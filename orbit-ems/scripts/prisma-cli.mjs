import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
if (env.DATABASE_URL) {
  const url = new URL(env.DATABASE_URL);
  if (url.hostname.endsWith("tidbcloud.com")) {
    url.searchParams.delete("ssl");
    url.searchParams.set("sslaccept", "strict");
    env.DATABASE_URL = url.toString();
  }
}
const prisma = path.join(project, "node_modules", ".bin", "prisma");
const result = spawnSync(prisma, process.argv.slice(2), { cwd: project, env, stdio: "inherit" });
if (result.error) { console.error(`Unable to run Prisma CLI: ${result.error.message}`); process.exit(1); }
process.exit(result.status ?? 1);
