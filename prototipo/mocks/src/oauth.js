// Proveedor de correo simulado ("Gmail"): servidor de autorización OAuth2 (authorization code).
//   GET  /oauth/autorizar         pantalla de consentimiento (la abre el navegador del usuario)
//   POST /oauth/autorizar         el usuario acepta o rechaza → redirect a la app con code o error
//   POST /correo/oauth/token      canje del code por el access token (servidor a servidor)
//   GET  /correo/api/perfil       casilla del token (Bearer)
//   POST /correo/oauth/revocar    revoca el token
const crypto = require("crypto");
const express = require("express");

const CLIENT_ID = "trotamundos";
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET ?? "";

// Token → casilla. Ana ya autorizó a Trotamundos antes (coincide con el seed del backend).
const tokensIniciales = () => new Map([["tok-demo-ana", "ana@trotamundos.test"]]);
let tokens = tokensIniciales();
const codigos = new Map(); // code → { casilla, redirectUri, vence }

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function pagina(q) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gmail simulado · Autorizar acceso</title>
<style>
  body{margin:0;font-family:system-ui,sans-serif;background:#f1f3f4;color:#202124;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
  form{background:#fff;border-radius:12px;padding:24px;max-width:420px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.15);display:grid;gap:14px}
  h1{font-size:1.2rem;margin:0} p{margin:0;color:#5f6368} ul{margin:0;padding-left:20px;color:#5f6368}
  label{display:grid;gap:4px;font-size:.9rem} input{font:inherit;padding:8px 10px;border:1px solid #dadce0;border-radius:6px}
  .acciones{display:flex;justify-content:flex-end;gap:8px} button{font:inherit;padding:8px 16px;border-radius:6px;border:1px solid #dadce0;background:#fff;cursor:pointer}
  button[value=permitir]{background:#1a73e8;border-color:#1a73e8;color:#fff}
</style></head>
<body><form method="post" action="/oauth/autorizar">
  <h1>Trotamundos quiere acceder a tu cuenta</h1>
  <p>Proveedor de correo simulado para el prototipo.</p>
  <label>Cuenta <input name="casilla" type="email" required value="${escapar(q.login_hint ?? "")}"></label>
  <p>Trotamundos podrá:</p>
  <ul><li>Leer los correos de los remitentes que elijas, para agregar reservas a tus viajes.</li></ul>
  <input type="hidden" name="redirect_uri" value="${escapar(q.redirect_uri ?? "")}">
  <input type="hidden" name="state" value="${escapar(q.state ?? "")}">
  <div class="acciones">
    <button name="decision" value="denegar">Cancelar</button>
    <button name="decision" value="permitir">Permitir</button>
  </div>
</form></body></html>`;
}

const oauth = express.Router();
oauth.use(express.urlencoded({ extended: false }));

oauth.get("/oauth/autorizar", (req, res) => {
  if (req.query.client_id !== CLIENT_ID || !req.query.redirect_uri) return res.status(400).send("client_id o redirect_uri inválidos");
  res.type("html").send(pagina(req.query));
});

oauth.post("/oauth/autorizar", (req, res) => {
  const destino = new URL(req.body.redirect_uri);
  destino.searchParams.set("state", req.body.state ?? "");
  if (req.body.decision !== "permitir") {
    destino.searchParams.set("error", "access_denied");
  } else {
    const code = crypto.randomBytes(16).toString("hex");
    codigos.set(code, { casilla: req.body.casilla.trim().toLowerCase(), redirectUri: req.body.redirect_uri, vence: Date.now() + 60_000 });
    destino.searchParams.set("code", code);
  }
  res.redirect(destino.toString());
});

oauth.post("/correo/oauth/token", (req, res) => {
  const { code, redirect_uri, client_id, client_secret } = req.body;
  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) return res.status(401).json({ error: "invalid_client" });
  const c = codigos.get(code);
  codigos.delete(code); // un code se usa una sola vez
  if (!c || c.vence < Date.now() || c.redirectUri !== redirect_uri) return res.status(400).json({ error: "invalid_grant" });
  const token = `tok-${crypto.randomBytes(24).toString("hex")}`;
  tokens.set(token, c.casilla);
  res.json({ access_token: token, token_type: "Bearer", scope: "correo.lectura" });
});

oauth.get("/correo/api/perfil", (req, res) => {
  const casilla = tokens.get((req.header("authorization") ?? "").replace(/^Bearer /, ""));
  casilla ? res.json({ email: casilla }) : res.status(401).json({ error: "invalid_token" });
});

oauth.post("/correo/oauth/revocar", (req, res) => {
  if (req.body.client_id !== CLIENT_ID || req.body.client_secret !== CLIENT_SECRET) return res.status(401).json({ error: "invalid_client" });
  tokens.delete(req.body.token);
  res.status(200).json({ revocado: true });
});

// Para el simulador: casillas que hoy tienen un token vigente
const casillasAutorizadas = () => [...new Set(tokens.values())];
const restablecer = () => {
  tokens = tokensIniciales();
  codigos.clear();
};

module.exports = { oauth, casillasAutorizadas, restablecer };
