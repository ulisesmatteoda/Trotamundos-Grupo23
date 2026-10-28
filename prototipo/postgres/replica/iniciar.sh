#!/bin/sh
# PostgreSQL Read Replica (Iteración 3, ADR-004): la primera vez clona el primario con
# pg_basebackup y queda como hot standby (solo lectura) recibiendo el WAL por streaming.
set -e

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[replica] clonando el primario con pg_basebackup..."
  until pg_basebackup -h postgres -U replicador -D "$PGDATA" -R -X stream -S replica_lectura; do
    echo "[replica] el primario todavía no acepta la conexión, reintento en 2 s"
    find "$PGDATA" -mindepth 1 -delete
    sleep 2
  done
  chmod 700 "$PGDATA"
  echo "[replica] clon listo"
fi

exec postgres -c hot_standby=on
