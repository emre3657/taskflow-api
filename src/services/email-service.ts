import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const logoUrl = `${process.env.FRONTEND_URL}/taskflow-logo.png`;

type SendPasswordResetEmailParams = {
  to: string;
  username: string;
  resetLink: string;
};

type SendEmailVerificationEmailParams = {
  to: string;
  username: string;
  verificationLink: string;
};

export async function sendPasswordResetEmail({
  to,
  username,
  resetLink,
}: SendPasswordResetEmailParams) {
  const from = process.env.MAIL_FROM;

  if (!from) {
    throw new Error("MAIL_FROM is not configured");
  }

  await resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html: `
      <div style="margin:0; padding:40px 16px; background:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
        <div style="max-width:640px; margin:0 auto;">
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:28px; padding:40px 32px; box-shadow:0 12px 32px rgba(15, 23, 42, 0.08);">
            
            <div style="text-align:center; margin-bottom:28px;">
              <img
                src="${logoUrl}"
                alt="TaskFlow"
                style="max-width:260px; width:100%; height:auto; display:inline-block;"
              />
            </div>

            <div style="text-align:center; margin-bottom:28px;">
              <h1 style="margin:0; font-size:30px; line-height:1.2; font-weight:700; color:#0f172a;">
                Reset your password
              </h1>
              <p style="margin:14px 0 0; font-size:15px; line-height:1.7; color:#475569;">
                Secure access to your TaskFlow account with a new password.
              </p>
            </div>

            <div style="margin-bottom:24px;">
              <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#334155;">
                Hello ${username},
              </p>

              <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#334155;">
                We received a request to reset the password for your TaskFlow account.
              </p>

              <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
                Click the button below to choose a new password. This link will expire in <strong>15 minutes</strong>.
              </p>
            </div>

            <div style="text-align:center; margin:32px 0;">
              <a
                href="${resetLink}"
                style="
                  display:inline-block;
                  background:#0f172a;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 24px;
                  border-radius:14px;
                  font-size:15px;
                  font-weight:700;
                  letter-spacing:0.01em;
                "
              >
                Reset Password
              </a>
            </div>

            <div style="margin:0 0 24px; padding:18px; border:1px solid #e2e8f0; border-radius:18px; background:#f8fafc;">
              <p style="margin:0 0 10px; font-size:13px; font-weight:700; color:#334155;">
                Button not working?
              </p>
              <p style="margin:0; font-size:13px; line-height:1.7; color:#475569; word-break:break-word;">
                Copy and paste this link into your browser:
                <br />
                <a href="${resetLink}" style="color:#2563eb; text-decoration:none;">
                  ${resetLink}
                </a>
              </p>
            </div>

            <div style="padding-top:20px; border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 10px; font-size:14px; line-height:1.7; color:#475569;">
                If you did not request this, you can safely ignore this email.
              </p>
              <p style="margin:0; font-size:14px; line-height:1.7; color:#475569;">
                Your current password will remain unchanged until you create a new one.
              </p>
            </div>
          </div>

          <p style="margin:16px 0 0; text-align:center; font-size:12px; color:#94a3b8;">
            © TaskFlow
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendEmailVerificationEmail({
  to,
  username,
  verificationLink,
}: SendEmailVerificationEmailParams) {
  const from = process.env.MAIL_FROM;

  if (!from) {
    throw new Error("MAIL_FROM is not configured");
  }

  await resend.emails.send({
    from,
    to,
    subject: "Verify your email",
    html: `
      <div style="margin:0; padding:40px 16px; background:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
        <div style="max-width:640px; margin:0 auto;">
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:28px; padding:40px 32px; box-shadow:0 12px 32px rgba(15, 23, 42, 0.08);">
            
            <div style="text-align:center; margin-bottom:28px;">
              <img
                src="${logoUrl}"
                alt="TaskFlow"
                style="max-width:260px; width:100%; height:auto; display:inline-block;"
              />
            </div>

            <div style="text-align:center; margin-bottom:28px;">
              <h1 style="margin:0; font-size:30px; line-height:1.2; font-weight:700; color:#0f172a;">
                Verify your email
              </h1>
              <p style="margin:14px 0 0; font-size:15px; line-height:1.7; color:#475569;">
                Confirm your email address to keep your account secure.
              </p>
            </div>

            <div style="margin-bottom:24px;">
              <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#334155;">
                Hello ${username},
              </p>

              <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#334155;">
                Welcome to TaskFlow. Please verify your email address to complete your account setup.
              </p>

              <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
                Click the button below to verify your email. This link will expire in <strong>30 minutes</strong>.
              </p>
            </div>

            <div style="text-align:center; margin:32px 0;">
              <a
                href="${verificationLink}"
                style="
                  display:inline-block;
                  background:#0f172a;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 24px;
                  border-radius:14px;
                  font-size:15px;
                  font-weight:700;
                  letter-spacing:0.01em;
                "
              >
                Verify Email
              </a>
            </div>

            <div style="margin:0 0 24px; padding:18px; border:1px solid #e2e8f0; border-radius:18px; background:#f8fafc;">
              <p style="margin:0 0 10px; font-size:13px; font-weight:700; color:#334155;">
                Button not working?
              </p>
              <p style="margin:0; font-size:13px; line-height:1.7; color:#475569; word-break:break-word;">
                Copy and paste this link into your browser:
                <br />
                <a href="${verificationLink}" style="color:#2563eb; text-decoration:none;">
                  ${verificationLink}
                </a>
              </p>
            </div>

            <div style="padding-top:20px; border-top:1px solid #e2e8f0;">
              <p style="margin:0; font-size:14px; line-height:1.7; color:#475569;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </div>
          </div>

          <p style="margin:16px 0 0; text-align:center; font-size:12px; color:#94a3b8;">
            © TaskFlow
          </p>
        </div>
      </div>
    `,
  });
}