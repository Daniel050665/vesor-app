import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { interestLabel } from "@/lib/validation";
import UserActions from "@/components/admin/UserActions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  experience: string;
  interests: string[];
  risk_tolerance: string | null;
  created_at: string;
  last_login_at: string | null;
  activities: number;
};

export default async function AdminUsers({ searchParams }: { searchParams: { q?: string; estado?: string; rol?: string } }) {
  const admin = await requireAdmin();
  const params: unknown[] = [];
  const where: string[] = [];
  if (searchParams.q?.trim()) {
    params.push(`%${searchParams.q.trim().toLowerCase().slice(0, 80)}%`);
    where.push(`(lower(u.email) like $${params.length} or lower(u.full_name) like $${params.length})`);
  }
  if (searchParams.estado === "active" || searchParams.estado === "suspended") {
    params.push(searchParams.estado);
    where.push(`u.status = $${params.length}`);
  }
  if (searchParams.rol === "admin" || searchParams.rol === "user") {
    params.push(searchParams.rol);
    where.push(`u.role = $${params.length}`);
  }
  // Nunca se seleccionan los hashes de contraseña.
  const users = await query<Row>(
    `select u.id, u.email, u.full_name, u.role, u.status, u.experience, u.interests, u.risk_tolerance, u.created_at, u.last_login_at,
       (select count(*)::int from activity_log a where a.user_id = u.id) as activities
     from app_users u ${where.length ? `where ${where.join(" and ")}` : ""}
     order by u.created_at desc limit 200`,
    params
  );

  return (
    <div>
      <form action="/admin/usuarios" className="filter-bar" style={{ gridTemplateColumns: "2fr 1fr 1fr auto" }}>
        <div>
          <label htmlFor="q">Buscar por nombre o correo</label>
          <input id="q" name="q" defaultValue={searchParams.q} />
        </div>
        <div>
          <label htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={searchParams.estado ?? ""}>
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>
        <div>
          <label htmlFor="rol">Rol</label>
          <select id="rol" name="rol" defaultValue={searchParams.rol ?? ""}>
            <option value="">Todos</option>
            <option value="user">Usuarios</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="pill pill-primary">Filtrar</button>
          <Link href="/admin/usuarios" className="pill pill-outline">Limpiar</Link>
        </div>
      </form>
      <p className="muted small">{users.length} cuenta(s)</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th><th>Rol</th><th>Estado</th><th>Perfil</th><th>Registro</th><th>Último acceso</th><th className="num">Actividades</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.full_name}</strong><div className="muted small">{u.email}</div></td>
                <td>{u.role === "admin" ? <span className="chip chip-gold">admin</span> : <span className="chip">usuario</span>}</td>
                <td><span className={`status-dot ${u.status === "active" ? "status-ok" : "status-error"}`} />{u.status === "active" ? "Activa" : "Suspendida"}</td>
                <td className="small">{u.experience} · riesgo {u.risk_tolerance ?? "—"}<div className="muted">{u.interests.map(interestLabel).join(", ")}</div></td>
                <td className="small">{dateTime(u.created_at)}</td>
                <td className="small">{u.last_login_at ? dateTime(u.last_login_at) : "—"}</td>
                <td className="num"><Link href={`/admin/actividad?usuario=${encodeURIComponent(u.email)}`}>{u.activities}</Link></td>
                <td><UserActions id={u.id} email={u.email} status={u.status} role={u.role} isSelf={u.id === admin.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="disclaimer">Por privacidad, el panel no muestra contraseñas ni el contenido de las conversaciones de los usuarios.</p>
    </div>
  );
}
