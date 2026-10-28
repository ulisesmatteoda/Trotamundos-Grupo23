// Registro de adaptadores concretos (único lugar del sistema que los conoce).
// Incorporar un proveedor = crear su adaptador y agregarlo a esta lista (QA-05a).
import { config } from "../config";
import { IAgenciaAdapter } from "./IAgenciaAdapter";
import { BookingAdapter } from "./adapters/BookingAdapter";
import { DespegarAdapter } from "./adapters/DespegarAdapter";
import { TrenAdapter } from "./adapters/TrenAdapter";

export const adaptadoresDeAgencias = (): IAgenciaAdapter[] => [
  new BookingAdapter(`${config.agenciasUrl}/booking`),
  new DespegarAdapter(`${config.agenciasUrl}/despegar`),
  new TrenAdapter(`${config.agenciasUrl}/tren`),
];
