import type { Db } from "mongodb";

export interface MigrationContext {
    db: Db;
    report(message: string): void;
    isDryRun: boolean;
}

export interface Migration {
    id: string;
    name: string;
    up(ctx: MigrationContext): Promise<void>;
}

const registry: Migration[] = [];

export function register(migration: Migration): void {
    if (registry.some((m) => m.id === migration.id)) {
        throw new Error(`Duplicate migration id: ${migration.id}`);
    }
    registry.push(migration);
}

export function getMigrations(): Migration[] {
    return [...registry].sort((a, b) => a.id.localeCompare(b.id));
}