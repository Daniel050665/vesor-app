import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthForm";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Iniciar sesión — Vesor" };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/panel");
  const next = searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//") ? searchParams.next : undefined;
  return (
    <AuthShell narrow>
      <LoginForm next={next} notice={next ? "Inicia sesión para continuar." : undefined} />
    </AuthShell>
  );
}
