PROMPT INICIO

Quiero que desarrolles una aplicación web completa, profesional, modular y lista para subir a Hostinger, basada en mi herramienta actual de generación de noticias desde fuentes reales (RSS, Google News, URLs directas, extracción de imágenes, traducción, emojis y formato de contenido listo para publicar).

Necesito que reescribas y evoluciones la herramienta actual bajo los siguientes lineamientos EXACTOS:

1. CONTEXTO Y ROL

Actuás como arquitecto de software senior, experto en:

Fullstack JavaScript

Node.js

Next.js o React + backend propio

Express.js

Firebase Firestore

Autenticación segura

Cloud Functions (si hace falta)

Integración RSS

Scraping de Google News con URLs específicas

Acortadores de enlaces

Traducción automática ES/EN

Deploy en Hostinger

Sistemas de suscripciones y control de uso

Tu tarea es generar TODO EL PROYECTO COMPLETO para producción.

2. OBJETIVO PRINCIPAL

Convertir mi herramienta local actual de generación de textos/noticias en una plataforma web SaaS profesional, llamada:

Título: “Buscador de noticias online”
Subtítulo: “Busca, traduce, crea emojis y da formato listo para publicar”

Debe incluir un icono visual con temática de redes + mundo + lupa.

3. REQUISITOS FUNCIONALES
3.1 Registro / Login

Autenticación con email+password (Firebase Auth).

Reset de contraseña.

Logout seguro.

Estado global (contexto) para detectar usuario activo.

Dashboard accesible solo si está logueado.

3.2 Sistema de Suscripción

Cada usuario tiene 30 días gratis desde la fecha de registro.

Firestore debe almacenar:

uid

email

fecha de alta

fecha de expiración

estado: activo / vencido

historial de logins

Si el usuario está vencido:

bloquear acceso

mostrar mensaje “Tu suscripción ha expirado”

botón “Renovar” (acción manual futura)

3.3 Pantalla principal (Dashboard)

Incluye:

Portada grande (header) con:

imagen alegórica moderna (tema: noticias globales / RSS / mundo digital)

título y subtítulo indicados

Íconos visuales (redes, mundo, lupa)

3.4 Buscador y Generador de Noticias

Debe mantener TODAS las funciones que ya existen en la herramienta local:

Fuentes:

Feeds RSS reales (los mismos que uso actualmente)

Google News filtrado a temas puntuales

URLs directas

Extracción de imágenes

Obtención del nombre del medio

Filtrado por fecha (últimas 48 h)

Ordenar por fecha descendente

Transformación del contenido:

Resumen breve 2–4 oraciones

Traducción inglés → español

Acortamiento de enlaces:

Enlace final DEBE aterrizar en la noticia exacta

No debe apuntar al homepage de Google News

Emoji contextual profesional

Texto final listo para publicar en:

WhatsApp

Telegram

Redes

Salida:

Por cada noticia generada:

🟦 TEMA  
📰 TITULAR  
📄 RESUMEN traducido  
🎯 EMOJIS  
🔗 Enlace acortado hacia la noticia real (no Google News)  
🖼️ Imagen de portada  
📺 Fuente  

3.5 Generación por categorías

Permitir elegir:

Deportes

Liga Argentina

Cine

Series

IPTV

Luego generar 1 o más textos por categoría.

4. REQUISITOS TÉCNICOS
4.1 Arquitectura

Generar un proyecto completo con:

/backend
  /controllers
  /services
  /utils
  /routes
  server.js

/frontend
  /components
  /pages
  /hooks
  /context
  /styles
  next.config.js


Backend en Node.js + Express.
Frontend en Next.js o React + Vite (tu recomendación).

Debe compilar y funcionar correctamente en Hostinger.

4.2 Firestore

Colecciones:

users/
  uid/
    email
    createdAt
    expiresAt
    status
    lastLogin

4.3 Seguridad

Validar tokens

No exponer claves

Usar .env en backend y frontend

4.4 Deploy

Debe generar:

Scripts de instalación

Configurar .htaccess para SPA en Hostinger

Optimización para hosting compartido

build final listo para subir

5. UI Y UX
Diseño profesional:

Header con portada gráfica

Tarjetas limpias

Botones modernos

Iconos SVG (mundo, lupa, redes)

Paleta moderna (azules, negros, grises)

Layout responsive

Páginas necesarias:

Login

Registro

Recuperar contraseña

Dashboard

Generador

Perfil / Suscripción

Pantalla de usuario vencido

6. CRITERIOS DE CALIDAD

Código limpio y comentado

Modular

Seguridad real para Firestore

Manejo de errores sólido

No debe romperse si una fuente RSS falla

Debe tener fallback como la herramienta actual

Debe entregar noticias reales y usables

Build listo para Hostinger en el primer intento

7. ENTREGA ESPERADA

Necesito que entregues:

A) Arquitectura completa del proyecto

Todos los archivos y carpetas necesarios.

B) Código completo

Tanto backend como frontend.

C) Configuraciones necesarias

Archivos .env, Firestore, Auth, etc.

D) Instrucciones de instalación

Paso a paso para Hostinger.

E) Instrucciones de uso y mantenimiento
F) Tests básicos

Para verificar que las funciones de RSS, shortening, traducción y login funcionan.

8. VERIFICACIÓN

Antes de entregar:

Probar login

Probar suscripción 30 días

Probar bloqueo de usuario vencido

Probar 10 fuentes RSS

Probar Google News filtrado

Probar que los enlaces se acortan y apuntan a la noticia real

Probar que el contenido devuelve imagen + emojis

Probar que el frontend se renderiza correctamente

Cuando termines, entregá el código completo, con explicación de cada módulo y el proyecto listo para producción.

PROMPT FIN