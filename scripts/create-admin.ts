/**
 * Prosedur administratif aman untuk membuat/mereset akun ADMIN (tidak ada endpoint publik).
 * Pemakaian:
 *   ADMIN_EMAIL=... ADMIN_USERNAME=... ADMIN_PASSWORD=... pnpm admin:create
 */
import { createAdminAccount } from "../src/server/services/auth.service";
import { registerSchema } from "../src/lib/validation/auth";
import { prisma } from "../src/lib/db";

async function main() {
  const parsed = registerSchema.safeParse({
    email: process.env.ADMIN_EMAIL,
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    console.error(
      "Input tidak valid:",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    console.error("Set ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD sebagai environment variable.");
    process.exit(1);
  }
  const admin = await createAdminAccount(parsed.data);
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ADMIN_CREATE_CLI",
      targetType: "User",
      targetId: admin.id,
      metadata: { email: admin.email },
    },
  });
  console.info(`Admin siap: ${admin.email} (${admin.username})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
