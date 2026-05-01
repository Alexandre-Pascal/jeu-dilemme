import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function loadOfferTexts(): Promise<string[]> {
  const rows = await prisma.offer.findMany({ orderBy: { order: "asc" } });
  const texts = rows.map((r) => r.text);
  const limitRaw = process.env.TEST_OFFER_LIMIT?.trim();
  if (!limitRaw) return texts;
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isFinite(limit) || limit < 1) return texts;
  return texts.slice(0, limit);
}
