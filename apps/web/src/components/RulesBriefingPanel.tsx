type Props = {
  isHost: boolean;
  /** MJ uniquement : ferme les règles et démarre le chrono des contraintes. */
  onDismiss?: () => void;
};

const STEPS: { title: string; body: string; accent: "violet" | "rose" | "amber" }[] = [
  {
    title: "Contraintes",
    body: "À chaque manche, une offre apparaît. Sur ton téléphone, tu écris une suite « mais… » pour équilibrer le deal — le chrono tourne dès que le MJ a validé l’intro.",
    accent: "violet",
  },
  {
    title: "Votes Oui / Non",
    body: "Ensuite, chaque dilemme (offre + contrainte d’un joueur) est voté à tour de rôle. Tu choisis Oui ou Non pour les autres ; sur le tien, ce sont les autres qui votent.",
    accent: "rose",
  },
  {
    title: "Scores & suite",
    body: "Après chaque vote : le résultat s’affiche. En fin de manche : récap des points, puis manche suivante jusqu’à la fin de la partie.",
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
