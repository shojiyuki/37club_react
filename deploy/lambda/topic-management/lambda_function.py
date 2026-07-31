import json
import logging
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

API_URL_ENV_NAME = "TOPIC_MANAGEMENT_API_URL"
PARAMETER_NAME_ENV_NAME = "TOPIC_MANAGEMENT_PARAMETER_NAME"
DEFAULT_TIMEOUT_SECONDS = 10

_cached_service_token: str | None = None


class ConfigurationError(RuntimeError):
    pass


def _audit_action(event: dict[str, Any]) -> str:
    action = event.get("action")
    return action if action in {"select", "insert", "update"} else "invalid"


def _audit_topic_id(
    event: dict[str, Any], result: dict[str, Any] | None = None
) -> int | None:
    requested_topic_id = event.get("topicId")
    if (
        isinstance(requested_topic_id, int)
        and not isinstance(requested_topic_id, bool)
        and requested_topic_id > 0
    ):
        return requested_topic_id

    if result is None:
        return None

    response = result.get("response")
    topic = response.get("topic") if isinstance(response, dict) else None
    created_topic_id = topic.get("topicId") if isinstance(topic, dict) else None
    if (
        isinstance(created_topic_id, int)
        and not isinstance(created_topic_id, bool)
        and created_topic_id > 0
    ):
        return created_topic_id

    return None


def _load_service_token(parameter_name: str, ssm_client: Any = None) -> str:
    global _cached_service_token

    if _cached_service_token:
        return _cached_service_token

    if ssm_client is None:
        import boto3

        ssm_client = boto3.client("ssm")

    response = ssm_client.get_parameter(Name=parameter_name, WithDecryption=True)
    parameter = response.get("Parameter", {})
    service_token = parameter.get("Value")
    if not isinstance(service_token, str) or len(service_token) < 32:
        raise ConfigurationError(
            "Topic management SecureString must contain at least 32 characters"
        )

    _cached_service_token = service_token
    return service_token


def _parse_response_body(raw_body: bytes) -> dict[str, Any]:
    if not raw_body:
        return {}

    try:
        parsed = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {"error": "INVALID_API_RESPONSE"}

    return parsed if isinstance(parsed, dict) else {"data": parsed}


def _call_topic_management_api(
    event: dict[str, Any],
    *,
    api_url: str,
    service_token: str,
    lambda_request_id: str,
    opener: Any = urlopen,
) -> dict[str, Any]:
    request = Request(
        api_url,
        data=json.dumps(event, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {service_token}",
            "Content-Type": "application/json",
            "X-Lambda-Request-ID": lambda_request_id,
        },
        method="POST",
    )

    try:
        with opener(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            body = _parse_response_body(response.read())
            return {
                "ok": 200 <= response.status < 300,
                "statusCode": response.status,
                "response": body,
            }
    except HTTPError as error:
        return {
            "ok": False,
            "statusCode": error.code,
            "response": _parse_response_body(error.read()),
        }
    except URLError as error:
        LOGGER.error(
            "topic_management_api_unreachable",
            extra={"lambda_request_id": lambda_request_id},
        )
        return {
            "ok": False,
            "statusCode": 502,
            "response": {"error": "TOPIC_MANAGEMENT_API_UNREACHABLE"},
        }


def lambda_handler(event: Any, context: Any) -> dict[str, Any]:
    if not isinstance(event, dict):
        return {
            "ok": False,
            "statusCode": 400,
            "response": {"error": "INVALID_INPUT"},
        }

    api_url = os.environ.get(API_URL_ENV_NAME, "").strip()
    parameter_name = os.environ.get(PARAMETER_NAME_ENV_NAME, "").strip()
    if not api_url or not parameter_name:
        raise ConfigurationError(
            f"{API_URL_ENV_NAME} and {PARAMETER_NAME_ENV_NAME} are required"
        )

    lambda_request_id = getattr(context, "aws_request_id", "unknown")
    action = _audit_action(event)
    requested_topic_id = _audit_topic_id(event)
    LOGGER.info(
        "topic_management_started action=%s topic_id=%s lambda_request_id=%s",
        action,
        requested_topic_id,
        lambda_request_id,
    )

    service_token = _load_service_token(parameter_name)
    result = _call_topic_management_api(
        event,
        api_url=api_url,
        service_token=service_token,
        lambda_request_id=lambda_request_id,
    )

    LOGGER.info(
        "topic_management_completed action=%s topic_id=%s lambda_request_id=%s status_code=%s ok=%s",
        action,
        _audit_topic_id(event, result),
        lambda_request_id,
        result["statusCode"],
        result["ok"],
    )
    return result
