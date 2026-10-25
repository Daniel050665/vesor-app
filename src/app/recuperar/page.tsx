import AuthShell from "@/components/AuthForm";
import { ForgotForm } from "@/components/auth/RecoveryForms";

export const metadata = { title: "Recuperar contraseña — Vesor" };

export default function RecuperarPage() {
  return (
    <AuthShell narrow>
      <ForgotForm />
    </AuthShell>
  );
}
