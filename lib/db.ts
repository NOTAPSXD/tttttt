import { connectDB } from './mongodb';
import {
    User,
    PasswordResetToken,
    Server,
    VPSServer,
    Invoice,
    Notification,
    Log,
    EmailLog,
    type IUser,
    type IPasswordResetToken,
    type IServer,
    type IVPSServer,
    type IInvoice,
    type INotification,
    type ILog,
    type IEmailLog
} from './models';

// Export the connection function
export { connectDB };

// Export all models
export {
    User,
    PasswordResetToken,
    Server,
    VPSServer,
    Invoice,
    Notification,
    Log,
    EmailLog
};

// Export types
export type {
    IUser,
    IPasswordResetToken,
    IServer,
    IVPSServer,
    IInvoice,
    INotification,
    ILog,
    IEmailLog
};

// Legacy prisma export for backward compatibility during migration
// This will be removed once all code is updated
export const prisma = {
    user: User,
    passwordResetToken: PasswordResetToken,
    server: Server,
    vpsServer: VPSServer,
    invoice: Invoice,
    notification: Notification,
    log: Log,
    emailLog: EmailLog,
};

