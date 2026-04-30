/** Réponses d’acquittement Socket.io typées sans assertion dangereuse */

export function getHostCreateRoomCode(ack: unknown): string | null {
  if (typeof ack !== "object" || ack === null) return null;
  const o = ack as Record<string, unknown>;
  if (o.ok !== true) return null;
  if (typeof o.roomCode !== "string") return null;
  return o.roomCode;
}

export function isRoomJoinOk(ack: unknown): boolean {
  if (typeof ack !== "object" || ack === null) return false;
  return (ack as Record<string, unknown>).ok === true;
}

export function getAckReason(ack: unknown): string | null {
  if (typeof ack !== "object" || ack === null) return null;
  const r = (ack as Record<string, unknown>).reason;
  return typeof r === "string" ? r : null;
}
