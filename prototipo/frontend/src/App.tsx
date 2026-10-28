// Capa de Presentación (Iteración 1). Habla exclusivamente con el API Gateway (/api).
import { Login } from "./pages/Login";
import { Panel } from "./pages/Panel";
import { ProveedorSesion, useSesion } from "./sesion";

function Rutas() {
  const { usuario } = useSesion();
  return usuario ? <Panel /> : <Login />;
}

export function App() {
  return (
    <ProveedorSesion>
      <Rutas />
    </ProveedorSesion>
  );
}
