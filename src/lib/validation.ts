// Validaciones compartidas entre el navegador y el servidor. El servidor siempre vuelve a validar.

export const EXPERIENCE_LEVELS = [
  { value: "principiante", label: "Principiante", hint: "Estoy aprendiendo cómo funcionan las inversiones." },
  { value: "intermedio", label: "Intermedio", hint: "He invertido antes y conozco conceptos básicos." },
  { value: "avanzado", label: "Avanzado", hint: "Uso indicadores y analizo activos por mi cuenta." },
] as const;

export const INTERESTS = [
  { value: "tecnologia", label: "Tecnología" },
  { value: "ia", label: "Inteligencia artificial" },
  { value: "cripto", label: "Criptomonedas" },
  { value: "energia", label: "Energía" },
  { value: "salud", label: "Salud" },
  { value: "finanzas", label: "Finanzas" },
  { value: "mercado_general", label: "Mercado general" },
] as const;

export const GOALS = [
  { value: "aprender", label: "Aprender a invertir" },
  { value: "ahorro_largo_plazo", label: "Ahorrar a largo plazo" },
  { value: "ingresos", label: "Generar ingresos periódicos" },
  { value: "crecimiento", label: "Hacer crecer mi capital" },
] as const;

export const HORIZONS = [
  { value: "corto", label: "Menos de 1 año" },
  { value: "medio", label: "Entre 1 y 5 años" },
  { value: "largo", label: "Más de 5 años" },
] as const;

/** Pregunta sencilla para estimar la tolerancia al riesgo. */
export const RISK_QUESTION = {
  question: "Si tu inversión cae 20% en un mes, ¿qué harías?",
  options: [
    { value: "baja", label: "Vendería para no perder más" },
    { value: "media", label: "Esperaría a ver cómo evoluciona" },
    { value: "alta", label: "Lo vería como una oportunidad" },
  ],
} as const;

export type Experience = (typeof EXPERIENCE_LEVELS)[number]["value"];
export type Interest = (typeof INTERESTS)[number]["value"];
export type RiskTolerance = "baja" | "media" | "alta";

export const interestLabel = (value: string) => INTERESTS.find((i) => i.value === value)?.label ?? value;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return "Escribe tu correo electrónico.";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return null;
}

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("al menos 10 caracteres");
  if (password.length > 128) problems.push("máximo 128 caracteres");
  if (!/[a-z]/.test(password)) problems.push("una minúscula");
  if (!/[A-Z]/.test(password)) problems.push("una mayúscula");
  if (!/\d/.test(password)) problems.push("un número");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("un símbolo");
  return problems;
}

export function validatePassword(password: string): string | null {
  const problems = passwordProblems(password);
  return problems.length ? `La contraseña debe tener ${problems.join(", ")}.` : null;
}

export function ageFrom(birthDate: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age--;
  return age;
}

export type PreferencesInput = {
  experience: Experience;
  interests: Interest[];
  goal: string | null;
  horizon: string | null;
  risk_tolerance: RiskTolerance | null;
};

export type RegisterInput = PreferencesInput & {
  full_name: string;
  email: string;
  password: string;
  birth_date: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export function validatePreferences(raw: Record<string, unknown>): Result<PreferencesInput> {
  const errors: Record<string, string> = {};
  const experience = String(raw.experience ?? "");
  if (!EXPERIENCE_LEVELS.some((l) => l.value === experience)) errors.experience = "Elige tu nivel de experiencia.";

  const interestsRaw = Array.isArray(raw.interests) ? raw.interests.map(String) : [];
  const interests = Array.from(new Set(interestsRaw)).filter((i) => INTERESTS.some((x) => x.value === i)) as Interest[];
  if (interests.length === 0) errors.interests = "Elige al menos un interés.";

  const goal = raw.goal ? String(raw.goal) : null;
  if (goal && !GOALS.some((g) => g.value === goal)) errors.goal = "Objetivo no válido.";
  const horizon = raw.horizon ? String(raw.horizon) : null;
  if (horizon && !HORIZONS.some((h) => h.value === horizon)) errors.horizon = "Horizonte no válido.";
  const risk = raw.risk_tolerance ? String(raw.risk_tolerance) : null;
  if (risk && !["baja", "media", "alta"].includes(risk)) errors.risk_tolerance = "Opción no válida.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: { experience: experience as Experience, interests, goal, horizon, risk_tolerance: risk as RiskTolerance | null },
  };
}

export function validateRegister(raw: Record<string, unknown>): Result<RegisterInput> {
  const errors: Record<string, string> = {};
  const full_name = String(raw.full_name ?? "").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(raw.email);
  const password = String(raw.password ?? "");
  const birth_date = String(raw.birth_date ?? "");

  if (full_name.length < 3 || !full_name.includes(" ")) errors.full_name = "Escribe tu nombre y apellido.";
  else if (full_name.length > 100) errors.full_name = "El nombre es muy largo (máximo 100 caracteres).";
  else if (/[<>{}]/.test(full_name)) errors.full_name = "El nombre contiene caracteres no permitidos.";

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (raw.password_confirm !== undefined && raw.password_confirm !== password)
    errors.password_confirm = "Las contraseñas no coinciden.";

  const age = ageFrom(birth_date);
  if (age === null) errors.birth_date = "Escribe una fecha de nacimiento válida.";
  else if (age < 18) errors.birth_date = "Debes ser mayor de edad para crear una cuenta.";
  else if (age > 120) errors.birth_date = "Revisa la fecha de nacimiento.";

  if (raw.accept_terms !== true) errors.accept_terms = "Debes aceptar que Vesor es una herramienta informativa.";

  const prefs = validatePreferences(raw);
  if (!prefs.ok) Object.assign(errors, prefs.errors);

  if (Object.keys(errors).length || !prefs.ok) return { ok: false, errors };
  return { ok: true, data: { ...prefs.data, full_name, email, password, birth_date } };
}
