import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export type OfferRow = { id: number; order: number; text: string; category: string };

export async function loadOfferTexts(): Promise<string[]> {
  const rows: OfferRow[] = await prisma.offer.findMany({ orderBy: { order: "asc" } });
  const texts = rows.map((r) => r.text);
  const limitRaw = process.env.TEST_OFFER_LIMIT?.trim();
  if (!limitRaw) return texts;
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isFinite(limit) || limit < 1) return texts;
  return texts.slice(0, limit);
}

/** Charge des offres par leurs IDs (dans l'ordre demandé). Les IDs inexistants sont ignorés. */
export async function loadOffersByIds(ids: number[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows: OfferRow[] = await prisma.offer.findMany({
    where: { id: { in: ids } },
  });
  const byId = new Map(rows.map((r) => [r.id, r.text]));
  return ids.map((id) => byId.get(id)).filter((t): t is string => t !== undefined);
}
