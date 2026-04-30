import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function loadOfferTexts(): Promise<string[]> {
  const rows = await prisma.offer.findMany({ orderBy: { order: "asc" } });
  return rows.map((r) => r.text);
}
