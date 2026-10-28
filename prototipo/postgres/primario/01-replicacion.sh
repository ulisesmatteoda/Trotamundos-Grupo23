#!/bin/sh
# PostgreSQL OLTP Primary (Iteración 3): habilita la replicación física hacia la réplica de lectura
# que usa el ETL (ADR-004). Corre una sola vez, al inicializar el volumen de datos.
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
CREATE ROLE replicador WITH REPLICATION LOGIN PASSWORD '${REPLICACION_PASSWORD}';
-- El slot retiene el WAL que la réplica todavía no recibió (no se pierde si se atrasa).
SELECT pg_create_physical_replication_slot('replica_lectura');
SQL

echo "host replication replicador all scram-sha-256" >> "$PGDATA/pg_hba.conf"
echo "[primario] replicación habilitada (rol replicador, slot replica_lectura)"
