import { PrismaClient } from "@prisma/client";

export function prismaDatabaseUrl(source = process.env.DATABASE_URL) {
  if (!source) return undefined;
  const url = new URL(source);
  if (url.hostname.endsWith("tidbcloud.com")) {
    // Drizzle's starter URL uses ssl=true. Prisma requires TiDB's explicit strict TLS mode.
    url.searchParams.delete("ssl");
    url.searchParams.set("sslaccept", "strict");
  }
  return url.toString();
}

const url = prismaDatabaseUrl();
export const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
