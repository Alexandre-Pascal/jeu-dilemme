import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HostSetTimersPayloadSchema,
  ServerStatePayloadSchema,
  SocketEvents,
  type ServerStatePayload,
} from "@dilemme/shared";
import { getAckReason, getHostCreateRoomCode } from "../socket-ack";
import { createSocket } from "../socket";

export function HostPage() {
  const socket = useMemo(() => createSocket(), []);
  const [state, setState] = useState<ServerStatePayload | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [constraintSec, setConstraintSec] = useState(60);
  const [voteSec, setVoteSec] = useState(60);

  useEffect(() => {
    const onState = (raw: unknown) => {
      const parsed = ServerStatePayloadSchema.safeParse(raw);
      if (parsed.success) setState(parsed.data);
    };
    const onErr = (raw: unknown) => {
      const msg =
        typeof raw === "object" && raw && "message" in raw && typeof (raw as { message: unknown }).message === "string"
          ? (raw as { message: string }).message
          : "Erreur réseau";
      setError(msg);
    };
    const onConnectErr = (err: Error) => {
      setError(err.message || "Impossible de joindre le serveur (lance `pnpm dev` côté API ?)");
    };
    socket.on(SocketEvents.SERVER_STATE, onState);
    socket.on(SocketEvents.ERROR, onErr);
    socket.on("connect_error", onConnectErr);
    return () => {
      socket.off(SocketEvents.SERVER_STATE, onState);
      socket.off(SocketEvents.ERROR, onErr);
      socket.off("connect_error", onConnectErr);
      // Ne pas socket.disconnect() ici : en dev, React StrictMode remonte le composant
      // et une déconnexion ferait perdre la session / les acks sans recréer la salle côté UI.
    };
  }, [socket]);

  const createRoom = useCallback(() => {
    setError(null);
    if (!socket.connected) socket.connect();
    socket.emit(SocketEvents.HOST_CREATE, {}, (ack: unknown) => {
      const code = getHostCreateRoomCode(ack);
      if (code) setRoomCode(code);
      else {
        const reason = getAckReason(ack);
        if (reason) setError(reason);
      }
    });
  }, [socket]);

  const startGame = useCallback(() => {
    setError(null);
    socket.emit(SocketEvents.HOST_START_GAME);
  }, [socket]);

  const applyTimers = useCallback(() => {
    const payload = HostSetTimersPayloadSchema.safeParse({
      constraintSeconds: constraintSec,
      voteSeconds: voteSec,
    });
    if (!payload.success) {
      setError("Durées invalides (15–300 s)");
      return;
    }
    socket.emit(SocketEvents.HOST_SET_TIMERS, payload.data);
  }, [constraintSec, socket, voteSec]);

  const endsIn = useCountdown(state?.phaseEndsAt ?? null);

  const allReady =
    state && state.players.length > 0 && state.players.every((p) => p.ready);

  return (
    <main style={{ padding: "1.25rem", maxWidth: 720, margin: "0 auto" }}>
      <h1>MJ — Le Dilemme Parfait</h1>
      {error ? (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}

      {!roomCode ? (
        <button type="button" onClick={createRoom} style={btnPrimary}>
          Créer une salle
        </button>
      ) : (
        <>
          <p>
            Code salle : <strong style={{ fontSize: "1.5rem", letterSpacing: "0.15em" }}>{roomCode}</strong>
          </p>
          <p style={{ color: "#444" }}>Les joueurs ouvrent « Joueur » et entrent ce code.</p>
        </>
      )}

      {state ? (
        <>
          <section style={card}>
            <h2>Joueurs</h2>
            <ul style={{ paddingLeft: "1.1rem" }}>
              {state.players.map((p) => (
                <li key={p.id}>
                  {p.nickname} — {p.ready ? "Prêt" : "Pas prêt"} — {p.score} pts
                </li>
              ))}
            </ul>
            {state.phase === "lobby" ? (
              <button type="button" disabled={!allReady} onClick={startGame} style={btnPrimary}>
                Lancer la partie
              </button>
            ) : null}
          </section>

          <section style={card}>
            <h2>Timers (secondes)</h2>
            <label style={labelRow}>
              Contrainte
              <input
                type="number"
                min={15}
                max={300}
                value={constraintSec}
                onChange={(e) => setConstraintSec(Number(e.target.value))}
              />
            </label>
            <label style={labelRow}>
              Vote
              <input type="number" min={15} max={300} value={voteSec} onChange={(e) => setVoteSec(Number(e.target.value))} />
            </label>
            <button type="button" onClick={applyTimers} style={btnSecondary}>
              Appliquer aux phases en cours
            </button>
          </section>

          <section style={card}>
            <h2>État</h2>
            <p>
              Phase : <strong>{state.phase}</strong>
            </p>
            {state.currentOfferText ? (
              <p>
                Offre (manche {state.currentRoundIndex + 1}/{state.totalRounds}) : <em>{state.currentOfferText}</em>
              </p>
            ) : null}
            {endsIn !== null ? <p>Temps restant : {endsIn}s</p> : null}
            {state.revealedDilemma ? (
              <div style={{ marginTop: "0.75rem" }}>
                <p>
                  <strong>Dilemme affiché</strong>
                </p>
                <p>{state.revealedDilemma.offer}</p>
                <p style={{ color: "#6d28d9" }}>Mais… {state.revealedDilemma.constraint}</p>
              </div>
            ) : null}
            {state.lastVoteResult ? (
              <p>
                Résultat vote : {state.lastVoteResult.yesPct.toFixed(1)} % Oui / {state.lastVoteResult.noPct.toFixed(1)} % Non
                (abstentions : {state.lastVoteResult.abstainCount})
              </p>
            ) : null}
            {state.phase === "round_recap" && state.roundRecap ? (
              <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: 14, background: "#fafafa", border: "1px solid #e4e4e7" }}>
                <p style={{ margin: 0, color: "#71717a", fontSize: "0.85rem" }}>
                  Manche {state.roundRecap.roundIndex + 1} sur {state.totalRounds}
                </p>
                <h3 style={{ margin: "0.2rem 0 0.75rem" }}>Récap</h3>
                <div style={{ padding: "0.75rem", borderRadius: 12, background: "#faf5ff", border: "1px solid #e9d5ff", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.06em" }}>L&apos;OFFRE</span>
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem" }}>{state.roundRecap.offerText}</p>
                </div>
                <p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "0.88rem" }}>Votes (indicateur bas = équilibré)</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  {state.roundRecap.authors.map((a, i) => (
                    <div
                      key={a.playerId}
                      style={{ padding: "0.5rem 0.65rem", borderRadius: 10, background: "#fff", border: "1px solid #e4e4e7", fontSize: "0.88rem" }}
                    >
                      <span style={{ color: "#a1a1aa", fontSize: "0.72rem" }}>n°{i + 1}</span>{" "}
                      <strong>{a.nickname}</strong> — {a.distanceFrom50.toFixed(1)}
                      {a.masterclass ? <span style={{ color: "#c2410c", fontWeight: 600 }}> · Masterclass +5</span> : null}
                    </div>
                  ))}
                </div>
                <p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "0.88rem" }}>Points</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ background: "#f4f4f5" }}>
                      <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#71717a" }}>Joueur</th>
                      <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#71717a" }}>Manche</th>
                      <th style={{ textAlign: "right", padding: "0.4rem 0.5rem", color: "#71717a" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.roundRecap.pointsThisRound.map((r) => (
                      <tr key={r.playerId}>
                        <td style={{ padding: "0.45rem 0.5rem", borderTop: "1px solid #e4e4e7" }}>{r.nickname}</td>
                        <td style={{ padding: "0.45rem 0.5rem", borderTop: "1px solid #e4e4e7" }}>
                          {r.delta > 0 ? `+${r.delta}` : r.delta}
                        </td>
                        <td style={{ padding: "0.45rem 0.5rem", borderTop: "1px solid #e4e4e7", textAlign: "right", fontWeight: 700 }}>
                          {r.totalScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {state.phase === "game_end" ? <p style={{ fontSize: "1.25rem" }}>Partie terminée.</p> : null}
          </section>
        </>
      ) : (
        <p>Connecté au serveur…</p>
      )}
    </main>
  );
}

function useCountdown(phaseEndsAt: number | null): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!phaseEndsAt) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phaseEndsAt]);
  return left;
}

const btnPrimary: CSSProperties = {
  padding: "0.75rem 1.25rem",
  borderRadius: 12,
  border: "none",
  background: "#7c3aed",
  color: "#fff",
  fontWeight: 700,
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "#4b5563",
  marginTop: "0.5rem",
};

const card: CSSProperties = {
  marginTop: "1rem",
  padding: "1rem",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 4px 20px rgba(15,15,18,0.06)",
};

const labelRow: CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "center",
  marginBottom: "0.35rem",
};
