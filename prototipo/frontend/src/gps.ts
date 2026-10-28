// "Cómo llegar" (QA-06a): usa la ubicación del dispositivo (Geolocation API, la capacidad nativa
// que expone el navegador) y abre la ruta hasta el lugar de la reserva en la app de mapas.
// Toque 1: el botón; toque 2: aceptar el permiso de ubicación (solo la primera vez).
import { Ubicacion } from "./api/tipos";

const TIMEOUT_MS = 5000;

export const tieneDestino = (u?: Ubicacion) => Boolean(u && ((u.lat != null && u.lng != null) || u.direccion));

function destinoDe(u: Ubicacion): string {
  return u.lat != null && u.lng != null ? `${u.lat},${u.lng}` : u.direccion!;
}

function urlRuta(destino: string, origen?: GeolocationCoordinates): string {
  const params = new URLSearchParams({ api: "1", destination: destino });
  if (origen) params.set("origin", `${origen.latitude},${origen.longitude}`);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function comoLlegar(destino: Ubicacion): void {
  // La pestaña se abre ya, dentro del gesto del usuario, para que el navegador no la bloquee.
  const pestana = window.open("about:blank", "_blank");
  const abrir = (origen?: GeolocationCoordinates) => {
    const url = urlRuta(destinoDe(destino), origen);
    if (pestana) pestana.location.href = url;
    else window.location.href = url;
  };
  if (!("geolocation" in navigator)) return abrir();
  // Sin permiso o sin señal, la app de mapas calcula la ruta desde la ubicación actual igual.
  navigator.geolocation.getCurrentPosition(
    (pos) => abrir(pos.coords),
    () => abrir(),
    { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 60_000 },
  );
}
