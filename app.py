"""API Flask local para recibir observaciones WiFi ESP32 y persistirlas en MySQL/XAMPP."""

import hmac
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).with_name(".env"))
except ImportError:
    pass

try:
    import pymysql
    from pymysql.cursors import DictCursor
except ImportError:
    pymysql = None
    DictCursor = None


app = Flask(__name__)
cors_origins = [origin.strip() for origin in os.getenv("DASHBOARD_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": cors_origins, "allow_headers": ["Content-Type", "X-ESP32-Token", "X-ESP32-Device"]}})

MAX_NETWORKS_PER_SCAN = 100
SSID_MAX_BYTES = 32
BSSID_PATTERN = re.compile(r"^[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}$")


class PersistenceError(RuntimeError):
    """Error controlado al guardar o consultar datos WiFi."""


class ValidationError(ValueError):
    """Error controlado para observaciones que no cumplen el contrato del ESP32."""


class AuthenticationError(PermissionError):
    """Error controlado para un sensor que no presentó un token válido."""


def _utc_now() -> datetime:
    """Genera la marca temporal en UTC para persistencia y trazabilidad."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _database_settings() -> dict[str, Any]:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise PersistenceError("Falta DATABASE_URL en el archivo .env.")

    parsed = urlparse(database_url)
    if parsed.scheme not in {"mysql", "mysql+pymysql"} or not parsed.hostname or not parsed.path.lstrip("/"):
        raise PersistenceError("DATABASE_URL debe usar el formato mysql://usuario:clave@127.0.0.1:3306/empresa.")

    return {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "database": parsed.path.lstrip("/"),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
    }


def _connect_db():
    if pymysql is None:
        raise PersistenceError("Falta PyMySQL. Ejecuta: pip install -r requirements.txt")
    try:
        return pymysql.connect(**_database_settings())
    except Exception as error:
        raise PersistenceError(f"No se pudo conectar a MySQL/XAMPP: {error}") from error


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _required_int(value: Any, field: str, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as error:
        raise ValidationError(f"{field} debe ser un entero entre {minimum} y {maximum}.") from error
    if parsed < minimum or parsed > maximum:
        raise ValidationError(f"{field} debe estar entre {minimum} y {maximum}.")
    return parsed


def _as_boolean(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"true", "1", "yes", "si", "sí"}


def _verify_scan_token() -> None:
    expected = os.getenv("ESP32_SCAN_TOKEN", "").strip()
    if len(expected) < 16:
        raise PersistenceError("Falta ESP32_SCAN_TOKEN o tiene menos de 16 caracteres. Configúralo antes de aceptar escaneos.")
    presented = request.headers.get("X-ESP32-Token", "")
    if not hmac.compare_digest(presented, expected):
        raise AuthenticationError("El token del ESP32 no es válido.")


def _network_observation(network: dict[str, Any]) -> dict[str, Any]:
    ssid = str(network.get("ssid", "")).strip()
    if len(ssid.encode("utf-8")) > SSID_MAX_BYTES:
        raise ValidationError("ssid no puede superar 32 octetos UTF-8.")

    raw_bssid = str(network.get("bssid", "")).strip()
    if raw_bssid and not BSSID_PATTERN.fullmatch(raw_bssid):
        raise ValidationError("bssid debe tener el formato AA:BB:CC:DD:EE:FF.")

    encryption = str(network.get("encryption", network.get("encriptacion", "UNKNOWN"))).strip() or "UNKNOWN"
    if len(encryption) > 80:
        raise ValidationError("encriptacion no puede superar 80 caracteres.")

    return {
        "ssid": ssid or None,
        "bssid": raw_bssid.upper() or None,
        "canal": _required_int(network.get("channel", network.get("canal")), "canal", 1, 196),
        "rssi": _required_int(network.get("rssi"), "rssi", -127, 0),
        "encriptacion": encryption,
        "oculto": _as_boolean(network.get("hidden", network.get("oculto", False))) or not ssid,
    }


def _resolve_owner_id(cursor) -> int:
    configured_email = os.getenv("WIFI_OWNER_EMAIL", "").strip()
    if configured_email:
        cursor.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (configured_email,))
        user = cursor.fetchone()
        if user:
            return _to_int(user["id"])
        raise PersistenceError("WIFI_OWNER_EMAIL no corresponde a un usuario registrado.")

    cursor.execute("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
    user = cursor.fetchone()
    if not user:
        raise PersistenceError("No hay una cuenta administradora en la tabla users.")
    return _to_int(user["id"])


def build_scan_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    raw_networks = payload.get("networks", payload.get("redes", []))
    if not isinstance(raw_networks, list):
        raise ValidationError("El campo networks debe ser una lista.")
    if len(raw_networks) > MAX_NETWORKS_PER_SCAN:
        raise ValidationError(f"Un escaneo no puede contener más de {MAX_NETWORKS_PER_SCAN} redes.")
    if not all(isinstance(network, dict) for network in raw_networks):
        raise ValidationError("Cada elemento de networks debe ser un objeto JSON.")

    networks = [_network_observation(network) for network in raw_networks]
    device_id = str(payload.get("device_id", payload.get("dispositivo", "esp32-scanner"))).strip() or "esp32-scanner"
    if len(device_id) > 80:
        raise ValidationError("device_id no puede superar 80 caracteres.")

    observed_at = _utc_now()
    return {
        "scan_summary": {
            "dispositivo": device_id,
            "total_redes": len(networks),
            "canal_optimo": None,
            "saturacion_general": None,
            "ocupacion_espectral": None,
            "perdida_paquetes": None,
            "tendencia_ia": None,
            "timestamp": _serializable(observed_at),
        },
        "networks": networks,
        "channels": [],
        "alerts": [],
        "prediction": None,
        "observed_at": observed_at,
    }


def persist_scan(snapshot: dict[str, Any]) -> int:
    connection = _connect_db()
    try:
        with connection.cursor() as cursor:
            owner_id = _resolve_owner_id(cursor)
            summary = snapshot["scan_summary"]
            cursor.execute(
                """
                INSERT INTO wifi_scans
                  (userId, timestamp, saturacionGeneral, ocupacionEspectral, perdidaPaquetes, totalRedes, tendenciaIA, canalOptimo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (owner_id, snapshot["observed_at"], summary["saturacion_general"], summary["ocupacion_espectral"], summary["perdida_paquetes"], summary["total_redes"], summary["tendencia_ia"], summary["canal_optimo"]),
            )
            scan_id = cursor.lastrowid

            for network in snapshot["networks"]:
                cursor.execute(
                    """
                    INSERT INTO wifi_networks (scanId, ssid, bssid, canal, rssi, encriptacion, oculto)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (scan_id, network["ssid"], network["bssid"], network["canal"], network["rssi"], network["encriptacion"], network["oculto"]),
                )
        connection.commit()
        return _to_int(scan_id)
    except PersistenceError:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        raise PersistenceError(f"No se pudo guardar el escaneo: {error}") from error
    finally:
        connection.close()


def _empty_dashboard():
    return {"ok": True, "sin_datos": True, "ultimo_escaneo": None, "canales": [], "redes": [], "alertas": [], "prediccion": None, "historico": [], "anomalias_futuras": []}


def _serializable(value: Any):
    if isinstance(value, datetime):
        timestamp = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return timestamp.isoformat().replace("+00:00", "Z")
    if value is None:
        return None
    if hasattr(value, "as_tuple"):
        return float(value)
    return value


def _channel_counts(networks: list[dict[str, Any]]) -> dict[int, int]:
    counts: dict[int, int] = {}
    for network in networks:
        channel = _to_int(network.get("canal"))
        counts[channel] = counts.get(channel, 0) + 1
    return counts


def _load_dashboard_from_db():
    connection = _connect_db()
    try:
        with connection.cursor() as cursor:
            owner_id = _resolve_owner_id(cursor)
            cursor.execute("SELECT id, timestamp, totalRedes FROM wifi_scans WHERE userId = %s ORDER BY timestamp DESC, id DESC LIMIT 1", (owner_id,))
            latest = cursor.fetchone()
            if not latest:
                return _empty_dashboard()

            scan_id = _to_int(latest["id"])
            cursor.execute("SELECT ssid, bssid, canal, rssi, encriptacion, oculto FROM wifi_networks WHERE scanId = %s ORDER BY rssi DESC, id ASC", (scan_id,))
            networks = [
                {"ssid": row["ssid"] or "", "bssid": row["bssid"], "canal": _to_int(row["canal"]), "rssi": _to_int(row["rssi"], -127), "encriptacion": row["encriptacion"] or "UNKNOWN", "oculto": bool(row["oculto"])}
                for row in cursor.fetchall()
            ]
            channels = [
                {"canal": channel, "cantidad_redes": count, "saturacion": None, "ocupacion_espectral": None, "interferencia_adyacente": None, "perdida_paquetes": None, "riesgo_anomalia": None, "anomalia": None}
                for channel, count in sorted(_channel_counts(networks).items())
            ]

            cursor.execute("SELECT id, timestamp, totalRedes FROM wifi_scans WHERE userId = %s ORDER BY timestamp DESC, id DESC LIMIT 20", (owner_id,))
            history = [
                {"id": _to_int(row["id"]), "timestamp": _serializable(row["timestamp"]), "saturacion_general": None, "ocupacion_espectral": None, "perdida_paquetes": None, "total_redes": _to_int(row["totalRedes"]), "tendencia_ia": None, "canal_optimo": None}
                for row in cursor.fetchall()
            ]

            summary = {"id": scan_id, "timestamp": _serializable(latest["timestamp"]), "total_redes": _to_int(latest["totalRedes"]), "canal_optimo": None, "saturacion_general": None, "ocupacion_espectral": None, "perdida_paquetes": None, "tendencia_ia": None}
            return {"ok": True, "sin_datos": False, "ultimo_escaneo": summary, "redes": networks, "canales": channels, "alertas": [], "prediccion": None, "historico": history, "anomalias_futuras": []}
    finally:
        connection.close()


@app.route("/api/health", methods=["GET"])
def health():
    try:
        connection = _connect_db()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        connection.close()
    except PersistenceError as error:
        return jsonify({"ok": False, "db": "disconnected", "status": str(error)}), 503
    auth_state = "configured" if len(os.getenv("ESP32_SCAN_TOKEN", "").strip()) >= 16 else "missing"
    return jsonify({"ok": True, "db": "connected", "scan_auth": auth_state, "status": "running", "timestamp": _serializable(_utc_now())})


@app.route("/api/scan", methods=["POST"])
@app.route("/api/esp_scan", methods=["POST"])
def receive_scan():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "error": "JSON inválido"}), 400
    try:
        _verify_scan_token()
        snapshot = build_scan_snapshot(payload)
        scan_id = persist_scan(snapshot)
    except AuthenticationError as error:
        return jsonify({"ok": False, "error": str(error)}), 401
    except ValidationError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    except PersistenceError as error:
        app.logger.error("No se guardó el escaneo: %s", error)
        return jsonify({"ok": False, "error": str(error)}), 503

    app.logger.info("Escaneo %s guardado desde %s: %s redes observadas.", scan_id, snapshot["scan_summary"]["dispositivo"], len(snapshot["networks"]))
    return jsonify({"ok": True, "scan_id": scan_id, "received": len(snapshot["networks"]), "device_id": snapshot["scan_summary"]["dispositivo"]}), 201


@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    try:
        return jsonify(_load_dashboard_from_db())
    except PersistenceError as error:
        app.logger.error("No se pudieron recuperar los datos WiFi: %s", error)
        response = _empty_dashboard()
        response.update({"ok": False, "error": str(error)})
        return jsonify(response), 503


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    try:
        dashboard = _load_dashboard_from_db()
        return jsonify({"metrics": {"active_scans": len(dashboard["historico"]), "status": "healthy", "last_scan": dashboard["ultimo_escaneo"]}})
    except PersistenceError as error:
        return jsonify({"metrics": {"active_scans": None, "status": "unavailable", "error": str(error)}}), 503


if __name__ == "__main__":
    print("==================================================")
    print(" FLASK LOCAL - ENTERPRISE DASHBOARD + MYSQL       ")
    print(" URL: http://0.0.0.0:5000                         ")
    print("==================================================")
    app.run(host="0.0.0.0", port=5000, debug=False)
