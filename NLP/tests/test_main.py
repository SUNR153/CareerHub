import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


VALID_PAYLOAD = {
    "educationYear": "3 курс",
    "specialization": "Computer Science",
    "targetRole": "Python Developer",
    "skills": ["Python", "Django"],
    "projects": [{"name": "CareerHub", "description": "Карьерная платформа"}],
    "personalTraits": ["ответственный"],
    "language": "ru",
}


class SummaryApiTests(unittest.TestCase):
    def setUp(self):
        main._requests.clear()
        self.client = TestClient(main.app)

    def test_health_reports_degraded_without_provider_key(self):
        with patch.dict(os.environ, {"GROQ_API": "", "GROQ_API_KEY": ""}):
            response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "degraded")

    def test_generate_summary_success(self):
        with patch.object(main, "generate_text", return_value="Я Python-разработчик."):
            response = self.client.post("/generate-summary", json=VALID_PAYLOAD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"field": "summary", "text": "Я Python-разработчик."})

    def test_invalid_language_is_rejected(self):
        response = self.client.post("/generate-summary", json={**VALID_PAYLOAD, "language": "de"})
        self.assertEqual(response.status_code, 422)

    def test_blank_required_value_is_rejected(self):
        response = self.client.post("/generate-summary", json={**VALID_PAYLOAD, "targetRole": " "})
        self.assertEqual(response.status_code, 422)

    def test_service_token_is_required_when_configured(self):
        with patch.dict(os.environ, {"NLP_SERVICE_TOKEN": "secret"}):
            response = self.client.post("/generate-summary", json=VALID_PAYLOAD)
            self.assertEqual(response.status_code, 401)
            with patch.object(main, "generate_text", return_value="Summary"):
                response = self.client.post(
                    "/generate-summary", json=VALID_PAYLOAD, headers={"X-Service-Token": "secret"}
                )
        self.assertEqual(response.status_code, 200)

    def test_provider_error_does_not_leak_details(self):
        with patch.object(
            main, "generate_text", side_effect=RuntimeError("Summary generation provider is unavailable")
        ):
            response = self.client.post("/generate-summary", json=VALID_PAYLOAD)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Summary generation provider is unavailable")


if __name__ == "__main__":
    unittest.main()
