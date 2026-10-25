import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crear cuenta — Vesor" };

export default async function RegistroPage() {
  if (await getCurrentUser()) redirect("/panel");
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
