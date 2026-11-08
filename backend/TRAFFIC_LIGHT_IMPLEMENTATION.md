# ClearBid NJ — configuración inicial del semáforo

Esta implementación aplica la clasificación del Document Style Guide v2 al motor de reglas:

- `critical` confirmado → `red` / **HIGH**.
- `warning` confirmado → `yellow` / **MODERATE**.
- Todas las reglas activas evaluadas y sin alertas → `green` / **LOW / CLEAR**.
- Sin catálogo activo o con datos críticos necesarios ausentes → `flag = null` y evaluación pendiente; nunca se presenta como LOW / CLEAR.
- Una advertencia confirmada puede mostrarse como MODERATE aunque falten otros datos de advertencias, siempre que las comprobaciones críticas estén completas; la ficha indicará que la evaluación sigue incompleta.

## Reglas incluidas

| Código | Severidad | Condición | Nivel visible |
|---|---|---|---|
| `IRS_SURVIVING_LIEN` | critical | `legal.surviving_irs_lien > 0` | HIGH |
| `SENIOR_LIEN_SURVIVES` | critical | `legal.senior_liens > 0` | HIGH |
| `CLOUDED_TITLE` | critical | El título no está en `clean`, `clear` o `clear_title` | HIGH |
| `BANKRUPTCY_INDICATOR` | critical | `legal.bankruptcy_indicator is True` | HIGH |
| `TOTAL_LIENS_REVIEW` | warning | `financial.total_liens_verified is True and financial.total_liens > 0` | MODERATE |
| `OPEN_PERMITS` | warning | `legal.open_permits_count > 0` | MODERATE |
| `MULTIPLE_DEFENDANTS` | warning | `legal.defendant_count > 1` | MODERATE |
| `LLC_OWNERSHIP` | warning | `legal.ownership_type.lower() == 'llc'` | MODERATE |
| `MORTGAGE_ACTIVE` | warning | `legal.mortgage_active is True` | MODERATE |
| `OCCUPIED_PROPERTY` | warning | `legal.occupancy == 'occupied'` | MODERATE |

Un saldo de `total_liens` positivo se marca MODERATE para exigir revisión de título. No se convierte automáticamente en HIGH porque el saldo total no demuestra por sí solo que todos esos gravámenes sobrevivan a la subasta. Un gravamen IRS sobreviviente, un gravamen senior informado como sobreviviente o un título no limpio sí activa HIGH.

## Campos nuevos del bloque legal

Se agregan columnas opcionales (`NULL` permitido) para:

- `bankruptcy_indicator`: booleano.
- `open_permits_count`: entero.
- `defendant_count`: entero.
- `ownership_type`: texto (`individual`, `llc`, `corporation`, `trust`, según corresponda).
- `mortgage_active`: booleano.

`NULL` significa que el dato no ha sido verificado. No reemplazarlo por `false`, `0`, `clean` o `individual` solo para obtener un color verde. Registrar esos valores únicamente cuando una fuente confiable respalde la comprobación.

## Aplicación en el entorno Docker

Desde PowerShell, abrir la carpeta `backend` del proyecto y ejecutar en este orden:

```powershell
docker compose up -d --build api worker
docker compose exec api alembic upgrade head
docker compose exec api python seed_risk_rules.py
```

El primer comando reconstruye la imagen, porque el Dockerfile copia el código al contenedor y no monta el código fuente como volumen. El segundo aplica las migraciones (la API también intenta aplicarlas al arrancar). El tercero crea o actualiza las reglas sin duplicarlas y recalcula las propiedades no archivadas. El proceso no cambia las credenciales ni modifica los saldos de los inmuebles.

## Verificación en Supabase SQL Editor

```sql
SELECT
    p.id,
    p.address,
    f.opening_price,
    f.total_liens,
    l.surviving_irs_lien,
    l.senior_liens,
    l.title_status,
    l.bankruptcy_indicator,
    l.open_permits_count,
    l.defendant_count,
    l.ownership_type,
    l.mortgage_active,
    l.occupancy,
    tl.flag,
    tl.evaluation_status,
    tl.engine_version,
    COUNT(rr.id) AS reglas_evaluadas
FROM properties p
LEFT JOIN property_financials f ON f.property_id = p.id
LEFT JOIN property_legal l ON l.property_id = p.id
LEFT JOIN traffic_light_results tl ON tl.property_id = p.id
LEFT JOIN rule_results rr ON rr.property_id = p.id
WHERE p.archived = false
GROUP BY
    p.id, p.address, f.opening_price, f.total_liens,
    l.surviving_irs_lien, l.senior_liens, l.title_status,
    l.bankruptcy_indicator, l.open_permits_count, l.defendant_count,
    l.ownership_type, l.mortgage_active, l.occupancy,
    tl.flag, tl.evaluation_status, tl.engine_version
ORDER BY p.address;
```

## Importante para los datos existentes

`opening_price` es el precio de apertura; `total_liens` es el saldo total informado de gravámenes. No son intercambiables. Antes de clasificar una propiedad que muestra, por ejemplo, un precio de apertura cercano a USD 260.000, revisar el valor real de `total_liens`.

En la extracción de datos revisada durante este trabajo, 74 Louise Lane tenía `opening_price = 264000` y `total_liens = 0`; esos datos no justifican describirla como una propiedad con USD 264.000 de deuda. Para 4216 Nottingham Way había un resultado histórico `MORTGAGE_ACTIVE` con un mensaje por USD 276.363, el mismo valor de su precio de apertura. La rama revisada no tenía un campo dedicado para confirmar ese estado hipotecario. Por eso se añadió `mortgage_active`, pero ese dato debe verificarse antes de cargar `true`.

No asignar valores legales por suposición. Mientras esos campos permanezcan sin comprobar, la propiedad queda pendiente y no se presenta como LOW / CLEAR.


## Antecedentes documentales preliminares (dataset 2026-11-08)

`seed_risk_rules.py` también carga de forma idempotente los antecedentes disponibles de las 11 propiedades, emparejando por dirección normalizada. Los campos `documentary_*` están separados de `traffic_light_results`: una etiqueta provisional no convierte una evaluación automática incompleta en definitiva.

- 124 Albemarle Avenue: MODERATE provisional; foreclosure y certificado municipal histórico.
- 114 Mercer Street: MODERATE provisional; expediente de foreclosure sin desenlace confirmado.
- 84 Lambertville Hopewell Road: MODERATE provisional; foreclosure y referencia REO sin titularidad confirmada.
- 4216 Nottingham Way: MODERATE provisional por ocupación registrada. El mensaje hipotecario antiguo por USD 276,363 se excluye porque coincide con el precio de apertura y no acredita una deuda.
- 183 Hollow Brook Road: requiere revisión; antecedente de Block 548 / Lot 1 con dirección no idéntica.
- 2465 Pennington Road: requiere revisión; un certificado aparece redimido y otro antecedente no tiene desenlace confirmado.
- Las otras cinco propiedades quedan con información insuficiente, no LOW / CLEAR.

Los importes se guardan como `reported_amount` y nunca se copian a `total_liens`, `surviving_irs_lien` o `senior_liens`. El dataset es una carga estática de antecedentes conocidos; no realiza scraping ni consulta en vivo los portales del condado.

Aplicar: `docker compose up -d --build api worker`, `docker compose exec api alembic upgrade head`, `docker compose exec api python seed_risk_rules.py`. La misma carga actualiza reglas, antecedentes y evaluaciones sin duplicar filas.


`property_financials.total_liens_verified` debe permanecer NULL mientras no exista una consulta actual que confirme el total de gravámenes. Un `total_liens = 0` importado sin verificación no se interpreta como ausencia de deuda; la regla `TOTAL_LIENS_REVIEW` queda `unknown`. Solo debe establecerse en `true` cuando el importe y su fecha/fuente hayan sido comprobados.


## Automatización al iniciar Docker

El `Dockerfile` ejecuta ahora, en este orden: migraciones Alembic, `initialize_risk_system.py` y Uvicorn. El bootstrap inserta reglas predeterminadas solo si faltan, actualiza únicamente la regla de sistema `TOTAL_LIENS_REVIEW` para exigir `total_liens_verified`, carga el dataset documental por dirección y recalcula cuando falta el resultado, cambió esa regla o cambió la versión del motor a 2.5. No sobrescribe otras reglas personalizadas existentes. `seed_risk_rules.py` sigue disponible para una resincronización manual explícita del catálogo y el recálculo completo.
