type Props = {
  isHost: boolean;
  onDismiss?: () => void;
};

const FLOW = [
  "Offre affichée → chacun écrit son « mais… » (chrono).",
  "Chaque dilemme est voté Oui ou Non à la suite — pas sur le tien.",
  "Récap des scores, puis manche suivante.",
];

export function RulesBriefingPanel({ isHost, onDismiss }: Props) {
  return (
    <div className="d-rules">
      <div className="d-rules-aurora" aria-hidden />
      <header className="d-rules-header">
        <h2 className="d-rules-title">Règles</h2>
        <p className="d-rules-lead">
          {isHost ? "Tu lances la 1re manche quand tu veux." : "Le MJ ouvre la suite quand c’est bon."}
        </p>
      </header>

      <div className="d-rules-bento">
        <section className="d-rules-tile d-rules-tile--goal" aria-labelledby="rules-goal-h">
          <h3 id="rules-goal-h" className="d-rules-tile-h">
            Objectif
          </h3>
          <div className="d-rules-gauge" aria-hidden>
            <span className="d-rules-gauge__yes">Oui</span>
            <span className="d-rules-gauge__no">Non</span>
          </div>
          <p className="d-rules-tile-p">
            Sur <strong>ton</strong> dilemme, tu veux un vote <strong>50&nbsp;/&nbsp;50</strong> entre Oui et Non (abstentions
            ignorées). Vote à fond = moins bien classé.
          </p>
        </section>

        <section className="d-rules-tile d-rules-tile--pts" aria-labelledby="rules-pts-h">
          <h3 id="rules-pts-h" className="d-rules-tile-h">
            Points
          </h3>
          <div className="d-rules-podium">
            <div className="d-rules-podium__cell">
              <span className="d-rules-podium__rk">1</span>
              <span className="d-rules-podium__pt">3</span>
            </div>
            <div className="d-rules-podium__cell">
              <span className="d-rules-podium__rk">2</span>
              <span className="d-rules-podium__pt">2</span>
            </div>
            <div className="d-rules-podium__cell">
              <span className="d-rules-podium__rk">3</span>
              <span className="d-rules-podium__pt">1</span>
            </div>
          </div>
          <p className="d-rules-tile-p">
            Fin de manche : du plus proche au plus loin du 50/50. Égalité → même rang.{" "}
            <span className="d-rules-badge">+5</span> si Oui = Non exact.
          </p>
        </section>
      </div>

      <ol className="d-rules-flow" aria-label="Déroulé">
        {FLOW.map((line, i) => (
          <li key={line} className="d-rules-flow__li" style={{ animationDelay: `${0.14 + i * 0.06}s` }}>
            <span className="d-rules-flow__i" aria-hidden>
              {i + 1}
            </span>
            {line}
          </li>
        ))}
      </ol>

      {isHost ? (
        <footer className="d-rules-footer d-rules-footer--host">
          <button type="button" className="d-btn d-btn--primary d-btn--lg d-btn--block d-rules-cta" onClick={onDismiss}>
            Commencer la 1re manche
          </button>
        </footer>
      ) : (
        <footer className="d-rules-footer">
          <p className="d-rules-wait">
            <span className="d-rules-wait__dot" aria-hidden />
            En attente du MJ…
          </p>
        </footer>
      )}
    </div>
  );
}
