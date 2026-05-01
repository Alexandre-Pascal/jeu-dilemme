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
      <div className="d-home-hero">
        <span className="d-home-badge">Jeu en ligne</span>
        <h1 className="d-home-title">Le Dilemme Parfait</h1>
        <p className="d-home-lead">Équilibre les offres improbables, vote, marque des points. Choisis comment tu joues.</p>
      </div>

      <div className="d-home-grid">
        <Link to="/host" className="d-home-card">
          <span className="d-home-card-icon" aria-hidden>
            🎬
          </span>
          <h2 className="d-home-card-title">Maître du jeu</h2>
          <p className="d-home-card-desc">Crée la salle, lance la partie et suis les scores depuis un grand écran.</p>
          <span className="d-home-card-cta">Ouvrir l’espace MJ →</span>
        </Link>

        <Link to="/play" className="d-home-card">
          <span className="d-home-card-icon" aria-hidden>
            🎮
          </span>
          <h2 className="d-home-card-title">Joueur</h2>
          <p className="d-home-card-desc">Rejoins avec le code salle, écris tes « mais… » et vote sur les dilemmes.</p>
          <span className="d-home-card-cta">Rejoindre une partie →</span>
        </Link>
      </div>
    </main>
  );
}
