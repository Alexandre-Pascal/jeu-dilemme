import { Link, Route, Routes } from "react-router-dom";
import { HostPage } from "./pages/HostPage";
import { PlayPage } from "./pages/PlayPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host" element={<HostPage />} />
      <Route path="/play" element={<PlayPage />} />
    </Routes>
  );
}

function Home() {
  return (
    <main className="d-page d-page--wide">
      <header className="d-home-hero">
        <span className="d-home-badge">Jeu en ligne</span>
        <h1 className="d-home-title">Le Dilemme Parfait</h1>
        <p className="d-home-lead">
          Offres absurdes, contraintes cinglantes, votes collectifs : une manche = une offre, des dilemmes, des points.
        </p>
      </header>

      <section className="d-home-roles" aria-labelledby="home-roles-title">
        <h2 id="home-roles-title" className="d-home-roles-title">
          Choisis ton rôle
        </h2>
        <p className="d-home-roles-lead">
          Une partie : <strong>un écran « maître du jeu »</strong> (idéalement au clavier) et{" "}
          <strong>un téléphone par joueur</strong> pour écrire et voter.
        </p>

        <div className="d-home-grid">
          <Link to="/host" className="d-home-card d-home-card--host">
            <span className="d-home-card-icon" aria-hidden>
              🎬
            </span>
            <div className="d-home-card-head">
              <h3 className="d-home-card-title">Maître du jeu</h3>
              <span className="d-home-card-platform">PC</span>
            </div>
            <p className="d-home-card-desc">
              Crée la salle, partage le code, lance les manches et affiche l’état de la partie sur un grand écran.
            </p>
            <span className="d-home-card-cta">Ouvrir l’espace MJ</span>
          </Link>

          <Link to="/play" className="d-home-card d-home-card--player">
            <span className="d-home-card-icon" aria-hidden>
              🎮
            </span>
            <div className="d-home-card-head">
              <h3 className="d-home-card-title">Joueur</h3>
              <span className="d-home-card-platform">Mobile</span>
            </div>
            <p className="d-home-card-desc">
              Rejoins avec le code salle, propose tes « mais… » sur l’offre et vote oui / non sur chaque dilemme.
            </p>
            <span className="d-home-card-cta">Rejoindre une partie</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
