# Inventario de dispositivos conectados

La sección **Dispositivos conectados** almacena un inventario de equipos observados exclusivamente en redes cuya administración esté autorizada. No genera dispositivos de demostración ni realiza exploraciones automáticas desde el navegador.

## Uso actual

Un administrador puede abrir **Dispositivos conectados** y registrar un equipo con nombre, IPv4, MAC, fabricante, tipo, estado y nivel de confianza. Si el mismo administrador registra de nuevo la misma MAC, el sistema actualiza el registro y su última detección en lugar de crear un duplicado.

La vista protege parcialmente la privacidad al ocultar los bytes centrales de la MAC. Solo los administradores pueden registrar dispositivos o cambiar el estado de confianza; cualquier usuario autenticado puede consultar su propio inventario.

## Fuentes de datos compatibles

| Fuente autorizada | Datos esperados | Función en el sistema |
|---|---|---|
| Router con DHCP | IP, MAC, nombre de host y concesión | Fuente principal de equipos conectados. |
| Router con ARP | IP, MAC y última actividad | Complementa el estado en línea. |
| ESP32 | SSID, RSSI, canal y calidad radioeléctrica | Complemento WiFi; no sustituye el inventario DHCP/ARP. |
| Registro manual | Datos confirmados por el administrador | Punto de inicio mientras se integra el router. |

> Para una integración automática futura, el recolector debe ejecutarse dentro de la red autorizada y enviar únicamente observaciones verificadas a una API protegida. Nunca se debe utilizar para explorar redes ajenas.

## Próxima integración recomendada

Implementa un recolector local conectado a la API del router para leer DHCP/ARP con credenciales de administrador. El recolector podrá crear o actualizar los registros mediante una credencial de servicio separada, registrando la fuente como `router_dhcp` o `router_arp`.
