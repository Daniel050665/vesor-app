"use client";

import { EXPERIENCE_LEVELS, GOALS, HORIZONS, INTERESTS, RISK_QUESTION } from "@/lib/validation";

export type PreferenceValues = {
  experience: string;
  interests: string[];
  goal: string;
  horizon: string;
  risk_tolerance: string;
};

type Props = {
  values: PreferenceValues;
  onChange: (values: PreferenceValues) => void;
  errors: Record<string, string>;
};

/** Campos de perfil inversor compartidos por el registro y la página de perfil. */
export default function PreferenceFields({ values, onChange, errors }: Props) {
  const set = <K extends keyof PreferenceValues>(key: K, value: PreferenceValues[K]) => onChange({ ...values, [key]: value });
  const toggleInterest = (value: string) =>
    set("interests", values.interests.includes(value) ? values.interests.filter((i) => i !== value) : [...values.interests, value]);
  const Err = ({ k }: { k: string }) => (errors[k] ? <div className="field-error">{errors[k]}</div> : null);

  return (
    <>
      <label id="experience-label">Nivel de experiencia en inversiones</label>
      <div className="option-cards" role="radiogroup" aria-labelledby="experience-label">
        {EXPERIENCE_LEVELS.map((l) => (
          <button type="button" role="radio" aria-checked={values.experience === l.value} key={l.value} className="option-card" onClick={() => set("experience", l.value)}>
            <strong>{l.label}</strong>
            <span>{l.hint}</span>
          </button>
        ))}
      </div>
      <Err k="experience" />

      <label id="interests-label">Intereses principales <span className="optional">(elige uno o varios)</span></label>
      <div className="toggle-group" role="group" aria-labelledby="interests-label">
        {INTERESTS.map((i) => (
          <button type="button" key={i.value} className="toggle" aria-pressed={values.interests.includes(i.value)} onClick={() => toggleInterest(i.value)}>
            {i.label}
          </button>
        ))}
      </div>
      <Err k="interests" />

      <div className="form-section">
        <h2>Objetivos y riesgo <span className="optional">(opcional)</span></h2>
        <div className="row">
          <div>
            <label htmlFor="goal">Objetivo principal</label>
            <select id="goal" value={values.goal} onChange={(e) => set("goal", e.target.value)}>
              <option value="">Prefiero no decirlo</option>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <Err k="goal" />
          </div>
          <div>
            <label htmlFor="horizon">¿En cuánto tiempo necesitarías el dinero?</label>
            <select id="horizon" value={values.horizon} onChange={(e) => set("horizon", e.target.value)}>
              <option value="">Prefiero no decirlo</option>
              {HORIZONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            <Err k="horizon" />
          </div>
        </div>
        <label id="risk-label">{RISK_QUESTION.question}</label>
        <div className="toggle-group" role="radiogroup" aria-labelledby="risk-label">
          {RISK_QUESTION.options.map((o) => (
            <button type="button" role="radio" key={o.value} className="toggle" aria-checked={values.risk_tolerance === o.value}
              onClick={() => set("risk_tolerance", values.risk_tolerance === o.value ? "" : o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="field-hint">Usamos tu respuesta para advertirte cuando un activo sea más volátil de lo que indicas.</p>
        <Err k="risk_tolerance" />
      </div>
    </>
  );
}
