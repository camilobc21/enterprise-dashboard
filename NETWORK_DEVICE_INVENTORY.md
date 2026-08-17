# Inventario de dispositivos conectados

La sección **Dispositivos conectados** muestra equipos observados exclusivamente en redes cuya administración esté autorizada. No genera dispositivos de demostración ni realiza exploraciones desde el navegador; el servidor local puede poblar su propia caché ARP mediante intentos ICMP limitados al segmento privado autorizado.

## Uso actual

Un administrador puede abrir **Dispositivos conectados** y pulsar **Actualizar dispositivos**. El servidor local puede realizar intentos ICMP limitados a su segmento privado `/24`, lee después la caché ARP del computador donde se ejecuta el dashboard, conserva IP, MAC, estado y última detección, y actualiza la misma MAC sin crear duplicados.

La vista protege parcialmente la privacidad al ocultar los bytes centrales de la MAC. Solo los administradores pueden registrar dispositivos o cambiar el estado de confianza; cualquier usuario autenticado puede consultar su propio inventario.

## Fuentes de datos compatibles

| Fuente autorizada | Datos esperados | Función en el sistema |
|---|---|---|
| Router con DHCP | IP, MAC, nombre de host y concesión | Fuente principal de equipos conectados. |
| Router con ARP | IP, MAC y última actividad | Complementa el estado en línea. |
| ESP32 | SSID, RSSI, canal y calidad radioeléctrica | Complemento WiFi; no sustituye el inventario DHCP/ARP. |
| Caché ARP local | IP y MAC que el computador ya conoce | Detección actual pasiva desde el dashboard local. |

> Para una integración automática futura, el recolector debe ejecutarse dentro de la red autorizada y enviar únicamente observaciones verificadas a una API protegida. Nunca se debe utilizar para explorar redes ajenas.

## Próxima integración recomendada

Implementa un recolector local conectado a la API del router para leer DHCP/ARP con credenciales de administrador. El recolector podrá crear o actualizar los registros mediante una credencial de servicio separada, registrando la fuente como `router_dhcp` o `router_arp`.
