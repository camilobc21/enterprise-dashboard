# Línea base de datos reales y estándares

**Estado:** línea base técnica; no constituye certificación de ISO, IEEE, NIST, Wi-Fi Alliance ni OWASP.  
**Ámbito:** Enterprise Dashboard ejecutado localmente con ESP32, Flask, MySQL/XAMPP y React.

## Principio de integridad de datos

El dashboard debe diferenciar entre una **observación**, una **medición**, una **métrica calculada documentada** y un valor no disponible. Solo se persisten y visualizan como observaciones WiFi los campos que el firmware comunica en cada escaneo: SSID cuando se anuncia, BSSID, RSSI, canal, cifrado informado y marca de SSID oculto. El sistema no atribuye a un escaneo pasivo valores de ocupación espectral, interferencia adyacente, pérdida de paquetes, riesgo de anomalía, predicción IA, “salud” de canal o canal óptimo.

> Cuando no existe una fuente de medición trazable, el valor se guarda como `NULL` y se presenta como **N/D** o se oculta. Cero solo representa una observación explícita de cero, nunca un valor de relleno.

| Dominio | Referencia | Control aplicado | Evidencia verificable |
|---|---|---|---|
| WLAN | ISO/IEC/IEEE 8802-11 / IEEE 802.11 | Se tratan SSID, BSSID, RSSI y canal como observaciones de una WLAN, sin afirmar que el ESP32 mide propiedades PHY adicionales. | JSON enviado por el ESP32, filas `wifi_networks`, marca temporal UTC y pruebas Flask. |
| Seguridad WiFi | Wi-Fi CERTIFIED WPA3 | El campo de cifrado se etiqueta como lo que reporta el escaneo; no certifica ni verifica WPA2/WPA3. La interfaz recomienda evaluar WPA3/PMF en el punto de acceso, no inferirlo desde RSSI. | Valor `encriptacion` recibido y configuración real del AP. |
| Seguridad de aplicación | OWASP ASVS 5.0.0 | Validación de entrada, autenticación local, control de roles, secretos de IA cifrados, token local obligatorio para el ESP32 y manejo de errores sin exponer claves. | Pruebas automatizadas, configuración de entorno y revisión de rutas protegidas. |
| Privacidad de observaciones | IEEE 802.11 y NIST CSF 2.0 | Los BSSID se conservan en MySQL para trazabilidad administrativa, se ocultan a usuarios no administradores y no se incluyen en el contexto enviado a IA. | Filtro `networksVisibleTo`, pantalla WiFi condicionada por rol y prueba `wifiPrivacy.test.ts`. |
| Gestión de riesgo | NIST CSF 2.0 | Inventario autorizado de red, registro de eventos, privilegios de administrador para refrescar ARP y documentación de respuesta a fallas. | `network_devices`, registros de auditoría, variables de autorización y manual local. |
| Calidad de software | ISO/IEC 25010:2023 | Se evalúan adecuación funcional, fiabilidad, seguridad, mantenibilidad y compatibilidad mediante pruebas, tipos, estados vacíos y documentación. | `pnpm test`, `pnpm check`, pruebas Flask y este registro de trazabilidad. |

## Criterios de aceptación

| ID | Criterio | Resultado esperado |
|---|---|---|
| DATA-01 | No hay valores de demostración, predicciones ni ceros de relleno en APIs o UI WiFi. | Las búsquedas de `mock`, valores de reserva y fórmulas históricas no encuentran uso productivo; la UI usa `N/D` o estados vacíos. |
| DATA-02 | Todo registro WiFi visible procede de un escaneo persistido. | Cada red visible referencia `wifi_networks.scanId` y el escaneo correspondiente en `wifi_scans`. |
| DATA-03 | Una métrica no medida no se convierte en puntuación de calidad, alerta o recomendación. | Los campos no medidos permanecen en `NULL`; no se generan alertas/predicciones automáticas a partir de conteos. |
| SEC-01 | El servicio local valida la estructura y los límites de cada observación antes de persistirla. | El API rechaza entradas fuera de rango o incompletas con HTTP 400. |
| SEC-02 | El servicio no usa CORS abierto por defecto. | Los orígenes permitidos se configuran explícitamente mediante entorno. |
| SEC-03 | Solo un ESP32 autorizado puede publicar un escaneo. | Flask exige `X-ESP32-Token`; el valor se configura fuera del repositorio en el PC y en el firmware. |
| PRIV-01 | Los identificadores BSSID se minimizan por rol y finalidad. | Solo administración puede recibir BSSID por tRPC; el contexto de IA los omite. |
| QUAL-01 | Cada cambio crítico está cubierto por pruebas y por verificación de tipos. | `python tests/test_flask_api.py`, `pnpm test` y `pnpm check` pasan. |

## Límites declarados

Un escaneo pasivo del ESP32 descubre puntos de acceso que son visibles desde la ubicación del sensor. No equivale a un inventario de todos los clientes conectados al router ni reemplaza métricas de un analizador de espectro, controlador WiFi o sistema de gestión de red. La sección de dispositivos usa ARP únicamente en la subred privada autorizada y debe presentarse como una observación de caché, no como una lista exhaustiva.

## Referencias

[1]: https://standards.ieee.org/ieee/802.11/10548/ "IEEE 802.11 — WLAN MAC and PHY specifications"
[2]: https://www.wi-fi.org/news-events/newsroom/wi-fi-alliance-introduces-wi-fi-certified-wpa3-security "Wi-Fi Alliance — Wi-Fi CERTIFIED WPA3"
[3]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard 5.0.0"
[4]: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf "NIST Cybersecurity Framework 2.0"
[5]: https://www.iso.org/obp/ui/#iso:std:iso-iec:25010:en "ISO/IEC 25010:2023 — product quality model"
