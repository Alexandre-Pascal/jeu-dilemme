import { Route, Routes } from "react-router-dom";
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
    <main style={{ padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1>Le Dilemme Parfait</h1>
      <p>Choisis ton rôle :</p>
      <ul>
        <li>
          <a href="/host">Maître du jeu (PC)</a>
        </li>
        <li>
          <a href="/play">Joueur (mobile)</a>
        </li>
      </ul>
    </main>
  );
}
