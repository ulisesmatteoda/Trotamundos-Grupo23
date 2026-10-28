// Datos de demostración (solo con SEED_DEMO=true y la base vacía).
// Las fechas son relativas al momento del seed para que la demo siempre tenga
// un viaje próximo y uno ya terminado que el ArchivadoJob debe archivar.
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

export async function sembrarDemo(): Promise<void> {
  if (await UsuarioRepository.hayUsuarios()) return;
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
