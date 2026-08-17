# Ejecutar Enterprise Dashboard en Visual Studio Code

Esta guía permite ejecutar el **frontend React**, el **servidor Express/tRPC**, la autenticación local, MySQL y los documentos en almacenamiento local desde un computador Windows con Visual Studio Code. El proyecto no necesita OAuth de Manus para iniciar sesión.

## 1. Requisitos previos

| Componente | Uso local | Comprobación |
|---|---|---|
| [Visual Studio Code](https://code.visualstudio.com/) | Editor y terminal integrada | `code --version` |
| [Git](https://git-scm.com/downloads) | Descargar y actualizar el repositorio | `git --version` |
| [Node.js 22 LTS](https://nodejs.org/) | Ejecutar React, Vite y Express | `node --version` |
| pnpm 10 | Instalar dependencias y ejecutar scripts | `pnpm --version` |
| [XAMPP](https://www.apachefriends.org/) con MySQL | Base de datos local | MySQL iniciado en el panel de XAMPP |
| [Python](https://www.python.org/downloads/) 3.11+ | Solo para el módulo WiFi/ESP32 con Flask | `python --version` |

> Mantén **MySQL** encendido en XAMPP antes de registrar o iniciar sesión. La primera cuenta creada en una base local vacía recibe el rol de administrador.

## 2. Descargar y abrir el proyecto

Abre PowerShell o la terminal integrada de Visual Studio Code y ejecuta:

```powershell
git clone https://github.com/camilobc21/enterprise-dashboard.git
cd enterprise-dashboard
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
code .
```

Si `corepack prepare` no está disponible en tu instalación, ejecuta `npm install -g pnpm@10.15.1` y continúa con `pnpm install`.

## 3. Configurar MySQL y variables locales

Inicia **MySQL** desde XAMPP. En phpMyAdmin crea una base de datos llamada `enterprise_dashboard`, o ejecuta:

```sql
CREATE DATABASE enterprise_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

En la terminal de Visual Studio Code, copia la plantilla y edítala:

```powershell
Copy-Item LOCAL_ENV_TEMPLATE.txt .env
code .env
```

Como mínimo configura `DATABASE_URL` y `JWT_SECRET`. Genera este último sin reutilizar contraseñas:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Pega el resultado como valor de `JWT_SECRET`. Si tu usuario MySQL tiene contraseña, adapta la URL de esta forma:

```env
DATABASE_URL=mysql://root:TU_CONTRASENA_CODIFICADA@127.0.0.1:3306/enterprise_dashboard
```

No subas el archivo `.env` a Git. La plantilla ya activa `LOCAL_STORAGE_DIR=./local-storage`, por lo que los documentos se guardarán y descargarán desde el propio computador sin requerir almacenamiento administrado.

## 4. Crear las tablas y arrancar el dashboard

En la terminal integrada de Visual Studio Code, ejecuta una sola vez para una base nueva:

```powershell
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Después inicia el servidor de desarrollo:

```powershell
pnpm dev
```

En PowerShell con la política de scripts restringida, ejecuta primero este comando **solo para la terminal actual** y luego inicia el proyecto:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
pnpm.cmd dev
```

La alternativa recomendada, que no requiere cambiar la política de PowerShell, es ejecutar el lanzador incluido después de `pnpm install`:

```powershell
.\run-dev.cmd
```

Como otra alternativa, selecciona el perfil de terminal **Command Prompt** en Visual Studio Code y ejecuta `pnpm dev`. Los scripts del proyecto usan `cross-env`, por lo que el valor de `NODE_ENV` funciona tanto en Windows como en macOS y Linux.

Abre [http://localhost:3000](http://localhost:3000). Crea la primera cuenta para ser administrador. Desde **Gestión de roles** puedes añadir la URL, el modelo y la clave de tu proveedor de IA compatible con OpenAI; la clave se cifra en la base de datos local.

### Acceso desde otro teléfono, tableta o computador de tu red

El servidor ahora escucha la red local y al iniciar muestra una línea como `LAN access available at http://192.168.1.50:3000/`. Asegúrate de que el otro dispositivo esté conectado a la **misma red Wi-Fi** y abre esa dirección exacta; no uses `localhost` en el segundo dispositivo.

Si Windows bloquea el acceso, abre PowerShell **como administrador** y ejecuta esta regla limitada a la red privada local:

```powershell
New-NetFirewallRule -DisplayName "Enterprise Dashboard LAN 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private -RemoteAddress LocalSubnet
```

Si el servidor indica que usa otro puerto, por ejemplo `3001`, abre la URL LAN con ese mismo puerto y ajusta la regla del firewall a ese número. No abras el puerto en perfiles públicos.

## 5. Activar análisis WiFi y ESP32

El repositorio incluye la integración del dashboard, pero el archivo de la API Flask/firmware de ESP32 debe mantenerse junto a tu proyecto de dispositivo. Para completar este módulo, inicia tu servicio Flask existente en el puerto `5000` y deja esta variable en `.env`:

```env
FLASK_API_URL=http://127.0.0.1:5000
```

La API debe exponer `GET /api/health`, `GET /api/dashboard` y recibir escaneos en `POST /api/esp_scan`; el contrato de datos está documentado en [FLASK_INTEGRATION.md](./FLASK_INTEGRATION.md). Para que el ESP32 pueda alcanzar Flask, configura en el firmware la **IP LAN de tu computador**, por ejemplo `http://192.168.1.50:5000/api/esp_scan`; `localhost` solo funciona desde el mismo computador.

## 6. Comprobaciones de funcionamiento

| Comprobación | Comando o acción esperada |
|---|---|
| Tipos | `pnpm check` termina sin errores |
| Pruebas | `pnpm test` termina correctamente |
| Compilación | `pnpm build` genera `dist/public/index.html` y `dist/index.js` |
| Aplicación | [http://localhost:3000](http://localhost:3000) muestra la pantalla de inicio |
| MySQL | El registro e inicio de sesión funcionan y aparece la primera cuenta administradora |
| Documentos | Al cargar un archivo aparece dentro de `local-storage/` |
| WiFi | `http://127.0.0.1:5000/api/health` responde cuando Flask está iniciado |

Para simular la compilación de producción en tu computador:

```powershell
pnpm build
pnpm start
```

## 7. Solución de problemas

| Síntoma | Acción recomendada |
|---|---|
| `DATABASE_URL is required` | Confirma que `.env` está en la raíz del repositorio y vuelve a iniciar `pnpm dev`. |
| PowerShell bloquea `pnpm.ps1` | Ejecuta `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` y usa `pnpm.cmd dev`, o abre una terminal Command Prompt. |
| Quiero iniciar sin cambiar la política de PowerShell | Después de `pnpm install`, ejecuta `.\run-dev.cmd`. |
| `NODE_ENV` no se reconoce | Actualiza el repositorio, ejecuta `pnpm install` y usa el script actualizado `pnpm dev`. |
| Error de conexión MySQL | Inicia MySQL en XAMPP, verifica el puerto `3306` y corrige usuario/contraseña en `DATABASE_URL`. |
| El login muestra `Failed query` y menciona `passwordHash` o `loginMethod` | Detén el servidor, realiza una exportación de respaldo desde phpMyAdmin y ejecuta `pnpm.cmd auth:repair`. Reinicia con `.\run-dev.cmd`. |
| Inicio sesión pero regreso a `/login` | Actualiza el repositorio, reinicia con `.\run-dev.cmd` y borra las cookies de `localhost` una vez. La versión actual usa una cookie `SameSite=Lax` compatible con HTTP local. |
| Otro dispositivo no puede abrir el dashboard | Conéctalo a la misma Wi-Fi, usa la línea `LAN access available at ...` del servidor y permite el puerto solo en el perfil privado de Windows. |
| No aparece el menú de administrador | Crea una base vacía y registra primero la cuenta administradora, o actualiza su rol desde MySQL. |
| El chat muestra proveedor no configurado | Como administrador, abre **Gestión de roles** y registra tu proveedor compatible con OpenAI. |
| WiFi sin datos | Inicia Flask, verifica `FLASK_API_URL` y usa la IP LAN del PC en el firmware ESP32. |
| Documentos no descargan | Confirma que `LOCAL_STORAGE_DIR` existe o usa el valor de ejemplo; el servidor la crea en la primera carga. |

## 8. Flujo diario en Visual Studio Code

Abre dos terminales integradas. En la primera mantén MySQL/XAMPP y, si aplica, Flask. En la segunda ejecuta `pnpm dev`. Al terminar, detén los procesos con `Ctrl+C`. Tus datos quedan en MySQL y los documentos en `local-storage/`.
