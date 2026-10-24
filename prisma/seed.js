const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@vexanode.com' },
        update: {
            role: 'ADMIN' // Ensure existing user becomes ADMIN
        },
        create: {
            email: 'admin@vexanode.com',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    console.log('-----------------------------------')
    console.log('Admin Account Ready:')
    console.log('Email: admin@vexanode.com')
    console.log('Password: admin123')
    console.log('-----------------------------------')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
