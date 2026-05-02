import { z } from "zod";

/** Noms d'événements Socket.io (contrat client/serveur) */
export const SocketEvents = {
  ROOM_JOIN: "room:join",
  HOST_CREATE: "host:create",
  PLAYER_READY: "player:ready",
  HOST_START_GAME: "host:startGame",
  /** MJ : fermer l’écran des règles et démarrer le chrono de la 1ʳᵉ manche (contraintes). */
  HOST_DISMISS_RULES: "host:dismissRules",
  CONSTRAINT_SUBMIT: "constraint:submit",
  VOTE_CAST: "vote:cast",
  /** Chaque joueur peut voter pour terminer le récap avant la fin du chrono. */
  RECAP_SKIP_VOTE: "recap:skipVote",
  HOST_SET_TIMERS: "host:setTimers",
  SERVER_STATE: "server:state",
  ERROR: "error",
} as const;

export const GamePhaseSchema = z.enum([
  "lobby",
  /** Après « Lancer la partie » : règles affichées jusqu’à action du MJ (pas de chrono). */
  "rules_briefing",
  "round_constraint",
  "round_vote",
  "round_subresult",
  "round_recap",
  "game_end",
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const PlayerPublicSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  ready: z.boolean(),
  score: z.number(),
});
export type PlayerPublic = z.infer<typeof PlayerPublicSchema>;

export const LastVoteResultSchema = z.object({
  yesPct: z.number(),
  noPct: z.number(),
  yesCount: z.number(),
  noCount: z.number(),
  abstainCount: z.number(),
});
export type LastVoteResult = z.infer<typeof LastVoteResultSchema>;

export const RoundScoreRowSchema = z.object({
  playerId: z.string(),
  deltaPoints: z.number(),
  distanceFrom50: z.number(),
  masterclass: z.boolean(),
});
export type RoundScoreRow = z.infer<typeof RoundScoreRowSchema>;

/** Récap après une manche complète (toutes les contraintes + tous les votes sur chaque dilemme). */
export const RoundRecapAuthorRowSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
  distanceFrom50: z.number(),
  masterclass: z.boolean(),
});
export type RoundRecapAuthorRow = z.infer<typeof RoundRecapAuthorRowSchema>;

export const RoundRecapPointsRowSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
  delta: z.number(),
  totalScore: z.number(),
});
export type RoundRecapPointsRow = z.infer<typeof RoundRecapPointsRowSchema>;

export const RoundRecapPayloadSchema = z.object({
  /** Manche terminée (0 = première offre). */
  roundIndex: z.number(),
  offerText: z.string(),
  authors: z.array(RoundRecapAuthorRowSchema),
  pointsThisRound: z.array(RoundRecapPointsRowSchema),
});
export type RoundRecapPayload = z.infer<typeof RoundRecapPayloadSchema>;

export const RecapSkipProgressSchema = z.object({
  votedCount: z.number(),
  requiredCount: z.number(),
  /** Pour la connexion courante (joueur) ; false si MJ ou non connecté en tant que joueur. */
  selfHasSkipped: z.boolean(),
});
export type RecapSkipProgress = z.infer<typeof RecapSkipProgressSchema>;

/** Nombre d’offres / manches : borne à la création de salle (MJ). */
export const HOST_ROUND_COUNT_MIN = 1;
export const HOST_ROUND_COUNT_MAX = 50;

export const ServerStatePayloadSchema = z.object({
  roomCode: z.string(),
  phase: GamePhaseSchema,
  phaseEndsAt: z.number().nullable(),
  isHost: z.boolean(),
  playerId: z.string().nullable(),
  players: z.array(PlayerPublicSchema),
  currentRoundIndex: z.number(),
  totalRounds: z.number(),
  /**
   * Limite choisie à la création de salle (nombre d’offres max) ; `null` = toutes les offres en base au démarrage.
   * En lobby avant lancement, `totalRounds` peut refléter cette valeur ; après `startGame`, `totalRounds` = offres réellement chargées.
   */
  plannedRoundCount: z.number().int().min(HOST_ROUND_COUNT_MIN).max(HOST_ROUND_COUNT_MAX).nullable(),
  currentOfferText: z.string().nullable(),
  votingForPlayerId: z.string().nullable(),
  revealedDilemma: z
    .object({ offer: z.string(), constraint: z.string() })
    .nullable(),
  constraintOpen: z.boolean(),
  voteOpen: z.boolean(),
  /** Pendant un vote : false si tu es l’auteur du dilemme (tu ne votes pas). */
  canVote: z.boolean(),
  lastVoteResult: LastVoteResultSchema.nullable(),
  lastRoundScores: z.array(RoundScoreRowSchema).nullable(),
  /** Présent uniquement en phase `round_recap`. */
  roundRecap: RoundRecapPayloadSchema.nullable(),
  /** Présent en `round_recap` : votes pour passer le récap avant la fin du timer. */
      recapSkipProgress: RecapSkipProgressSchema.nullable(),
  /** IDs des offres jouées durant la partie — fourni uniquement en phase `game_end`. */
  playedOfferIds: z.array(z.number().int().positive()).nullable(),
  message: z.string().optional(),
});
export type ServerStatePayload = z.infer<typeof ServerStatePayloadSchema>;

/** Client → serveur */
export const HostCreatePayloadSchema = z.object({
  nickname: z.string().min(1).max(32).optional(),
  /** Si absent : toutes les offres disponibles en base au lancement. Sinon, au plus ce nombre d’offres (manches). */
  roundCount: z.number().int().min(HOST_ROUND_COUNT_MIN).max(HOST_ROUND_COUNT_MAX).optional(),
  /** Si fourni : utilise uniquement ces IDs d’offres (dans l’ordre). Prend la priorité sur roundCount. */
  offerIds: z.array(z.number().int().positive()).optional(),
});
export const RoomJoinPayloadSchema = z.object({
  roomCode: z.string().min(4).max(8),
  nickname: z.string().min(1).max(32),
});
export const PlayerReadyPayloadSchema = z.object({
  ready: z.boolean(),
});

export const HostDismissRulesPayloadSchema = z.object({});
export const ConstraintSubmitPayloadSchema = z.object({
  text: z.string().max(500),
});
export const VoteCastPayloadSchema = z.object({
  value: z.enum(["yes", "no"]),
});
export const HostSetTimersPayloadSchema = z.object({
  constraintSeconds: z.number().int().min(15).max(300),
  voteSeconds: z.number().int().min(15).max(300),
});

export const RecapSkipVotePayloadSchema = z.object({});

export const MASTERCLASS_BONUS = 5;
export const PODIUM_POINTS = [3, 2, 1] as const;

/** Distance au 50 % idéal (0 = parfait). yesRatio entre 0 et 1. */
export function distanceFromIdeal5050(yesRatio: number): number {
  return Math.abs(yesRatio * 100 - 50);
}

/** yesRatio = yes / (yes+no), abstentions exclues. Si pas de votes valides, ratio 0.5 (pire distance). */
export function voteRatio(yes: number, no: number): number {
  const t = yes + no;
  if (t === 0) return 0.5;
  return yes / t;
}

export function isPerfect5050(yes: number, no: number): boolean {
  return yes === no && yes + no > 0;
}
