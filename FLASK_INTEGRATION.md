# Integración Flask + MySQL - Enterprise Dashboard

## 📋 Descripción

La dashboard React consulta el servicio Flask local (`app.py`). Cada escaneo recibido desde el ESP32 se guarda en la misma base de datos MySQL/XAMPP del proyecto, dentro de `wifi_scans`, `wifi_channels`, `wifi_alerts` y `wifi_predictions`.

## 🔗 Configuración

### 1. Variable de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
FLASK_API_URL=http://localhost:5000
DATABASE_URL=mysql://root:@127.0.0.1:3306/enterprise_dashboard
```

O si usas ngrok para desarrollo:

```env
FLASK_API_URL=https://your-ngrok-url.ngrok-free.dev
```

### 2. Cliente Flask

Se ha creado un cliente HTTP en `server/_core/flaskClient.ts` que maneja todas las llamadas a Flask:

```typescript
import {
  getDashboardData,
  getLastScan,
  getChannels,
  getAlerts,
  getPredictions,
  getHistory,
  getFutureAnomalies,
  getDetectedNetworks,
  hasData,
} from "../_core/flaskClient";
```

## 📊 Endpoints Utilizados

La dashboard llama a estos endpoints de tu Flask:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/dashboard` | GET | Obtiene todos los datos del dashboard |
| `/api/scan` | POST | Recibe escaneos del ESP32 y los guarda en MySQL |
| `/api/esp_scan` | POST | Alias compatible para recibir escaneos heredados |
| `/api/health` | GET | Comprueba Flask y la conexión con MySQL |

## 🔄 Flujo de Datos

```
ESP32 (esp32_wifi_dashboard.ino)
    ↓
    POST /api/scan
    ↓
Flask API (app.py)
    ↓
    MySQL Database
    ↓
    GET /api/dashboard
    ↓
Dashboard React
    ↓
Visualización en tiempo real
```

## 📱 Componentes Actualizados

### WiFiAnalysis.tsx
- Obtiene datos de canales desde Flask
- Muestra gráficos de saturación, interferencia y ocupación espectral
- Visualiza predicciones de IA
- Muestra alertas detectadas

### WiFiNetworks.tsx
- Lista todas las redes WiFi detectadas
- Filtra por SSID
- Muestra información de canales
- Indicadores de calidad de señal

### WiFiTrends.tsx
- Gráficos de tendencias históricas
- Análisis de patrones
- Predicciones futuras

## 🚀 Cómo Ejecutar

### Paso 1: Instalar dependencias e iniciar Flask

```cmd
cd enterprise-dashboard
pip install -r requirements.txt
python app.py
```

Deberías ver:
```
==================================================
FLASK LOCAL - ENTERPRISE DASHBOARD + MYSQL
URL: http://0.0.0.0:5000
==================================================
```

Antes de encender el ESP32, comprueba que la respuesta contiene `"db":"connected"`:

```cmd
curl http://127.0.0.1:5000/api/health
```

### Paso 2: Configurar Dashboard

En la dashboard, asegúrate de que `FLASK_API_URL` está configurado correctamente en `.env`.

### Paso 3: Ejecutar Dashboard

```bash
pnpm dev
```

### Paso 4: Enviar datos del ESP32

El ESP32 enviará datos automáticamente cada 30 segundos a:
```
POST http://IP_DEL_PC:5000/api/scan
```

Después de una respuesta `HTTP 201`, abre phpMyAdmin y revisa `wifi_scans`. Debe aparecer una fila nueva por cada escaneo recibido. Los trece canales calculados se guardan en `wifi_channels`; las alertas y la predicción se guardan, respectivamente, en `wifi_alerts` y `wifi_predictions`.

## 📡 Formato de Datos

### Entrada (ESP8266 → Flask)

```json
{
  "dispositivo": "ESP8266",
  "perdida_paquetes": 5.2,
  "redes": [
    {
      "ssid": "Mi Red WiFi",
      "rssi": -65,
      "canal": 6,
      "ancho_banda": 20,
      "encriptacion": "WPA2",
      "perdida_paquetes": 5.2
    }
  ]
}
```

### Salida (Flask → Dashboard)

```json
{
  "ok": true,
  "sin_datos": false,
  "ultimo_escaneo": {
    "id": 1,
    "dispositivo": "ESP8266",
    "total_redes": 12,
    "canal_optimo": 6,
    "saturacion_general": 45.5,
    "ocupacion_espectral": 62.3,
    "perdida_paquetes": 8.2,
    "tendencia_ia": 2,
    "timestamp": "2026-06-24T14:22:35"
  },
  "redes": [
    {
      "ssid": "Red1",
      "rssi": -65,
      "canal": 6,
      "ancho_banda": 20,
      "encriptacion": "WPA2"
    }
  ],
  "canales": [
    {
      "canal": 1,
      "cantidad_redes": 3,
      "saturacion": 23.1,
      "ocupacion_espectral": 45.2,
      "interferencia_adyacente": 10.5,
      "perdida_paquetes": 5.0,
      "riesgo_anomalia": 25.3,
      "anomalia": 0
    }
  ],
  "prediccion": {
    "canal_predicho": 6,
    "confianza": 0.85,
    "score_espectral": 92.5,
    "detalle": "Predicción IA con Random Forest + Análisis Espectral"
  },
  "alertas": [
    {
      "canal": 1,
      "tipo": "ANOMALIA_CANAL",
      "severidad": "MEDIA",
      "descripcion": "Canal 1 con comportamiento anómalo..."
    }
  ],
  "historico": [...],
  "anomalias_futuras": [...]
}
```

## 🔧 Troubleshooting

### Error: "No se puede conectar a la API Flask"

1. Verifica que Flask está ejecutándose: `http://127.0.0.1:5000/api/health`
2. La respuesta debe indicar `"db":"connected"`; si no, revisa `DATABASE_URL`, XAMPP/MySQL y `pip install -r requirements.txt`.
3. Verifica que `FLASK_API_URL` es correcto en `.env`.

### Error: "No hay datos disponibles"

1. Verifica que el ESP32 muestra `HTTP 201` en el monitor serial.
2. Revisa la consola donde ejecutaste `python app.py`; debe mostrar `Escaneo <id> guardado`.
3. En phpMyAdmin, abre `wifi_scans` y confirma que se incrementó el número de filas.
4. Si Flask muestra un error de conexión, confirma que XAMPP/MySQL está encendido y que `DATABASE_URL` apunta a la base correcta.

### Error: CORS

Si ves errores de CORS, asegúrate de que Flask tiene CORS habilitado:

```python
from flask_cors import CORS
CORS(app)
```

## 📝 Notas Importantes

1. **Estructura de Datos**: La dashboard espera que Flask devuelva datos en el formato especificado arriba. Si cambias la estructura en Flask, debes actualizar el cliente Flask.

2. **Autenticación**: Actualmente no hay autenticación entre la dashboard y Flask. Para producción, considera agregar tokens.

3. **Real-time**: Los datos se actualizan cada vez que el usuario recarga o navega. Para actualizaciones en tiempo real, considera agregar WebSockets.

4. **Caché**: Los datos se cachean en el cliente. Para forzar una actualización, usa `refetch()` en tRPC.

## 🎯 Próximos Pasos

1. ✅ Conectar ESP8266 a Flask
2. ✅ Verificar que Flask recibe datos
3. ✅ Verificar que dashboard obtiene datos de Flask
4. ⏭️ Configurar alertas en tiempo real
5. ⏭️ Agregar autenticación
6. ⏭️ Implementar WebSockets para actualizaciones en vivo

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de Flask
2. Verifica la conectividad: `curl http://localhost:5000/api/health`
3. Revisa la consola del navegador (F12)
4. Verifica que el ESP8266 está conectado a WiFi
