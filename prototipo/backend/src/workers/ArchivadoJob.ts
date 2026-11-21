// Tarea periódica en background (UC-02, ciclo de vida del viaje): archiva los viajes
// completados para sacarlos de la vista principal. También purga las conversaciones vencidas
// del asistente (ADR-012). Ambas operaciones son idempotentes, por lo que pueden correr en
// varios workers a la vez sin efectos duplicados.
import os from "os";
import { config } from "../config";
import { ViajeService } from "../domain/ViajeService";
import { ConversacionRepository } from "../persistence/ConversacionRepository";

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
    // Retención acotada de las conversaciones del asistente (ADR-012).
    try {
      const purgados = await ConversacionRepository.purgarAnterioresA(config.conversacionRetencionDias);
      if (purgados > 0) console.log(`[worker ${os.hostname()}] ${purgados} mensaje(s) del asistente purgado(s) por retención`);
    } catch (err) {
      console.error(`[worker ${os.hostname()}] la purga de conversaciones falló, se reintenta en el próximo ciclo`, err);
    }
  };
  correr();
  setInterval(correr, intervaloMs);
}
