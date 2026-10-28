// Capa de Presentación (Iteración 1). En la Fase 0 solo muestra el estado del backend,
// consultado siempre a través del API Gateway (/api), nunca a la base ni a terceros.
import { useEffect, useState } from "react";

type Health = {
  estado: "ok" | "degradado";
  instancia?: string;
  dependencias: Record<string, "ok" | "error">;
};

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="contenedor">
      <h1>Trotamundos</h1>
      <p className="subtitulo">Prototipo — Fase 0</p>

      <section className="tarjeta">
        <h2>Estado del sistema</h2>
        {error && <p className="error">No se pudo contactar al API Gateway.</p>}
        {!health && !error && <p>Consultando…</p>}
        {health && (
          <>
            <p>
              Backend: <strong className={health.estado}>{health.estado}</strong>
              {health.instancia && <span className="instancia"> ({health.instancia})</span>}
            </p>
            <ul>
              {Object.entries(health.dependencias).map(([nombre, estado]) => (
                <li key={nombre}>
                  {nombre}: <strong className={estado}>{estado}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
