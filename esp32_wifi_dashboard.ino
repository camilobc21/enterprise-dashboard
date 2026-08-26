/*
 * Enterprise Dashboard - ESP32 WiFi Scanner
 *
 * Escanea las redes WiFi visibles y envía el resultado en JSON al API Flask
 * de tu computador por la red local.
 *
 * Librerías requeridas en Arduino IDE:
 *   - ESP32 by Espressif Systems
 *   - ArduinoJson 6.x o superior
 *
 * Antes de cargar el programa cambia WIFI_SSID, WIFI_PASSWORD, API_URL y ESP32_SCAN_TOKEN.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --------------------------- Configuración ---------------------------
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASENA";

// Usa la IP LAN del computador donde está ejecutándose Flask.
// Ejemplo: http://192.168.1.100:5000/api/scan
const char* API_URL = "http://192.168.1.100:5000/api/scan";

// Debe coincidir con ESP32_SCAN_TOKEN en el .env del computador que ejecuta Flask.
// Genera un valor aleatorio de al menos 16 caracteres y nunca lo publiques en Git.
const char* ESP32_SCAN_TOKEN = "REEMPLAZA_CON_TU_TOKEN_LOCAL_SECRETO";

const unsigned long SCAN_INTERVAL_MS = 30000UL;
const uint16_t MAX_NETWORKS_TO_SEND = 50;
const uint32_t HTTP_TIMEOUT_MS = 10000UL;

unsigned long lastScanAt = 0;

String encryptionName(wifi_auth_mode_t mode) {
  switch (mode) {
    case WIFI_AUTH_OPEN: return "abierta";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA-PSK";
    case WIFI_AUTH_WPA2_PSK: return "WPA2-PSK";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2-PSK";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2-Enterprise";
    case WIFI_AUTH_WPA3_PSK: return "WPA3-PSK";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2/WPA3-PSK";
    default: return "desconocida";
  }
}

String makeDeviceId() {
  uint64_t chipId = ESP.getEfuseMac();
  char id[17];
  snprintf(id, sizeof(id), "%04X%08X",
           static_cast<uint16_t>(chipId >> 32),
           static_cast<uint32_t>(chipId));
  return String("esp32-") + id;
}

bool connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.printf("Conectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000UL) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No se pudo conectar al WiFi.");
    return false;
  }

  Serial.print("WiFi conectado. IP del ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.print("Gateway: ");
  Serial.println(WiFi.gatewayIP());
  return true;
}

void sendScanToFlask() {
  if (!connectToWiFi()) {
    return;
  }

  Serial.println("Iniciando escaneo WiFi...");
  const int networkCount = WiFi.scanNetworks(false, true);
  if (networkCount < 0) {
    Serial.printf("El escaneo falló con código %d.\n", networkCount);
    WiFi.scanDelete();
    return;
  }

  const uint16_t count = min<uint16_t>(networkCount, MAX_NETWORKS_TO_SEND);
  Serial.printf("Redes encontradas: %d. Enviando: %u.\n", networkCount, count);

  // El tamaño permite enviar hasta 50 redes con sus metadatos.
  DynamicJsonDocument payload(32768);
  payload["device_id"] = makeDeviceId();
  payload["source"] = "esp32";
  payload["ip_address"] = WiFi.localIP().toString();
  payload["rssi_connected"] = WiFi.RSSI();
  payload["timestamp_ms"] = millis();
  payload["network_count"] = networkCount;

  JsonArray networks = payload.createNestedArray("networks");
  for (uint16_t i = 0; i < count; i++) {
    JsonObject network = networks.createNestedObject();
    network["ssid"] = WiFi.SSID(i);
    network["bssid"] = WiFi.BSSIDstr(i);
    network["rssi"] = WiFi.RSSI(i);
    network["channel"] = WiFi.channel(i);
    network["encryption"] = encryptionName(WiFi.encryptionType(i));
    network["hidden"] = WiFi.SSID(i).length() == 0;
  }

  String requestBody;
  serializeJson(payload, requestBody);

  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-ESP32-Device", makeDeviceId());
  http.addHeader("X-ESP32-Token", ESP32_SCAN_TOKEN);

  const int statusCode = http.POST(requestBody);
  if (statusCode > 0) {
    Serial.printf("Respuesta del API: HTTP %d\n", statusCode);
    Serial.println(http.getString());
  } else {
    Serial.printf("Error enviando al API: %s\n", http.errorToString(statusCode).c_str());
  }

  http.end();
  WiFi.scanDelete();
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Enterprise Dashboard - ESP32 WiFi Scanner ===");
  Serial.printf("ID del dispositivo: %s\n", makeDeviceId().c_str());
  connectToWiFi();
  sendScanToFlask();
  lastScanAt = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  if (millis() - lastScanAt >= SCAN_INTERVAL_MS) {
    sendScanToFlask();
    lastScanAt = millis();
  }

  delay(250);
}
