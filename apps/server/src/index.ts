import "./load-env.js";
import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  ConstraintSubmitPayloadSchema,
  HostCreatePayloadSchema,
  HostDismissRulesPayloadSchema,
  HostSetTimersPayloadSchema,
  PlayerReadyPayloadSchema,
  RecapSkipVotePayloadSchema,
  RoomJoinPayloadSchema,
  SocketEvents,
  VoteCastPayloadSchema,
} from "@dilemme/shared";
import { createRequire } from "node:module";
import { GameRoom } from "./game-room.js";
import { loadOffers, loadOffersByIds, prisma } from "./prisma.js";

type GameSocket = {
  id: string;
  data: { roomCode?: string; isHost?: boolean; playerId?: string };
  join(room: string): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(close?: boolean): void;
};

/** Surface minimale : résolution tsc des exports ESM de socket.io */
type IOServerInstance = {
  on(event: "connection", handler: (socket: GameSocket) => void): void;
  close(callback?: () => void): void;
  sockets: { sockets: Map<string, GameSocket>; adapter: { rooms: Map<string, Set<string>> } };
  to(room: string): { emit: (event: string, ...args: unknown[]) => void };
};

const require = createRequire(import.meta.url);
const { Server: IOServer } = require("socket.io") as { Server: new (...args: unknown[]) => IOServerInstance };

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const roomsByCode = new Map<string, GameRoom>();

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: CORS_ORIGIN, credentials: true });

fastify.get("/health", async () => ({ ok: true }));

/** Liste toutes les offres disponibles. */
fastify.get("/api/offers", async () => {
  const rows = await prisma.offer.findMany({ orderBy: { order: "asc" } });
  return rows;
});

/** Ajoute une nouvelle offre. */
fastify.post<{ Body: { text: string; category?: string } }>("/api/offers", {
  schema: {
    body: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string", minLength: 1, maxLength: 500 },
        category: { type: "string", maxLength: 100 },
      },
    },
  },
}, async (req, reply) => {
  const { text, category = "" } = req.body;
  const max = await prisma.offer.aggregate({ _max: { order: true } });
  const nextOrder = (max._max.order ?? 0) + 1;
  const offer = await prisma.offer.create({ data: { text: text.trim(), category: category.trim(), order: nextOrder } });
  reply.code(201);
  return offer;
});

/** Supprime une offre par son ID. */
fastify.delete<{ Params: { id: string } }>("/api/offers/:id", async (req, reply) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    reply.code(400);
    return { ok: false, reason: "ID invalide" };
  }
  try {
    await prisma.offer.delete({ where: { id } });
    reply.code(204);
    return null;
  } catch {
    reply.code(404);
    return { ok: false, reason: "Offre introuvable" };
  }
});

await fastify.ready();

const io = new IOServer(fastify.server, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"], credentials: true },
});

function broadcastRoom(room: GameRoom): void {
  const set = io.sockets.adapter.rooms.get(room.roomCode);
  if (!set) return;
  for (const sid of set) {
    const s = io.sockets.sockets.get(sid);
    if (s)
      s.emit(
        SocketEvents.SERVER_STATE,
        room.toPublicState(sid, s.data.playerId),
      );
  }
}

io.on("connection", (socket: GameSocket) => {
  socket.on(SocketEvents.HOST_CREATE, (...args: unknown[]) => {
    const payload = args[0];
    const ack = args[1] as ((r: unknown) => void) | undefined;
    const parsed = HostCreatePayloadSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      ack?.({ ok: false, reason: "Payload invalide" });
      return;
    }
    let room: GameRoom;
    const offerIds = parsed.data.offerIds && parsed.data.offerIds.length > 0 ? parsed.data.offerIds : null;
    const planned = offerIds ? null : (parsed.data.roundCount ?? null);
    room = GameRoom.create(socket.id, () => broadcastRoom(room), planned, offerIds);
    roomsByCode.set(room.roomCode, room);
    socket.join(room.roomCode);
    socket.data.roomCode = room.roomCode;
    socket.data.isHost = true;
    ack?.({ ok: true, roomCode: room.roomCode });
    broadcastRoom(room);
  });

  socket.on(SocketEvents.ROOM_JOIN, (...args: unknown[]) => {
    const payload = args[0];
    const ack = args[1] as ((r: unknown) => void) | undefined;
    const parsed = RoomJoinPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, reason: "Pseudo ou code invalide" });
      return;
    }
    const code = parsed.data.roomCode.toUpperCase();
    const room = roomsByCode.get(code);
    if (!room) {
      ack?.({ ok: false, reason: "Salle introuvable" });
      return;
    }
    const res = room.addPlayer(socket.id, parsed.data.nickname);
    if (!res.ok) {
      ack?.(res);
      return;
    }
    socket.join(room.roomCode);
    socket.data.roomCode = room.roomCode;
    socket.data.isHost = false;
    socket.data.playerId = res.playerId;
    ack?.({ ok: true, roomCode: room.roomCode, playerId: res.playerId });
    broadcastRoom(room);
  });

  socket.on(SocketEvents.PLAYER_READY, (payload: unknown) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room) return;
    const parsed = PlayerReadyPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    room.setReady(socket.id, parsed.data.ready, socket.data.playerId);
  });

  socket.on(SocketEvents.HOST_START_GAME, async () => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room || socket.id !== room.hostSocketId) return;
    const loader = room.selectedOfferIds
      ? () => loadOffersByIds(room.selectedOfferIds!)
      : loadOffers;
    const res = await room.startGame(loader);
    if (!res.ok) socket.emit(SocketEvents.ERROR, { message: res.reason });
    broadcastRoom(room);
  });

  socket.on(SocketEvents.HOST_DISMISS_RULES, (...args: unknown[]) => {
    const ack = args[1] as ((r: unknown) => void) | undefined;
    const code = socket.data.roomCode as string | undefined;
    if (!code) {
      ack?.({ ok: false, reason: "Pas de salle" });
      return;
    }
    const room = roomsByCode.get(code);
    if (!room || socket.id !== room.hostSocketId) {
      ack?.({ ok: false, reason: "Réservé au MJ" });
      return;
    }
    if (!HostDismissRulesPayloadSchema.safeParse(args[0] ?? {}).success) {
      ack?.({ ok: false, reason: "Payload invalide" });
      return;
    }
    const res = room.hostDismissRules(socket.id);
    if (!res.ok) {
      ack?.(res);
      return;
    }
    ack?.({ ok: true });
    broadcastRoom(room);
  });

  socket.on(SocketEvents.CONSTRAINT_SUBMIT, (payload: unknown) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room) return;
    const parsed = ConstraintSubmitPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const res = room.submitConstraint(socket.id, parsed.data.text, socket.data.playerId);
    if (!res.ok) socket.emit(SocketEvents.ERROR, { message: res.reason });
  });

  socket.on(SocketEvents.VOTE_CAST, (payload: unknown) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room) return;
    const parsed = VoteCastPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const res = room.castVote(socket.id, parsed.data.value, socket.data.playerId);
    if (!res.ok) socket.emit(SocketEvents.ERROR, { message: res.reason });
  });

  socket.on(SocketEvents.RECAP_SKIP_VOTE, (payload: unknown) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room) return;
    if (!RecapSkipVotePayloadSchema.safeParse(payload ?? {}).success) return;
    const res = room.voteRecapSkip(socket.id, socket.data.playerId);
    if (!res.ok) socket.emit(SocketEvents.ERROR, { message: res.reason });
  });

  socket.on(SocketEvents.HOST_SET_TIMERS, (payload: unknown) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room) return;
    const parsed = HostSetTimersPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const res = room.setTimers(parsed.data.constraintSeconds, parsed.data.voteSeconds, socket.id);
    if (!res.ok) socket.emit(SocketEvents.ERROR, { message: res.reason });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = roomsByCode.get(code);
    if (!room) return;
    if (socket.data.isHost) {
      room.destroy();
      roomsByCode.delete(code);
      io.to(code).emit(SocketEvents.ERROR, { message: "Le MJ a quitté la salle." });
      return;
    }
    if (room.phase === "lobby") {
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      broadcastRoom(room);
    }
  });
});

await fastify.listen({ port: PORT, host: HOST });
fastify.log.info(`HTTP + Socket.io sur le port ${PORT}`);

process.on("SIGINT", async () => {
  for (const r of roomsByCode.values()) r.destroy();
  io.close();
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});
