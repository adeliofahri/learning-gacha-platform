import { Resend } from "resend";
import { env } from "@/lib/env";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendVerificationEmail(params: {
  to: string;
  token: string;
}): Promise<void> {
  // Integration test tidak perlu mengirim email sungguhan.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const config = env();

  if (!config.RESEND_API_KEY || !config.EMAIL_FROM) {
    throw new Error("RESEND_API_KEY dan EMAIL_FROM wajib dikonfigurasi");
  }

  const resend = new Resend(config.RESEND_API_KEY);

  const verificationUrl = new URL("/verify-email", config.APP_URL);
  verificationUrl.searchParams.set("token", params.token);

  const safeUrl = escapeHtml(verificationUrl.toString());

  const { error } = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: params.to,
    subject: "Verifikasi Email - Learning Gacha",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Selamat datang di Learning Gacha!</h2>
        <p>Terima kasih telah mendaftar.</p>
        <p>Silakan verifikasi alamat email dengan menekan tombol berikut:</p>
        <p style="margin: 28px 0;">
          <a
            href="${safeUrl}"
            style="background: #2563eb; color: white; padding: 12px 20px;
                   border-radius: 8px; text-decoration: none;"
          >
            Verifikasi Email
          </a>
        </p>
        <p>Tautan ini hanya berlaku selama 30 menit dan hanya dapat digunakan satu kali.</p>
        <p>Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
      </div>
    `,
    text: [
      "Selamat datang di Learning Gacha!",
      "Silakan verifikasi email melalui tautan berikut:",
      verificationUrl.toString(),
      "Tautan berlaku selama 30 menit.",
      "Jika kamu tidak merasa mendaftar, abaikan email ini.",
    ].join("\n\n"),
  });

  if (error) {
    console.error("[email] Failed to send verification email:", error);
    throw new Error("Gagal mengirim email verifikasi");
  }
}


export async function sendPasswordResetEmail(params: {
  to: string;
  token: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const config = env();

  if (!config.RESEND_API_KEY || !config.EMAIL_FROM) {
    throw new Error("RESEND_API_KEY dan EMAIL_FROM wajib dikonfigurasi");
  }

  const resend = new Resend(config.RESEND_API_KEY);

  const resetUrl = new URL("/reset-password", config.APP_URL);
  resetUrl.searchParams.set("token", params.token);

  const safeUrl = escapeHtml(resetUrl.toString());

  const { error } = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: params.to,
    subject: "Reset Password - Learning Gacha",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Reset Password Learning Gacha</h2>
        <p>Kami menerima permintaan untuk mengatur ulang password akun kamu.</p>
        <p>Tekan tombol berikut untuk membuat password baru:</p>
        <p style="margin: 28px 0;">
          <a
            href="${safeUrl}"
            style="background: #2563eb; color: white; padding: 12px 20px;
                   border-radius: 8px; text-decoration: none;"
          >
            Reset Password
          </a>
        </p>
        <p>Tautan ini berlaku selama 30 menit dan hanya dapat digunakan satu kali.</p>
        <p>Jika kamu tidak meminta reset password, abaikan email ini.
        Password akun kamu tidak akan berubah.</p>
      </div>
    `,
    text: [
      "Reset Password Learning Gacha",
      "Kami menerima permintaan untuk mengatur ulang password akun kamu.",
      "Buka tautan berikut untuk membuat password baru:",
      resetUrl.toString(),
      "Tautan berlaku selama 30 menit dan hanya dapat digunakan satu kali.",
      "Jika kamu tidak meminta reset password, abaikan email ini.",
    ].join("\n\n"),
  });

  if (error) {
    console.error("[email] Failed to send password reset email:", error);
    throw new Error("Gagal mengirim email reset password");
  }
}
