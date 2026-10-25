import { requireAdmin } from "@/lib/auth";
import AdminTabs from "@/components/admin/AdminTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración — Vesor" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Cada página y cada API de administración vuelven a verificar el rol en el servidor.
  await requireAdmin();
  return (
    <div>
      <div className="page-head" style={{ marginBottom: 14 }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p>
          <h1>Panel de administración</h1>
        </div>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
