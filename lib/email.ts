import nodemailer from 'nodemailer';
import { connectDB, EmailLog } from '@/lib/db';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
}

export function renderEmailTemplate(
    template: string,
    data: { name?: string; email?: string; role?: string; [k: string]: any } = {}
): string {
    const appName = "VexaNode";
    const appUrl = (process.env.NEXTAUTH_URL || "https://vps.vexanode.cloud").replace(/\/+$/, "");
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
    const yearFormatted = String(now.getFullYear());

    const fallbackName = data.name?.trim() || (data.email ? data.email.split("@")[0] : "Customer");

    return template
        .replace(/{{\s*name\s*}}/gi, fallbackName)
        .replace(/{{\s*email\s*}}/gi, data.email || "")
        .replace(/{{\s*role\s*}}/gi, data.role || "CLIENT")
        .replace(/{{\s*date\s*}}/gi, dateFormatted)
        .replace(/{{\s*year\s*}}/gi, yearFormatted)
        .replace(/{{\s*(?:app_name|appName)\s*}}/gi, appName)
        .replace(/{{\s*(?:dashboard_url|dashboardUrl|app_url|appUrl)\s*}}/gi, `${appUrl}/client`)
        .replace(/{{\s*(?:support_url|supportUrl)\s*}}/gi, `${appUrl}/support`);
}

export function getFormattedSender(): string {
    const fromName = process.env.SMTP_FROM_NAME || "VexaNode";
    const rawFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@vexanode.gg";

    // If it already has an address in <...>, extract name and address
    if (rawFrom.includes("<") && rawFrom.includes(">")) {
        const emailMatch = rawFrom.match(/<([^>]+)>/);
        const address = emailMatch ? emailMatch[1].trim() : rawFrom;
        const namePart = rawFrom.replace(/<[^>]+>/, "").replace(/["']/g, "").trim();
        const name = namePart || fromName;
        return `"${name}" <${address}>`;
    }

    // Clean any accidental quotes/angle brackets and construct standard RFC 5322 From header
    const address = rawFrom.replace(/["'<>]/g, "").trim();
    return `"${fromName}" <${address}>`;
}

/**
 * F-014: Sanitize email content before recording into EmailLog.
 * Redacts one-time password reset tokens and temporary/root passwords so they
 * are never stored indefinitely in administrative database logs.
 */
function sanitizeEmailContentForAudit(content: string): string {
    if (!content) return "";
    let sanitized = content.replace(/([?&]token=)[a-zA-Z0-9_-]+/gi, "$1[REDACTED]");
    sanitized = sanitized.replace(/(password[:\s=]+)[^\s<"']+/gi, "$1[REDACTED]");
    return sanitized.substring(0, 5000);
}

export const sendEmail = async (
    to: string,
    subject: string,
    html: string,
    sentBy: string = 'SYSTEM',
    text?: string
) => {
    const t = getTransporter();
    if (!t) {
        console.warn("SMTP configuration missing. Email not sent.");
        return false;
    }

    try {
        const sender = getFormattedSender();
        await t.sendMail({
            from: sender,
            replyTo: sender,
            to,
            subject,
            html,
            text: text || undefined,
        });

        try {
            await connectDB();
            await EmailLog.create({
                recipient: to,
                subject,
                content: sanitizeEmailContentForAudit(html),
                status: 'SENT',
                sentBy,
            });
        } catch (e) {
            console.error("Failed to log email:", e);
        }

        console.log(`Email sent to ${to}: ${subject}`);
        return true;
    } catch (error: unknown) {
        console.error("Email sending failed:", error);
        const message = error instanceof Error ? error.message : "Unknown SMTP error";
        try {
            await connectDB();
            await EmailLog.create({
                recipient: to,
                subject,
                content: sanitizeEmailContentForAudit(html),
                status: 'FAILED',
                error: message,
                sentBy,
            });
        } catch {
            // logging failure is non-fatal
        }
        return false;
    }
};