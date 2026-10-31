import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { prisma } from "../server/ems/database";

const migrationName = "20261031172000_ems_init";
const migrationPath = resolve(join(import.meta.dirname, "..", "prisma", "migrations", migrationName, "migration.sql"));

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS ems_schema_migrations (
    migration VARCHAR(120) NOT NULL PRIMARY KEY,
    appliedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const applied = await prisma.$queryRawUnsafe<Array<{ migration: string }>>(
    "SELECT migration FROM ems_schema_migrations WHERE migration = ? LIMIT 1", migrationName,
  );
  if (applied.length) {
    console.log(`EMS migration ${migrationName} is already applied; no changes made.`);
    return;
  }

  const source = await readFile(migrationPath, "utf8");
  const statements = source.split(";").map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^CREATE TABLE\s+/i, "CREATE TABLE IF NOT EXISTS "));
  for (const statement of statements) {
    const constraint = statement.match(/^ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)`/i);
    if (constraint) {
      const exists = await prisma.$queryRawUnsafe<Array<{ constraintName: string }>>(
        "SELECT CONSTRAINT_NAME AS constraintName FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? LIMIT 1",
        constraint[1]!, constraint[2]!,
      );
      if (exists.length) continue;
    }
    await prisma.$executeRawUnsafe(statement);
  }
  await prisma.$executeRawUnsafe("INSERT INTO ems_schema_migrations (migration) VALUES (?)", migrationName);
  console.log(`Applied ${migrationName}; added ${statements.length} non-destructive EMS DDL statements.`);
}

main().catch((error) => {
  console.error("EMS migration stopped. Existing tables and migration history were preserved.", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
