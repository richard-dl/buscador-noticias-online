# Ruta de Migración a Nuevo Dominio

Este documento detalla todos los pasos necesarios para migrar el proyecto **Buscador de Noticias Online** desde el subdominio actual `buscador.tuplay.top` a un nuevo dominio raíz.

---

## Resumen del Proyecto Actual

### Arquitectura de Servicios

| Servicio | Proveedor | URL Actual | Función |
|----------|-----------|------------|---------|
| **Frontend** | Hostinger | `https://buscador.tuplay.top` | SPA React/Vite |
| **Backend API** | Vercel | `https://buscador-noticias-online.vercel.app/api` | Node.js/Express |
| **Base de Datos** | Firebase Firestore | `buscador-noticias-efc60` | NoSQL Database |
| **Autenticación** | Firebase Auth | `buscador-noticias-efc60.firebaseapp.com` | OAuth + Email/Pass |
| **Cloud Functions** | Firebase | `us-central1-buscador-noticias-efc60.cloudfunctions.net` | Funciones serverless |
| **Bot VIP** | Telegram | Webhook hacia Vercel | Contenido VIP |
| **Pagos** | PayPal | API Live | Suscripciones |

---

## Variables a Definir

Antes de comenzar la migración, define estos valores:

```
NUEVO_DOMINIO = ejemplo.com              # Tu nuevo dominio raíz
NUEVO_SUBDOMINIO_API = api.ejemplo.com   # (Opcional) Subdominio para API
```

---

## FASE 1: Preparación (Pre-migración)

### 1.1 Registrar y Configurar el Nuevo Dominio

**En tu registrador de dominios (Hostinger, GoDaddy, Namecheap, etc.):**

1. Registrar el nuevo dominio `ejemplo.com`
2. Verificar que los DNS estén activos
3. Documentar los nameservers del dominio

### 1.2 Crear Backup Completo

```powershell
# Backup del código
cd "c:\Proyectos\buscador-noticias-online"
rm -f backup-migracion.zip
tar -cf - --exclude='node_modules' --exclude='dist' --exclude='.git' . | gzip > backup-migracion.zip

# Exportar datos de Firestore (desde Firebase Console)
# Console > Firestore > Exportar > Cloud Storage
```

### 1.3 Preparar Certificado SSL

El nuevo dominio necesitará SSL. Opciones:
- **Hostinger**: SSL gratuito incluido (Let's Encrypt)
- **Cloudflare**: SSL gratuito con CDN
- **Let's Encrypt**: Certificado gratuito manual

---

## FASE 2: Configuración de Firebase

### 2.1 Firebase Authentication - Dominios Autorizados

**Consola Firebase:** https://console.firebase.google.com/project/buscador-noticias-efc60

1. Ir a **Authentication** → **Settings** → **Authorized domains**
2. Click en **Add domain**
3. Agregar:
   - `ejemplo.com`
   - `www.ejemplo.com`
   - `api.ejemplo.com` (si usas subdominio para API)

**Dominios actuales autorizados:**
```
localhost
buscador-noticias-efc60.firebaseapp.com
buscador-noticias-efc60.web.app
buscador.tuplay.top  ← Mantener hasta completar migración
```

### 2.2 Firebase - OAuth Redirect URIs (Google Sign-In)

**Consola Google Cloud:** https://console.cloud.google.com/apis/credentials

1. Ir a **APIs & Services** → **Credentials**
2. Buscar el OAuth 2.0 Client ID del proyecto Firebase
3. En **Authorized JavaScript origins**, agregar:
   - `https://ejemplo.com`
   - `https://www.ejemplo.com`
4. En **Authorized redirect URIs**, agregar:
   - `https://ejemplo.com/__/auth/handler`
   - `https://buscador-noticias-efc60.firebaseapp.com/__/auth/handler`

### 2.3 Firebase Hosting (Opcional)

Si deseas usar Firebase Hosting en lugar de Hostinger:

1. En `firebase.json`, agregar:
```json
{
  "hosting": {
    "site": "tu-nuevo-sitio",
    "public": "frontend/dist",
    ...
  }
}
```

2. Conectar dominio personalizado:
   - **Firebase Console** → **Hosting** → **Add custom domain**
   - Agregar `ejemplo.com`
   - Seguir instrucciones de verificación DNS

---

## FASE 3: Configuración de Vercel (Backend)

### 3.1 Agregar Dominio Personalizado al Backend

**Dashboard Vercel:** https://vercel.com/dashboard

1. Ir al proyecto `buscador-noticias-online`
2. **Settings** → **Domains**
3. Agregar: `api.ejemplo.com`
4. Copiar los registros DNS proporcionados:

```dns
# Opción A: CNAME (Recomendado)
api.ejemplo.com  CNAME  cname.vercel-dns.com

# Opción B: A Records
api.ejemplo.com  A  76.76.21.21
```

### 3.2 Actualizar Variables de Entorno en Vercel

**Dashboard Vercel** → **Settings** → **Environment Variables**

| Variable | Valor Anterior | Nuevo Valor |
|----------|----------------|-------------|
| `FRONTEND_URL_PROD` | `https://buscador.tuplay.top` | `https://ejemplo.com` |
| `NODE_ENV` | `production` | `production` |

**Redesplegar** después de cambiar las variables:
- **Deployments** → **...** → **Redeploy**

### 3.3 Actualizar CORS en Backend

**Archivo:** `backend/server.js` (líneas 27-32)

```javascript
// ANTES
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD  // https://buscador.tuplay.top
].filter(Boolean);

// DESPUÉS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,  // https://ejemplo.com
  'https://ejemplo.com',          // Agregar explícitamente
  'https://www.ejemplo.com'       // Con www
].filter(Boolean);
```

---

## FASE 4: Configuración de Hostinger (Frontend)

### 4.1 Opción A: Nuevo Dominio en la Misma Cuenta Hostinger

1. **hPanel** → **Dominios** → **Agregar dominio**
2. Agregar `ejemplo.com`
3. Configurar DNS si el dominio está en otro registrador:
   ```dns
   @ A 82.197.80.2
   www CNAME ejemplo.com
   ```
4. Esperar propagación DNS (hasta 48 horas)
5. Activar SSL: **hPanel** → **SSL** → **Instalar**

### 4.2 Opción B: Cambiar Dominio Principal

1. **hPanel** → **Cuenta** → **Cambiar dominio principal**
2. Seleccionar `ejemplo.com`
3. Confirmar cambio

### 4.3 Configurar Redirección del Dominio Antiguo

**Archivo:** `public_html/.htaccess` (en buscador.tuplay.top)

```apache
# Redirección 301 permanente al nuevo dominio
RewriteEngine On
RewriteCond %{HTTP_HOST} ^buscador\.tuplay\.top$ [NC]
RewriteRule ^(.*)$ https://ejemplo.com/$1 [R=301,L]
```

---

## FASE 5: Actualizar Código del Proyecto

### 5.1 Frontend - Variables de Entorno

**Archivo:** `frontend/.env.production`

```env
# ANTES
VITE_API_URL=https://buscador-noticias-online.vercel.app/api

# DESPUÉS
VITE_API_URL=https://api.ejemplo.com/api
# O si usas el dominio Vercel original:
# VITE_API_URL=https://buscador-noticias-online.vercel.app/api
```

**Archivo:** `frontend/.env` (desarrollo)
```env
# Sin cambios - sigue apuntando a localhost
VITE_API_URL=http://localhost:3001/api
```

### 5.2 Frontend - Firebase Config (Sin cambios necesarios)

**Archivo:** `frontend/src/services/firebase.js`

El `authDomain` de Firebase puede seguir siendo el predeterminado:
```javascript
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
// Valor: buscador-noticias-efc60.firebaseapp.com
```

**Nota:** No es necesario cambiar esto. Firebase Auth redirige correctamente.

### 5.3 Frontend - Componentes con URLs Hardcodeadas

**Archivo:** `frontend/src/components/TVPlayer.jsx` (línea 6)

```javascript
// ANTES
const API_URL = import.meta.env.VITE_API_URL || 'https://buscador-noticias-online.vercel.app/api';

// DESPUÉS
const API_URL = import.meta.env.VITE_API_URL || 'https://api.ejemplo.com/api';
```

**Archivo:** `frontend/src/pages/Expired.jsx` (línea 39)

```javascript
// ANTES
href="mailto:soporte@tuplay.top?subject=Renovación de suscripción - Buscador de Noticias"

// DESPUÉS
href="mailto:soporte@ejemplo.com?subject=Renovación de suscripción - Buscador de Noticias"
```

### 5.4 Backend - Variables de Entorno

**Archivo:** `backend/.env`

```env
# ANTES
FRONTEND_URL_PROD=https://buscador.tuplay.top

# DESPUÉS
FRONTEND_URL_PROD=https://ejemplo.com
```

**Archivo:** `backend/.env.example` (actualizar para documentación)

```env
FRONTEND_URL_PROD=https://ejemplo.com
```

### 5.5 Cloud Functions

**Archivo:** `functions/index.js` (líneas 17-23)

```javascript
// ANTES
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://buscador.tuplay.top'
  ],
  credentials: true
}));

// DESPUÉS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ejemplo.com',
    'https://www.ejemplo.com'
  ],
  credentials: true
}));
```

---

## FASE 6: Configuración de Servicios Externos

### 6.1 PayPal - Return URLs

**Dashboard PayPal Developer:** https://developer.paypal.com/dashboard

No requiere cambios inmediatos ya que los pagos se procesan vía API.

Sin embargo, si tienes configurado webhooks o return URLs:

1. **Webhooks** → Actualizar URL de notificación:
   - De: `https://buscador-noticias-online.vercel.app/api/paypal/webhook`
   - A: `https://api.ejemplo.com/api/paypal/webhook`

### 6.2 Telegram Bot - Webhook

El webhook de Telegram debe actualizarse si la URL del backend cambia:

```bash
# Configurar nuevo webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://api.ejemplo.com/api/vip/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"

# Variables actuales (en backend/.env):
# TELEGRAM_BOT_TOKEN=8355309730:AAG6kilaqWxbs6U7uDcwMFxMbtr6LO_khPc
# TELEGRAM_WEBHOOK_SECRET=d722952c36cd1da822a59a42a0a989046858280edf7925e826e6caeea3b20f2b
```

**Verificar webhook actual:**
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### 6.3 Google Gemini API (Sin cambios)

La API de Gemini no requiere configuración de dominio.

### 6.4 Anthropic Claude API (Sin cambios)

La API de Claude no requiere configuración de dominio.

### 6.5 Currents API (Sin cambios)

La API de Currents no requiere configuración de dominio.

---

## FASE 7: Actualizar Documentación

### 7.1 README.md

Actualizar todas las referencias:
- `https://buscador.tuplay.top` → `https://ejemplo.com`
- `https://api.buscador.tuplay.top` → `https://api.ejemplo.com`

### 7.2 DEPLOY.md

Actualizar secciones:
- URLs de producción
- Credenciales de hosting
- Ejemplos de configuración

### 7.3 CLAUDE-INSTRUCCIONES.md

Actualizar URLs de referencia si las hay.

---

## FASE 8: Despliegue

### 8.1 Build del Frontend

```powershell
cd "c:\Proyectos\buscador-noticias-online\frontend"
npm run build
```

### 8.2 Subir Frontend a Hostinger

**Opción A: FileZilla/SFTP**
```
Host: sftp://82.197.80.2
Puerto: 65002
Usuario: u903977987
Contraseña: szRkBKBw3GPwt&3
Directorio: /public_html/
```

Subir todo el contenido de `frontend/dist/`

**Opción B: PowerShell con WinSCP** (si tienes el script)
```powershell
.\deploy-frontend.ps1
```

### 8.3 Desplegar Backend en Vercel

```bash
cd backend
git add .
git commit -m "Migrate to new domain ejemplo.com"
git push origin develop
```

Vercel desplegará automáticamente.

### 8.4 Desplegar Cloud Functions (Opcional)

Si usas Firebase Cloud Functions:

```bash
firebase deploy --only functions
```

---

## FASE 9: Verificación Post-migración

### 9.1 Checklist de Verificación

| Verificación | URL | Estado |
|--------------|-----|--------|
| Frontend carga | `https://ejemplo.com` | [ ] |
| SSL activo | `https://ejemplo.com` (candado verde) | [ ] |
| API Health Check | `https://api.ejemplo.com/api/health` | [ ] |
| Login Email/Password | Formulario de login | [ ] |
| Login Google | Botón "Iniciar con Google" | [ ] |
| Búsqueda de noticias | Página Generator | [ ] |
| TV Streaming | Página TVStreaming | [ ] |
| Zona VIP | Página ZonaVip | [ ] |
| PayPal checkout | Página Subscription | [ ] |
| Redirección 301 | `https://buscador.tuplay.top` → `https://ejemplo.com` | [ ] |
| Telegram webhook | Enviar mensaje al grupo VIP | [ ] |

### 9.2 Pruebas de Funcionalidad

```bash
# 1. Health check del backend
curl https://api.ejemplo.com/api/health

# 2. Verificar CORS (debe retornar Access-Control headers)
curl -I -X OPTIONS https://api.ejemplo.com/api/health \
  -H "Origin: https://ejemplo.com" \
  -H "Access-Control-Request-Method: GET"

# 3. Verificar webhook Telegram
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### 9.3 Monitoreo Inicial (Primera Semana)

- Revisar logs de Vercel diariamente
- Verificar errores CORS en consola del navegador
- Monitorear pagos PayPal
- Verificar que contenido VIP siga llegando desde Telegram

---

## FASE 10: Limpieza Post-migración

### 10.1 Mantener Redirecciones (3-6 meses)

Mantener la redirección 301 desde el dominio antiguo durante al menos 3-6 meses para:
- SEO: transferir autoridad al nuevo dominio
- Usuarios: no perder usuarios con bookmarks
- Enlaces externos: permitir que actualicen sus referencias

### 10.2 Remover Dominio Antiguo de Firebase

**Después de 3 meses**, remover de Firebase Auth:
1. **Authentication** → **Settings** → **Authorized domains**
2. Remover `buscador.tuplay.top`

### 10.3 Actualizar Referencias Finales

Buscar y reemplazar todas las referencias restantes:

```powershell
# Buscar referencias al dominio antiguo
cd "c:\Proyectos\buscador-noticias-online"
grep -r "tuplay.top" --include="*.js" --include="*.jsx" --include="*.json" --include="*.md" --include="*.env*"
```

---

## Resumen de Archivos a Modificar

### Cambios Obligatorios

| Archivo | Cambio Requerido |
|---------|------------------|
| `backend/.env` | `FRONTEND_URL_PROD` |
| `backend/server.js` | Agregar nuevos orígenes CORS |
| `frontend/.env.production` | `VITE_API_URL` |
| `frontend/src/components/TVPlayer.jsx` | URL fallback API |
| `frontend/src/pages/Expired.jsx` | Email de soporte |
| `functions/index.js` | Orígenes CORS |

### Configuración en Consolas

| Servicio | Configuración |
|----------|---------------|
| Firebase Auth | Agregar dominios autorizados |
| Google Cloud | Actualizar OAuth redirect URIs |
| Vercel | Agregar dominio personalizado + variables |
| Hostinger | Configurar nuevo dominio + SSL |
| Telegram | Actualizar webhook URL |
| PayPal | Actualizar webhook URL (si aplica) |

### Documentación

| Archivo | Actualizar URLs |
|---------|-----------------|
| `README.md` | URLs de producción |
| `DEPLOY.md` | Credenciales y URLs |
| `backend/.env.example` | URLs de ejemplo |
| `frontend/.env.example` | URLs de ejemplo |

---

## Registro DNS Completo (Ejemplo)

Para el nuevo dominio `ejemplo.com`:

```dns
# Frontend (Hostinger)
@       A       82.197.80.2
www     CNAME   ejemplo.com

# Backend API (Vercel)
api     CNAME   cname.vercel-dns.com

# Email (si aplica)
@       MX      10 mail.ejemplo.com
```

---

## Timeline Sugerido

| Día | Actividad |
|-----|-----------|
| **1** | Registrar dominio, configurar DNS básico |
| **2** | Esperar propagación DNS, configurar SSL |
| **3** | Actualizar Firebase Auth, Google OAuth |
| **4** | Actualizar código (frontend + backend) |
| **5** | Desplegar, verificar funcionamiento básico |
| **6-7** | Pruebas exhaustivas, corregir errores |
| **8+** | Configurar redirección 301, monitorear |

---

## Soporte y Contacto

Si encuentras problemas durante la migración:

1. Revisar logs en Vercel Dashboard
2. Revisar consola del navegador (F12)
3. Verificar DNS con: https://dnschecker.org
4. Verificar SSL con: https://www.ssllabs.com/ssltest/

---

**Documento creado:** 2025-12-28
**Proyecto:** Buscador de Noticias Online
**Versión de migración:** 1.0
