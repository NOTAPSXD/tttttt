import mongoose from 'mongoose';
import { ALL_MODELS } from '@/lib/models';

const MONGODB_URI = process.env.MONGODB_URI;

let indexVerificationRan = false;

/**
 * Ensure all schema indexes exist. Non-fatal: logs a warning if a unique
 * index cannot be built (e.g. pre-existing duplicate docs) so it can be
 * triaged instead of silently breaking writes.
 */
const verifyIndexes = async () => {
    if (indexVerificationRan) return;
    indexVerificationRan = true;
    try {
        await Promise.all(
            ALL_MODELS.map((m: any) =>
                m.createIndexes().catch((err: any) => {
                    console.error(`[db] failed to ensure indexes for ${m?.modelName}:`, err?.message || err);
                })
            )
        );
    } catch (e) {
        console.error('[db] index verification failed:', e);
    }
};

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    verifyIndexes();
    return cached.conn;
}
