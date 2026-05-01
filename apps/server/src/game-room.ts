import { randomBytes } from "node:crypto";
import type { GamePhase, RoundRecapPayload, ServerStatePayload } from "@dilemme/shared";
import type { AuthorRoundResult } from "./scoring.js";
import { computeRoundPodiumDeltas, computeVoteDisplay } from "./scoring.js";

export type Player = {
  id: string;
  nickname: string;
  socketId: string;
  ready: boolean;
  score: number;
};

function makeId(): string {
  return randomBytes(8).toString("hex");
}

function makeRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[buf[i] % chars.length]!;
  return s;
}

export class GameRoom {
  readonly roomCode: string;
  hostSocketId: string;
  players: Player[] = [];
  phase: GamePhase = "lobby";
  constraintSeconds = 60;
  voteSeconds = 60;
  /** Pause « récap points » après chaque manche complète, avant l’offre suivante. */
  recapSeconds = 15;
  offers: string[] = [];
  /** Limite MJ à la création de salle ; `null` = charger toutes les offres au démarrage. */
  plannedRoundCount: number | null = null;
  currentRoundIndex = 0;
  constraints = new Map<string, string>();
  /** Index dans `players` : pour quel auteur on vote */
  voteAuthorIndex = 0;
  votes = new Map<string, "yes" | "no">();
  roundAuthorResults: AuthorRoundResult[] = [];
  roundRecapPayload: RoundRecapPayload | null = null;
  /** Joueurs ayant demandé à passer le récap (phase `round_recap`). */
  recapSkipVotes = new Set<string>();
  phaseEndsAt: number | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private broadcast: () => void;

  constructor(roomCode: string, hostSocketId: string, broadcast: () => void) {
    this.roomCode = roomCode;
    this.hostSocketId = hostSocketId;
    this.broadcast = broadcast;
  }

  static create(hostSocketId: string, broadcast: () => void, plannedRoundCount: number | null = null): GameRoom {
    const room = new GameRoom(makeRoomCode(), hostSocketId, broadcast);
    room.plannedRoundCount = plannedRoundCount;
    return room;
  }

  clearPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private schedulePhaseEnd(ms: number, fn: () => void): void {
    this.clearPhaseTimer();
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      fn();
    }, ms);
  }

  setOffers(texts: string[]): void {
    this.offers = texts;
  }

  /**
   * Associe la connexion Socket.io au joueur : d’abord par `playerId` mémorisé côté serveur au join
   * (fiable après upgrade/reconnexion), sinon par `socketId` ; met à jour `player.socketId` si besoin.
   */
  resolvePlayer(socketId: string, clientPlayerId?: string | null): Player | undefined {
    if (clientPlayerId) {
      const byId = this.players.find((p) => p.id === clientPlayerId);
      if (byId) {
        if (byId.socketId !== socketId) byId.socketId = socketId;
        return byId;
      }
    }
    return this.players.find((p) => p.socketId === socketId);
  }

  toPublicState(socketId: string, clientPlayerId?: string | null): ServerStatePayload {
    const isHost = socketId === this.hostSocketId;
    const self = this.resolvePlayer(socketId, clientPlayerId ?? null);
    const offer =
      this.currentRoundIndex < this.offers.length
        ? (this.offers[this.currentRoundIndex] ?? null)
        : null;
    const votingPlayer =
      this.phase === "round_vote" || this.phase === "round_subresult"
        ? (this.players[this.voteAuthorIndex] ?? null)
        : null;

    const revealedDilemma =
      votingPlayer && offer
        ? {
            offer,
            constraint: this.constraints.get(votingPlayer.id) ?? "",
          }
        : null;

    let lastVoteResult = null as ServerStatePayload["lastVoteResult"];
    if (this.phase === "round_subresult" && votingPlayer) {
      const stats = this.lastVoteStatsFor(votingPlayer.id);
      if (stats) lastVoteResult = stats;
    }

    let lastRoundScores = null as ServerStatePayload["lastRoundScores"];
    if (this.phase === "round_subresult" && votingPlayer) {
      const stats = this.lastVoteStatsFor(votingPlayer.id);
      if (stats) {
        const d = computeVoteDisplay(stats.yesCount, stats.noCount, stats.abstainCount);
        lastRoundScores = [
          {
            playerId: votingPlayer.id,
            deltaPoints: 0,
            distanceFrom50: d.distance,
            masterclass: d.masterclass,
          },
        ];
      }
    }

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      isHost,
      playerId: self?.id ?? null,
      players: this.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        ready: p.ready,
        score: p.score,
      })),
      currentRoundIndex: this.currentRoundIndex,
      totalRounds:
        this.offers.length > 0
          ? this.offers.length
          : this.plannedRoundCount ?? 0,
      plannedRoundCount: this.plannedRoundCount,
      currentOfferText: offer,
      votingForPlayerId: votingPlayer?.id ?? null,
      revealedDilemma,
      constraintOpen: this.phase === "round_constraint",
      voteOpen: this.phase === "round_vote",
      canVote:
        this.phase === "round_vote" && !!self && !!votingPlayer && self.id !== votingPlayer.id,
      lastVoteResult,
      lastRoundScores,
      roundRecap: this.phase === "round_recap" && this.roundRecapPayload ? this.roundRecapPayload : null,
      recapSkipProgress:
        this.phase === "round_recap" && this.players.length > 0
          ? {
              votedCount: this.recapSkipVotes.size,
              requiredCount: this.players.length,
              selfHasSkipped: self ? this.recapSkipVotes.has(self.id) : false,
            }
          : null,
      message: undefined,
    };
  }

  private lastVoteStatsFor(authorId: string) {
    let yes = 0;
    let no = 0;
    let abstain = 0;
    for (const p of this.players) {
      if (p.id === authorId) continue;
      const v = this.votes.get(p.id);
      if (v === "yes") yes++;
      else if (v === "no") no++;
      else abstain++;
    }
    const d = computeVoteDisplay(yes, no, abstain);
    return {
      yesPct: d.yesPct,
      noPct: d.noPct,
      yesCount: yes,
      noCount: no,
      abstainCount: abstain,
    };
  }

  addPlayer(socketId: string, nickname: string): { ok: true; playerId: string } | { ok: false; reason: string } {
    if (this.phase !== "lobby") return { ok: false, reason: "Partie déjà commencée" };
    if (this.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
      return { ok: false, reason: "Pseudo déjà pris" };
    }
    const id = makeId();
    this.players.push({ id, nickname, socketId, ready: false, score: 0 });
    this.broadcast();
    return { ok: true, playerId: id };
  }

  setReady(
    socketId: string,
    ready: boolean,
    clientPlayerId?: string | null,
  ): { ok: true } | { ok: false; reason: string } {
    const p = this.resolvePlayer(socketId, clientPlayerId ?? null);
    if (!p) return { ok: false, reason: "Joueur introuvable" };
    p.ready = ready;
    this.broadcast();
    return { ok: true };
  }

  reconnectHost(newSocketId: string): void {
    this.hostSocketId = newSocketId;
    this.broadcast();
  }

  reconnectPlayer(playerId: string, newSocketId: string): boolean {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) return false;
    p.socketId = newSocketId;
    this.broadcast();
    return true;
  }

  async startGame(loadOffers: () => Promise<string[]>): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.players.length < 1) return { ok: false, reason: "Au moins un joueur requis" };
    if (!this.players.every((p) => p.ready)) return { ok: false, reason: "Tous les joueurs doivent être prêts" };
    const allOffers = await loadOffers();
    if (allOffers.length === 0) return { ok: false, reason: "Aucune offre en base (lance les migrations + seed)" };
    const cap =
      this.plannedRoundCount != null
        ? Math.min(Math.max(1, this.plannedRoundCount), allOffers.length)
        : allOffers.length;
    this.offers = allOffers.slice(0, cap);
    this.currentRoundIndex = 0;
    this.phase = "round_constraint";
    this.constraints.clear();
    this.roundAuthorResults = [];
    this.roundRecapPayload = null;
    this.voteAuthorIndex = 0;
    this.votes.clear();
    const ends = Date.now() + this.constraintSeconds * 1000;
    this.phaseEndsAt = ends;
    this.schedulePhaseEnd(this.constraintSeconds * 1000, () => this.endConstraintPhase());
    this.broadcast();
    return { ok: true };
  }

  setTimers(constraintSeconds: number, voteSeconds: number, socketId: string): { ok: true } | { ok: false; reason: string } {
    if (socketId !== this.hostSocketId) return { ok: false, reason: "Réservé au MJ" };
    this.constraintSeconds = constraintSeconds;
    this.voteSeconds = voteSeconds;
    if (this.phase === "round_constraint" && this.phaseEndsAt) {
      const remaining = Math.max(1000, this.phaseEndsAt - Date.now());
      this.clearPhaseTimer();
      this.phaseEndsAt = Date.now() + remaining;
      this.schedulePhaseEnd(remaining, () => this.endConstraintPhase());
    } else if (this.phase === "round_vote" && this.phaseEndsAt) {
      const remaining = Math.max(1000, this.phaseEndsAt - Date.now());
      this.clearPhaseTimer();
      this.phaseEndsAt = Date.now() + remaining;
      this.schedulePhaseEnd(remaining, () => this.endVotePhase());
    } else if (this.phase === "round_recap" && this.phaseEndsAt) {
      const remaining = Math.max(1000, this.phaseEndsAt - Date.now());
      this.clearPhaseTimer();
      this.phaseEndsAt = Date.now() + remaining;
      this.schedulePhaseEnd(remaining, () => this.endRoundRecap());
    }
    this.broadcast();
    return { ok: true };
  }

  voteRecapSkip(
    socketId: string,
    clientPlayerId?: string | null,
  ): { ok: true } | { ok: false; reason: string } {
    if (this.phase !== "round_recap") return { ok: false, reason: "Pas de récap en cours" };
    const p = this.resolvePlayer(socketId, clientPlayerId ?? null);
    if (!p) return { ok: false, reason: "Joueur introuvable" };
    if (!this.recapSkipVotes.has(p.id)) this.recapSkipVotes.add(p.id);
    if (this.recapSkipVotes.size >= this.players.length) {
      this.endRoundRecap();
    } else this.broadcast();
    return { ok: true };
  }

  submitConstraint(
    socketId: string,
    text: string,
    clientPlayerId?: string | null,
  ): { ok: true } | { ok: false; reason: string } {
    if (this.phase !== "round_constraint") return { ok: false, reason: "Phase incorrecte" };
    const p = this.resolvePlayer(socketId, clientPlayerId ?? null);
    if (!p) return { ok: false, reason: "Seuls les joueurs envoient une contrainte" };
    this.constraints.set(p.id, text.trim());
    if (this.players.every((pl) => this.constraints.has(pl.id))) {
      this.endConstraintPhase();
    } else this.broadcast();
    return { ok: true };
  }

  castVote(
    socketId: string,
    value: "yes" | "no",
    clientPlayerId?: string | null,
  ): { ok: true } | { ok: false; reason: string } {
    if (this.phase !== "round_vote") return { ok: false, reason: "Pas de vote en cours" };
    const author = this.players[this.voteAuthorIndex];
    if (!author) return { ok: false, reason: "Aucun dilemme en vote" };
    const p = this.resolvePlayer(socketId, clientPlayerId ?? null);
    if (!p) return { ok: false, reason: "Joueur introuvable" };
    if (p.id === author.id) return { ok: false, reason: "Tu ne peux pas voter sur ton propre dilemme" };
    this.votes.set(p.id, value);
    const voters = this.players.filter((pl) => pl.id !== author.id);
    if (voters.every((v) => this.votes.has(v.id))) {
      this.endVotePhase();
    } else this.broadcast();
    return { ok: true };
  }

  private endConstraintPhase(): void {
    if (this.phase !== "round_constraint") return;
    this.clearPhaseTimer();
    for (const p of this.players) {
      if (!this.constraints.has(p.id)) this.constraints.set(p.id, "");
    }
    this.beginVoteForCurrentAuthor();
  }

  private beginVoteForCurrentAuthor(): void {
    this.phase = "round_vote";
    this.votes.clear();
    const ends = Date.now() + this.voteSeconds * 1000;
    this.phaseEndsAt = ends;
    this.schedulePhaseEnd(this.voteSeconds * 1000, () => this.endVotePhase());
    this.broadcast();
  }

  private endVotePhase(): void {
    if (this.phase !== "round_vote") return;
    this.clearPhaseTimer();
    const author = this.players[this.voteAuthorIndex];
    if (!author) {
      this.advanceRoundOrEnd();
      return;
    }
    let yes = 0;
    let no = 0;
    let abstain = 0;
    for (const p of this.players) {
      if (p.id === author.id) continue;
      const v = this.votes.get(p.id);
      if (v === "yes") yes++;
      else if (v === "no") no++;
      else abstain++;
    }
    const d = computeVoteDisplay(yes, no, abstain);
    this.roundAuthorResults.push({
      playerId: author.id,
      distance: d.distance,
      masterclass: d.masterclass,
    });
    this.phase = "round_subresult";
    this.phaseEndsAt = null;
    this.broadcast();

    setTimeout(() => this.afterSubresult(), 3500);
  }

  private afterSubresult(): void {
    if (this.phase !== "round_subresult") return;
    this.voteAuthorIndex += 1;
    if (this.voteAuthorIndex < this.players.length) {
      this.phase = "round_vote";
      this.votes.clear();
      const ends = Date.now() + this.voteSeconds * 1000;
      this.phaseEndsAt = ends;
      this.schedulePhaseEnd(this.voteSeconds * 1000, () => this.endVotePhase());
    } else {
      const finishedRoundIndex = this.currentRoundIndex;
      const finishedOffer = this.offers[this.currentRoundIndex] ?? "";
      const authorSnapshot = [...this.roundAuthorResults];
      const deltas = computeRoundPodiumDeltas(this.roundAuthorResults);
      for (const p of this.players) {
        p.score += deltas.get(p.id) ?? 0;
      }
      const nick = (id: string) => this.players.find((x) => x.id === id)?.nickname ?? id;
      const recapAuthors: RoundRecapPayload["authors"] = authorSnapshot.map((r) => ({
        playerId: r.playerId,
        nickname: nick(r.playerId),
        distanceFrom50: r.distance,
        masterclass: r.masterclass,
      }));
      const pointsThisRound: RoundRecapPayload["pointsThisRound"] = [...this.players]
        .map((p) => ({
          playerId: p.id,
          nickname: p.nickname,
          delta: deltas.get(p.id) ?? 0,
          totalScore: p.score,
        }))
        .sort((a, b) => b.totalScore - a.totalScore || b.delta - a.delta);

      this.roundAuthorResults = [];
      this.voteAuthorIndex = 0;
      this.constraints.clear();
      this.currentRoundIndex += 1;

      this.roundRecapPayload = {
        roundIndex: finishedRoundIndex,
        offerText: finishedOffer,
        authors: recapAuthors,
        pointsThisRound,
      };
      this.recapSkipVotes.clear();
      this.phase = "round_recap";
      const recapMs = this.recapSeconds * 1000;
      this.phaseEndsAt = Date.now() + recapMs;
      this.schedulePhaseEnd(recapMs, () => this.endRoundRecap());
    }
    this.broadcast();
  }

  private endRoundRecap(): void {
    if (this.phase !== "round_recap") return;
    this.clearPhaseTimer();
    this.recapSkipVotes.clear();
    this.roundRecapPayload = null;
    if (this.currentRoundIndex >= this.offers.length) {
      this.phase = "game_end";
      this.phaseEndsAt = null;
    } else {
      this.phase = "round_constraint";
      const ends = Date.now() + this.constraintSeconds * 1000;
      this.phaseEndsAt = ends;
      this.schedulePhaseEnd(this.constraintSeconds * 1000, () => this.endConstraintPhase());
    }
    this.broadcast();
  }

  private advanceRoundOrEnd(): void {
    this.phase = "game_end";
    this.phaseEndsAt = null;
    this.broadcast();
  }

  destroy(): void {
    this.clearPhaseTimer();
  }
}
