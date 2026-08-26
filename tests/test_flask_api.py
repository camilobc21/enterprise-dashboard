import sys
import os
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import PersistenceError, app, build_scan_snapshot


class FlaskScanApiTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.environment = patch.dict(os.environ, {"ESP32_SCAN_TOKEN": "token-local-de-prueba-123456"})
        self.environment.start()

    def tearDown(self):
        self.environment.stop()

    def test_scan_is_accepted_after_the_database_persistence_succeeds(self):
        payload = {
            "device_id": "esp32-test",
            "rssi_connected": -52,
            "networks": [{"ssid": "Lab", "bssid": "AA:BB:CC:DD:EE:FF", "rssi": -60, "channel": 6}],
        }
        with patch("app.persist_scan", return_value=41):
            response = self.client.post("/api/scan", json=payload, headers={"X-ESP32-Token": "token-local-de-prueba-123456"})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["scan_id"], 41)
        self.assertEqual(response.get_json()["received"], 1)

    def test_scan_returns_an_actionable_error_when_mysql_persistence_fails(self):
        with patch("app.persist_scan", side_effect=PersistenceError("No se pudo conectar a MySQL/XAMPP")):
            response = self.client.post("/api/scan", json={"networks": []}, headers={"X-ESP32-Token": "token-local-de-prueba-123456"})

        self.assertEqual(response.status_code, 503)
        self.assertIn("MySQL/XAMPP", response.get_json()["error"])

    def test_scan_snapshot_uses_observed_network_data_and_marks_unmeasured_metrics_unknown(self):
        snapshot = build_scan_snapshot({
            "device_id": "esp32-test",
            "networks": [{"ssid": "Lab", "bssid": "AA:BB:CC:DD:EE:FF", "rssi": -60, "channel": 6, "encryption": "WPA2"}],
        })

        self.assertEqual(snapshot["scan_summary"]["total_redes"], 1)
        self.assertEqual(snapshot["networks"][0]["rssi"], -60)
        self.assertTrue(snapshot["scan_summary"]["timestamp"].endswith("Z"))
        self.assertIsNone(snapshot["scan_summary"]["saturacion_general"])
        self.assertIsNone(snapshot["scan_summary"]["ocupacion_espectral"])
        self.assertIsNone(snapshot["scan_summary"]["perdida_paquetes"])
        self.assertIsNone(snapshot["prediction"])
        self.assertEqual(snapshot["channels"], [])
        self.assertEqual(snapshot["alerts"], [])

    def test_scan_rejects_an_invalid_bssid_instead_of_normalizing_it_to_fake_data(self):
        response = self.client.post("/api/scan", json={
            "networks": [{"ssid": "Lab", "bssid": "no-es-una-mac", "rssi": -60, "channel": 6}],
        }, headers={"X-ESP32-Token": "token-local-de-prueba-123456"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("bssid", response.get_json()["error"])

    def test_scan_rejects_a_request_without_the_sensor_token(self):
        response = self.client.post("/api/scan", json={"networks": []})

        self.assertEqual(response.status_code, 401)
        self.assertIn("token", response.get_json()["error"])

    def test_dashboard_reads_the_persisted_source_of_truth(self):
        persisted_dashboard = {
            "ok": True,
            "sin_datos": False,
            "ultimo_escaneo": {"id": 7, "total_redes": 2, "saturacion_general": None, "ocupacion_espectral": None, "perdida_paquetes": None, "tendencia_ia": None, "canal_optimo": None},
            "redes": [{"ssid": "Lab", "canal": 6, "rssi": -60}],
            "canales": [{"canal": 6, "cantidad_redes": 1, "saturacion": None, "ocupacion_espectral": None, "interferencia_adyacente": None, "perdida_paquetes": None, "riesgo_anomalia": None, "anomalia": None}],
            "alertas": [],
            "prediccion": None,
            "historico": [],
            "anomalias_futuras": [],
        }
        with patch("app._load_dashboard_from_db", return_value=persisted_dashboard) as loader:
            response = self.client.get("/api/dashboard")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["ultimo_escaneo"]["id"], 7)
        self.assertIsNone(response.get_json()["ultimo_escaneo"]["saturacion_general"])
        self.assertIsNone(response.get_json()["canales"][0]["interferencia_adyacente"])
        loader.assert_called_once()

    def test_health_connects_to_the_configured_mysql_database(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["db"], "connected")


if __name__ == "__main__":
    unittest.main()
