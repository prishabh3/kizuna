import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const departments = [
    "Engineering",
    "Product",
    "Design",
    "HR",
    "Finance",
    "Marketing",
    "Operations",
];

const sampleUsers = [
    {
        name: "Hiroshi Tanaka",
        email: "hiroshi.tanaka@kizuna.com",
        role: "ADMIN" as UserRole,
        department: "Engineering",
    },
    {
        name: "Yuki Sato",
        email: "yuki.sato@kizuna.com",
        role: "MANAGER" as UserRole,
        department: "Product",
    },
    {
        name: "James Rodriguez",
        email: "james.rodriguez@kizuna.com",
        role: "EMPLOYEE" as UserRole,
        department: "Engineering",
    },
    {
        name: "Priya Sharma",
        email: "priya.sharma@kizuna.com",
        role: "EMPLOYEE" as UserRole,
        department: "Design",
    },
    {
        name: "Chen Wei",
        email: "chen.wei@kizuna.com",
        role: "MANAGER" as UserRole,
        department: "Engineering",
    },
    {
        name: "Aiko Suzuki",
        email: "aiko.suzuki@kizuna.com",
        role: "EMPLOYEE" as UserRole,
        department: "HR",
    },
    {
        name: "Marco Rossi",
        email: "marco.rossi@kizuna.com",
        role: "EMPLOYEE" as UserRole,
        department: "Finance",
    },
    {
        name: "Kenji Yamamoto",
        email: "kenji.yamamoto@kizuna.com",
        role: "ADMIN" as UserRole,
        department: "Operations",
    },
    {
        name: "Amara Diallo",
        email: "amara.diallo@kizuna.com",
        role: "EMPLOYEE" as UserRole,
        department: "Marketing",
    },
    {
        name: "Miku Kobayashi",
        email: "miku.kobayashi@kizuna.com",
        role: "MANAGER" as UserRole,
        department: "Product",
    },
];

async function main() {
    console.log("🌱 Seeding Kizuna database...");

    const hashedPassword = await bcrypt.hash("kizuna2024!", 10);

    for (const user of sampleUsers) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                ...user,
                password: hashedPassword,
            },
        });
        console.log(`  ✓ Created user: ${user.name}`);
    }

    // Seed attendance records
    const users = await prisma.user.findMany({ select: { id: true } });
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"] as const;

    for (const user of users) {
        for (let i = 0; i < 5; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            await prisma.attendance.upsert({
                where: { userId_date: { userId: user.id, date } },
                update: {},
                create: {
                    userId: user.id,
                    date,
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                },
            });
        }
    }
    console.log("  ✓ Seeded attendance records");

    // Seed leave records
    await prisma.leave.createMany({
        data: [
            {
                userId: 3,
                startDate: new Date("2024-03-15"),
                endDate: new Date("2024-03-20"),
                reason: "Annual leave",
                status: "APPROVED",
            },
            {
                userId: 4,
                startDate: new Date("2024-04-01"),
                endDate: new Date("2024-04-03"),
                reason: "Personal reasons",
                status: "PENDING",
            },
            {
                userId: 7,
                startDate: new Date("2024-03-25"),
                endDate: new Date("2024-03-27"),
                reason: "Medical leave",
                status: "APPROVED",
            },
        ],
        skipDuplicates: true,
    });
    console.log("  ✓ Seeded leave records");

    console.log("\n✅ Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
