# Datos de prueba EliteBid

Generados con `npm run qa:seed`.

| Caso | Email | Clave / codigo | Estado esperado |
| --- | --- | --- | --- |
| Cuenta invitada con codigo vigente. Usar OTP 123456. | `demo.elitebid.invitado.pendiente@elitebid.test` | `OTP 123456` | invitado / pendiente / comun |
| Cuenta invitada con codigo vencido. Debe pedir reenvio. | `demo.elitebid.invitado.vencido@elitebid.test` | `OTP vencido 111111; usar reenvio` | invitado / pendiente / comun |
| Cliente verificado, sin medios de pago. | `demo.elitebid.cliente.sinpago@elitebid.test` | `Demo!2203` | cliente / activo / comun |
| Cliente verificado con tarjeta habilitada para entrar a salas comun. | `demo.elitebid.cliente.conpago@elitebid.test` | `Demo!2203` | cliente / activo / comun |
| Cliente con pago y penalidad activa. | `demo.elitebid.cliente.penalidad@elitebid.test` | `Demo!2203` | cliente / activo / comun |
| Cliente con metricas para categoria plata. | `demo.elitebid.cliente.plata@elitebid.test` | `Demo!2203` | cliente / activo / plata |
| Cliente con puja ganadora pendiente de registrar compra. | `demo.elitebid.cliente.compra@elitebid.test` | `Demo!2203` | cliente / activo / comun |
| Cliente con solicitud de lote en inspeccion. | `demo.elitebid.cliente.lote@elitebid.test` | `Demo!2203` | cliente / activo / comun |

Notas:

- Los mails usan dominio `.test`; no salen a cuentas reales.
- El seed es idempotente: borra y vuelve a crear solo usuarios `demo.elitebid.*@elitebid.test`.
- Para probar desde Login: usar los emails de la tabla y la clave/codigo correspondiente.
- El cliente con penalidad debe mostrar notificacion y panel de penalidades.
- El cliente con lote debe mostrar una venta en inspeccion en `Mis ventas`.
