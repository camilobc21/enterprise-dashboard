# Firmware ESP32 para Enterprise Dashboard

El firmware está en el archivo [`esp32_wifi_dashboard.ino`](./esp32_wifi_dashboard.ino). Escanea las redes WiFi visibles y envía un objeto JSON por HTTP al servicio Flask que se ejecuta en el computador.

## 1. Requisitos

Necesitas un ESP32 compatible, Arduino IDE, el paquete **ESP32 by Espressif Systems** y la librería **ArduinoJson 6.x o superior**. En Arduino IDE puedes instalar ArduinoJson desde `Sketch > Include Library > Manage Libraries`.

En `Tools > Board` selecciona el modelo correcto, por ejemplo `ESP32 Dev Module`. Selecciona también el puerto COM que corresponda al ESP32 y una velocidad de carga de 115200 baudios.

## 2. Configurar el archivo

Abre `esp32_wifi_dashboard.ino` y cambia estas tres constantes:

```cpp
const char* WIFI_SSID = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASENA_DE_TU_WIFI";
const char* API_URL = "http://192.168.1.100:5000/api/scan";
```

En `API_URL`, reemplaza `192.168.1.100` por la dirección IPv4 local del computador donde se está ejecutando Flask. En Windows puedes verla con:

```cmd
ipconfig
```

Usa la dirección **IPv4** de la misma interfaz de red que utiliza el ESP32. No uses `localhost` ni `127.0.0.1`, porque desde el ESP32 esas direcciones apuntan al propio ESP32, no al computador.

El ESP32 enviará un escaneo cada 30 segundos. Para cambiar el intervalo, modifica `SCAN_INTERVAL_MS`.

## 3. Formato enviado al API Flask

El ESP32 hace un `POST` a `/api/scan` con `Content-Type: application/json`. El cuerpo tiene esta estructura:

```json
{
  "device_id": "esp32-1234567890AB",
  "source": "esp32",
  "ip_address": "192.168.1.120",
  "rssi_connected": -48,
  "timestamp_ms": 123456,
  "network_count": 4,
  "networks": [
    {
      "ssid": "MiRed",
      "bssid": "AA:BB:CC:DD:EE:FF",
      "rssi": -52,
      "channel": 6,
      "encryption": "WPA2-PSK",
      "hidden": false
    }
  ]
}
```

Tu servicio Flask debe aceptar el `POST`, guardar o procesar el escaneo y responder con un código HTTP `2xx`, preferiblemente `200` o `201`. Como referencia, una ruta mínima sería:

```python
from flask import Flask, jsonify, request

app = Flask(__name__)
latest_scan = None

@app.post("/api/scan")
def receive_scan():
    global latest_scan
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("networks"), list):
        return jsonify({"ok": False, "error": "JSON de escaneo inválido"}), 400

    latest_scan = payload
    return jsonify({
        "ok": True,
        "received": len(payload["networks"]),
        "device_id": payload.get("device_id")
    }), 201

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "status": "running"})

if __name__ == "__main__":
    # 0.0.0.0 es necesario para aceptar conexiones del ESP32 por la LAN.
    app.run(host="0.0.0.0", port=5000, debug=False)
```

El repositorio ya incluye un servidor Flask completo en `app.py`: recibe `/api/scan`, guarda cada escaneo en MySQL/XAMPP y expone `/api/dashboard`. Antes de iniciarlo, instala las dependencias desde la raíz del proyecto:

```cmd
pip install -r requirements.txt
python app.py
```

Para que el dashboard Node/Express consuma los datos, la ruta `/api/dashboard` de Flask devuelve las claves `ultimo_escaneo`, `redes`, `canales`, `alertas`, `prediccion` e `historico`.

## 4. Probar la conexión

Primero inicia Flask en el computador y verifica desde el mismo computador:

```cmd
curl http://127.0.0.1:5000/api/health
```

Después verifica desde otro dispositivo de la red que el puerto sea accesible usando la IP LAN del computador. Si Windows Firewall pregunta, permite Python en redes privadas o crea una regla de entrada para TCP 5000.

Carga el programa al ESP32 y abre `Tools > Serial Monitor` a **115200 baudios**. Una ejecución correcta se parece a esto:

```text
WiFi conectado. IP del ESP32: 192.168.1.120
Iniciando escaneo WiFi...
Redes encontradas: 4. Enviando: 4.
Respuesta del API: HTTP 201
```

## 5. Errores frecuentes

### `HTTP 404`

La dirección IP es correcta, pero Flask no tiene registrada la ruta `/api/scan`, o la ruta configurada en `API_URL` no coincide con la ruta real. Confirma que el endpoint exista.

### `HTTP -1`, timeout o `connection refused`

Revisa que Flask esté iniciado con `host="0.0.0.0"`, que el ESP32 esté en la misma red, que el puerto sea el correcto y que Windows Firewall permita las conexiones entrantes.

### No se conecta al WiFi

Verifica SSID y contraseña. El ESP32 clásico solo puede conectarse a redes de **2.4 GHz**; una red exclusivamente de 5 GHz no funcionará.

### `ArduinoJson.h: No such file or directory`

Instala ArduinoJson desde el gestor de librerías de Arduino IDE y vuelve a compilar.

### `undefined reference to app_main`

Este error normalmente indica una instalación dañada o mezclada del núcleo ESP32, no un error del código. En Arduino IDE elimina y reinstala el paquete **esp32 by Espressif Systems** desde `Boards Manager`. Reinicia Arduino IDE, selecciona nuevamente `ESP32 Dev Module` y compila otra vez. No mezcles archivos de una instalación antigua de ESP-IDF con el paquete de Arduino.

## 6. Seguridad

El firmware transmite los nombres y metadatos de las redes visibles. Úsalo únicamente en redes propias o con autorización. Para una red no confiable, añade autenticación al endpoint Flask y HTTPS antes de enviar información de producción; esta versión usa HTTP local para facilitar las pruebas con ESP32.
