#!/usr/bin/env python3
"""API Flask local para recibir escaneos ESP32 y persistirlos en MySQL/XAMPP."""

import json
import os
from datetime import datetime
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
CORS(app)

latest_scan: dict[str, Any] | None = None


class PersistenceError(RuntimeError):
    """Error controlado al guardar o consultar datos WiFi."""


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


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _network_observation(network: dict[str, Any]) -> dict[str, Any]:
    ssid = str(network.get("ssid", "")).strip()
    return {
        "ssid": ssid or None,
        "bssid": str(network.get("bssid", "")).strip() or None,
        "canal": _to_int(network.get("channel", network.get("canal")), 0),
        "rssi": _to_int(network.get("rssi"), -127),
        "encriptacion": str(network.get("encryption", network.get("encriptacion", "UNKNOWN"))).strip() or "UNKNOWN",
        "oculto": bool(network.get("hidden", network.get("oculto", False))) or not ssid,
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
        raise PersistenceError("El campo networks debe ser una lista.")

    networks = [_network_observation(network) for network in raw_networks if isinstance(network, dict)]
    total_networks = len(networks)
    channel_counts = {channel: 0 for channel in range(1, 14)}
    for network in networks:
        channel = network["canal"]
        if channel in channel_counts:
            channel_counts[channel] += 1

    recommended_channel = min((1, 6, 11), key=lambda channel: channel_counts[channel])
    timestamp = datetime.now()
    density_reference = max(1, _to_int(os.getenv("WIFI_CHANNEL_DENSITY_REFERENCE", "8"), 8))
    alert_threshold = max(1, _to_int(os.getenv("WIFI_DENSITY_ALERT_THRESHOLD", "6"), 6))
    channels = []
    alerts = []
    for channel, count in channel_counts.items():
        density_index = round(min(100.0, (count / density_reference) * 100), 2)
        channel_data = {
            "canal": channel,
            "cantidad_redes": count,
            "saturacion": density_index,
            "ocupacion_espectral": None,
            "interferencia_adyacente": None,
            "perdida_paquetes": None,
            "riesgo_anomalia": density_index,
            "anomalia": 1 if count >= alert_threshold else 0,
        }
        channels.append(channel_data)
        if count >= alert_threshold:
            alerts.append({
                "canal": channel,
                "tipo": "saturacion",
                "severidad": "critical" if count >= density_reference else "warning",
                "descripcion": f"El canal {channel} tiene {count} redes observadas por el ESP32.",
                "metadata": {"cantidad_redes": count, "fuente": "esp32", "tipo_medida": "densidad_observada"},
            })

    scan_summary = {
        "dispositivo": payload.get("device_id", "esp32-scanner"),
        "total_redes": total_networks,
        "canal_optimo": recommended_channel,
        "saturacion_general": max((channel["saturacion"] for channel in channels), default=0.0),
        "ocupacion_espectral": None,
        "perdida_paquetes": _optional_float(payload.get("packet_loss", payload.get("perdida_paquetes"))),
        "tendencia_ia": None,
        "timestamp": timestamp.isoformat(),
    }
    return {
        "scan_summary": scan_summary,
        "networks": networks,
        "channels": channels,
        "alerts": alerts,
        "prediction": None,
        "observed_at": timestamp,
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
                (
                    owner_id,
                    snapshot["observed_at"],
                    summary["saturacion_general"],
                    summary["ocupacion_espectral"],
                    summary["perdida_paquetes"],
                    summary["total_redes"],
                    summary["tendencia_ia"],
                    summary["canal_optimo"],
                ),
            )
            scan_id = cursor.lastrowid

            for network in snapshot["networks"]:
                if network["canal"] <= 0:
                    continue
                cursor.execute(
                    """
                    INSERT INTO wifi_networks
                      (scanId, ssid, bssid, canal, rssi, encriptacion, oculto)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        scan_id,
                        network["ssid"],
                        network["bssid"],
                        network["canal"],
                        network["rssi"],
                        network["encriptacion"],
                        network["oculto"],
                    ),
                )

            for channel in snapshot["channels"]:
                cursor.execute(
                    """
                    INSERT INTO wifi_channels
                      (scanId, canal, saturacion, ocupacionEspectral, interferencia, perdidaPaquetes, riesgoAnomalia)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        scan_id,
                        channel["canal"],
                        channel["saturacion"],
                        channel["ocupacion_espectral"],
                        channel["interferencia_adyacente"],
                        channel["perdida_paquetes"],
                        channel["riesgo_anomalia"],
                    ),
                )

            for alert in snapshot["alerts"]:
                cursor.execute(
                    """
                    INSERT INTO wifi_alerts (userId, scanId, timestamp, tipo, descripcion, severidad, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        owner_id,
                        scan_id,
                        snapshot["observed_at"],
                        alert["tipo"],
                        alert["descripcion"],
                        alert["severidad"],
                        json.dumps(alert["metadata"]),
                    ),
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
    return {
        "ok": True,
        "sin_datos": True,
        "ultimo_escaneo": None,
        "canales": [],
        "redes": [],
        "alertas": [],
        "prediccion": None,
        "historico": [],
        "anomalias_futuras": [],
    }


def _serializable(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    if hasattr(value, "as_tuple"):
        return float(value)
    return value


def _load_dashboard_from_db():
    connection = _connect_db()
    try:
        with connection.cursor() as cursor:
            owner_id = _resolve_owner_id(cursor)
            cursor.execute(
                """
                SELECT id, timestamp, saturacionGeneral, ocupacionEspectral, perdidaPaquetes,
                       totalRedes, tendenciaIA, canalOptimo
                FROM wifi_scans
                WHERE userId = %s
                ORDER BY timestamp DESC, id DESC
                LIMIT 1
                """,
                (owner_id,),
            )
            latest = cursor.fetchone()
            if not latest:
                return _empty_dashboard()

            scan_id = _to_int(latest["id"])
            cursor.execute(
                """
                SELECT ssid, bssid, canal, rssi, encriptacion, oculto
                FROM wifi_networks WHERE scanId = %s ORDER BY rssi DESC, id ASC
                """,
                (scan_id,),
            )
            networks = [
                {
                    "ssid": row["ssid"] or "",
                    "bssid": row["bssid"],
                    "canal": _to_int(row["canal"]),
                    "rssi": _to_int(row["rssi"], -127),
                    "encriptacion": row["encriptacion"] or "UNKNOWN",
                    "oculto": bool(row["oculto"]),
                }
                for row in cursor.fetchall()
            ]
            network_counts = {channel: 0 for channel in range(1, 14)}
            for network in networks:
                if network["canal"] in network_counts:
                    network_counts[network["canal"]] += 1

            cursor.execute(
                """
                SELECT canal, saturacion, ocupacionEspectral, interferencia,
                       perdidaPaquetes, riesgoAnomalia
                FROM wifi_channels WHERE scanId = %s ORDER BY canal ASC
                """,
                (scan_id,),
            )
            channels = [
                {
                    "canal": _to_int(row["canal"]),
                    "cantidad_redes": network_counts.get(_to_int(row["canal"]), 0),
                    "saturacion": _serializable(row["saturacion"]),
                    "ocupacion_espectral": _serializable(row["ocupacionEspectral"]),
                    "interferencia_adyacente": _serializable(row["interferencia"]),
                    "perdida_paquetes": _serializable(row["perdidaPaquetes"]),
                    "riesgo_anomalia": _serializable(row["riesgoAnomalia"]),
                    "anomalia": 1 if network_counts.get(_to_int(row["canal"]), 0) >= _to_int(os.getenv("WIFI_DENSITY_ALERT_THRESHOLD", "6"), 6) else 0,
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT timestamp, tipo, descripcion, severidad, metadata
                FROM wifi_alerts WHERE scanId = %s ORDER BY timestamp DESC, id DESC
                """,
                (scan_id,),
            )
            alerts = []
            for row in cursor.fetchall():
                try:
                    metadata = json.loads(row["metadata"]) if row["metadata"] else {}
                except (TypeError, json.JSONDecodeError):
                    metadata = {}
                alerts.append({
                    "timestamp": _serializable(row["timestamp"]),
                    "tipo": row["tipo"],
                    "descripcion": row["descripcion"],
                    "severidad": row["severidad"],
                    "metadata": metadata,
                })

            cursor.execute(
                """
                SELECT id, timestamp, saturacionGeneral, ocupacionEspectral, perdidaPaquetes,
                       totalRedes, tendenciaIA, canalOptimo
                FROM wifi_scans WHERE userId = %s
                ORDER BY timestamp DESC, id DESC LIMIT 20
                """,
                (owner_id,),
            )
            history = [
                {
                    "id": _to_int(row["id"]),
                    "timestamp": _serializable(row["timestamp"]),
                    "saturacion_general": _serializable(row["saturacionGeneral"]),
                    "ocupacion_espectral": _serializable(row["ocupacionEspectral"]),
                    "perdida_paquetes": _serializable(row["perdidaPaquetes"]),
                    "total_redes": _to_int(row["totalRedes"]),
                    "tendencia_ia": _serializable(row["tendenciaIA"]),
                    "canal_optimo": _serializable(row["canalOptimo"]),
                }
                for row in cursor.fetchall()
            ]

            summary = {
                "id": scan_id,
                "timestamp": _serializable(latest["timestamp"]),
                "total_redes": _to_int(latest["totalRedes"]),
                "canal_optimo": _serializable(latest["canalOptimo"]),
                "saturacion_general": _serializable(latest["saturacionGeneral"]),
                "ocupacion_espectral": _serializable(latest["ocupacionEspectral"]),
                "perdida_paquetes": _serializable(latest["perdidaPaquetes"]),
                "tendencia_ia": _serializable(latest["tendenciaIA"]),
            }
            return {
                "ok": True,
                "sin_datos": False,
                "ultimo_escaneo": summary,
                "redes": networks,
                "canales": channels,
                "alertas": alerts,
                "prediccion": None,
                "historico": history,
                "anomalias_futuras": [],
            }
    finally:
        connection.close()


def _build_dashboard(snapshot: dict[str, Any], scan_id: int, history: list[dict[str, Any]] | None = None):
    summary = {"id": scan_id, **snapshot["scan_summary"]}
    return {
        "ok": True,
        "sin_datos": False,
        "ultimo_escaneo": summary,
        "redes": snapshot["networks"],
        "canales": snapshot["channels"],
        "alertas": snapshot["alerts"],
        "prediccion": snapshot["prediction"],
        "historico": history or [summary],
        "anomalias_futuras": [],
    }


@app.route("/api/health", methods=["GET"])
def health():
    try:
        connection = _connect_db()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        connection.close()
        database_state = "connected"
    except PersistenceError as error:
        database_state = "disconnected"
        return jsonify({"ok": False, "db": database_state, "status": str(error)}), 503

    return jsonify({"ok": True, "db": database_state, "status": "running", "timestamp": datetime.now().isoformat()})


@app.route("/api/scan", methods=["POST"])
@app.route("/api/esp_scan", methods=["POST"])
def receive_scan():
    global latest_scan
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "error": "JSON inválido"}), 400

    try:
        snapshot = build_scan_snapshot(payload)
        scan_id = persist_scan(snapshot)
        latest_scan = _build_dashboard(snapshot, scan_id)
    except PersistenceError as error:
        app.logger.error("No se guardó el escaneo: %s", error)
        return jsonify({"ok": False, "error": str(error)}), 503

    app.logger.info("Escaneo %s guardado desde %s: %s redes.", scan_id, payload.get("device_id"), len(snapshot["networks"]))
    return jsonify({"ok": True, "scan_id": scan_id, "received": len(snapshot["networks"]), "device_id": payload.get("device_id")}), 201


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
        return jsonify({"metrics": {"active_scans": 0, "status": "unavailable", "error": str(error)}}), 503


if __name__ == "__main__":
    print("==================================================")
    print(" FLASK LOCAL - ENTERPRISE DASHBOARD + MYSQL       ")
    print(" URL: http://0.0.0.0:5000                         ")
    print("==================================================")
    app.run(host="0.0.0.0", port=5000, debug=False)
