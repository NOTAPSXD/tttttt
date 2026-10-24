#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS so it runs with `node`, without tsx or path aliases */
/**
 * Create (or promote) an admin user.
 *
 * Run it:
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js --email admin@example.com
 *   node scripts/create-admin.js --email admin@example.com --password "secret123" --role SUPER_ADMIN
 *
 * In a terminal it asks for the email, name and password (password is hidden).
 * Non-interactive runs use the flags / ADMIN_PASSWORD env var instead.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const ROOT = path.resolve(__dirname, "..");
const ROLES = ["SUPPORT", "ADMIN", "SUPER_ADMIN"];
const MIN_PASSWORD = 8;


function loadEnv() {
    for (const name of [".env.local", ".env"]) {
        const file = path.join(ROOT, name);
        if (!fs.existsSync(file)) continue;

        for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
            const line = raw.trim();
            if (!line || line.startsWith("#")) continue;

            const eq = line.indexOf("=");
            if (eq <= 0) continue;

            const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
            let value = line.slice(eq + 1).trim();
            if (process.env[key] !== undefined) continue;

            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    }
}

// ── CLI arguments ────────────────────────────────────────────

function parseArgs(argv) {
    const opts = { email: null, name: null, password: null, role: "ADMIN", dryRun: false, help: false };
    const positional = [];

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--dry-run") {
            opts.dryRun = true;
            continue;
        }
        if (arg === "--help" || arg === "-h") {
            opts.help = true;
            continue;
        }
        if (arg.startsWith("--")) {
            const eq = arg.indexOf("=");
            const key = eq === -1 ? arg : arg.slice(0, eq);
            const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
            const map = { "--email": "email", "--name": "name", "--password": "password", "--role": "role" };

            if (!map[key]) throw new Error(`Unknown option: ${key}`);
            opts[map[key]] = value || null;
            continue;
        }

        positional.push(arg);
    }

    if (!opts.email && positional[0]) opts.email = positional[0];
    if (opts.role) opts.role = String(opts.role).toUpperCase();
    return opts;
}

function printHelp() {
    console.log(`Create or promote an admin user.

Usage:
  node scripts/create-admin.js [--email <email>] [--name <name>]
                               [--password <password>] [--role <role>]
                               [--dry-run]

Options:
  --email, --name, --password   Prompted for when omitted in a terminal.
  --role                        SUPPORT | ADMIN (default) | SUPER_ADMIN
  --dry-run                     Show what would change, write nothing
  -h, --help                    Show this help

Reads MONGODB_URI from .env / .env.local.`);
}

// ── Prompts ──────────────────────────────────────────────────

const isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function askHidden(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);

    const original = rl._writeToOutput;
    rl._writeToOutput = () => {};

    return new Promise((resolve) => {
        rl.question("", (answer) => {
            rl._writeToOutput = original;
            rl.close();
            process.stdout.write("\n");
            resolve(answer);
        });
    });
}

async function promptEmail() {
    for (;;) {
        const email = await ask("Email: ");
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
        console.log("  Please enter a valid email address.");
    }
}

/** Returns the password, or null to keep the existing one / generate one. */
async function promptPassword(existing) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const first = await askHidden(
            existing ? "New password (blank = keep current): " : "Password (blank = generate one): "
        );
        if (!first) return null;

        if (first.length < MIN_PASSWORD) {
            console.log(`  Password must be at least ${MIN_PASSWORD} characters.`);
            continue;
        }

        const confirm = await askHidden("Confirm password: ");
        if (first !== confirm) {
            console.log("  Passwords did not match, try again.");
            continue;
        }
        return first;
    }
    throw new Error("Too many invalid password attempts.");
}

// ── User model (minimal, matches lib/models.ts) ──────────────

const User =
    mongoose.models.User ||
    mongoose.model(
        "User",
        new mongoose.Schema(
            {
                name: { type: String, required: true },
                email: { type: String, required: true, unique: true },
                emailLower: { type: String, required: true, unique: true },
                password: { type: String },
                role: { type: String, enum: ["CLIENT", "SUPPORT", "ADMIN", "SUPER_ADMIN"], default: "CLIENT" },
                balance: { type: Number, default: 0 },
                status: { type: String, enum: ["active", "suspended"], default: "active" },
                suspended: { type: Boolean, default: false },
                verified: { type: Boolean, default: false },
            },
            { timestamps: true }
        )
    );

// ── Main ─────────────────────────────────────────────────────

async function main() {
    loadEnv();
    const opts = parseArgs(process.argv.slice(2));

    if (opts.help) {
        printHelp();
        return;
    }

    let email = opts.email || process.env.ADMIN_EMAIL || null;
    if (!email) {
        if (!isInteractive()) throw new Error("Missing email. Pass --email admin@example.com");
        email = await promptEmail();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid email: ${email}`);
    if (!ROLES.includes(opts.role)) throw new Error(`Invalid role "${opts.role}". Use: ${ROLES.join(", ")}`);

    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set in .env or .env.local");

    await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
    });
    console.log("[create-admin] connected to MongoDB");

    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ $or: [{ emailLower }, { email }] });

    if (existing) console.log(`[create-admin] found existing user: ${existing.email} (${existing.role})`);

    let name = opts.name;
    if (!name && !existing && isInteractive()) {
        name = (await ask("Name [Super Admin]: ")) || "Super Admin";
    }
    if (!name) name = existing ? existing.name : "Super Admin";

    let password = opts.password || process.env.ADMIN_PASSWORD || null;
    if (!password && isInteractive()) {
        password = await promptPassword(Boolean(existing));
    }

    let generated = false;
    if (!password && !existing) {
        password = crypto.randomBytes(12).toString("base64url");
        generated = true;
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    if (existing) {
        if (opts.dryRun) {
            console.log(`[create-admin] dry run — would update ${email} to ${opts.role}`);
        } else {
            await User.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        name,
                        email,
                        emailLower,
                        role: opts.role,
                        status: "active",
                        suspended: false,
                        verified: true,
                        ...(passwordHash ? { password: passwordHash } : {}),
                    },
                }
            );
            console.log(`[create-admin] updated ${email} → ${opts.role}`);
        }
    } else if (opts.dryRun) {
        console.log(`[create-admin] dry run — would create ${email} as ${opts.role}`);
    } else {
        await User.create({
            name,
            email,
            emailLower,
            password: passwordHash,
            role: opts.role,
            balance: 0,
            status: "active",
            suspended: false,
            verified: true,
        });
        console.log(`[create-admin] created ${email} as ${opts.role}`);
    }

    console.log("-----------------------------------");
    console.log(`Email:    ${email}`);
    console.log(`Role:     ${opts.role}`);
    if (opts.dryRun) {
        console.log("Password: (dry run, nothing written)");
    } else if (generated) {
        console.log(`Password: ${password}`);
        console.log("Save this password now — it is not shown again.");
    } else if (password) {
        console.log("Password: (as supplied)");
    } else {
        console.log("Password: (unchanged)");
    }
    console.log("-----------------------------------");
}

main()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
        console.error("[create-admin] ✘", err && err.message ? err.message : err);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    });
