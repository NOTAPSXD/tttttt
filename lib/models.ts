import mongoose, { Schema, Model, Document } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────

export type UserRole = 'CLIENT' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
export type ProviderType = 'virtfusion' | 'manual';
export type ServerStatusValue =
    | 'RUNNING'
    | 'STOPPED'
    | 'OFFLINE'
    | 'SUSPENDED'
    | 'PROVISIONING'
    | 'UNKNOWN';
export type TaskStatusValue = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type AssignmentStatusValue = 'active' | 'closed';
export type ShareStatusValue = 'pending' | 'accepted' | 'revoked';
export type BucketGranularity = 'hour' | 'day';

// ── Interfaces ────────────────────────────────────────────────

export interface IUser extends Document {
    _id: any;
    name: string;
    email: string;
    emailLower: string;
    password?: string;
    role: UserRole;
    balance: number;
    discordId?: string;
    pteroUserId?: string;
    pteroUsername?: string;
    pteroEmail?: string;
    verified?: boolean;
    verifiedIp?: string;
    status: 'active' | 'suspended';
    suspended?: boolean;
    suspensionReason?: string;
    suspendedBy?: string;
    referralCode?: string;
    lastLogin?: Date;
    lastLoginIp?: string;
    timezone?: string;
    notes?: string;
    twoFactor?: {
        enabled: boolean;
        secretEnc?: string | null;
        pendingSecretEnc?: string | null;
        recoveryHashes?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface IPasswordResetToken extends Document {
    _id: any;
    token: string;
    expiresAt: Date;
    userId: string;
    used: boolean;
    createdAt: Date;
}

export interface IServer extends Document {
    _id: any;
    providerServerId: string;
    providerType: ProviderType;
    name: string;
    hostname?: string | null;
    status: string;
    suspended: boolean;
    ip?: string;
    ipLower?: string;
    cpu?: string;
    ram?: string;
    disk?: string;
    city?: string;
    country?: string;
    planLabel?: string | null;
    tags: string[];
    notes?: string;
    ownerId: any | null;
    ownerEmail?: string;
    ownerName?: string;
    renewalDate?: Date;
    expiresAt?: Date | null;
    bookmarked?: boolean;
    statusCheckedAt?: Date | null;
    lastSyncedAt?: Date | null;
    providerDeletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface INotification extends Document {
    _id: any;
    title: string;
    message: string;
    read: boolean;
    readAt?: Date | null;
    type?: 'info' | 'warning' | 'success' | 'error';
    link?: string;
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

export interface ISession extends Document {
    _id: any;
    tokenHash: string;
    userId: any;
    userAgent?: string;
    deviceLabel?: string;
    ip?: string;
    lastSeenAt: Date;
    expiresAt: Date;
    revokedAt?: Date | null;
    createdAt: Date;
}

export interface ILoginHistory extends Document {
    _id: any;
    userId: any;
    ip: string;
    userAgent?: string;
    timezone?: string;
    status: 'success' | 'failed';
    reason?: string;
    at: Date;
}

export interface IAuditLog extends Document {
    _id: any;
    actorId?: any;
    actorRole?: string | null;
    actorEmail?: string | null;
    action: string;
    targetId?: any;
    targetType?: string | null;
    targetName?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string;
    userAgent?: string;
    ts: Date;
}

export interface ITask extends Document {
    _id: any;
    serverId: any;
    userId?: any;
    type: string;
    status: TaskStatusValue;
    request?: unknown;
    result?: unknown;
    error?: string;
    rawError?: unknown;
    requestedAt: Date;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    durationSec?: number | null;
}

export interface IAnnouncement extends Document {
    _id: any;
    title: string;
    body: string;
    active: boolean;
    scope: 'all' | 'client' | 'admin';
    createdBy: any;
    createdAt: Date;
    expiresAt?: Date | null;
}

export interface IServerShare extends Document {
    _id: any;
    serverId: any;
    inviteeId?: any;
    inviteeEmail?: string;
    permissions: string[];
    status: ShareStatusValue;
    createdBy: any;
    createdAt: Date;
}

export interface ITrafficBucket extends Document {
    _id: any;
    serverId: any;
    bucket: BucketGranularity;
    period: string;
    start: Date;
    rx: number;
    tx: number;
    total: number;
}

export interface IRateLimit extends Document {
    _id: any;
    key: string;
    count: number;
    resetAt: Date;
    createdAt: Date;
}

export interface ISyncRun extends Document {
    _id: any;
    startedAt: Date;
    finishedAt?: Date | null;
    status: 'running' | 'completed' | 'failed';
    added: number;
    updated: number;
    missing: number;
    unassigned?: number;
    orphaned?: number;
    errorsList: string[];
    totals?: Record<string, number>;
}

export interface IServerAssignment extends Document {
    _id: any;
    serverId: any;
    fromUserId?: any;
    toUserId: any;
    actorId?: any;
    reason?: string;
    active: boolean;
    at: Date;
}

export interface IMigration extends Document {
    _id: any;
    name: string;
    appliedAt: Date;
    checksum?: string;
}

// ── Schemas ───────────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        emailLower: { type: String, required: true, unique: true },
        password: { type: String },
        role: { type: String, enum: ['CLIENT', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'], default: 'CLIENT' },
        balance: { type: Number, default: 0.0 },
        discordId: { type: String, unique: true, sparse: true },
        pteroUserId: { type: String },
        pteroUsername: { type: String },
        pteroEmail: { type: String },
        verified: { type: Boolean, default: false },
        verifiedIp: { type: String },
        status: { type: String, enum: ['active', 'suspended'], default: 'active' },
        suspended: { type: Boolean, default: false },
        suspensionReason: { type: String },
        suspendedBy: { type: String },
        referralCode: { type: String, unique: true, sparse: true },
        lastLogin: { type: Date },
        lastLoginIp: { type: String },
        timezone: { type: String },
        notes: { type: String },
        twoFactor: {
            enabled: { type: Boolean, default: false },
            secretEnc: { type: String, default: null },
            pendingSecretEnc: { type: String, default: null },
            recoveryHashes: { type: [String], default: [] },
        },
    },
    { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
    {
        token: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        userId: { type: String, required: true, ref: 'User' },
        used: { type: Boolean, default: false },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

PasswordResetTokenSchema.index({ userId: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ServerSchema = new Schema<IServer>(
    {
        providerServerId: { type: String, required: true, unique: true },
        providerType: { type: String, enum: ['virtfusion', 'manual'], default: 'virtfusion' },
        name: { type: String, required: true },
        hostname: { type: String, default: null },
        status: { type: String, default: 'UNKNOWN' },
        suspended: { type: Boolean, default: false },
        ip: { type: String },
        ipLower: { type: String },
        cpu: { type: String },
        ram: { type: String },
        disk: { type: String },
        city: { type: String },
        country: { type: String },
        planLabel: { type: String, default: null },
        tags: { type: [String], default: [] },
        notes: { type: String },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        ownerEmail: { type: String },
        ownerName: { type: String },
        renewalDate: { type: Date },
        expiresAt: { type: Date, default: null },
        bookmarked: { type: Boolean, default: false },
        statusCheckedAt: { type: Date, default: null },
        lastSyncedAt: { type: Date, default: null },
        providerDeletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

ServerSchema.index({ ownerId: 1, status: 1 });
ServerSchema.index({ status: 1 });
ServerSchema.index({ ownerId: 1 }, { partialFilterExpression: { ownerId: null }, name: 'unassigned_owner' });
ServerSchema.index({ providerDeletedAt: 1 }, { partialFilterExpression: { providerDeletedAt: { $ne: null } }, name: 'orphaned_servers' });
ServerSchema.index({ expiresAt: 1 });
ServerSchema.index({ ipLower: 1 });
ServerSchema.index({ ip: 1 });
ServerSchema.index({ lastSyncedAt: -1 });

const NotificationSchema = new Schema<INotification>(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
        readAt: { type: Date, default: null },
        type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
        link: { type: String },
        userId: { type: String, required: true, ref: 'User' },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const LogSchema = new Schema<ILog>(
    {
        action: { type: String, required: true },
        details: { type: String },
        ip: { type: String },
        userId: { type: String, ref: 'User' },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

LogSchema.index({ userId: 1 });
LogSchema.index({ createdAt: -1 });

const EmailLogSchema = new Schema<IEmailLog>(
    {
        recipient: { type: String, required: true },
        subject: { type: String, required: true },
        content: { type: String },
        status: { type: String, enum: ['SENT', 'FAILED'], required: true },
        error: { type: String },
        sentBy: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

const SessionSchema = new Schema<ISession>(
    {
        tokenHash: { type: String, required: true, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userAgent: { type: String },
        deviceLabel: { type: String },
        ip: { type: String },
        lastSeenAt: { type: Date, default: () => new Date() },
        expiresAt: { type: Date, required: true },
        revokedAt: { type: Date, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

SessionSchema.index({ userId: 1, lastSeenAt: -1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LoginHistorySchema = new Schema<ILoginHistory>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        ip: { type: String, default: '' },
        userAgent: { type: String },
        timezone: { type: String },
        status: { type: String, enum: ['success', 'failed'], required: true },
        reason: { type: String },
        at: { type: Date, default: () => new Date() },
    },
    { timestamps: false }
);

LoginHistorySchema.index({ userId: 1, at: -1 });
LoginHistorySchema.index({ status: 1, at: -1 });
// Raw logins retained 180 days.
LoginHistorySchema.index({ at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const AuditLogSchema = new Schema<IAuditLog>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        actorRole: { type: String },
        actorEmail: { type: String },
        action: { type: String, required: true },
        targetId: { type: Schema.Types.ObjectId },
        targetType: { type: String },
        targetName: { type: String },
        before: { type: Schema.Types.Mixed },
        after: { type: Schema.Types.Mixed },
        ip: { type: String },
        userAgent: { type: String },
        ts: { type: Date, default: () => new Date() },
    },
    { timestamps: false }
);

AuditLogSchema.index({ ts: -1 });
AuditLogSchema.index({ actorId: 1, ts: -1 });
AuditLogSchema.index({ targetId: 1, ts: -1 });

const TaskSchema = new Schema<ITask>(
    {
        serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        type: { type: String, required: true },
        status: { type: String, enum: ['queued', 'running', 'done', 'failed', 'cancelled'], default: 'queued' },
        request: { type: Schema.Types.Mixed },
        result: { type: Schema.Types.Mixed },
        error: { type: String },
        rawError: { type: Schema.Types.Mixed },
        requestedAt: { type: Date, default: () => new Date() },
        startedAt: { type: Date, default: null },
        finishedAt: { type: Date, default: null },
        durationSec: { type: Number, default: null },
    },
    { timestamps: false }
);

TaskSchema.index({ serverId: 1, requestedAt: -1 });
TaskSchema.index({ status: 1, requestedAt: -1 });
TaskSchema.index({ userId: 1, requestedAt: -1 });

const AnnouncementSchema = new Schema<IAnnouncement>(
    {
        title: { type: String, required: true },
        body: { type: String, required: true },
        active: { type: Boolean, default: true },
        scope: { type: String, enum: ['all', 'client', 'admin'], default: 'all' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        expiresAt: { type: Date, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

AnnouncementSchema.index({ active: 1, createdAt: -1 });

const ServerShareSchema = new Schema<IServerShare>(
    {
        serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
        inviteeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        inviteeEmail: { type: String },
        permissions: { type: [String], default: ['view'] },
        status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

ServerShareSchema.index({ serverId: 1, status: 1 });
ServerShareSchema.index({ inviteeId: 1, status: 1 });

const TrafficBucketSchema = new Schema<ITrafficBucket>(
    {
        serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
        bucket: { type: String, enum: ['hour', 'day'], required: true },
        period: { type: String, required: true },
        start: { type: Date, required: true },
        rx: { type: Number, default: 0 },
        tx: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
    },
    { timestamps: false }
);

TrafficBucketSchema.index({ serverId: 1, bucket: 1, period: 1 }, { unique: true });
TrafficBucketSchema.index({ serverId: 1, bucket: 1, start: 1 });
// Raw hourly samples expire after 90 days; daily aggregates are kept.
TrafficBucketSchema.index(
    { start: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { bucket: 'hour' } }
);

const RateLimitSchema = new Schema<IRateLimit>(
    {
        key: { type: String, required: true, unique: true },
        count: { type: Number, default: 0 },
        resetAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-expire counters when their window passes (no Redis needed).
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const SyncRunSchema = new Schema<ISyncRun>(
    {
        startedAt: { type: Date, default: () => new Date() },
        finishedAt: { type: Date, default: null },
        status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
        added: { type: Number, default: 0 },
        updated: { type: Number, default: 0 },
        missing: { type: Number, default: 0 },
        unassigned: { type: Number, default: 0 },
        orphaned: { type: Number, default: 0 },
        errorsList: { type: [String], default: [] },
        totals: { type: Schema.Types.Mixed },
    },
    { timestamps: false }
);

SyncRunSchema.index({ startedAt: -1 });

const ServerAssignmentSchema = new Schema<IServerAssignment>(
    {
        serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
        fromUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reason: { type: String },
        active: { type: Boolean, default: true },
        at: { type: Date, default: () => new Date() },
    },
    { timestamps: false }
);

ServerAssignmentSchema.index({ serverId: 1, at: -1 });
ServerAssignmentSchema.index({ toUserId: 1, at: -1 });
// One active owner per server, enforced by the DB.
ServerAssignmentSchema.index(
    { serverId: 1 },
    { unique: true, name: 'one_active_owner', partialFilterExpression: { active: true } }
);

const MigrationSchema = new Schema<IMigration>(
    {
        name: { type: String, required: true, unique: true },
        appliedAt: { type: Date, default: () => new Date() },
        checksum: { type: String },
    },
    { timestamps: false }
);

// ── Model registration ────────────────────────────────────────

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const PasswordResetToken: Model<IPasswordResetToken> =
    mongoose.models.PasswordResetToken || mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
export const Server: Model<IServer> = mongoose.models.Server || mongoose.model<IServer>('Server', ServerSchema);
export const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const Log: Model<ILog> = mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);
export const EmailLog: Model<IEmailLog> = mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
export const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
export const LoginHistory: Model<ILoginHistory> =
    mongoose.models.LoginHistory || mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);
export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export const Announcement: Model<IAnnouncement> =
    mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
export const ServerShare: Model<IServerShare> =
    mongoose.models.ServerShare || mongoose.model<IServerShare>('ServerShare', ServerShareSchema);
export const TrafficBucket: Model<ITrafficBucket> =
    mongoose.models.TrafficBucket || mongoose.model<ITrafficBucket>('TrafficBucket', TrafficBucketSchema);
export const RateLimit: Model<IRateLimit> = mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
export const SyncRun: Model<ISyncRun> = mongoose.models.SyncRun || mongoose.model<ISyncRun>('SyncRun', SyncRunSchema);
export const ServerAssignment: Model<IServerAssignment> =
    mongoose.models.ServerAssignment || mongoose.model<IServerAssignment>('ServerAssignment', ServerAssignmentSchema);
export const Migration: Model<IMigration> = mongoose.models.Migration || mongoose.model<IMigration>('Migration', MigrationSchema);

// All models that should be index-verified at boot.
export const ALL_MODELS: Model<any>[] = [
    User,
    PasswordResetToken,
    Server,
    Notification,
    Log,
    EmailLog,
    Session,
    LoginHistory,
    AuditLog,
    Task,
    Announcement,
    ServerShare,
    TrafficBucket,
    RateLimit,
    SyncRun,
    ServerAssignment,
    Migration,
];