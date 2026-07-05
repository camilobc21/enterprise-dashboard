# Solución: Error de OAuth Redirect URI

## Problema

Cuando intentas loguearte con otra cuenta, ves el error:

```
[internal] authorization failed: invalid redirect_uri: redirect_uri domain 
'3000-ii01ymzpedyeujnnq46ra-80160a4a.us1.manus.computer' not allowed for this project
```

O ves errores de "blocked" y "failed" en las peticiones GET/POST en la consola del navegador.

## Causa

Tu aplicación Manus (`bbVRvWNukTPPfhTnBgtzvm`) no tiene configurados los dominios permitidos para OAuth. El servidor OAuth rechaza peticiones desde dominios que no están en la lista de "Redirect URIs" permitidos.

## Solución

### Opción 1: Usar el Dominio Publicado (Recomendado)

El dominio publicado de tu aplicación es: `https://enterprisedash-bbvrvwnu.manus.space`

Este dominio debería estar automáticamente autorizado en tu aplicación Manus.

**Pasos:**

1. Accede a tu aplicación en: `https://enterprisedash-bbvrvwnu.manus.space`
2. Intenta loguearte con otra cuenta
3. Si funciona, el problema está resuelto

**Si sigue sin funcionar:**

Contacta a soporte de Manus en https://help.manus.im y menciona:
- Tu Application ID: `bbVRvWNukTPPfhTnBgtzvm`
- El dominio que no funciona: `enterprisedash-bbvrvwnu.manus.space`

### Opción 2: Usar el Dominio de Desarrollo (Para desarrollo local)

Si quieres loguearte con otra cuenta durante el desarrollo, necesitas añadir el dominio de desarrollo a la lista de Redirect URIs permitidos.

**El dominio de desarrollo es:**
```
https://3000-ii01ymzpedyeujnnq46ra-80160a4a.us1.manus.computer
```

**Pasos para configurarlo:**

1. Ve a tu proyecto en Manus
2. Click en **Settings** (⚙️)
3. Busca la sección **OAuth** o **Redirect URIs** (puede estar bajo "Integrations" o "General")
4. Añade este dominio a la lista de Redirect URIs permitidos:
   - `https://3000-ii01ymzpedyeujnnq46ra-80160a4a.us1.manus.computer`
   - `https://3000-ii01ymzpedyeujnnq46ra-80160a4a.us1.manus.computer/api/oauth/callback`

5. Guarda los cambios
6. Intenta loguearte nuevamente

### Opción 3: Contactar a Soporte

Si no encuentras la opción de configurar Redirect URIs en el panel de Manus:

1. Ve a https://help.manus.im
2. Abre un ticket de soporte
3. Menciona:
   - Tu Application ID: `bbVRvWNukTPPfhTnBgtzvm`
   - Los dominios que necesitas autorizar:
     - `https://3000-ii01ymzpedyeujnnq46ra-80160a4a.us1.manus.computer`
     - `https://enterprisedash-bbvrvwnu.manus.space`

## Cómo funciona OAuth en tu aplicación

1. Haces click en "Login"
2. Tu navegador te redirige a: `https://manus.im/app-auth?appId=bbVRvWNukTPPfhTnBgtzvm&redirectUri=...`
3. Ingresas tus credenciales
4. Manus te redirige de vuelta a tu aplicación con un código de autorización
5. Tu servidor Express intercambia el código por un token
6. Tu sesión se crea y puedes acceder a tu cuenta

**El paso 4 es donde falla:** Manus rechaza redirigirte porque tu dominio no está en la lista de Redirect URIs permitidos.

## Verificación

Para verificar que está funcionando:

1. Abre la consola del navegador (F12)
2. Ve a **Network**
3. Intenta loguearte
4. Busca peticiones a `api.manus.im` o `manus.im`
5. Si ves status 200 (verde), está funcionando
6. Si ves status 403 o 401 (rojo), hay un problema de autorización

## Próximos pasos

Una vez que logres loguearte con otra cuenta:

1. Verifica que cada cuenta tiene acceso a sus propios datos
2. Prueba las diferentes funcionalidades del dashboard
3. Configura roles de usuario si es necesario (admin, usuario regular, etc.)

## Preguntas frecuentes

**P: ¿Por qué funciona con la primera cuenta pero no con otras?**
R: Probablemente la primera cuenta es la que creó el proyecto. Las otras cuentas necesitan que se configure correctamente el OAuth redirect URI.

**P: ¿Qué es un Redirect URI?**
R: Es la URL a la que el servidor OAuth te redirige después de que ingreses tus credenciales. Debe estar en la lista de dominios permitidos por seguridad.

**P: ¿Puedo usar cualquier dominio?**
R: No, solo los dominios que estén en la lista de Redirect URIs permitidos de tu aplicación. Esto es por seguridad, para evitar que aplicaciones maliciosas intercepten tus credenciales.

**P: ¿Cómo cambio el dominio después?**
R: Contacta a soporte de Manus o busca la opción de configurar Redirect URIs en el panel de tu aplicación.
