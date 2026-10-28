import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import PersistenceError, app


class FlaskScanApiTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_scan_is_accepted_after_the_database_persistence_succeeds(self):
        payload = {
            "device_id": "esp32-test",
            "rssi_connected": -52,
            "networks": [{"ssid": "Lab", "bssid": "AA:BB:CC:DD:EE:FF", "rssi": -60, "channel": 6}],
        }
        with patch("app.persist_scan", return_value=41):
            response = self.client.post("/api/scan", json=payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["scan_id"], 41)
        self.assertEqual(response.get_json()["received"], 1)

    def test_scan_returns_an_actionable_error_when_mysql_persistence_fails(self):
        with patch("app.persist_scan", side_effect=PersistenceError("No se pudo conectar a MySQL/XAMPP")):
            response = self.client.post("/api/scan", json={"networks": []})

        self.assertEqual(response.status_code, 503)
        self.assertIn("MySQL/XAMPP", response.get_json()["error"])

    def test_health_connects_to_the_configured_mysql_database(self):
        with patch("app._connect_db", return_value=MagicMock()):
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["db"], "connected")


if __name__ == "__main__":
    unittest.main()
