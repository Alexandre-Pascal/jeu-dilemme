import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ServerStatePayloadSchema,
  SocketEvents,
  type ServerStatePayload,
} from "@dilemme/shared";
import { getAckReason, isRoomJoinOk } from "../socket-ack";
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
  /** Manche pour laquelle la contrainte a été envoyée (attente des autres). */
  const [constraintSentRoundIndex, setConstraintSentRoundIndex] = useState<number | null>(null);
  /** Vote enregistré pour ce dilemme (manche + auteur). */
  const [voteSent, setVoteSent] = useState<{
    roundIndex: number;
    votingForPlayerId: string;
    value: "yes" | "no";
  } | null>(null);

  const stateRef = useRef<ServerStatePayload | null>(null);
  stateRef.current = state;

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
      setVoteSent(null);
    };
    socket.on(SocketEvents.SERVER_STATE, onState);
    socket.on(SocketEvents.ERROR, onErr);
    return () => {
      socket.off(SocketEvents.SERVER_STATE, onState);
      socket.off(SocketEvents.ERROR, onErr);
    };
  }, [socket]);

  const join = useCallback(() => {
    setError(null);
    socket.emit(
      SocketEvents.ROOM_JOIN,
      { roomCode: roomCode.trim(), nickname: nickname.trim() },
      (ack: unknown) => {
        if (isRoomJoinOk(ack)) {
          setJoined(true);
          setConstraintSentRoundIndex(null);
          setVoteSent(null);
        }
        else {
          const reason = getAckReason(ack);
          if (reason) setError(reason);
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
    const s = stateRef.current;
    if (!s || s.phase !== "round_constraint") return;
    socket.emit(SocketEvents.CONSTRAINT_SUBMIT, { text: constraint });
    setConstraint("");
    setConstraintSentRoundIndex(s.currentRoundIndex);
  }, [constraint, socket]);

  const vote = useCallback((value: "yes" | "no") => {
    const s = stateRef.current;
    if (!s || s.phase !== "round_vote" || !s.votingForPlayerId) return;
    socket.emit(SocketEvents.VOTE_CAST, { value });
    setVoteSent({
      roundIndex: s.currentRoundIndex,
      votingForPlayerId: s.votingForPlayerId,
      value,
    });
  }, [socket]);

  const voteSkipRecap = useCallback(() => {
    socket.emit(SocketEvents.RECAP_SKIP_VOTE, {});
  }, [socket]);

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
  /** Même logique que le serveur : évite un état incohérent si le socket a changé sans resync. */
  const canVoteOnCurrentDilemma =
    state?.phase === "round_vote" &&
    state.playerId != null &&
    state.votingForPlayerId != null &&
    state.playerId !== state.votingForPlayerId;

  const voteAcknowledgedForCurrentDilemma =
    canVoteOnCurrentDilemma &&
    voteSent != null &&
    state != null &&
    state.phase === "round_vote" &&
    voteSent.roundIndex === state.currentRoundIndex &&
    voteSent.votingForPlayerId === state.votingForPlayerId;

  const constraintAcknowledgedForCurrentRound =
    constraintSentRoundIndex !== null &&
    state?.phase === "round_constraint" &&
    constraintSentRoundIndex === state.currentRoundIndex;

  const recapPayload = state?.phase === "round_recap" && state.roundRecap ? state.roundRecap : null;

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
          {constraintAcknowledgedForCurrentRound ? (
            <>
              <p style={{ marginTop: "0.75rem", padding: "1rem", borderRadius: 12, background: "#ecfdf5", color: "#166534" }}>
                <strong>Contrainte envoyée.</strong> En attente des autres joueurs…
              </p>
              {endsIn !== null ? <p style={{ marginTop: "0.5rem", color: "#555" }}>Chrono : {endsIn}s</p> : null}
            </>
          ) : (
            <>
              <p>Écris ta contrainte (« mais… ») pour équilibrer le dilemme.</p>
              {endsIn !== null ? <p>Chrono : {endsIn}s</p> : null}
              <textarea
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
                rows={4}
                style={{ width: "100%", fontSize: "1rem", padding: "0.75rem", marginTop: "0.5rem" }}
                maxLength={500}
                placeholder="Mais…"
              />
              <button
                type="button"
                onClick={submitConstraint}
                disabled={!constraint.trim()}
                style={{
                  ...btnYes,
                  marginTop: "0.75rem",
                  width: "100%",
                  opacity: constraint.trim() ? 1 : 0.5,
                }}
              >
                Envoyer
              </button>
            </>
          )}
        </section>
      ) : null}

      {state?.phase === "round_vote" && state.revealedDilemma ? (
        <section style={card}>
          <p style={{ fontSize: "1.05rem" }}>{state.revealedDilemma.offer}</p>
          <p style={{ color: "#6d28d9", fontSize: "1.1rem" }}>Mais… {state.revealedDilemma.constraint}</p>
          {endsIn !== null ? <p>Vote : {endsIn}s</p> : null}
          {canVoteOnCurrentDilemma && voteAcknowledgedForCurrentDilemma ? (
            <p
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: 12,
                background: voteSent?.value === "yes" ? "#ecfdf5" : "#fef2f2",
                color: voteSent?.value === "yes" ? "#166534" : "#991b1b",
                fontWeight: 700,
              }}
            >
              Tu as voté <strong>{voteSent?.value === "yes" ? "OUI" : "NON"}</strong>. En attente des autres…
            </p>
          ) : null}
          {canVoteOnCurrentDilemma && !voteAcknowledgedForCurrentDilemma ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
              <button type="button" style={btnYes} onClick={() => vote("yes")}>
                OUI
              </button>
              <button type="button" style={btnNo} onClick={() => vote("no")}>
                NON
              </button>
            </div>
          ) : null}
          {!canVoteOnCurrentDilemma ? (
            <p style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: "#f3e8ff", color: "#5b21b6" }}>
              C’est <strong>ton</strong> dilemme : les autres votent Oui ou Non. Tu verras le résultat juste après.
            </p>
          ) : null}
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

      {recapPayload && state ? (
        <section style={{ ...card, padding: "1.25rem" }}>
          <p style={{ margin: 0, color: "#71717a", fontSize: "0.9rem" }}>
            Manche {recapPayload.roundIndex + 1} sur {state.totalRounds}
          </p>
          <h2 style={{ margin: "0.2rem 0 1rem", fontSize: "1.35rem" }}>Récap</h2>

          <div style={recapOfferBox}>
            <span style={recapKicker}>L&apos;offre</span>
            <p style={{ margin: "0.4rem 0 0", fontSize: "1.08rem", lineHeight: 1.45, color: "#18181b" }}>
              {recapPayload.offerText}
            </p>
          </div>

          <p style={{ margin: "1.35rem 0 0.35rem", fontWeight: 700, fontSize: "1rem" }}>Les votes sur chaque dilemme</p>
          <p style={{ margin: "0 0 0.75rem", color: "#71717a", fontSize: "0.88rem", lineHeight: 1.4 }}>
            Un indicateur bas = vote très équilibré entre Oui et Non. Un indicateur haut = vote très à fond.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {recapPayload.authors.map((a, i) => (
              <div key={a.playerId} style={recapAuthorCard}>
                <div style={{ fontSize: "0.75rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Dilemme n° {i + 1} / {recapPayload.authors.length}
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", marginTop: "0.15rem" }}>{a.nickname}</div>
                <div style={{ fontSize: "0.92rem", color: "#3f3f46", marginTop: "0.35rem" }}>
                  Indicateur d&apos;équilibre : <strong>{a.distanceFrom50.toFixed(1)}</strong>
                </div>
                {a.masterclass ? (
                  <div style={recapMasterclassBadge}>Masterclass — vote 50/50 exact · +5 pts bonus au classement</div>
                ) : null}
              </div>
            ))}
          </div>

          <p style={{ margin: "1.35rem 0 0.5rem", fontWeight: 700, fontSize: "1rem" }}>Points après cette manche</p>
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e4e4e7" }}>
            <table style={recapTable}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={recapTh}>Joueur</th>
                  <th style={recapTh}>Cette manche</th>
                  <th style={{ ...recapTh, textAlign: "right" as const }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recapPayload.pointsThisRound.map((r) => (
                  <tr key={r.playerId}>
                    <td style={recapTd}>{r.nickname}</td>
                    <td style={recapTd}>{r.delta > 0 ? `+${r.delta}` : String(r.delta)}</td>
                    <td style={{ ...recapTd, textAlign: "right" as const, fontWeight: 800 }}>{r.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.recapSkipProgress ? (
            <div
              style={{
                marginTop: "1.1rem",
                padding: "1rem",
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#475569" }}>
                Pour passer avant la fin du chrono :{" "}
                <strong>
                  {state.recapSkipProgress.votedCount} / {state.recapSkipProgress.requiredCount}
                </strong>{" "}
                joueurs ont voté.
              </p>
              {state.playerId ? (
                state.recapSkipProgress.selfHasSkipped ? (
                  <p style={{ margin: "0.65rem 0 0", fontSize: "0.9rem", color: "#16a34a", fontWeight: 600 }}>
                    Tu as voté pour passer — en attente des autres…
                  </p>
                ) : (
                  <button type="button" onClick={voteSkipRecap} style={btnSkipRecap}>
                    Passer le récap
                  </button>
                )
              ) : null}
            </div>
          ) : null}

          {endsIn !== null ? (
            <p style={{ marginTop: "1rem", padding: "0.85rem", borderRadius: 12, background: "#f4f4f5", color: "#3f3f46", textAlign: "center" }}>
              Suite automatiquement dans <strong>{endsIn}s</strong> si personne ne valide avant.
            </p>
          ) : null}
        </section>
      ) : null}

      {state?.phase === "game_end" ? (
        <section style={card}>
          <h2>Fin de partie</h2>
          <ol style={{ paddingLeft: "1.25rem", margin: 0 }}>
            {[...state.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <li key={p.id}>
                  {p.nickname} — {p.score} pts
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

const recapOfferBox: CSSProperties = {
  padding: "1rem 1.1rem",
  borderRadius: 14,
  background: "linear-gradient(135deg, #faf5ff 0%, #f4f4f5 100%)",
  border: "1px solid #e9d5ff",
};

const recapKicker: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7c3aed",
};

const recapAuthorCard: CSSProperties = {
  padding: "0.85rem 1rem",
  borderRadius: 12,
  background: "#fafafa",
  border: "1px solid #e4e4e7",
};

const recapMasterclassBadge: CSSProperties = {
  marginTop: "0.45rem",
  padding: "0.35rem 0.5rem",
  borderRadius: 8,
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#9a3412",
  background: "#ffedd5",
  display: "inline-block",
};

const recapTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.95rem",
};

const recapTh: CSSProperties = {
  textAlign: "left",
  padding: "0.65rem 0.85rem",
  fontWeight: 700,
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#71717a",
  borderBottom: "1px solid #e4e4e7",
};

const recapTd: CSSProperties = {
  padding: "0.65rem 0.85rem",
  borderBottom: "1px solid #f4f4f5",
  color: "#27272a",
};

const btnSkipRecap: CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.65rem 1.1rem",
  borderRadius: 12,
  border: "1px solid #64748b",
  background: "#fff",
  color: "#334155",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: "pointer",
};
