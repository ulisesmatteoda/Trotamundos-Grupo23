// Capa de Datos: conexión a PostgreSQL OLTP Primary (Iteración 3).
import { Pool } from "pg";
import { config } from "../config";

export const db = new Pool({ connectionString: config.databaseUrl });

export async function pingDb(): Promise<boolean> {
  try {
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
