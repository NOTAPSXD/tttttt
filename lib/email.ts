
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

import { connectDB, EmailLog } from '@/lib/db';

// ... existing code ...

export const sendEmail = async (to: string, subject: string, html: string, sentBy: string = 'SYSTEM') => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn("SMTP configuration missing. Email not sent.");
        return false;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"VexaNode" <noreply@vexanode.com>',
            to,
            subject,
            html,
        });

        // Log to database
        try {
            await connectDB();
            await EmailLog.create({
                recipient: to,
                subject,
                content: html.substring(0, 5000), // Limit size
                status: 'SENT',
                sentBy
            });
        } catch (e) {
            console.error("Failed to log email:", e);
        }

        console.log(`Email sent to ${to}: ${subject}`);
        return true;
    } catch (error: any) {
        console.error("Email sending failed:", error);
        // Log failure
        try {
            await connectDB();
            await EmailLog.create({
                recipient: to,
                subject,
                content: html.substring(0, 5000),
                status: 'FAILED',
                error: error.message,
                sentBy
            });
        } catch (e) { }
        return false;
    }
};
