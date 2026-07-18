import json
import os
from typing import Any

import boto3


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _json_default(value: Any) -> str:
    return str(value)


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    instance_name = os.environ["LIGHTSAIL_INSTANCE_NAME"]
    region = os.environ.get("LIGHTSAIL_REGION", "ap-northeast-1")
    dry_run = _env_bool("DRY_RUN", True)

    print("[budget-soft-stop] received event")
    print(json.dumps(event, ensure_ascii=False, default=_json_default))

    lightsail = boto3.client("lightsail", region_name=region)
    instance = lightsail.get_instance(instanceName=instance_name)["instance"]
    state = instance.get("state", {}).get("name", "unknown")

    print(
        json.dumps(
            {
                "message": "target instance state",
                "instanceName": instance_name,
                "region": region,
                "state": state,
                "dryRun": dry_run,
            },
            ensure_ascii=False,
        )
    )

    if state != "running":
        return {
            "ok": True,
            "action": "skipped",
            "reason": f"instance is {state}",
            "instanceName": instance_name,
            "state": state,
            "dryRun": dry_run,
        }

    if dry_run:
        return {
            "ok": True,
            "action": "would_stop",
            "instanceName": instance_name,
            "state": state,
            "dryRun": dry_run,
        }

    response = lightsail.stop_instance(instanceName=instance_name)
    print(json.dumps(response, ensure_ascii=False, default=_json_default))

    return {
        "ok": True,
        "action": "stop_instance",
        "instanceName": instance_name,
        "state": state,
        "dryRun": dry_run,
        "operations": response.get("operations", []),
    }
