import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ServerStatePayloadSchema,
  SocketEvents,
  type ServerStatePayload,
} from "@dilemme/shared";
import { createSocket } from "../socket";

export function PlayPage() {
  const [params] = useSearchParams();
  const initialCode = (params.get("code") ?? "").toUpperCase();
  const socket = useMemo(() => createSocket(), []);
  const [state, setState] = useState<ServerStatePayload | null>(null);
  const [roomCode, setRoomCode] = useState(initialCode);
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [constraint, setConstraint] = useState("");

  useEffect(() => {
    const onState = (raw: unknown) => {
      const parsed = ServerStatePayloadSchema.safeParse(raw);
      if (parsed.success) setState(parsed.data);
    };
    const onErr = (raw: unknown) => {
      const msg =
        typeof raw === "object" && raw && "message" in raw && typeof (raw as { message: unknown }).message === "string"
          ? (raw as { message: string }).message
          : "Erreur";
      setError(msg);
    };
    socket.on(SocketEvents.SERVER_STATE, onState);
    socket.on(SocketEvents.ERROR, onErr);
    return () => {
      socket.off(SocketEvents.SERVER_STATE, onState);
      socket.off(SocketEvents.ERROR, onErr);
      socket.disconnect();
    };
  }, [socket]);

  const join = useCallback(() => {
    setError(null);
    socket.emit(
      SocketEvents.ROOM_JOIN,
      { roomCode: roomCode.trim(), nickname: nickname.trim() },
      (ack: unknown) => {
        if (typeof ack === "object" && ack && "ok" in ack && (ack as { ok: boolean }).ok) {
          setJoined(true);
        } else if (typeof ack === "object" && ack && "reason" in ack) {
          setError(String((ack as { reason: string }).reason));
        }
      },
    );
  }, [nickname, roomCode, socket]);

  const setReady = useCallback(
    (ready: boolean) => {
      socket.emit(SocketEvents.PLAYER_READY, { ready });
    },
    [socket],
  );

  const submitConstraint = useCallback(() => {
    socket.emit(SocketEvents.CONSTRAINT_SUBMIT, { text: constraint });
    setConstraint("");
  }, [constraint, socket]);

  const vote = useCallback(
    (value: "yes" | "no") => {
      socket.emit(SocketEvents.VOTE_CAST, { value });
    },
    [socket],
  );

  const endsIn = useCountdown(state?.phaseEndsAt ?? null);

  if (!joined) {
    return (
      <main style={{ padding: "1.25rem", maxWidth: 480, margin: "0 auto" }}>
        <h1>Joueur</h1>
        {error ? (
          <p style={{ color: "#b91c1c" }} role="alert">
            {error}
          </p>
        ) : null}
        <label style={stack}>
          Code salle
          <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} autoCapitalize="characters" />
        </label>
        <label style={stack}>
          Pseudo
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={32} />
        </label>
        <button type="button" onClick={join} style={btnYes} disabled={!roomCode.trim() || !nickname.trim()}>
          Rejoindre
        </button>
      </main>
    );
  }

  const self = state?.players.find((p) => p.id === state.playerId);

  return (
    <main style={{ padding: "1.25rem", maxWidth: 520, margin: "0 auto" }}>
      <h1>Partie</h1>
      {error ? (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}

      {state?.phase === "lobby" ? (
        <section style={card}>
          <p>
            Bienvenue <strong>{self?.nickname}</strong>
          </p>
          <button type="button" onClick={() => setReady(!self?.ready)} style={self?.ready ? btnNo : btnYes}>
            {self?.ready ? "Annuler prêt" : "Je suis prêt"}
          </button>
        </section>
      ) : null}

      {state?.phase === "round_constraint" ? (
        <section style={card}>
          <p style={{ fontSize: "1.1rem" }}>
            <strong>Offre :</strong> {state.currentOfferText}
          </p>
          <p>Écris ta contrainte (« mais… ») pour équilibrer le dilemme.</p>
          {endsIn !== null ? <p>Chrono : {endsIn}s</p> : null}
          <textarea
            value={constraint}
            onChange={(e) => setConstraint(e.target.value)}
            rows={4}
            style={{ width: "100%", fontSize: "1rem", padding: "0.75rem" }}
            maxLength={500}
            placeholder="Mais…"
          />
          <button type="button" onClick={submitConstraint} style={{ ...btnYes, marginTop: "0.75rem", width: "100%" }}>
            Envoyer
          </button>
        </section>
      ) : null}

      {state?.phase === "round_vote" && state.revealedDilemma ? (
        <section style={card}>
          <p style={{ fontSize: "1.05rem" }}>{state.revealedDilemma.offer}</p>
          <p style={{ color: "#6d28d9", fontSize: "1.1rem" }}>Mais… {state.revealedDilemma.constraint}</p>
          {endsIn !== null ? <p>Vote : {endsIn}s</p> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="button" style={btnYes} onClick={() => vote("yes")}>
              OUI
            </button>
            <button type="button" style={btnNo} onClick={() => vote("no")}>
              NON
            </button>
          </div>
        </section>
      ) : null}

      {state?.phase === "round_subresult" && state.lastVoteResult ? (
        <section style={card}>
          <h2>Résultat</h2>
          <p>
            {state.lastVoteResult.yesPct.toFixed(1)} % Oui — {state.lastVoteResult.noPct.toFixed(1)} % Non
          </p>
          {state.lastRoundScores?.[0]?.masterclass ? <p style={{ color: "#b45309", fontWeight: 800 }}>Masterclass !</p> : null}
        </section>
      ) : null}

      {state?.phase === "game_end" ? (
        <section style={card}>
          <h2>Fin de partie</h2>
          <ol>
            {[...state.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <li key={p.id}>
                  {i + 1}. {p.nickname} — {p.score} pts
                </li>
              ))}
          </ol>
        </section>
      ) : null}

      {state && state.phase !== "lobby" && state.phase !== "game_end" ? (
        <p style={{ marginTop: "1rem", color: "#555" }}>
          Ton score : <strong>{self?.score ?? 0}</strong>
        </p>
      ) : null}
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

const btnYes: CSSProperties = {
  padding: "1rem",
  borderRadius: 14,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  fontSize: "1.1rem",
};

const btnNo: CSSProperties = {
  ...btnYes,
  background: "#dc2626",
};

const card: CSSProperties = {
  marginTop: "1rem",
  padding: "1rem",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 4px 20px rgba(15,15,18,0.06)",
};

const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  marginBottom: "0.75rem",
};
