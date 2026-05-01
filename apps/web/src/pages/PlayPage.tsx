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
  const [constraintSentRoundIndex, setConstraintSentRoundIndex] = useState<number | null>(null);
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
        } else {
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
      <main className="d-page d-page--narrow">
        <header className="d-header">
          <h1 className="d-title">Joueur</h1>
          <p className="d-subtitle">Entre le code affiché par le MJ et ton pseudo pour rejoindre la salle.</p>
        </header>
        {error ? (
          <p className="d-alert--error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="d-card d-card--flush">
          <h2 className="d-join-card-title">Rejoindre la partie</h2>
          <p className="d-join-hint">Le code à 6 caractères est affiché sur l’écran du maître du jeu.</p>
          <label className="d-label" htmlFor="join-room-code">
            Code salle
            <input
              id="join-room-code"
              className="d-input d-input--roomcode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ex. AB12CD"
              inputMode="text"
            />
          </label>
          <label className="d-label" htmlFor="join-nickname">
            Pseudo
            <input
              id="join-nickname"
              className="d-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={32}
              autoComplete="username"
              placeholder="Ton nom dans la partie"
            />
          </label>
          <button
            type="button"
            onClick={join}
            className="d-btn d-btn--yes d-btn--block"
            disabled={!roomCode.trim() || !nickname.trim()}
          >
            Rejoindre
          </button>
        </div>
      </main>
    );
  }

  const self = state?.players.find((p) => p.id === state.playerId);
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
    <main className="d-page d-page--narrow">
      <header className="d-header">
        <h1 className="d-title">Partie</h1>
        <p className="d-subtitle">Réponds aux offres, vote et grimpe au classement.</p>
      </header>

      {error ? (
        <p className="d-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      {state?.phase === "lobby" ? (
        <section key="lobby" className="d-card d-phase-enter">
          <p>
            Bienvenue <strong>{self?.nickname}</strong>
          </p>
          <button
            type="button"
            onClick={() => setReady(!self?.ready)}
            className={`d-btn d-btn--block ${self?.ready ? "d-btn--secondary" : "d-btn--primary"}`}
          >
            {self?.ready ? "Annuler prêt" : "Je suis prêt"}
          </button>
        </section>
      ) : null}

      {state?.phase === "round_constraint" ? (
        <section key="constraint" className="d-card d-phase-enter">
          <p className="d-offer-line">
            <strong>Offre :</strong> {state.currentOfferText}
          </p>
          {constraintAcknowledgedForCurrentRound ? (
            <>
              <div className="d-callout d-callout--success" style={{ marginTop: "0.75rem" }}>
                <strong>Contrainte envoyée.</strong> En attente des autres joueurs…
              </div>
              {endsIn !== null ? (
                <p className="d-muted" style={{ marginTop: "0.5rem" }}>
                  Chrono : {endsIn}s
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p>Écris ta contrainte (« mais… ») pour équilibrer le dilemme.</p>
              {endsIn !== null ? <p className="d-muted">Chrono : {endsIn}s</p> : null}
              <textarea
                className="d-textarea"
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Mais…"
              />
              <button
                type="button"
                onClick={submitConstraint}
                disabled={!constraint.trim()}
                className="d-btn d-btn--yes d-btn--block"
              >
                Envoyer
              </button>
            </>
          )}
        </section>
      ) : null}

      {state?.phase === "round_vote" && state.revealedDilemma ? (
        <section key="vote" className="d-card d-phase-enter">
          <p className="d-offer-line">{state.revealedDilemma.offer}</p>
          <p className="d-constraint-line">Mais… {state.revealedDilemma.constraint}</p>
          {endsIn !== null ? <p className="d-muted">Vote : {endsIn}s</p> : null}
          {canVoteOnCurrentDilemma && voteAcknowledgedForCurrentDilemma ? (
            <div
              className={`d-callout ${voteSent?.value === "yes" ? "d-callout--success" : "d-callout--danger"}`}
              style={{ marginTop: "1rem" }}
            >
              Tu as voté <strong>{voteSent?.value === "yes" ? "OUI" : "NON"}</strong>. En attente des autres…
            </div>
          ) : null}
          {canVoteOnCurrentDilemma && !voteAcknowledgedForCurrentDilemma ? (
            <div className="d-btn-row">
              <button type="button" className="d-btn--yes" onClick={() => vote("yes")}>
                OUI
              </button>
              <button type="button" className="d-btn--no" onClick={() => vote("no")}>
                NON
              </button>
            </div>
          ) : null}
          {!canVoteOnCurrentDilemma ? (
            <div className="d-callout d-callout--purple">C’est ton dilemme : les autres votent Oui ou Non. Tu verras le résultat juste après.</div>
          ) : null}
        </section>
      ) : null}

      {state?.phase === "round_subresult" && state.lastVoteResult ? (
        <section key="subresult" className="d-card d-phase-enter">
          <h2>Résultat</h2>
          <p>
            {state.lastVoteResult.yesPct.toFixed(1)} % Oui — {state.lastVoteResult.noPct.toFixed(1)} % Non
          </p>
          {state.lastRoundScores?.[0]?.masterclass ? <p className="d-masterclass">Masterclass !</p> : null}
        </section>
      ) : null}

      {recapPayload && state ? (
        <section key="recap" className="d-card d-phase-enter d-recap">
          <header className="d-recap-header">
            <span className="d-recap-round">
              Manche {recapPayload.roundIndex + 1} / {state.totalRounds}
            </span>
            <h2 className="d-recap-title">Récap</h2>
          </header>

          <div className="d-recap-block d-recap-block--scores">
            <h3 className="d-recap-block__title" id="recap-scores-heading">
              Points après cette manche
            </h3>
            <div className="d-recap-scores" role="region" aria-labelledby="recap-scores-heading">
              <div className="d-recap-scores-head" aria-hidden>
                <span>Joueur</span>
                <span>Manche</span>
                <span>Total</span>
              </div>
              <ul className="d-recap-scores-list">
                {recapPayload.pointsThisRound.map((r) => {
                  const self = r.playerId === state.playerId;
                  const deltaStr = r.delta > 0 ? `+${r.delta}` : String(r.delta);
                  const deltaClass =
                    r.delta > 0 ? "d-recap-score-delta--up" : r.delta < 0 ? "d-recap-score-delta--down" : "";
                  return (
                    <li
                      key={r.playerId}
                      className={`d-recap-score-row${self ? " d-recap-score-row--self" : ""}`.trim()}
                      aria-label={`${r.nickname}, ${deltaStr} cette manche, total ${r.totalScore}`}
                    >
                      <span className="d-recap-score-name">
                        {r.nickname}
                        {self ? <span className="d-recap-score-you">Toi</span> : null}
                      </span>
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
            <p>{recapPayload.offerText}</p>
          </div>

          <div className="d-recap-block">
            <h3 className="d-recap-block__title">Votes sur chaque dilemme</h3>
            <p className="d-recap-block__hint">
              Jauge vers la droite = vote plus tranché (loin du 50/50). À gauche = plus équilibré.
            </p>
            <ul className="d-recap-votes">
              {recapPayload.authors.map((a, i) => {
                const polarPct = Math.max(5, Math.min(100, (a.distanceFrom50 / 50) * 100));
                return (
                  <li key={a.playerId} className="d-recap-vote">
                    <div className="d-recap-vote__head">
                      <span className="d-recap-vote__badge" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="d-recap-vote__meta">
                        Dilemme {i + 1} / {recapPayload.authors.length}
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
                      <p className="d-recap-masterclass">Masterclass — 50/50 exact · +5 pts au classement</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {state.recapSkipProgress ? (
            <div className="d-recap-skip">
              <p className="d-recap-skip__lead">
                Passer avant la fin du chrono :{" "}
                <strong>
                  {state.recapSkipProgress.votedCount} / {state.recapSkipProgress.requiredCount}
                </strong>{" "}
                joueurs.
              </p>
              {state.playerId ? (
                state.recapSkipProgress.selfHasSkipped ? (
                  <p className="d-recap-skip__status">Tu as voté pour passer — en attente des autres…</p>
                ) : (
                  <button type="button" onClick={voteSkipRecap} className="d-btn--skip">
                    Passer le récap
                  </button>
                )
              ) : null}
            </div>
          ) : null}

          {endsIn !== null ? (
            <p className="d-recap-next">
              Suite automatiquement dans <strong>{endsIn}s</strong> si personne ne valide avant.
            </p>
          ) : null}
        </section>
      ) : null}

      {state?.phase === "game_end" ? (
        <section key="end" className="d-card d-phase-enter">
          <h2>Fin de partie</h2>
          <p className="d-podium-intro">Classement final — du plus haut score au plus bas.</p>
          <div className="d-podium-head" aria-hidden>
            <span>Rang</span>
            <span>Joueur</span>
            <span>Points</span>
          </div>
          <ul className="d-podium">
            {[...state.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => {
                const rank = i + 1;
                const tier =
                  rank === 1 ? "d-podium__row--1" : rank === 2 ? "d-podium__row--2" : rank === 3 ? "d-podium__row--3" : "";
                const self = p.id === state.playerId ? "d-podium__row--self" : "";
                return (
                  <li
                    key={p.id}
                    className={`d-podium__row ${tier} ${self}`.trim()}
                    aria-label={`Rang ${rank}, ${p.nickname}, ${p.score} points`}
                  >
                    <span className="d-podium__rank" aria-hidden>
                      {rank}
                    </span>
                    <span className="d-podium__name">
                      {p.nickname}
                      {p.id === state.playerId ? <span className="d-podium__you">Toi</span> : null}
                    </span>
                    <span className="d-podium__score">
                      {p.score}
                      <span className="d-podium__pts">pts</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}

      {state && state.phase !== "lobby" && state.phase !== "game_end" ? (
        <p className="d-score-footer">
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
