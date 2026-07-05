# Render Deployment Guide

Esta guía te ayudará a desplegar el Enterprise Dashboard en Render.

## Paso 1: Crear una cuenta en Render

1. Ve a https://render.com
2. Click en "Sign up"
3. Usa tu email o GitHub para registrarte

## Paso 2: Conectar tu repositorio GitHub

1. En el dashboard de Render, click en "New +"
2. Selecciona "Web Service"
3. Click en "Connect account" para conectar GitHub
4. Autoriza a Render para acceder a tus repositorios
5. Selecciona `camilobc21/enterprise-dashboard`

## Paso 3: Configurar el servicio web

En la página de configuración del servicio:

| Campo | Valor |
|-------|-------|
| **Name** | enterprise-dashboard |
| **Environment** | Node |
| **Region** | Elige la más cercana a ti (ej: Ohio, Frankfurt) |
| **Branch** | main |
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `pnpm start` |
| **Plan** | Starter (gratuito con limitaciones) |

## Paso 4: Configurar variables de entorno

Haz click en "Environment" y añade las siguientes variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<tu_url_de_mysql_aqui>
JWT_SECRET=<genera_una_clave_aleatoria_aqui>
VITE_APP_ID=<tu_app_id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=<tu_open_id>
OWNER_NAME=<tu_nombre>
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=<tu_api_key>
VITE_FRONTEND_FORGE_API_KEY=<tu_frontend_api_key>
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_ANALYTICS_ENDPOINT=<tu_analytics_endpoint>
VITE_ANALYTICS_WEBSITE_ID=<tu_website_id>
```

## Paso 5: Desplegar

1. Haz click en "Create Web Service"
2. Render comenzará a construir tu aplicación
3. Puedes ver el progreso en la pestaña "Logs"
4. Una vez completado, tu aplicación estará disponible en `https://<nombre-del-servicio>.onrender.com`

## Paso 6: Conectar la base de datos (Opcional)

Si quieres usar una base de datos PostgreSQL en Render:

1. En el dashboard, click en "New +"
2. Selecciona "PostgreSQL"
3. Configura el nombre y la región
4. Copia la connection string
5. Actualiza `DATABASE_URL` en tu servicio web con esta connection string

**IMPORTANTE:** Actualmente estás usando MySQL con XAMPP en tu máquina local. Para producción en Render, necesitarás:
- Migrar a PostgreSQL (Render lo proporciona)
- O usar un servicio MySQL externo como AWS RDS o PlanetScale

## Paso 7: Actualizar la URL de la API de Flask

En tu código, actualiza la URL de la API de Flask para que apunte a tu servidor público:

```javascript
// En lugar de usar 152.202.241.28, usa tu URL pública
const FLASK_API_URL = 'https://tu-servidor-flask.com/api';
```

## Troubleshooting

### Error: "Build failed"
- Revisa los logs en Render
- Asegúrate de que todas las variables de entorno están configuradas
- Verifica que `pnpm` está instalado correctamente

### Error: "Port already in use"
- Render asigna automáticamente el puerto, no necesitas configurarlo

### Error: "Cannot connect to database"
- Verifica que la connection string de DATABASE_URL es correcta
- Asegúrate de que la base de datos es accesible desde Render

## Notas importantes

- Render proporciona un dominio gratuito: `<nombre>.onrender.com`
- Los servicios gratuitos se duermen después de 15 minutos de inactividad
- Para un servicio siempre activo, necesitas un plan pagado
- Render reinicia automáticamente los servicios cada hora

## Próximos pasos

1. Despliega el proyecto en Render
2. Verifica que funciona correctamente
3. Actualiza tu Flask API para que use la URL pública de Render
4. Configura un dominio personalizado si lo deseas
