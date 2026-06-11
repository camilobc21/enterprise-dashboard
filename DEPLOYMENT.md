# Enterprise Dashboard - Guía de Despliegue

## Descripción General

Enterprise Dashboard es un sistema completo de gestión empresarial con autenticación segura, análisis en tiempo real, integración con IA y múltiples funcionalidades avanzadas.

## Características Principales

- **Autenticación Segura**: JWT + OAuth2
- **Dashboard Profesional**: Gráficos interactivos con Recharts
- **Panel Administrativo**: Gestión de usuarios y roles
- **Gestor CRUD**: Creación, lectura, actualización y eliminación de registros
- **Chat con IA**: Integración con Claude API
- **Gestor de Documentos**: Subida y almacenamiento seguro de archivos
- **Sistema de Notificaciones**: Alertas en tiempo real
- **Auditoría Completa**: Registro detallado de acciones
- **Exportación de Reportes**: PDF y Excel
- **WebSockets**: Sincronización en tiempo real

## Requisitos Previos

- Docker y Docker Compose
- Node.js 22+ (para desarrollo local)
- MySQL 8.0+ (si no usas Docker)
- Git

## Instalación con Docker

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd enterprise-dashboard
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
DATABASE_URL=mysql://dashboard:dashboard@db:3306/enterprise_dashboard
JWT_SECRET=tu-clave-secreta-muy-segura
VITE_APP_ID=tu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
```

### 3. Construir e iniciar los contenedores

```bash
docker-compose up -d
```

### 4. Ejecutar migraciones de base de datos

```bash
docker-compose exec app pnpm db:push
```

### 5. Acceder a la aplicación

- **Aplicación**: http://localhost:3000
- **Base de Datos**: localhost:3306

## Instalación Local (Desarrollo)

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar base de datos

Asegúrate de tener MySQL corriendo y crea la base de datos:

```sql
CREATE DATABASE enterprise_dashboard;
CREATE USER 'dashboard'@'localhost' IDENTIFIED BY 'dashboard';
GRANT ALL PRIVILEGES ON enterprise_dashboard.* TO 'dashboard'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

### 4. Ejecutar migraciones

```bash
pnpm db:push
```

### 5. Iniciar servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en http://localhost:3000

## Estructura del Proyecto

```
enterprise-dashboard/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas principales
│   │   ├── components/    # Componentes reutilizables
│   │   ├── lib/           # Utilidades
│   │   └── App.tsx        # Enrutador principal
│   └── index.html
├── server/                # Backend Express + tRPC
│   ├── routers/           # Procedimientos tRPC
│   ├── db.ts              # Funciones de base de datos
│   ├── routers.ts         # Enrutador principal
│   └── _core/             # Configuración interna
├── drizzle/               # Esquema y migraciones
├── shared/                # Código compartido
├── Dockerfile             # Imagen Docker
├── docker-compose.yml     # Configuración Docker Compose
└── nginx.conf             # Configuración Nginx

```

## Páginas Disponibles

### Autenticado

- `/dashboard` - Panel principal con métricas
- `/admin` - Panel administrativo (solo admin)
- `/crud` - Gestor de registros
- `/ai` - Chat con IA
- `/documents` - Gestor de documentos
- `/notifications` - Centro de notificaciones

### Público

- `/` - Landing page

## API Endpoints

Todos los endpoints están bajo `/api/trpc/` y utilizan tRPC.

### Dashboard
- `dashboard.getMetrics` - Obtener métricas
- `dashboard.createMetric` - Crear métrica
- `dashboard.updateMetric` - Actualizar métrica

### Usuarios
- `users.getAll` - Listar usuarios (admin)
- `users.getUser` - Obtener usuario
- `users.getCurrentUser` - Usuario actual
- `users.updateRole` - Cambiar rol (admin)

### Notificaciones
- `notifications.getNotifications` - Listar notificaciones
- `notifications.getUnread` - No leídas
- `notifications.markAsRead` - Marcar como leída
- `notifications.create` - Crear notificación

### Documentos
- `documents.getDocuments` - Listar documentos
- `documents.getDocument` - Obtener documento
- `documents.upload` - Subir archivo
- `documents.delete` - Eliminar documento

### IA
- `ai.getConversations` - Listar conversaciones
- `ai.getConversation` - Obtener conversación
- `ai.getMessages` - Obtener mensajes
- `ai.createConversation` - Crear conversación
- `ai.sendMessage` - Enviar mensaje

### CRUD
- `crud.getRecords` - Listar registros
- `crud.getRecord` - Obtener registro
- `crud.create` - Crear registro
- `crud.update` - Actualizar registro
- `crud.delete` - Eliminar registro

### Auditoría
- `audit.getLogs` - Listar logs (admin)
- `audit.getUserLogs` - Logs de usuario
- `audit.logAction` - Registrar acción

## Configuración de Producción

### 1. Certificados SSL

Coloca tus certificados en:
- `/etc/nginx/certs/cert.pem`
- `/etc/nginx/certs/key.pem`

O genera auto-firmados:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### 2. Variables de entorno críticas

```env
NODE_ENV=production
JWT_SECRET=<cambiar-a-valor-seguro>
DATABASE_URL=<url-produccion>
VITE_APP_ID=<tu-app-id>
```

### 3. Iniciar en producción

```bash
docker-compose -f docker-compose.yml up -d
```

## Monitoreo y Logs

### Ver logs de la aplicación

```bash
docker-compose logs -f app
```

### Ver logs de la base de datos

```bash
docker-compose logs -f db
```

### Ver logs de Nginx

```bash
docker-compose logs -f nginx
```

## Backup y Restauración

### Backup de base de datos

```bash
docker-compose exec db mysqldump -u dashboard -pdashboard enterprise_dashboard > backup.sql
```

### Restaurar base de datos

```bash
docker-compose exec -T db mysql -u dashboard -pdashboard enterprise_dashboard < backup.sql
```

## Solución de Problemas

### La aplicación no inicia

1. Verifica que los puertos 3000, 3306 no estén en uso
2. Revisa los logs: `docker-compose logs app`
3. Asegúrate de que la base de datos está corriendo: `docker-compose logs db`

### Errores de base de datos

1. Verifica la conexión: `docker-compose exec db mysql -u dashboard -pdashboard`
2. Ejecuta migraciones: `docker-compose exec app pnpm db:push`
3. Reinicia el contenedor: `docker-compose restart db`

### WebSocket no funciona

1. Verifica que Nginx está corriendo
2. Revisa la configuración de proxy en nginx.conf
3. Asegúrate de que el puerto 443 está abierto

## Desarrollo

### Agregar nuevas migraciones

1. Edita `drizzle/schema.ts`
2. Ejecuta: `pnpm drizzle-kit generate`
3. Revisa el SQL generado
4. Aplica: `pnpm db:push`

### Agregar nuevos procedimientos tRPC

1. Crea archivo en `server/routers/`
2. Exporta router
3. Importa en `server/routers.ts`
4. Usa en frontend: `trpc.feature.useQuery()`

### Ejecutar pruebas

```bash
pnpm test
```

## Soporte

Para reportar problemas o solicitar características, abre un issue en el repositorio.

## Licencia

MIT
