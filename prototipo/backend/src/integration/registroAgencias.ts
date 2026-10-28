// Registro de adaptadores concretos (único lugar del sistema que los conoce).
// Incorporar un proveedor = crear su adaptador y agregarlo a la lista correspondiente (QA-05a).
import { config } from "../config";
import { IAgenciaAdapter } from "./IAgenciaAdapter";
import { BookingAdapter } from "./adapters/BookingAdapter";
import { DespegarAdapter } from "./adapters/DespegarAdapter";
import { TrenAdapter } from "./adapters/TrenAdapter";
import { IRedSocialAdapter } from "./redes/IRedSocialAdapter";
import { FacebookAdapter } from "./redes/FacebookAdapter";
import { XAdapter } from "./redes/XAdapter";
import { IAgenciaSoporteAdapter } from "./soporte/IAgenciaSoporteAdapter";
import { DespegarSoporteAdapter } from "./soporte/DespegarSoporteAdapter";

// Proveedores de reservas (ADR-002)
export const adaptadoresDeAgencias = (): IAgenciaAdapter[] => [
  new BookingAdapter(`${config.agenciasUrl}/booking`),
  new DespegarAdapter(`${config.agenciasUrl}/despegar`),
  new TrenAdapter(`${config.agenciasUrl}/tren`),
];

// Redes sociales (ADR-009)
export const adaptadoresDeRedes = (): IRedSocialAdapter[] => [
  new FacebookAdapter(`${config.socialUrl}/facebook`, config.socialTokenApp),
  new XAdapter(`${config.socialUrl}/x`, config.socialTokenApp),
];

// Agencias de soporte (ADR-009)
export const adaptadoresDeSoporte = (): IAgenciaSoporteAdapter[] => [new DespegarSoporteAdapter(`${config.agenciasUrl}/despegar`)];
