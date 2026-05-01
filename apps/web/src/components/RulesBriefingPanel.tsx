type Props = {
  isHost: boolean;
  /** MJ uniquement : ferme les règles et démarre le chrono des contraintes. */
  onDismiss?: () => void;
};

const STEPS: { title: string; body: string; accent: "violet" | "rose" | "amber" }[] = [
  {
    title: "Contraintes",
    body: "À chaque manche, une offre apparaît. Sur ton téléphone, tu complètes avec un « mais… » pour rendre le deal moins alléchant — le chrono part quand le MJ a fermé cet écran.",
    accent: "violet",
  },
  {
    title: "Votes Oui / Non",
    body: "Chaque dilemme (offre + contrainte d’un joueur) est voté à la suite. Tu votes pour les autres ; sur le tien, tu ne votes pas : le groupe décide. Les abstentions ne comptent pas dans le pourcentage : seuls les Oui et Non exprimés forment le résultat.",
    accent: "rose",
  },
  {
    title: "Récap & manches suivantes",
    body: "Après chaque vote, le résultat s’affiche. En fin de manche, le récap applique le barème ci-dessus, puis on enchaîne sur l’offre suivante jusqu’à la fin de la partie.",
    accent: "amber",
  },
];

export function RulesBriefingPanel({ isHost, onDismiss }: Props) {
  return (
    <div className="d-rules">
      <div className="d-rules-aurora" aria-hidden />
      <header className="d-rules-header">
        <span className="d-rules-kicker">Tout le monde sur la même longueur d’onde</span>
        <h2 className="d-rules-title">Les règles en 3 temps</h2>
        <p className="d-rules-lead">
          Pas de chrono ici : lis à ton rythme.{" "}
          {isHost ? "Quand tu es prêt, tu lances la première manche." : "Le MJ déclenche la suite quand il veut."}
        </p>
      </header>

      <div className="d-rules-callout" role="note">
        <p className="d-rules-callout__block">
          <strong>Objectif pour ton dilemme.</strong> Quand c’est ton « offre + mais… » qui est votée, tu veux que le groupe soit{" "}
          <strong>le plus partagé possible entre Oui et Non</strong>, c’est-à-dire se rapprocher du{" "}
          <strong>50&nbsp;% Oui / 50&nbsp;% Non</strong> (sur les votes Oui+Non uniquement). Un vote à 90&nbsp;% Oui ou 90&nbsp;% Non
          est « très à fond » : pour toi, c’est moins bien qu’un vote serré autour du milieu.
        </p>
        <p className="d-rules-callout__block">
          <strong>Points en fin de manche.</strong> Tous les dilemmes de la manche sont classés du plus proche du 50/50 au plus
          éloigné. <strong>1er → 3 pts, 2e → 2 pts, 3e → 1 pt</strong>, les autres 0. À égalité d’écart au 50/50, même rang donc{" "}
          <strong>mêmes points</strong> (ex.&nbsp;: deux ex-aequo 1ers → chacun 3 pts). Bonus <strong>Masterclass</strong> : si
          tu as exactement autant de Oui que de Non (avec au moins un vote), <strong>+5 pts</strong> en plus sur ce dilemme.
        </p>
      </div>

      <ol className="d-rules-steps" aria-label="Déroulé d’une partie">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`d-rules-step d-rules-step--${s.accent}`} style={{ animationDelay: `${0.08 + i * 0.14}s` }}>
            <span className="d-rules-step__num" aria-hidden>
              {i + 1}
            </span>
            <div className="d-rules-step__body">
              <h3 className="d-rules-step__title">{s.title}</h3>
              <p className="d-rules-step__text">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {isHost ? (
        <footer className="d-rules-footer d-rules-footer--host">
          <p className="d-rules-footer-note">Les joueurs voient la même chose sur leur téléphone.</p>
          <button
            type="button"
            className="d-btn d-btn--primary d-btn--lg d-btn--block d-rules-cta"
            onClick={onDismiss}
          >
            Commencer la 1re manche
          </button>
        </footer>
      ) : (
        <footer className="d-rules-footer">
          <p className="d-rules-wait">
            <span className="d-rules-wait__dot" aria-hidden />
            En attente du maître du jeu…
          </p>
        </footer>
      )}
    </div>
  );
}
