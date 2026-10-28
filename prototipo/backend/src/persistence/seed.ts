// Datos de demostración (solo con SEED_DEMO=true y la base vacía).
// Las fechas son relativas al momento del seed para que la demo siempre tenga
// un viaje próximo y uno ya terminado que el ArchivadoJob debe archivar.
import { db } from "./db";
import { ViajeRepository } from "./ViajeRepository";
import { UsuarioRepository } from "./UsuarioRepository";
import { RemitenteRepository } from "./RemitenteRepository";
import { ConexionCorreoRepository } from "./ConexionCorreoRepository";
import { cifrar } from "../security/CifradoEnvoltorio";
import { hashear } from "../security/passwords";

const DIA = 24 * 60 * 60 * 1000;
const enDias = (dias: number, hora = 12) => {
  const d = new Date(Date.now() + dias * DIA);
  d.setUTCHours(hora, 0, 0, 0);
  return d;
};

const LOCK_SEED = 724_002;

// Varias réplicas de la API pueden arrancar a la vez (ADR-006): el advisory lock garantiza que
// una sola cargue la demo y que las demás, al obtenerlo, encuentren los datos ya cargados.
export async function sembrarDemo(): Promise<void> {
  const cliente = await db.connect();
  try {
    await cliente.query("SELECT pg_advisory_lock($1)", [LOCK_SEED]);
    if (await UsuarioRepository.hayUsuarios()) return;
    await sembrarUsuariosDemo();
    await sembrarDatosAnaliticos();
  } finally {
    await cliente.query("SELECT pg_advisory_unlock($1)", [LOCK_SEED]).catch(() => undefined);
    cliente.release();
  }
}

async function sembrarUsuariosDemo(): Promise<void> {
  const password = await hashear("demo1234");

  const ana = await UsuarioRepository.crear("ana@trotamundos.test", "Ana", password, "es-AR");
  const bruno = await UsuarioRepository.crear("bruno@trotamundos.test", "Bruno", password, "en-US");
  // Carla no recibe viajes compartidos: sirve para comprobar el 403 de QA-04b.
  await UsuarioRepository.crear("carla@trotamundos.test", "Carla", password, "pt-BR");

  const madrid = await ViajeRepository.crear(ana, { nombre: "Escapada a Madrid", destino: "Madrid, España" });
  await ViajeRepository.crearReserva(
    madrid,
    {
      tipo: "VUELO",
      titulo: "EZE → MAD",
      proveedor: "Iberia",
      codigoConfirmacion: "IB6844",
      inicio: enDias(20, 23),
      fin: enDias(21, 13),
      ubicacion: { direccion: "Aeropuerto Ministro Pistarini, Ezeiza", lat: -34.8222, lng: -58.5358, zonaHoraria: "America/Argentina/Buenos_Aires" },
      ubicacionFin: { direccion: "Aeropuerto Adolfo Suárez Madrid-Barajas", lat: 40.4983, lng: -3.5676, zonaHoraria: "Europe/Madrid" },
      precio: { valor: 1250, moneda: "USD" },
    },
    "MANUAL",
  );
  await ViajeRepository.crearReserva(
    madrid,
    {
      tipo: "HOTEL",
      titulo: "Hotel Gran Vía",
      proveedor: "Booking",
      codigoConfirmacion: "BK-55120",
      inicio: enDias(21, 14),
      fin: enDias(25, 10),
      ubicacion: { direccion: "Gran Vía 25, Madrid", lat: 40.4203, lng: -3.7058, zonaHoraria: "Europe/Madrid" },
      precio: { valor: 480, moneda: "EUR" },
    },
    "MANUAL",
  );

  const cordoba = await ViajeRepository.crear(ana, { nombre: "Fin de semana en Córdoba", destino: "Córdoba, Argentina" });
  await ViajeRepository.crearReserva(
    cordoba,
    {
      tipo: "BUS",
      titulo: "Retiro → Córdoba",
      proveedor: "Andesmar",
      inicio: enDias(-12, 1),
      fin: enDias(-12, 11),
      ubicacion: { direccion: "Terminal de Retiro, Buenos Aires", zonaHoraria: "America/Argentina/Buenos_Aires" },
      ubicacionFin: { direccion: "Terminal de Ómnibus de Córdoba", zonaHoraria: "America/Argentina/Cordoba" },
      precio: { valor: 45000, moneda: "ARS" },
    },
    "MANUAL",
  );
  await ViajeRepository.crearReserva(
    cordoba,
    {
      tipo: "HOTEL",
      titulo: "Hostería Las Sierras",
      inicio: enDias(-12, 15),
      fin: enDias(-10, 13),
      ubicacion: { direccion: "Villa Carlos Paz", zonaHoraria: "America/Argentina/Cordoba" },
    },
    "MANUAL",
  );

  // Casilla de Ana ya autorizada (CON-02): el token de demo que el proveedor simulado reconoce,
  // guardado con Envelope Encryption como cualquier otro.
  await ConexionCorreoRepository.guardar(ana, "gmail", "ana@trotamundos.test", cifrar("tok-demo-ana"));

  // Whitelist de Ana (QA-03b): acepta correos de Booking y Despegar.
  await RemitenteRepository.agregar(ana, "@booking.com");
  await RemitenteRepository.agregar(ana, "@despegar.com");

  const bariloche = await ViajeRepository.crear(bruno, { nombre: "Ski en Bariloche", destino: "Bariloche, Argentina" });
  await ViajeRepository.crearReserva(
    bariloche,
    {
      tipo: "AUTO",
      titulo: "Alquiler 4x4",
      proveedor: "Hertz",
      inicio: enDias(40, 15),
      fin: enDias(47, 15),
      ubicacion: { direccion: "Aeropuerto de Bariloche", zonaHoraria: "America/Argentina/Salta" },
    },
    "MANUAL",
  );

  console.log("[db] datos de demo cargados (ana@, bruno@ y carla@trotamundos.test / demo1234)");
}

// --- Datos sintéticos para la analítica (UC-03) -------------------------------------------
// Viajeros ficticios con viajes pasados y futuros, para que los reportes del Data Warehouse
// muestren tendencias. Generador pseudoaleatorio con semilla fija: siempre los mismos datos.
function generador(semilla: number) {
  let x = semilla;
  return () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

const DESTINOS = [
  { nombre: "Madrid, España", zona: "Europe/Madrid", moneda: "EUR", peso: 5 },
  { nombre: "Lisboa, Portugal", zona: "Europe/Lisbon", moneda: "EUR", peso: 4 },
  { nombre: "Río de Janeiro, Brasil", zona: "America/Sao_Paulo", moneda: "BRL", peso: 6 },
  { nombre: "Bariloche, Argentina", zona: "America/Argentina/Salta", moneda: "ARS", peso: 5 },
  { nombre: "Nueva York, Estados Unidos", zona: "America/New_York", moneda: "USD", peso: 4 },
  { nombre: "Cancún, México", zona: "America/Cancun", moneda: "USD", peso: 3 },
  { nombre: "Roma, Italia", zona: "Europe/Rome", moneda: "EUR", peso: 3 },
  { nombre: "Santiago, Chile", zona: "America/Santiago", moneda: "CLP", peso: 2 },
];
const TIPOS = ["VUELO", "HOTEL", "AUTO", "TREN", "BUS"];
const ORIGENES = ["MANUAL", "EMAIL", "EMAIL", "AGENCIA", "AGENCIA"] as const;
const PROB_CANCELACION: Record<string, number> = { VUELO: 0.18, HOTEL: 0.1, AUTO: 0.08, TREN: 0.05, BUS: 0.12 };

async function sembrarDatosAnaliticos(): Promise<void> {
  const azar = generador(23);
  const elegir = <T>(l: readonly T[]) => l[Math.floor(azar() * l.length)];
  const destinoPonderado = () => {
    let r = azar() * DESTINOS.reduce((a, d) => a + d.peso, 0);
    return DESTINOS.find((d) => (r -= d.peso) < 0) ?? DESTINOS[0];
  };
  const password = await hashear(`sintetico-${Date.now()}`); // cuentas sin acceso real

  let reservas = 0;
  for (let n = 1; n <= 40; n++) {
    const usuario = await UsuarioRepository.crear(`viajero${String(n).padStart(2, "0")}@demo.test`, `Viajero ${n}`, password, "es-AR");
    const viajes = 1 + Math.floor(azar() * 3);
    for (let v = 0; v < viajes; v++) {
      const destino = destinoPonderado();
      const viajeId = await ViajeRepository.crear(usuario, { nombre: destino.nombre, destino: destino.nombre });
      const inicioViaje = Math.floor(azar() * 420) - 300; // entre ~10 meses atrás y ~4 meses adelante
      for (const tipo of TIPOS.filter((t) => t === "VUELO" || azar() < 0.45)) {
        const desde = enDias(inicioViaje + Math.floor(azar() * 3), 8 + Math.floor(azar() * 12));
        const r = await ViajeRepository.crearReserva(
          viajeId,
          {
            tipo,
            titulo: `${tipo} ${destino.nombre}`,
            inicio: desde,
            fin: new Date(desde.getTime() + (tipo === "HOTEL" ? 3 + Math.floor(azar() * 6) : 0.1 + azar()) * DIA),
            ubicacion: { zonaHoraria: destino.zona },
            precio: { valor: Math.round(50 + azar() * 1500), moneda: destino.moneda },
          },
          elegir(ORIGENES),
        );
        if (azar() < PROB_CANCELACION[tipo]) await ViajeRepository.cancelarReserva(r.id);
        reservas++;
      }
    }
  }
  console.log(`[db] datos sintéticos para analítica: 40 viajeros, ${reservas} reservas`);
}
