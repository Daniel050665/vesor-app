import Simulator from "@/components/Simulator";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Análisis de riesgo — Vesor" };

export default async function AnalizarPage() {
  await requireUser("/analizar");
  return <Simulator />;
}
