// Data Warehouse (OLAP): modelo dimensional en estrella para el motor de reportes (ADR-004).
// Se crea de forma idempotente al iniciar el ETL.
export const ESQUEMA_DW = `
  CREATE TABLE IF NOT EXISTS dim_fecha (
    fecha_id   int PRIMARY KEY,        -- aaaammdd
    fecha      date NOT NULL,
    anio       int NOT NULL,
    mes        int NOT NULL,
    trimestre  int NOT NULL,
    dia_semana int NOT NULL            -- 1 = lunes … 7 = domingo
  );

  CREATE TABLE IF NOT EXISTS dim_destino (
    destino_id serial PRIMARY KEY,
    nombre     text NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS dim_tipo_reserva (
    tipo text PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS dim_origen (
    origen text PRIMARY KEY            -- MANUAL | EMAIL | AGENCIA
  );

  -- Hecho: una fila por reserva. Sin datos personales: el usuario va como hash con sal.
  CREATE TABLE IF NOT EXISTS hecho_reserva (
    reserva_id     uuid PRIMARY KEY,
    fecha_id       int  NOT NULL REFERENCES dim_fecha,
    destino_id     int  NOT NULL REFERENCES dim_destino,
    tipo           text NOT NULL REFERENCES dim_tipo_reserva,
    origen         text NOT NULL REFERENCES dim_origen,
    estado         text NOT NULL,
    cancelada      boolean NOT NULL,
    duracion_horas numeric(10, 2),
    monto          numeric(12, 2),
    moneda         text,
    viajero_hash   text NOT NULL
  );

  CREATE TABLE IF NOT EXISTS etl_corrida (
    id              serial PRIMARY KEY,
    inicio          timestamptz NOT NULL,
    fin             timestamptz NOT NULL,
    filas           int NOT NULL,
    fuente          text NOT NULL,     -- servidor del que se extrajo
    fuente_replica  boolean NOT NULL   -- true si la fuente era la réplica (pg_is_in_recovery)
  );
`;
