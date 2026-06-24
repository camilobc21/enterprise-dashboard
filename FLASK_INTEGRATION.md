# Integración Flask - Enterprise Dashboard

## 📋 Descripción

La dashboard React ha sido adaptada para funcionar directamente con tu API Flask (`app.py`). Todos los datos de WiFi se obtienen desde Flask en lugar de la base de datos local.

## 🔗 Configuración

### 1. Variable de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
FLASK_API_URL=http://localhost:5000
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
| `/api/esp_scan` | POST | Recibe escaneos del ESP8266 |

## 🔄 Flujo de Datos

```
ESP8266 (magnus.ino)
    ↓
    POST /api/esp_scan
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

### Paso 1: Iniciar Flask

```bash
cd /ruta/a/tu/app.py
python app.py
```

Deberías ver:
```
==================================================
SERVIDOR WIFI IA PRO v2 - CON ANÁLISIS ESPECTRAL
URL: http://0.0.0.0:5000
Dashboard: http://localhost:5000
==================================================
```

### Paso 2: Configurar Dashboard

En la dashboard, asegúrate de que `FLASK_API_URL` está configurado correctamente en `.env`.

### Paso 3: Ejecutar Dashboard

```bash
pnpm dev
```

### Paso 4: Enviar Datos del ESP8266

El ESP8266 enviará datos automáticamente cada 30 segundos a:
```
POST http://localhost:5000/api/esp_scan
```

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

1. Verifica que Flask está ejecutándose: `http://localhost:5000/api/health`
2. Verifica que `FLASK_API_URL` es correcto en `.env`
3. Si usas ngrok, verifica que la URL es correcta y está actualizada

### Error: "No hay datos disponibles"

1. Verifica que el ESP8266 está enviando datos
2. Revisa los logs de Flask: `tail -f app.log`
3. Prueba manualmente: `curl http://localhost:5000/api/dashboard`

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
