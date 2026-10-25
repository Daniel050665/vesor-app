export const TIPOS = [
  "Criptomonedas",
  "Acciones / ETF",
  "Forex / divisas",
  "Trading con 'señales' o bots",
  "Fondo o club de inversión",
  "Negocio / préstamo a terceros",
  "Otro",
] as const;

export const FUENTES = [
  "Influencer / creador de contenido",
  "Grupo de WhatsApp / Telegram / Discord",
  "Amigo o conocido",
  "Anuncio en redes sociales",
  "Plataforma o app conocida",
  "Otra",
] as const;

export const REGULADA = ["Sí", "No", "No sé"] as const;

export interface OportunidadInput {
  nombre: string;
  tipo: string;
  fuente: string;
  rentabilidad_pct: number;
  periodo: "mensual" | "anual" | "total";
  monto: number;
  garantizada: boolean;
  presion: boolean;
  regulada: string;
  evidencia: string;
}

export type Nivel = "bajo" | "medio" | "alto";

export interface Factor {
  titulo: string;
  detalle: string;
}

export interface ResultadoRiesgo {
  nivel: Nivel;
  resumen: string;
  factores: Factor[];
  recomendacion: string;
  confianza: "baja" | "media" | "alta";
  informacion_faltante: string[];
}

/** Valida y normaliza lo que llega del cliente. Devuelve errores que dicen cómo corregir. */
export function validarInput(raw: any): { ok: true; data: OportunidadInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const nombre = String(raw?.nombre ?? "").trim();
  const evidencia = String(raw?.evidencia ?? "").trim();
  const rentabilidad = Number(raw?.rentabilidad_pct);
  const monto = Number(raw?.monto);

  if (nombre.length < 2) errors.nombre = "Escribe el nombre de la empresa, proyecto o persona (mínimo 2 letras).";
  if (nombre.length > 120) errors.nombre = "El nombre es muy largo (máximo 120 caracteres).";
  if (!TIPOS.includes(raw?.tipo)) errors.tipo = "Selecciona el tipo de inversión de la lista.";
  if (!FUENTES.includes(raw?.fuente)) errors.fuente = "Selecciona dónde te enteraste de esta oportunidad.";
  if (!Number.isFinite(rentabilidad) || rentabilidad <= 0)
    errors.rentabilidad_pct = "Ingresa la rentabilidad prometida como un número mayor que 0 (ej: 15).";
  else if (rentabilidad > 100000) errors.rentabilidad_pct = "Ese porcentaje parece un error. Revisa el número.";
  if (!["mensual", "anual", "total"].includes(raw?.periodo)) errors.periodo = "Selecciona el periodo de la rentabilidad.";
  if (!Number.isFinite(monto) || monto <= 0)
    errors.monto = "Ingresa el monto que piensas invertir, mayor que 0 (ej: 500000).";
  if (!REGULADA.includes(raw?.regulada)) errors.regulada = "Indica si está regulada, aunque sea 'No sé'.";
  if (evidencia.length < 20)
    errors.evidencia = "Cuéntanos más: describe qué te prometen y cómo funciona (mínimo 20 caracteres).";
  if (evidencia.length > 3000) errors.evidencia = "Máximo 3000 caracteres. Resume lo más importante.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      nombre,
      tipo: raw.tipo,
      fuente: raw.fuente,
      rentabilidad_pct: rentabilidad,
      periodo: raw.periodo,
      monto,
      garantizada: Boolean(raw.garantizada),
      presion: Boolean(raw.presion),
      regulada: raw.regulada,
      evidencia,
    },
  };
}
