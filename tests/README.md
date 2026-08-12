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

## `appointment_mutations.test.sql`

Suite autocontenida para los RPC de mutación del Step 19 (`move_appointment`,
`cancel_appointment`, `complete_appointment`, definidos en
`migrations/12_appointment_mutations.sql`). Verifica autorización, estados
terminales, identidad, jornada y colisión atómica:

| Test | Qué comprueba |
|------|----------------|
| M1 | Move válido: reubica y **preserva** id + duración (autoritativo del servidor) |
| M2 | Colisión: no se puede mover sobre un horario ocupado (no cancelado) |
| M3 | Adyacencia permitida: fin==inicio no es colisión |
| M4 | Move entre profesionales del **mismo** negocio |
| M5 | `OUTSIDE_HOURS`: fuera de la jornada (solo si hay horario configurado) |
| M6–M8 | Completar; no mover ni cancelar una cita completada (terminal) |
| C1–C3 | Cancelar (no borra); cancel idempotente; no completar una cancelada |
| A1 | `UNAUTHORIZED`: quien no es dueño ni staff no puede mutar |
| N1 | `NOT_FOUND`: id inexistente |

`auth.uid()` se simula fijando el claim JWT del owner. Correr igual que el otro:

```bash
npx @insforge/cli db query "$(tr '\n' ' ' < tests/appointment_mutations.test.sql)"
```

> **Aplicar la migración primero:** `12_appointment_mutations.sql` debe estar
> aplicada (`db query` / `db migrations`) contra el proyecto InsForge enlazado
> antes de correr esta suite. La garantía de concurrencia es el lock `FOR UPDATE`
> sobre la fila del profesional; M2 verifica el rechazo de colisión observable.
