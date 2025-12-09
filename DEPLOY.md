# Guía de Deployment - Buscador de Noticias Online

Esta guía describe cómo desplegar el proyecto en producción.

## Arquitectura de Deployment

- **Frontend**: Hostinger (Shared Hosting) - https://buscador.tuplay.top
- **Backend**: Render.com (Free Tier) - API Node.js
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Authentication

---

## 1. Deploy del Backend en Render.com

### Paso 1: Crear cuenta en Render.com
1. Ve a https://render.com
2. Regístrate con tu cuenta de GitHub
3. Autoriza a Render para acceder a tus repositorios

### Paso 2: Crear nuevo Web Service
1. Click en "New +" → "Web Service"
2. Conecta tu repositorio de GitHub `buscador-noticias-online`
3. Configuración:
   - **Name**: `buscador-noticias-backend`
   - **Region**: Oregon (US West) o la más cercana
   - **Branch**: `develop` o `master`
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Paso 3: Configurar Variables de Entorno
En el dashboard de Render, ve a "Environment" y agrega:

```
NODE_ENV=production
PORT=10000
FRONTEND_URL_PROD=https://buscador.tuplay.top
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_PRIVATE_KEY=tu_private_key
```

**IMPORTANTE**: Para `FIREBASE_PRIVATE_KEY`, copia la clave completa incluyendo:
```
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

### Paso 4: Deploy
1. Click en "Create Web Service"
2. Render automáticamente construirá y desplegará tu backend
3. Una vez completado, obtendrás una URL como: `https://buscador-noticias-backend.onrender.com`

### Paso 5: Verificar Health Check
Visita: `https://tu-app.onrender.com/api/health`

Deberías ver:
```json
{
  "status": "ok",
  "message": "Buscador de Noticias API funcionando",
  "timestamp": "2025-12-09T..."
}
```

---

## 2. Deploy del Frontend en Hostinger

### Paso 1: Build del Frontend
Desde la raíz del proyecto:

```powershell
cd frontend
npm run build
```

Esto genera la carpeta `frontend/dist/` con:
- `index.html`
- `assets/` (JS y CSS optimizados)
- `favicon.svg`
- `.htaccess` (ya incluido)

### Paso 2: Configurar Variables de Entorno

**ANTES** de hacer el build, edita `frontend/.env.production`:

```env
VITE_API_URL=https://tu-app.onrender.com
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

Luego vuelve a hacer build: `npm run build`

### Paso 3: Subir Archivos a Hostinger

#### Opción A: FileZilla (Recomendado)
1. Descarga FileZilla: https://filezilla-project.org/
2. Conecta con:
   - **Host**: `sftp://82.197.80.2`
   - **Puerto**: `65002`
   - **Usuario**: `u903977987`
   - **Contraseña**: `szRkBKBw3GPwt&3`
3. En el servidor, navega a `/public_html/`
4. Sube todo el contenido de `frontend/dist/` (arrastra los archivos)
5. Asegúrate de subir también el archivo `.htaccess`

#### Opción B: PowerShell Script (Windows con WinSCP)
```powershell
.\deploy-frontend.ps1
```

### Paso 4: Verificar Deployment
1. Visita: https://buscador.tuplay.top
2. Verifica que cargue correctamente
3. Prueba login y búsqueda de noticias

---

## 3. Configuración Post-Deployment

### Backend CORS
Verifica que en `backend/server.js` las URLs permitidas incluyan:
```javascript
const allowedOrigins = [
  'https://buscador.tuplay.top',
  process.env.FRONTEND_URL_PROD
];
```

### Frontend API URL
Verifica que `frontend/.env.production` apunte a tu URL de Render:
```env
VITE_API_URL=https://tu-app.onrender.com
```

---

## 4. Monitoreo y Logs

### Backend (Render.com)
- Dashboard → Logs: Ver logs en tiempo real
- Dashboard → Metrics: CPU, memoria, requests
- **Nota**: El plan Free duerme después de 15 min de inactividad

### Frontend (Hostinger)
- Panel de Hostinger → Archivos → Ver logs de errores
- Usa DevTools del navegador para ver errores de red

---

## 5. Actualizaciones

### Backend
Render automáticamente despliega cuando haces push a la rama configurada:
```bash
git add backend/
git commit -m "Update backend"
git push origin develop
```

### Frontend
1. Hacer cambios en `frontend/src/`
2. Build: `npm run build`
3. Subir archivos de `dist/` a Hostinger (FileZilla o script)

---

## 6. Troubleshooting

### Error: "No permitido por CORS"
- Verifica `FRONTEND_URL_PROD` en variables de entorno de Render
- Verifica `allowedOrigins` en `backend/server.js`

### Error: "Failed to fetch"
- Verifica que la URL del backend en `.env.production` sea correcta
- Verifica que el backend esté corriendo (health check)
- Verifica que Render no haya pausado el servicio (Free tier)

### Frontend muestra página en blanco
- Verifica que `.htaccess` esté en `public_html/`
- Verifica logs en DevTools del navegador
- Verifica que los assets estén en `public_html/assets/`

### Error: "Firebase not initialized"
- Verifica variables de entorno de Firebase en Render
- Verifica que `FIREBASE_PRIVATE_KEY` tenga el formato correcto (con \n)

---

## 7. Credenciales de Deployment

### Hostinger SSH/SFTP
- **Host**: 82.197.80.2
- **Puerto**: 65002
- **Usuario**: u903977987
- **Contraseña**: szRkBKBw3GPwt&3
- **Dominio**: buscador.tuplay.top
- **Directorio**: /public_html/

### Render.com
- Gestiona deployments desde: https://dashboard.render.com
- Repositorio: GitHub (conectado)

### Firebase
- Console: https://console.firebase.google.com
- Proyecto: buscador-noticias-efc60

---

## 8. Checklist de Deployment

### Pre-deployment
- [ ] Variables de entorno configuradas en Render
- [ ] Variables de entorno configuradas en `.env.production`
- [ ] Build del frontend exitoso
- [ ] Archivos `.htaccess` incluidos

### Post-deployment
- [ ] Backend health check responde OK
- [ ] Frontend carga correctamente
- [ ] Login funciona
- [ ] Búsqueda de noticias funciona
- [ ] Imágenes se muestran correctamente
- [ ] URLs acortadas funcionan
- [ ] Perfiles de búsqueda se guardan y aplican

---

**Última actualización**: 2025-12-09
