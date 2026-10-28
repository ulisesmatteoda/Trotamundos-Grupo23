import { FormEvent, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";
import { SelectorIdioma } from "../i18n/SelectorIdioma";
import { useSesion } from "../sesion";

export function Login() {
  const { ingresar } = useSesion();
  const { t } = useI18n();
  const { mensajeDe } = useMensajes();
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
      setError(mensajeDe(err));
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="tarjeta login-form" onSubmit={enviar}>
        <div className="login-encabezado">
          <h1>Trotamundos</h1>
          <SelectorIdioma />
        </div>
        <p className="tenue">{t("app.lema")}</p>

        <label>
          {t("login.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          {t("login.password")}
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
          {enviando ? t("login.ingresando") : t("login.ingresar")}
        </button>
        <p className="tenue pista">{t("login.pista")}</p>
      </form>
    </main>
  );
}
