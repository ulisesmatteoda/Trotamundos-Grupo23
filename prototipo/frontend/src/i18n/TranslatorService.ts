// Translation Engine (Iteración 4, Vista de Módulos): carga bajo demanda los paquetes de idioma
// (es.json, en.json, pt.json) que nginx sirve como estáticos cacheables (CDN, ADR-007) y
// resuelve las claves con interpolación de parámetros.

export type Diccionario = Record<string, string>;
export type Parametros = Record<string, string | number>;

const cargados = new Map<string, Promise<Diccionario>>();

export function cargarIdioma(idioma: string): Promise<Diccionario> {
  let promesa = cargados.get(idioma);
  if (!promesa) {
    promesa = fetch(`/locales/${idioma}.json`).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar el idioma ${idioma}`);
      return r.json() as Promise<Diccionario>;
    });
    promesa.catch(() => cargados.delete(idioma));
    cargados.set(idioma, promesa);
  }
  return promesa;
}

// Si la clave no existe se devuelve `respaldo` o la clave misma, nunca un error.
export function traducir(dic: Diccionario, clave: string, params?: Parametros, respaldo?: string): string {
  const texto = dic[clave] ?? respaldo ?? clave;
  return params ? texto.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`)) : texto;
}
