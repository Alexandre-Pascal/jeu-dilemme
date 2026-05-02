import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
const LS_SELECTED = "dilemme:selectedOfferIds";
const LS_PLAYED = "dilemme:playedOfferIds";

type Offer = { id: number; order: number; text: string; category: string };

export function loadSelectedOfferIds(): number[] | null {
  try {
    const raw = localStorage.getItem(LS_SELECTED);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as number[];
  } catch {
    return null;
  }
}

function saveSelectedOfferIds(ids: number[] | null): void {
  if (!ids || ids.length === 0) localStorage.removeItem(LS_SELECTED);
  else localStorage.setItem(LS_SELECTED, JSON.stringify(ids));
}

function loadPlayedOfferIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_PLAYED);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function resetPlayedOfferIds(): void {
  localStorage.removeItem(LS_PLAYED);
}

const CATEGORY_ICONS: Record<string, string> = {
  "Richesse & succès": "💸",
  "Super-pouvoirs": "🦸",
  "Esprit & perception": "🧠",
  "Santé & bien-être": "❤️",
  "Social & influence": "🎭",
  "Talent & savoir": "🎓",
  "Vie quotidienne": "🏠",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [played, setPlayed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [drawCount, setDrawCount] = useState(20);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/offers`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: Offer[] = await res.json();
      setOffers(data);
      const storedIds = loadSelectedOfferIds();
      if (storedIds) {
        const existing = new Set(data.map((o) => o.id));
        setSelected(new Set(storedIds.filter((id) => existing.has(id))));
      }
      setPlayed(loadPlayedOfferIds());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les offres");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  };

  const toggleCategory = (ids: number[]) => {
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
    setSaved(false);
  };

  const selectAll = () => { setSelected(new Set(offers.map((o) => o.id))); setSaved(false); };
  const deselectAll = () => { setSelected(new Set()); setSaved(false); };

  const saveSelection = () => {
    const ids = selected.size > 0 ? [...selected] : null;
    saveSelectedOfferIds(ids);
    setSaved(true);
  };

  const drawRandom = (excludePlayed: boolean) => {
    const pool = excludePlayed
      ? offers.filter((o) => !played.has(o.id))
      : [...offers];
    const n = Math.min(drawCount, pool.length);
    if (n === 0) return;
    const drawn = shuffle(pool).slice(0, n);
    setSelected(new Set(drawn.map((o) => o.id)));
    setSaved(false);
  };

  const handleResetPlayed = () => {
    resetPlayedOfferIds();
    setPlayed(new Set());
  };

  const addOffer = async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: newCategory.trim() }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setNewText("");
      await fetchOffers();
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ajouter l'offre");
    } finally {
      setAdding(false);
    }
  };

  const deleteOffer = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/offers/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Erreur ${res.status}`);
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setSaved(false);
      await fetchOffers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de supprimer l'offre");
    }
  };

  const grouped = offers.reduce<Record<string, Offer[]>>((acc, o) => {
    const cat = o.category || "Sans catégorie";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(o);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

  const unplayedCount = offers.filter((o) => !played.has(o.id)).length;
  const playedCount = played.size;

  const selectionLabel =
    selected.size === 0
      ? "Toutes les offres utilisées (aucune sélection)"
      : `${selected.size} offre${selected.size > 1 ? "s" : ""} sélectionnée${selected.size > 1 ? "s" : ""}`;

  return (
    <main className="d-page">
      <header className="d-header">
        <Link to="/host" className="d-btn d-btn--ghost d-btn--sm d-back-btn">
          ← Retour MJ
        </Link>
        <h1 className="d-title">Gérer les dilemmes</h1>
        <p className="d-subtitle">Sélectionne des paquets ou tire au sort parmi les offres non encore jouées.</p>
      </header>

      {error ? <p className="d-alert--error" role="alert">{error}</p> : null}

      {/* Tirage aléatoire */}
      <section className="d-card d-offers-draw-card">
        <h2>Tirage aléatoire</h2>
        <div className="d-offers-draw-stats">
          <span className="d-offers-draw-stat">
            <strong>{unplayedCount}</strong> non jouée{unplayedCount !== 1 ? "s" : ""}
          </span>
          <span className="d-offers-draw-sep">·</span>
          <span className="d-offers-draw-stat d-offers-draw-stat--played">
            <strong>{playedCount}</strong> déjà jouée{playedCount !== 1 ? "s" : ""}
          </span>
          {playedCount > 0 ? (
            <button
              type="button"
              className="d-btn d-btn--ghost d-btn--sm"
              onClick={handleResetPlayed}
              title="Marquer toutes les offres comme non jouées"
            >
              Réinitialiser les joués
            </button>
          ) : null}
        </div>

        <div className="d-offers-draw-row">
          <label className="d-label-row" style={{ flex: 1 }}>
            Nombre d'offres
            <input
              type="number"
              className="d-input d-input--narrow"
              min={1}
              max={offers.length}
              value={drawCount}
              onChange={(e) => setDrawCount(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
            />
          </label>
        </div>
        <div className="d-offers-draw-btns">
          <button
            type="button"
            className="d-btn d-btn--primary d-btn--block"
            onClick={() => drawRandom(true)}
            disabled={unplayedCount === 0}
          >
            🎲 Tirer parmi les non jouées ({unplayedCount})
          </button>
          <button
            type="button"
            className="d-btn d-btn--secondary d-btn--block"
            onClick={() => drawRandom(false)}
            disabled={offers.length === 0}
          >
            Tirer parmi toutes ({offers.length})
          </button>
        </div>
        {unplayedCount === 0 && playedCount > 0 ? (
          <p className="d-muted" style={{ fontSize: "0.82rem", marginTop: "0.5rem" }}>
            Toutes les offres ont été jouées. Clique sur « Réinitialiser les joués » pour repartir de zéro.
          </p>
        ) : null}
      </section>

      {/* Barre de sélection sticky */}
      <div className="d-offers-sticky-bar">
        <span className="d-offers-sticky-label">{selectionLabel}</span>
        <div className="d-offers-sticky-actions">
          <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={selectAll}>Tout</button>
          <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={deselectAll}>Aucun</button>
          <button
            type="button"
            className={`d-btn d-btn--sm ${saved ? "d-btn--secondary" : "d-btn--primary"}`}
            onClick={saveSelection}
          >
            {saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Catégories */}
      {loading ? (
        <p className="d-connecting">Chargement…</p>
      ) : (
        categories.map((cat) => {
          const catOffers = grouped[cat]!;
          const catIds = catOffers.map((o) => o.id);
          const allSelected = catIds.every((id) => selected.has(id));
          const someSelected = catIds.some((id) => selected.has(id));
          const icon = CATEGORY_ICONS[cat] ?? "📦";
          const selectedCount = catIds.filter((id) => selected.has(id)).length;

          return (
            <section key={cat} className="d-card d-offers-cat-card">
              <div className="d-offers-cat-header">
                <label className="d-offers-cat-label">
                  <input
                    type="checkbox"
                    className="d-offers-checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={() => toggleCategory(catIds)}
                  />
                  <span className="d-offers-cat-icon" aria-hidden>{icon}</span>
                  <span className="d-offers-cat-name">{cat}</span>
                </label>
                <span className="d-offers-cat-count">{selectedCount}/{catOffers.length}</span>
              </div>

              <ul className="d-offers-list">
                {catOffers.map((offer) => {
                  const isPlayed = played.has(offer.id);
                  const isSelected = selected.has(offer.id);
                  return (
                    <li
                      key={offer.id}
                      className={`d-offers-item${isSelected ? " d-offers-item--selected" : ""}${isPlayed ? " d-offers-item--played" : ""}`}
                    >
                      <label className="d-offers-item-label">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(offer.id)}
                          className="d-offers-checkbox"
                        />
                        <span className="d-offers-item-text">{offer.text}</span>
                      </label>
                      {isPlayed ? (
                        <span className="d-offers-played-badge" aria-label="Déjà jouée">✓</span>
                      ) : null}
                      <button
                        type="button"
                        className="d-btn d-btn--ghost d-btn--sm d-offers-delete"
                        onClick={() => deleteOffer(offer.id)}
                        aria-label={`Supprimer : ${offer.text}`}
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      {/* Ajouter une offre */}
      <section className="d-card">
        <h2>Ajouter un dilemme</h2>
        <div className="d-offers-add-row">
          <input
            ref={inputRef}
            type="text"
            className="d-input d-offers-add-input"
            placeholder="Ex. Tu peux voler mais tu dors les pieds en l'air…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addOffer(); }}
            maxLength={500}
            disabled={adding}
          />
        </div>
        <div className="d-offers-add-row" style={{ marginTop: "0.5rem" }}>
          <select
            className="d-input"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={adding}
          >
            <option value="">— Catégorie (optionnel) —</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            className="d-btn d-btn--primary"
            onClick={addOffer}
            disabled={adding || !newText.trim()}
          >
            {adding ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </section>

      <p className="d-muted" style={{ fontSize: "0.8rem", textAlign: "center", marginBottom: "4rem" }}>
        {selected.size === 0
          ? "Sans sélection, toutes les offres seront utilisées."
          : `Seules les ${selected.size} offres cochées seront utilisées pour la prochaine partie créée.`}
      </p>
    </main>
  );
}
