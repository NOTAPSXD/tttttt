const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Basic .env.local loader
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim();
        }
    });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Minimal Schema for seeding
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'CLIENT'], default: 'CLIENT' },
    balance: { type: Number, default: 0.0 },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully.');

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const email = 'admin@vexanode.com';

        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log('Admin user already exists. Updating role...');
            existingAdmin.role = 'ADMIN';
            await existingAdmin.save();
        } else {
            console.log('Creating new Admin user...');
            await User.create({
                name: 'Super Admin',
                email: email,
                password: hashedPassword,
                role: 'ADMIN',
                balance: 0
            });
        }

        console.log('-----------------------------------');
        console.log('Admin Account Ready:');
        console.log('Email: ' + email);
        console.log('Password: admin123');
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
