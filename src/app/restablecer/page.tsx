import AuthShell from "@/components/AuthForm";
import { ResetForm } from "@/components/auth/RecoveryForms";

export const metadata = { title: "Nueva contraseña — Vesor" };

export default function RestablecerPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <AuthShell narrow>
      <ResetForm token={searchParams.token ?? ""} />
    </AuthShell>
  );
}
