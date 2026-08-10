# Tests

Tests de la lógica crítica del backend (InsForge / PostgreSQL).

## `book_appointment.test.sql`

Suite autocontenida para el RPC `public.book_appointment`. Verifica las
propiedades de seguridad de la reserva:

| Test | Qué comprueba |
|------|----------------|
| T1 | El precio lo pone el servidor (`services.base_price`), ignora el precio del cliente |
| T2 | El override por barbero (`staff_services.custom_price`) tiene prioridad |
| T3 | Colisión: no se puede reservar un horario solapado |
| T4 | No se puede reservar un profesional de **otro** negocio (cross-tenant) |
| T5 | No se puede reservar un servicio inexistente |

Siembra sus propios datos, corre las aserciones y limpia todo. Si algo falla
lanza `EXCEPTION 'TESTS FAILED'` y toda la transacción se revierte (nunca deja
datos de prueba).

### Cómo correrlo

Requiere el proyecto InsForge enlazado (`npx @insforge/cli link`). Desde la raíz:

```bash
npx @insforge/cli db query "$(tr '\n' ' ' < tests/book_appointment.test.sql)"
```

> Se aplana a una sola línea con `tr` porque `db query` corta el SQL en el primer
> salto de línea. Los comentarios del archivo son de bloque (`/* */`) para
> sobrevivir el aplanado. Si el resultado no trae error → todos los tests pasaron;
> un `TESTS FAILED: N fallas` indica cuántos fallaron.
