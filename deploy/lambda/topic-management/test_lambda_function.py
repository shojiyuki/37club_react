import importlib.util
import json
import pathlib
import unittest
from types import SimpleNamespace
from unittest.mock import patch


MODULE_PATH = pathlib.Path(__file__).with_name("lambda_function.py")
SPEC = importlib.util.spec_from_file_location("topic_management_lambda", MODULE_PATH)
assert SPEC and SPEC.loader
LAMBDA = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAMBDA)


class FakeSsmClient:
    def __init__(self, value):
        self.value = value
        self.requested_parameter_name = None

    def get_parameter(self, *, Name, WithDecryption):
        self.requested_parameter_name = Name
        self.with_decryption = WithDecryption
        return {"Parameter": {"Value": self.value}}


class FakeResponse:
    status = 200

    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc_value, _traceback):
        return False

    def read(self):
        return json.dumps(self.body).encode("utf-8")


class TopicManagementLambdaTest(unittest.TestCase):
    def setUp(self):
        LAMBDA._cached_service_token = None

    def test_loads_the_service_token_from_a_secure_parameter(self):
        token = "secure-service-token-12345678901234567890"
        client = FakeSsmClient(token)

        result = LAMBDA._load_service_token("/37club/production/topic-token", client)

        self.assertEqual(result, token)
        self.assertEqual(
            client.requested_parameter_name, "/37club/production/topic-token"
        )
        self.assertTrue(client.with_decryption)

    def test_forwards_select_json_without_exposing_the_token_in_the_result(self):
        captured = {}

        def opener(request, *, timeout):
            captured["url"] = request.full_url
            captured["headers"] = dict(request.header_items())
            captured["body"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return FakeResponse(
                {
                    "ok": True,
                    "action": "select",
                    "count": 1,
                    "topics": [{"topicId": 3}],
                }
            )

        result = LAMBDA._call_topic_management_api(
            {"action": "select", "topicId": 3},
            api_url="https://api.37club.net/api/internal/topic-management",
            service_token="secure-service-token-12345678901234567890",
            lambda_request_id="lambda-request-1",
            opener=opener,
        )

        self.assertTrue(result["ok"])
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(captured["body"], {"action": "select", "topicId": 3})
        self.assertEqual(captured["headers"]["X-lambda-request-id"], "lambda-request-1")
        self.assertNotIn("secure-service-token", json.dumps(result))

    def test_rejects_non_object_input_before_calling_the_api(self):
        context = SimpleNamespace(aws_request_id="lambda-request-1")

        with patch.object(LAMBDA, "_call_topic_management_api") as api_call:
            result = LAMBDA.lambda_handler([], context)

        self.assertEqual(result["statusCode"], 400)
        api_call.assert_not_called()

    def test_normalizes_audit_fields_without_logging_input_content(self):
        self.assertEqual(LAMBDA._audit_action({"action": "update"}), "update")
        self.assertEqual(LAMBDA._audit_action({"action": "unknown"}), "invalid")
        self.assertEqual(
            LAMBDA._audit_topic_id({"action": "update", "topicId": 5}), 5
        )
        self.assertIsNone(
            LAMBDA._audit_topic_id({"action": "select", "scope": "upcoming"})
        )

        insert_result = {
            "ok": True,
            "statusCode": 200,
            "response": {
                "ok": True,
                "action": "insert",
                "topic": {"topicId": 6},
            },
        }
        self.assertEqual(
            LAMBDA._audit_topic_id({"action": "insert"}, insert_result), 6
        )

    def test_handler_logs_only_audit_metadata_for_insert(self):
        context = SimpleNamespace(aws_request_id="lambda-request-2")
        event = {
            "action": "insert",
            "topic": {
                "prompt": "must-not-appear-in-logs",
                "locationName": "must-not-appear-in-logs",
            },
        }
        api_result = {
            "ok": True,
            "statusCode": 200,
            "response": {
                "ok": True,
                "action": "insert",
                "topic": {"topicId": 7},
            },
        }

        with (
            patch.dict(
                LAMBDA.os.environ,
                {
                    LAMBDA.API_URL_ENV_NAME: "https://api.37club.net/internal",
                    LAMBDA.PARAMETER_NAME_ENV_NAME: "/37club/production/topic-token",
                },
            ),
            patch.object(LAMBDA, "_load_service_token", return_value="secret-token"),
            patch.object(
                LAMBDA, "_call_topic_management_api", return_value=api_result
            ),
            self.assertLogs(level="INFO") as captured_logs,
        ):
            result = LAMBDA.lambda_handler(event, context)

        self.assertEqual(result, api_result)
        joined_logs = "\n".join(captured_logs.output)
        self.assertIn("action=insert", joined_logs)
        self.assertIn("topic_id=7", joined_logs)
        self.assertIn("lambda_request_id=lambda-request-2", joined_logs)
        self.assertNotIn("must-not-appear-in-logs", joined_logs)
        self.assertNotIn("secret-token", joined_logs)


if __name__ == "__main__":
    unittest.main()
