import mongoose, { Schema, Model, Document } from 'mongoose';

// TypeScript Interfaces
export interface IUser extends Document {
    _id: any;
    name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'CLIENT';
    balance: number;
    discordId?: string;
    pteroUserId?: string;
    pteroUsername?: string;
    pteroEmail?: string;
    verified?: boolean;
    verifiedIp?: string;
    suspended?: boolean;
    suspensionReason?: string;
    suspendedBy?: string;
    referralCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPasswordResetToken extends Document {
    _id: any;
    token: string;
    expiresAt: Date;
    userId: string;
    createdAt: Date;
}

export interface IServer extends Document {
    _id: any;
    virtfusionId: string;
    name: string;
    status: string;
    suspended: boolean;
    ip?: string;
    cpu?: string;
    ram?: string;
    disk?: string;
    userId?: string;
    renewalDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IInvoice extends Document {
    _id: any;
    amount: number;
    description: string;
    status: 'UNPAID' | 'PAID' | 'CANCELLED';
    dueDate: Date;
    paidAt?: Date;
    paymentMethod?: string;
    reference?: string;
    userId: string;
    createdAt: Date;
}

export interface INotification extends Document {
    _id: any;
    title: string;
    message: string;
    read: boolean;
    userId: string;
    createdAt: Date;
}

export interface ILog extends Document {
    _id: any;
    action: string;
    details?: string;
    ip?: string;
    userId?: string;
    createdAt: Date;
}

export interface IEmailLog extends Document {
    _id: any;
    recipient: string;
    subject: string;
    content?: string;
    status: 'SENT' | 'FAILED';
    error?: string;
    sentBy?: string;
    createdAt: Date;
}

// Mongoose Schemas
const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String },
        role: { type: String, enum: ['ADMIN', 'CLIENT'], default: 'CLIENT' },
        balance: { type: Number, default: 0.0 },
        discordId: { type: String, unique: true, sparse: true },
        pteroUserId: { type: String },
        pteroUsername: { type: String },
        pteroEmail: { type: String },
        verified: { type: Boolean, default: false },
        verifiedIp: { type: String },
        suspended: { type: Boolean, default: false },
        suspensionReason: { type: String },
        suspendedBy: { type: String },
        referralCode: { type: String, unique: true, sparse: true },
    },
    {
        timestamps: true,
    }
);

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
    {
        token: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        userId: { type: String, required: true, ref: 'User' },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

const ServerSchema = new Schema<IServer>(
    {
        virtfusionId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        status: { type: String, default: 'UNKNOWN' },
        suspended: { type: Boolean, default: false },
        ip: { type: String },
        cpu: { type: String },
        ram: { type: String },
        disk: { type: String },
        userId: { type: String, ref: 'User' },
        renewalDate: { type: Date },
    },
    {
        timestamps: true,
    }
);

const InvoiceSchema = new Schema<IInvoice>(
    {
        amount: { type: Number, required: true },
        description: { type: String, required: true },
        status: { type: String, enum: ['UNPAID', 'PAID', 'CANCELLED'], default: 'UNPAID' },
        dueDate: { type: Date, required: true },
        paidAt: { type: Date },
        paymentMethod: { type: String },
        reference: { type: String },
        userId: { type: String, required: true, ref: 'User' },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

const NotificationSchema = new Schema<INotification>(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
        userId: { type: String, required: true, ref: 'User' },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

const LogSchema = new Schema<ILog>(
    {
        action: { type: String, required: true },
        details: { type: String },
        ip: { type: String },
        userId: { type: String, ref: 'User' },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

const EmailLogSchema = new Schema<IEmailLog>(
    {
        recipient: { type: String, required: true },
        subject: { type: String, required: true },
        content: { type: String },
        status: { type: String, enum: ['SENT', 'FAILED'], required: true },
        error: { type: String },
        sentBy: { type: String },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Indexes


PasswordResetTokenSchema.index({ userId: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

ServerSchema.index({ userId: 1 });
InvoiceSchema.index({ userId: 1 });
NotificationSchema.index({ userId: 1, read: 1 });
LogSchema.index({ userId: 1 });
LogSchema.index({ createdAt: -1 });

export interface IVPSServer extends Document {
    _id: any;
    instanceId: string;
    name: string;
    status: string;
    ip?: string;
    cpu?: string;
    ram?: string;
    disk?: string;
    userId?: string;
    region: string;
    createdAt: Date;
    updatedAt: Date;
}

const VPSServerSchema = new Schema<IVPSServer>(
    {
        instanceId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        status: { type: String, default: 'UNKNOWN' },
        ip: { type: String },
        cpu: { type: String },
        ram: { type: String },
        disk: { type: String },
        userId: { type: String, ref: 'User' },
        region: { type: String, required: true },
    },
    {
        timestamps: true,
        collection: 'vps_servers'
    }
);

VPSServerSchema.index({ userId: 1 });

export const VPSServer: Model<IVPSServer> = mongoose.models.VPSServer || mongoose.model<IVPSServer>('VPSServer', VPSServerSchema);
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const PasswordResetToken: Model<IPasswordResetToken> =
    mongoose.models.PasswordResetToken || mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
export const Server: Model<IServer> = mongoose.models.Server || mongoose.model<IServer>('Server', ServerSchema);
export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const Log: Model<ILog> = mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);
export const EmailLog: Model<IEmailLog> = mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
