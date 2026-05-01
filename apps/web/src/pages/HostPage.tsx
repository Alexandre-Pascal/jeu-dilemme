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

  const hostRoundRecap =
    state && state.phase === "round_recap" && state.roundRecap ? state.roundRecap : null;

  return (
    <main className="d-page">
      <header className="d-header">
        <h1 className="d-title">Maître du jeu</h1>
        <p className="d-subtitle">Pilote la partie, partage le code salle et suis l’avancement en direct.</p>
      </header>

      {error ? (
        <p className="d-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      {!roomCode ? (
        <button type="button" onClick={createRoom} className="d-btn d-btn--primary d-btn--lg">
          Créer une salle
        </button>
      ) : (
        <div className="d-card d-card--flush">
          <p className="d-muted" style={{ marginTop: 0 }}>
            Code salle
          </p>
          <p>
            <span className="d-code">{roomCode}</span>
          </p>
          <p className="d-muted">Les joueurs ouvrent « Joueur » et entrent ce code.</p>
        </div>
      )}

      {state ? (
        <>
          <section key="players" className="d-card d-phase-enter">
            <h2>Joueurs</h2>
            <ul className="d-list">
              {state.players.map((p) => (
                <li key={p.id}>
                  {p.nickname} — {p.ready ? "Prêt" : "Pas prêt"} — {p.score} pts
                </li>
              ))}
            </ul>
            {state.phase === "lobby" ? (
              <button type="button" disabled={!allReady} onClick={startGame} className="d-btn d-btn--primary d-btn--block">
                Lancer la partie
              </button>
            ) : null}
          </section>

          <section key="timers" className="d-card d-phase-enter">
            <h2>Timers (secondes)</h2>
            <label className="d-label-row">
              Contrainte
              <input
                type="number"
                min={15}
                max={300}
                value={constraintSec}
                onChange={(e) => setConstraintSec(Number(e.target.value))}
              />
            </label>
            <label className="d-label-row">
              Vote
              <input type="number" min={15} max={300} value={voteSec} onChange={(e) => setVoteSec(Number(e.target.value))} />
            </label>
            <button type="button" onClick={applyTimers} className="d-btn d-btn--secondary d-btn--block">
              Appliquer aux phases en cours
            </button>
          </section>

          <section key="state" className="d-card d-phase-enter">
            <h2>État</h2>
            <p>
              Phase : <strong>{state.phase}</strong>
            </p>
            {state.currentOfferText ? (
              <p>
                Offre (manche {state.currentRoundIndex + 1}/{state.totalRounds}) : <em>{state.currentOfferText}</em>
              </p>
            ) : null}
            {endsIn !== null ? <p className="d-muted">Temps restant : {endsIn}s</p> : null}
            {state.revealedDilemma ? (
              <div style={{ marginTop: "0.75rem" }}>
                <p>
                  <strong>Dilemme affiché</strong>
                </p>
                <p className="d-offer-line">{state.revealedDilemma.offer}</p>
                <p className="d-constraint-line">Mais… {state.revealedDilemma.constraint}</p>
              </div>
            ) : null}
            {state.lastVoteResult ? (
              <p>
                Résultat vote : {state.lastVoteResult.yesPct.toFixed(1)} % Oui / {state.lastVoteResult.noPct.toFixed(1)} % Non
                (abstentions : {state.lastVoteResult.abstainCount})
              </p>
            ) : null}
            {hostRoundRecap ? (
              <div className="d-host-recap-inner d-recap d-recap--compact">
                <header className="d-recap-header">
                  <span className="d-recap-round">
                    Manche {hostRoundRecap.roundIndex + 1} sur {state.totalRounds}
                  </span>
                  <h3 className="d-recap-title">Récap</h3>
                </header>
                <div className="d-recap-block d-recap-block--scores">
                  <h4 className="d-recap-block__title" id="host-recap-scores-heading">
                    Points après cette manche
                  </h4>
                  <div className="d-recap-scores" role="region" aria-labelledby="host-recap-scores-heading">
                    <div className="d-recap-scores-head" aria-hidden>
                      <span>Joueur</span>
                      <span>Manche</span>
                      <span>Total</span>
                    </div>
                    <ul className="d-recap-scores-list">
                      {hostRoundRecap.pointsThisRound.map((r) => {
                        const deltaStr = r.delta > 0 ? `+${r.delta}` : String(r.delta);
                        const deltaClass =
                          r.delta > 0 ? "d-recap-score-delta--up" : r.delta < 0 ? "d-recap-score-delta--down" : "";
                        return (
                          <li key={r.playerId} className="d-recap-score-row">
                            <span className="d-recap-score-name">{r.nickname}</span>
                            <span className={`d-recap-score-delta ${deltaClass}`.trim()}>{deltaStr}</span>
                            <span className="d-recap-score-total">{r.totalScore}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <div className="d-recap-offer d-recap-offer--remind">
                  <span className="d-kicker">Rappel — l&apos;offre</span>
                  <p>{hostRoundRecap.offerText}</p>
                </div>
                <div className="d-recap-block">
                  <h4 className="d-recap-block__title">Votes sur chaque dilemme</h4>
                  <p className="d-recap-block__hint">
                    Jauge vers la droite = vote plus tranché. À gauche = plus équilibré.
                  </p>
                  <ul className="d-recap-votes">
                    {hostRoundRecap.authors.map((a, i) => {
                      const polarPct = Math.max(5, Math.min(100, (a.distanceFrom50 / 50) * 100));
                      return (
                        <li key={a.playerId} className="d-recap-vote">
                          <div className="d-recap-vote__head">
                            <span className="d-recap-vote__badge" aria-hidden>
                              {i + 1}
                            </span>
                            <span className="d-recap-vote__meta">
                              Dilemme {i + 1} / {hostRoundRecap.authors.length}
                            </span>
                            <span className="d-recap-vote__name">{a.nickname}</span>
                          </div>
                          <div
                            className="d-recap-meter"
                            role="img"
                            aria-label={`Écart au partage 50/50 : ${a.distanceFrom50.toFixed(1)} points`}
                          >
                            <div className="d-recap-meter__labels" aria-hidden>
                              <span>Équilibré</span>
                              <span>À fond</span>
                            </div>
                            <div className="d-recap-meter__track">
                              <div className="d-recap-meter__fill" style={{ width: `${polarPct}%` }} />
                            </div>
                            <p className="d-recap-meter__caption">
                              Écart 50/50 : <strong>{a.distanceFrom50.toFixed(1)}</strong>
                            </p>
                          </div>
                          {a.masterclass ? (
                            <p className="d-recap-masterclass">Masterclass — 50/50 exact · +5 pts</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {state.recapSkipProgress ? (
                  <p className="d-recap-host-skip">
                    Votes pour passer le récap :{" "}
                    <strong>
                      {state.recapSkipProgress.votedCount} / {state.recapSkipProgress.requiredCount}
                    </strong>{" "}
                    joueurs
                  </p>
                ) : null}
              </div>
            ) : null}
            {state.phase === "game_end" ? (
              <p style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 0 }}>Partie terminée.</p>
            ) : null}
          </section>
        </>
      ) : (
        <p className="d-connecting">Connecté au serveur…</p>
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
