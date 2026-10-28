// Textos de la interfaz en español. En la Fase 3 se reemplazan por el I18nProvider
// con paquetes es.json / en.json (ADR-008); el backend ya devuelve solo códigos.

export const TIPOS_RESERVA: Record<string, string> = {
  VUELO: "Vuelo",
  HOTEL: "Hotel",
  AUTO: "Auto",
  TREN: "Tren",
  BUS: "Bus",
};

const ERRORES: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Email o contraseña incorrectos.",
  TOKEN_REQUERIDO: "Tu sesión terminó. Ingresá de nuevo.",
  TOKEN_INVALIDO: "Tu sesión terminó. Ingresá de nuevo.",
  VIAJE_NO_ENCONTRADO: "El viaje ya no existe.",
  RESERVA_NO_ENCONTRADA: "La reserva ya no existe.",
  DATOS_INVALIDOS: "Revisá los campos marcados.",
  REMITENTE_DUPLICADO: "Ese remitente ya está en la lista.",
  REMITENTE_NO_ENCONTRADO: "El remitente ya no está en la lista.",
  AGENCIA_DESCONOCIDA: "No hay integración con ese proveedor.",
  AGENCIA_NO_DISPONIBLE: "El proveedor no responde en este momento. Probá más tarde.",
  SIN_CONEXION: "No se pudo conectar con el servidor.",
  ERROR_INTERNO: "Ocurrió un error inesperado.",
};

const ERRORES_CAMPO: Record<string, string> = {
  REQUERIDO: "Este campo es obligatorio.",
  TEXTO_INVALIDO: "Ingresá un texto válido.",
  DEMASIADO_LARGO: "Es demasiado largo.",
  FECHA_INVALIDA: "Ingresá una fecha y hora válidas.",
  ANTERIOR_AL_INICIO: "Tiene que ser posterior al inicio.",
  ZONA_HORARIA_INVALIDA: "Elegí una zona horaria de la lista.",
  NUMERO_INVALIDO: "Ingresá un número mayor o igual a 0.",
  MONEDA_INVALIDA: "Usá un código de 3 letras (ej. USD).",
  TIPO_INVALIDO: "Elegí un tipo de la lista.",
  REMITENTE_INVALIDO: "Usá una dirección (reservas@aerolinea.com) o un dominio (@booking.com).",
};

export const ORIGEN_RESERVA: Record<string, string> = {
  EMAIL: "Importada de tu correo",
  AGENCIA: "Sincronizada con el proveedor",
};

export const ESTADO_RESERVA: Record<string, string> = {
  MODIFICADA: "Modificada",
  CANCELADA: "Cancelada",
};

// Nombre visible de cada integración; si llega una nueva sin traducción se muestra su nombre técnico.
export const NOMBRE_AGENCIA: Record<string, string> = {
  booking: "Booking",
  despegar: "Despegar",
  tren: "Trenes",
};

export const mensajeError = (codigo: string) => ERRORES[codigo] ?? ERRORES.ERROR_INTERNO;
export const mensajeCampo = (codigo: string) => ERRORES_CAMPO[codigo] ?? codigo;
