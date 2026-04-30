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
 * Attribue 3 / 2 / 1 pts aux trois premiers rangs de distance (plus petit = mieux),
 * avec ex-aequo sur la même distance : même nombre de points pour le groupe.
 * Bonus Masterclass (+5) en plus pour chaque auteur ayant eu 50/50 exact sur son vote.
 */
export function computeRoundPodiumDeltas(results: AuthorRoundResult[]): Map<string, number> {
  const deltas = new Map<string, number>();
  if (results.length === 0) return deltas;

  const sorted = [...results].sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.playerId.localeCompare(b.playerId);
  });

  let podiumIndex = 0;
  let i = 0;
  while (i < sorted.length && podiumIndex < PODIUM_POINTS.length) {
    const d = sorted[i].distance;
    let j = i;
    while (j < sorted.length && sorted[j].distance === d) j++;
    const pts = PODIUM_POINTS[podiumIndex];
    for (let k = i; k < j; k++) {
      const id = sorted[k].playerId;
      deltas.set(id, (deltas.get(id) ?? 0) + pts);
    }
    podiumIndex += 1;
    i = j;
  }

  for (const r of results) {
    if (r.masterclass) {
      deltas.set(r.playerId, (deltas.get(r.playerId) ?? 0) + MASTERCLASS_BONUS);
    }
  }

  return deltas;
}
