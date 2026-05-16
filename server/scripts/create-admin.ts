import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { QueryTypes, Sequelize } from "sequelize";

dotenv.config();

const email = (process.argv[2] ?? "admin@gmail.com").trim().toLowerCase();
const password = process.argv[3] ?? "password";
const fullName = process.argv[4] ?? "Administrator";

const sequelize = new Sequelize(
  process.env.DB_NAME || "project_management",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "postgres",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    logging: false,
  },
);

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await sequelize.query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1`,
    { replacements: { email }, type: QueryTypes.SELECT },
  );

  if (existing.length > 0) {
    await sequelize.query(
      `UPDATE users
       SET password_hash = :passwordHash,
           full_name = :fullName,
           is_admin = true,
           is_blocked = false
       WHERE id = :id`,
      {
        replacements: { passwordHash, fullName, id: existing[0].id },
      },
    );
    console.log(`Updated admin: ${email} (id: ${existing[0].id})`);
  } else {
    const inserted = await sequelize.query<{ id: string }>(
      `INSERT INTO users (id, email, password_hash, full_name, is_admin, is_blocked)
       VALUES (gen_random_uuid(), :email, :passwordHash, :fullName, true, false)
       RETURNING id`,
      {
        replacements: { email, passwordHash, fullName },
        type: QueryTypes.SELECT,
      },
    );
    console.log(`Created admin: ${email} (id: ${inserted[0]?.id})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
