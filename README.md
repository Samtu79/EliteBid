# EliteBid

Demo Expo + React Native para la segunda entrega del TPO DAI 1C2026. La app muestra un circuito mobile funcional de subastas premium: login, subastas, sala en vivo, pujas, favoritos, compras, perfil, medios de pago y penalidades.

## Como correr la demo

Requisitos:

- Node.js 20.19 o superior
- Expo SDK 54

Comandos:

```bash
npm install
npm run web
```

Expo abre una URL local. Si se quiere fijar puerto:

```bash
npm run web -- --port 3002
```

## Usuario de prueba

```text
Email: alejandro@elitebid.com
Clave: Elite1234
Categoria: platino
```

## Circuito sugerido para mostrar

1. Iniciar sesion con el usuario de prueba.
2. Entrar a `Subastas`.
3. Abrir `Patek Philippe Grand Complications`.
4. Ingresar a la sala en vivo.
5. Hacer una puja y verificar que cambia el monto/feed.
6. Marcar y desmarcar favoritos para ver el popup.
7. Entrar a `Compras`, confirmar pago y ver la compra pasar de `Puja ganadora` a `Compra pagada`.
8. Entrar a `Perfil` y revisar estadisticas, foto y datos bloqueados.
9. Entrar a `Penalidades`, pagar o marcar como solucionada.

## Entregables

- Informe segunda entrega: [`INFORME_SEGUNDA_ENTREGA.md`](./INFORME_SEGUNDA_ENTREGA.md)
- Checklist QA con capturas: [`QA_CHECKLIST_SEGUNDA_ENTREGA.md`](./QA_CHECKLIST_SEGUNDA_ENTREGA.md)
- Rama de GitHub usada para compartir: `informe-segunda-entrega`

## Estado real del backend

Esta version usa una capa de servicios local dentro de Expo:

- Mobile: SQLite via `expo-sqlite`.
- Web: adaptador `webDatabase.js` con persistencia en `localStorage`, para evitar bloqueos de Access Handles del navegador.

No hay todavia un backend Express + TypeScript deployado ni JWT real firmado. La logica de negocio esta implementada localmente para demostrar el circuito integrado de la segunda entrega.

## Estructura principal

- `src/backend/database.js`: esquema, seed inicial y conexion a la base.
- `src/backend/webDatabase.js`: base persistente para web.
- `src/backend/authService.js`: login, registro, sesion y recupero de clave.
- `src/backend/auctionService.js`: subastas, sala, pujas, favoritos y compras.
- `src/backend/paymentService.js`: medios de pago.
- `src/backend/profileService.js`: perfil, foto, estadisticas y datos editables.
- `src/backend/penaltyService.js`: penalidades y resolucion.
- `src/components/BottomNav.js`: barra inferior fija.
- `src/components/AppToast.js`: popups/toasts reutilizables.
- `src/screens/*`: pantallas mobile de la demo.

## Validacion rapida

```bash
npx expo export --platform web
```

Ese comando verifica que el bundle web compile correctamente.
