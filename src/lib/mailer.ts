// Envío de correos transaccionales. Proveedor opcional: Resend (RESEND_API_KEY + MAIL_FROM).
// Sin proveedor configurado, en desarrollo el enlace se muestra en la consola del servidor.

export async function sendMail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[correo de desarrollo] Para: ${to}\nAsunto: ${subject}\n${text}\n`);
      return { delivered: false, dev: true };
    }
    console.error("[mailer] RESEND_API_KEY / MAIL_FROM no configurados; no se envió el correo.");
    return { delivered: false, dev: false };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!response.ok) console.error("[mailer] Error del proveedor de correo:", response.status);
    return { delivered: response.ok, dev: false };
  } catch (error) {
    console.error("[mailer] No se pudo contactar al proveedor de correo", error);
    return { delivered: false, dev: false };
  }
}
