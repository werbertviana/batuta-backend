import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendPasswordResetEmailInput = {
  to: string;
  token: string;
};

function buildResetPasswordHtml(resetUrl: string) {
  return `
  <div style="margin:0;padding:0;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;">
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background:#f4f7f8;padding:32px 12px;"
    >
      <tr>
        <td align="center">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width:560px;
              background:#ffffff;
              border-radius:22px;
              overflow:hidden;
              border:1px solid #e5e7eb;
            "
          >

            <tr>
              <td
                style="
                  background:#2FAFC4;
                  padding:30px 24px;
                  text-align:center;
                "
              >
                <h1
                  style="
                    margin:0;
                    color:#ffffff;
                    font-size:34px;
                    letter-spacing:1px;
                  "
                >
                  Batuta
                </h1>

                <p
                  style="
                    margin:8px 0 0;
                    color:#eafcff;
                    font-size:15px;
                  "
                >
                  Educação musical gamificada
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 30px 28px;">

                <h2
                  style="
                    margin:0 0 14px;
                    color:#222222;
                    font-size:26px;
                  "
                >
                  Redefinição de senha
                </h2>

                <p
                  style="
                    margin:0 0 18px;
                    color:#444444;
                    font-size:16px;
                    line-height:26px;
                  "
                >
                  Recebemos uma solicitação para redefinir a senha da sua conta no Batuta.
                </p>

                <p
                  style="
                    margin:0 0 26px;
                    color:#444444;
                    font-size:16px;
                    line-height:26px;
                  "
                >
                  Toque no botão abaixo para criar uma nova senha.
                  Este link expira em
                  <strong>15 minutos</strong>.
                </p>

                <div style="text-align:center;margin:30px 0;">

                  <a
                    href="${resetUrl}"
                    style="
                      display:inline-block;
                      background:#2FAFC4;
                      color:#ffffff;
                      text-decoration:none;
                      font-size:17px;
                      font-weight:bold;
                      padding:16px 30px;
                      border-radius:14px;
                    "
                  >
                    Redefinir senha
                  </a>

                </div>

                <p
                  style="
                    margin:24px 0 0;
                    color:#777777;
                    font-size:14px;
                    line-height:24px;
                    text-align:center;
                  "
                >
                  Caso o aplicativo não abra automaticamente,
                  utilize o botão exibido na página que será aberta no navegador.
                </p>

                <p
                  style="
                    margin:28px 0 0;
                    color:#8a8a8a;
                    font-size:13px;
                    line-height:22px;
                  "
                >
                  Se você não solicitou essa alteração,
                  ignore este email.
                  Sua senha atual continuará a mesma.
                </p>

              </td>
            </tr>

            <tr>
              <td
                style="
                  background:#f9fafb;
                  padding:18px 24px;
                  text-align:center;
                  border-top:1px solid #eef0f2;
                "
              >
                <p
                  style="
                    margin:0;
                    color:#8a8a8a;
                    font-size:12px;
                  "
                >
                  © Batuta — Aprenda música de forma leve e divertida.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </div>
  `;
}

export async function sendPasswordResetEmail({
  to,
  token,
}: SendPasswordResetEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[MAIL_DISABLED] RESEND_API_KEY não configurada");
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Batuta <onboarding@resend.dev>";

  const resetBaseUrl =
    process.env.APP_RESET_PASSWORD_URL ||
    "https://batuta-reset-link.vercel.app";

  const resetUrl =
    `${resetBaseUrl}?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Redefina sua senha no Batuta",
    html: buildResetPasswordHtml(resetUrl),
  });

  if (error) {
    console.log("[RESEND_ERROR]", error);

    throw new Error(
      "Não foi possível enviar o email de recuperação.",
    );
  }

  console.log("[RESEND_EMAIL_SENT]", { to });
}