# Buscador de Noticias Online

Plataforma SaaS para periodistas que permite buscar, traducir y formatear noticias desde múltiples fuentes (RSS, Google News) con sistema de autenticación y suscripción.

## Características

- 🔐 **Autenticación**: Email/Password y Google Sign-In
- 📅 **Suscripción**: 30 días de prueba gratis
- 🔍 **Búsqueda avanzada**: Por temática, provincia, localidad y palabras clave
- 📰 **Múltiples fuentes**: RSS de medios argentinos y Google News
- 🌐 **Traducción**: Automática de inglés a español
- 🔗 **Acortador de URLs**: Enlaces cortos listos para compartir
- 🎯 **Emojis**: Generación automática según la temática
- 📋 **Formato listo**: Texto formateado para WhatsApp, Telegram y redes
- 💾 **Perfiles de búsqueda**: Guarda tus filtros favoritos

## Stack Tecnológico

- **Frontend**: React + Vite
- **Backend**: Firebase Cloud Functions (Node.js + Express)
- **Base de datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **Hosting**: Firebase Hosting + Hostinger (frontend estático)

## Estructura del Proyecto

```
buscador-noticias-online/
├── frontend/           # Aplicación React
│   ├── src/
│   │   ├── components/ # Componentes reutilizables
│   │   ├── pages/      # Páginas de la aplicación
│   │   ├── context/    # Context de autenticación
│   │   ├── services/   # API y Firebase
│   │   └── styles/     # Estilos CSS
│   └── public/
├── backend/            # Servidor Express (desarrollo local)
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── utils/
├── functions/          # Firebase Cloud Functions (producción)
├── docs/               # Documentación adicional
└── firebase.json       # Configuración de Firebase
```

## Instalación

### Prerrequisitos

- Node.js 18 o superior
- npm o yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta de Firebase con proyecto configurado

### 1. Clonar el repositorio

```bash
git clone https://github.com/richard-dl/buscador-noticias-online.git
cd buscador-noticias-online
```

### 2. Configurar Firebase

```bash
# Login en Firebase
firebase login

# Verificar proyecto vinculado
firebase projects:list
```

### 3. Instalar dependencias

```bash
# Frontend
cd frontend
npm install

# Functions (backend para producción)
cd ../functions
npm install

# Backend local (opcional, para desarrollo)
cd ../backend
npm install
```

### 4. Configurar variables de entorno

**Frontend** (`frontend/.env`):
```env
VITE_FIREBASE_API_KEY=AIzaSyATQCFHll3JxwySinmKS1rHSUq-0305y0g
VITE_FIREBASE_AUTH_DOMAIN=buscador-noticias-efc60.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=buscador-noticias-efc60
VITE_FIREBASE_STORAGE_BUCKET=buscador-noticias-efc60.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=483468685250
VITE_FIREBASE_APP_ID=1:483468685250:web:56de0bc17609da5cf3705b
VITE_API_URL=https://us-central1-buscador-noticias-efc60.cloudfunctions.net/api/api
```

**Backend local** (`backend/.env`):
```env
PORT=3001
FIREBASE_PROJECT_ID=buscador-noticias-efc60
FIREBASE_CLIENT_EMAIL=tu-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Desarrollo Local

### Opción A: Frontend + Backend local

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Acceder a: http://localhost:5173

### Opción B: Frontend + Firebase Emulators

```bash
# Terminal 1: Emuladores de Firebase
firebase emulators:start

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Deploy a Producción

### Deploy a Firebase (Recomendado)

```bash
# Build del frontend
cd frontend
npm run build

# Deploy de todo (functions + hosting + rules)
cd ..
firebase deploy
```

### Deploy solo Frontend a Hostinger

1. Construir el frontend:
```bash
cd frontend
npm run build
```

2. Subir la carpeta `frontend/dist/` al directorio `public_html` de Hostinger via FTP o File Manager.

3. El archivo `.htaccess` ya está configurado para SPA en `frontend/public/.htaccess`.

4. Actualizar `VITE_API_URL` en `.env` para apuntar a la Cloud Function:
```env
VITE_API_URL=https://us-central1-buscador-noticias-efc60.cloudfunctions.net/api/api
```

## Configuración de Firebase

### Habilitar autenticación

1. Ve a Firebase Console > Authentication > Sign-in method
2. Habilita "Correo electrónico/contraseña"
3. Habilita "Google"

### Configurar Firestore

1. Ve a Firebase Console > Firestore Database
2. Crear base de datos en modo producción
3. Aplicar reglas de seguridad:

```bash
firebase deploy --only firestore:rules
```

### Desplegar Cloud Functions

```bash
firebase deploy --only functions
```

## URLs del Proyecto

- **Frontend (Hostinger)**: https://buscador.tuplay.top
- **API (Cloud Functions)**: https://us-central1-buscador-noticias-efc60.cloudfunctions.net/api
- **Firebase Console**: https://console.firebase.google.com/project/buscador-noticias-efc60

## Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/register | Registrar usuario |
| POST | /api/auth/login | Verificar login |
| GET | /api/user/profile | Obtener perfil |
| GET | /api/user/search-profiles | Listar perfiles de búsqueda |
| POST | /api/user/search-profiles | Crear perfil de búsqueda |
| DELETE | /api/user/search-profiles/:id | Eliminar perfil |
| GET | /api/news/rss | Obtener noticias de RSS |
| GET | /api/news/search | Buscar noticias con filtros |
| GET | /api/geo/provincias | Lista de provincias |
| GET | /api/geo/tematicas | Lista de temáticas |

## Uso

1. **Registro**: Crear cuenta con email o Google
2. **Dashboard**: Ver noticias recientes y perfiles guardados
3. **Generador**: Configurar filtros (temáticas, provincias, keywords)
4. **Buscar**: Obtener noticias formateadas listas para copiar
5. **Guardar perfiles**: Crear perfiles de búsqueda para uso rápido

## Mantenimiento

### Agregar nuevos feeds RSS

Editar `functions/index.js` o `backend/services/rssService.js`:

```javascript
const RSS_FEEDS = {
  nuevaCategoria: [
    { name: 'Nombre del medio', url: 'https://...rss', category: 'categoria' }
  ]
};
```

### Modificar suscripción

En `functions/index.js`, buscar la creación del usuario:

```javascript
const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
```

## Licencia

MIT License - Richard DL

---

Desarrollado con ❤️ para periodistas argentinos
