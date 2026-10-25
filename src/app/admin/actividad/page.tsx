import { requireAdmin } from "@/lib/auth";
import { queryActivity, type ActivityFilters as Filters } from "@/lib/activity-query";
import ActivityTimeline from "@/components/ActivityTimeline";
import ActivityFilters, { Pager } from "@/components/ActivityFilters";

export const dynamic = "force-dynamic";

export default async function AdminActivity({ searchParams }: { searchParams: Filters }) {
  await requireAdmin();
  const { rows, page, hasMore } = await queryActivity(searchParams, null);
  return (
    <div>
      <p className="muted">Registros de todos los usuarios. Las conversaciones y análisis privados no se enlazan desde aquí.</p>
      <ActivityFilters action="/admin/actividad" filters={searchParams} withUser />
      <ActivityTimeline rows={rows} showUser />
      <Pager action="/admin/actividad" filters={searchParams} page={page} hasMore={hasMore} />
    </div>
  );
}
