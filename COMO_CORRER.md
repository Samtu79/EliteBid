# Como correr EliteBid

Guia rapida para levantar la app local, API, MySQL y Expo Go.

## Requisitos

- Node.js 20.19 o superior.
- npm.
- Expo Go instalado en el celular.
- MySQL local o Docker Desktop.
- Ngrok instalado si queres probar desde celular fuera de la PC.

Instalar dependencias:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm install
```

## Variables `.env`

El archivo `.env` debe estar en la raiz del proyecto:

```text
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=TU_PASSWORD
DB_NAME=elitebid
API_PORT=3001
EXPO_PUBLIC_API_URL=http://127.0.0.1:3001/api
EXPO_PUBLIC_WEB_API_URL=http://127.0.0.1:3001/api
EXPO_PUBLIC_MOBILE_API_URL=http://TU_IP_O_NGROK/api
```

Si usas el Docker Compose del repo, la base expone MySQL en `3307` y la password root es:

```text
DB_PASSWORD=elitebid
```

Si usas tu MySQL instalado en Windows, deja la password real de tu MySQL.

## Opcion A: correr en PC / Web

Terminal 1, levantar MySQL con Docker:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
docker compose up -d mysql
```

Si no usas Docker y ya tenes MySQL local iniciado, salta ese paso.

Terminal 2, inicializar base:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run db:init
```

Terminal 3, levantar API:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run api
```

La API queda en:

```text
http://127.0.0.1:3001/api
```

Terminal 4, levantar Expo Web:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run web
```

## Opcion B: correr en celular con Expo Go y ngrok

Terminal 1, levantar MySQL:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
docker compose up -d mysql
```

Terminal 2, inicializar base:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run db:init
```

Terminal 3, levantar API:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run api
```

Terminal 4, levantar ngrok:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
ngrok http 3001
```

Copiar la URL HTTPS de ngrok y ponerla en `.env` con `/api` al final:

```text
EXPO_PUBLIC_MOBILE_API_URL=https://TU_URL_NGROK.ngrok-free.app/api
```

Terminal 5, levantar Expo con tunnel:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run start -- --tunnel --clear
```

Escanea el QR con Expo Go.

## Opcion C: script automatico con ngrok

Este script levanta MySQL, inicializa la base, abre ngrok, actualiza `EXPO_PUBLIC_MOBILE_API_URL` y abre API + Expo en ventanas separadas.

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
npm run dev:tunnel:win
```

Si PowerShell bloquea scripts:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev-tunnel.ps1
```

## Checks utiles

Ver si la API responde:

```powershell
curl http://127.0.0.1:3001/api/health
```

Reiniciar datos de prueba:

```powershell
npm run db:init
```

Testear flujo completo automatizado:

```powershell
npm run qa:flow
```

Compilar web para validar que no rompe:

```powershell
npm exec -- expo export --platform web
```

## Problemas comunes

Si `npm` dice que no encuentra `package.json`, estas parado en la carpeta incorrecta. Entra a:

```powershell
cd C:\Users\sadan\Documents\Da1\EliteBid
```

Si `ngrok` no se reconoce:

```powershell
winget install --id Ngrok.Ngrok -e
```

Si `docker` no se reconoce, abrir Docker Desktop o instalarlo.

Si Expo Go no conecta desde el celular, usar ngrok y verificar que `EXPO_PUBLIC_MOBILE_API_URL` tenga la URL HTTPS con `/api`.
