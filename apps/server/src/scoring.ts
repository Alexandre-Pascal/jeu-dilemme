import { MASTERCLASS_BONUS, PODIUM_POINTS } from "@dilemme/shared";

export type AuthorRoundResult = {
  playerId: string;
  distance: number;
  masterclass: boolean;
};

export function computeVoteDisplay(yes: number, no: number, abstain: number) {
  const denom = yes + no;
  if (denom === 0) {
    return {
      yesPct: 0,
      noPct: 0,
      yesCount: yes,
      noCount: no,
      abstainCount: abstain,
      distance: 50,
      masterclass: false,
    };
  }
  const yesPct = (yes / denom) * 100;
  const noPct = (no / denom) * 100;
  const ratio = yes / denom;
  const distance = Math.abs(ratio * 100 - 50);
  const masterclass = yes === no && denom > 0;
  return { yesPct, noPct, yesCount: yes, noCount: no, abstainCount: abstain, distance, masterclass };
}

/**
 * Fin de manche : classement **dense** sur la distance au 50/50 (plus petit = mieux).
 * - Rang 1 → 3 pts, rang 2 → 2 pts, rang 3 → 1 pt, rangs 4+ → 0 (même avec 10 joueurs).
 * - Ex-aequo : même distance = **même rang** → mêmes points (ex. deux 1ers → chacun 3 pts ; le suivant est rang 2 → 2 pts).
 * Bonus Masterclass (+5) en plus par auteur ayant eu un vote 50/50 exact sur son dilemme.
 */
export function computeRoundPodiumDeltas(results: AuthorRoundResult[]): Map<string, number> {
  const deltas = new Map<string, number>();
  if (results.length === 0) return deltas;

  const sorted = [...results].sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.playerId.localeCompare(b.playerId);
  });

  let rank = 0;
  let lastDistance = Number.NaN;
  for (const r of sorted) {
    if (Number.isNaN(lastDistance) || r.distance !== lastDistance) {
      rank += 1;
      lastDistance = r.distance;
    }
    const pts = rank === 1 ? PODIUM_POINTS[0] : rank === 2 ? PODIUM_POINTS[1] : rank === 3 ? PODIUM_POINTS[2] : 0;
    if (pts > 0) deltas.set(r.playerId, (deltas.get(r.playerId) ?? 0) + pts);
  }

  for (const r of results) {
    if (r.masterclass) {
      deltas.set(r.playerId, (deltas.get(r.playerId) ?? 0) + MASTERCLASS_BONUS);
    }
  }

  return deltas;
}
