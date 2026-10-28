// Tarea periódica en background (UC-02, ciclo de vida del viaje): archiva los viajes
// completados para sacarlos de la vista principal. La operación es idempotente, por lo
// que puede correr en varios workers a la vez sin efectos duplicados.
import os from "os";
import { ViajeService } from "../domain/ViajeService";

export function iniciarArchivadoJob(intervaloMs: number): void {
  const correr = async () => {
    try {
      const archivados = await ViajeService.archivarCompletados();
      if (archivados.length > 0) {
        console.log(`[worker ${os.hostname()}] ArchivadoJob: ${archivados.length} viaje(s) archivado(s)`, archivados.map((v) => v.id));
      }
    } catch (err) {
      console.error(`[worker ${os.hostname()}] ArchivadoJob falló, se reintenta en el próximo ciclo`, err);
    }
  };
  correr();
  setInterval(correr, intervaloMs);
}
