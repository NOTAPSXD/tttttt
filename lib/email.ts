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
        await t.sendMail({
            from: process.env.SMTP_FROM || '"VexaNode" <noreply@vexanode.com>',
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
                content: html.substring(0, 5000),
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
                content: html.substring(0, 5000),
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