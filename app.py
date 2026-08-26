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
    networks = payload.get("networks", payload.get("redes", []))
    if not isinstance(networks, list):
        raise PersistenceError("El campo networks debe ser una lista.")

    total_networks = len(networks)
    saturation = min(100.0, total_networks * 7.5)
    channel_counts = {channel: 0 for channel in range(1, 14)}
    for network in networks:
        if isinstance(network, dict):
            channel = _to_int(network.get("channel", network.get("canal")), 0)
            if channel in channel_counts:
                channel_counts[channel] += 1

    recommended_channel = min((1, 6, 11), key=lambda channel: channel_counts[channel])
    timestamp = datetime.now()
    channels = []
    alerts = []
    for channel, count in channel_counts.items():
        channel_data = {
            "canal": channel,
            "cantidad_redes": count,
            "saturacion": round(min(100.0, count * 15.0), 2),
            "ocupacion_espectral": round(min(100.0, count * 20.0), 2),
            "interferencia_adyacente": round(count * 5.2, 2),
            "perdida_paquetes": round(count * 1.5, 2),
            "riesgo_anomalia": round(count * 12.0, 2),
            "anomalia": 1 if count > 4 else 0,
        }
        channels.append(channel_data)
        if count >= 4:
            alerts.append({
                "canal": channel,
                "tipo": "saturacion",
                "severidad": "critical" if count >= 6 else "warning",
                "descripcion": f"Canal {channel} presenta alta densidad con {count} redes detectadas.",
                "metadata": {"cantidad_redes": count, "fuente": "esp32"},
            })

    scan_summary = {
        "dispositivo": payload.get("device_id", "esp32-scanner"),
        "total_redes": total_networks,
        "canal_optimo": recommended_channel,
        "saturacion_general": round(saturation, 2),
        "ocupacion_espectral": round(min(100.0, saturation * 1.2), 2),
        "perdida_paquetes": round(max(0.0, _to_float(payload.get("rssi_connected"), -60) * -0.1), 2),
        "tendencia_ia": 1 if total_networks < 10 else 2,
        "timestamp": timestamp.isoformat(),
    }
    prediction = {
        "canal_predicho": recommended_channel,
        "confianza": 0.89,
        "score_espectral": round(max(10.0, 100.0 - saturation), 2),
        "detalle": "Predicción de canal óptimo basada en densidad espectral de la observación actual.",
    }
    return {
        "scan_summary": scan_summary,
        "networks": networks,
        "channels": channels,
        "alerts": alerts,
        "prediction": prediction,
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

            prediction = snapshot["prediction"]
            cursor.execute(
                """
                INSERT INTO wifi_predictions
                  (userId, timestamp, saturacionPredicha, riesgoAnomalia, canalOptimoPredicho, analisisPrediccion, confianza)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    owner_id,
                    snapshot["observed_at"],
                    summary["saturacion_general"],
                    max((channel["riesgo_anomalia"] for channel in snapshot["channels"]), default=0),
                    prediction["canal_predicho"],
                    prediction["detalle"],
                    prediction["confianza"],
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
    return jsonify(latest_scan or _empty_dashboard())


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    return jsonify({"metrics": {"active_scans": 1 if latest_scan else 0, "status": "healthy"}})


if __name__ == "__main__":
    print("==================================================")
    print(" FLASK LOCAL - ENTERPRISE DASHBOARD + MYSQL       ")
    print(" URL: http://0.0.0.0:5000                         ")
    print("==================================================")
    app.run(host="0.0.0.0", port=5000, debug=False)
