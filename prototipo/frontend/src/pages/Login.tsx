import { FormEvent, useState } from "react";
import { ErrorApi } from "../api/cliente";
import { useSesion } from "../sesion";
import { mensajeError } from "../textos";

export function Login() {
  const { ingresar } = useSesion();
  const [email, setEmail] = useState("ana@trotamundos.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await ingresar(email, password);
    } catch (err) {
      setError(mensajeError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"));
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="tarjeta login-form" onSubmit={enviar}>
        <h1>Trotamundos</h1>
        <p className="tenue">Todos tus viajes, en un solo lugar.</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="primario" disabled={enviando}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="tenue pista">Demo: ana@trotamundos.test o bruno@trotamundos.test, contraseña demo1234</p>
      </form>
    </main>
  );
}
