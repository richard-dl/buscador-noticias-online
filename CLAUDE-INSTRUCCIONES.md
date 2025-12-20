# Instrucciones para Claude Code - Buscador Noticias Online

## Arquitectura del Proyecto

- **Frontend**: Hospedado en **Hostinger** (hosting compartido)
- **Backend**: Desplegado en **Vercel**
- **Base de datos**: Firebase/Firestore

## Ramas Git

El proyecto usa dos ramas principales:
- `master` - Producción
- `develop` - Desarrollo

**IMPORTANTE**: Siempre hacer commit y push a AMBAS ramas:

```bash
git add . && git commit -m "mensaje" && git push origin develop && git checkout master && git merge develop && git push origin master && git checkout develop
```

## Crear Backup

Para crear un backup del código fuente (sin node_modules, dist, .git):

```bash
cd "c:\Proyectos\buscador-noticias-online" && rm -f backup-buscador-noticias.zip && tar -cf - --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='*.zip' --exclude='*.tar*' backend frontend/src frontend/public frontend/package.json frontend/vite.config.js frontend/index.html firebase.json firestore.indexes.json vercel.json | gzip > backup-buscador-noticias.zip
```

**NO usar PowerShell Compress-Archive** (es extremadamente lento). Usar el pipeline `tar | gzip` que es instantáneo.

El resultado debe ser un archivo de ~400-500KB.

## Build del Frontend

```bash
cd "c:\Proyectos\buscador-noticias-online\frontend" && npm run build
```

## Estructura de Carpetas

```
buscador-noticias-online/
├── backend/
│   ├── routes/          # Rutas de la API
│   ├── services/        # Servicios (Claude, Gemini, RSS, etc.)
│   ├── utils/           # Utilidades
│   ├── middleware/      # Middlewares
│   └── scripts/         # Scripts de mantenimiento
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas
│   │   ├── services/    # API client
│   │   └── styles/      # CSS
│   ├── public/          # Assets estáticos
│   └── dist/            # Build de producción
├── firebase.json
├── vercel.json
└── backup-buscador-noticias.zip
```
