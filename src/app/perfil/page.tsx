import { requireUser } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { PasswordForm, PreferencesForm } from "@/components/ProfileForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi perfil — Vesor" };

export default async function PerfilPage() {
  const user = await requireUser("/perfil");
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>Tu cuenta y preferencias</h1>
          <p className="muted">Puedes cambiar tus intereses, nivel y tolerancia al riesgo cuando quieras; la personalización se actualiza al instante.</p>
        </div>
      </div>
      <div className="dash-grid">
        <PreferencesForm
          initialName={user.full_name}
          initial={{
            experience: user.experience,
            interests: user.interests,
            goal: user.goal ?? "",
            horizon: user.horizon ?? "",
            risk_tolerance: user.risk_tolerance ?? "",
          }}
        />
        <div>
          <section className="card">
            <h2>Datos de la cuenta</h2>
            <div className="tl-details" style={{ marginTop: 0 }}>
              <dl>
                <dt>Correo</dt><dd>{user.email}</dd>
                <dt>Rol</dt><dd>{user.role === "admin" ? "Administrador" : "Usuario"}</dd>
                <dt>Miembro desde</dt><dd>{dateTime(user.created_at)}</dd>
                <dt>Último acceso</dt><dd>{user.last_login_at ? dateTime(user.last_login_at) : "—"}</dd>
              </dl>
            </div>
          </section>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
