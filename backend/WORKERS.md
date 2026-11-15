# Workers asíncronos — ClearBid NJ

## Levantar los servicios

Desde esta carpeta (`backend/`):

```bash
docker compose up --build
```

Esto levanta la API, Redis y el worker Celery. API y worker comparten el volumen `clearbid_exports`, que conserva los CSV/XLSX generados y permite que la API los entregue mediante el endpoint autenticado de descarga.

## Comprobar el worker

```bash
docker compose logs -f worker
```

Para inspeccionar las tareas registradas:

```bash
docker compose exec worker celery -A app.celery_app:celery_app inspect registered
```

Deben aparecer `app.tasks.jobs.process_export_job` y `app.tasks.jobs.process_ingest_job`.

## Ejecutar pruebas

```bash
python -m pip install -r requirements.txt
pytest -q
```

## Exportaciones

Las exportaciones admiten CSV y XLSX. Los filtros del esquema compartido se aplican en la consulta. La descarga requiere autenticación y solo permite al propietario del trabajo descargarlo. Los archivos expiran según `EXPORT_EXPIRE_HOURS` (6 horas por defecto).

## Ingestas

La cola Celery y el estado del trabajo ya están conectados. No hay todavía un importador registrado: cada origen debe definir su parser y mapeo de campos antes de poder importar propiedades reales. Mientras no exista un adaptador para `source`, el trabajo termina en `failed` con un mensaje explícito; no se simula una importación exitosa.
