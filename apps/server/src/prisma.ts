import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export type OfferRow = { id: number; order: number; text: string; category: string };
export type OfferEntry = { id: number; text: string };

/** Charge toutes les offres en base, dans l'ordre. */
export async function loadOffers(): Promise<OfferEntry[]> {
  const rows: OfferRow[] = await prisma.offer.findMany({ orderBy: { order: "asc" } });
  const entries = rows.map((r) => ({ id: r.id, text: r.text }));
  const limitRaw = process.env.TEST_OFFER_LIMIT?.trim();
  if (!limitRaw) return entries;
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isFinite(limit) || limit < 1) return entries;
  return entries.slice(0, limit);
}

/** Charge des offres par leurs IDs (dans l'ordre demandé). Les IDs inexistants sont ignorés. */
export async function loadOffersByIds(ids: number[]): Promise<OfferEntry[]> {
  if (ids.length === 0) return [];
  const rows: OfferRow[] = await prisma.offer.findMany({
    where: { id: { in: ids } },
  });
  const byId = new Map(rows.map((r) => [r.id, { id: r.id, text: r.text }]));
  return ids.map((id) => byId.get(id)).filter((e): e is OfferEntry => e !== undefined);
}
