# SAAAPEE AWARDS

Plataforma local para recopilar clips de YouTube, votar categorías y gestionar participantes desde una cuenta de administración.

## Puesta en marcha local

1. Instala las dependencias: `npm install`.
2. Copia `.env.example` a `.env`.
3. Define `ADMIN_USERNAME` y `ADMIN_PASSWORD` en `.env`. La contraseña debe tener al menos 8 caracteres y no debe compartirse.
4. Construye el front-end: `npm run build`.
5. Inicia el servidor: `npm run local`.

En la primera ejecución, si no existe `data/users.json`, se crea la cuenta administradora a partir de las variables de `.env`. Después, administra el resto de cuentas desde la propia página.

## Datos que no se publican

Git ignora el archivo `.env`, los datos de `data/` y las fotos o vídeos en `uploads/`. Ahí se guardan usuarios, hashes de contraseña, votos, clips, perfiles y archivos subidos. No los subas a GitHub.

No hay claves API configuradas en el proyecto. Si añades servicios externos en el futuro, almacena sus credenciales únicamente en `.env` y documenta una variable de ejemplo sin valor real en `.env.example`.
