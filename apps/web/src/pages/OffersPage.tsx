import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
const LS_KEY = "dilemme:selectedOfferIds";

type Offer = { id: number; order: number; text: string };

export function loadSelectedOfferIds(): number[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as number[];
  } catch {
    return null;
  }
}

function saveSelectedOfferIds(ids: number[] | null): void {
  if (!ids || ids.length === 0) localStorage.removeItem(LS_KEY);
  else localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
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

  const selectAll = () => {
    setSelected(new Set(offers.map((o) => o.id)));
    setSaved(false);
  };

  const deselectAll = () => {
    setSelected(new Set());
    setSaved(false);
  };

  const saveSelection = () => {
    const ids = selected.size > 0 ? [...selected] : null;
    saveSelectedOfferIds(ids);
    setSaved(true);
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
        body: JSON.stringify({ text }),
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSaved(false);
      await fetchOffers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de supprimer l'offre");
    }
  };

  const selectionLabel =
    selected.size === 0
      ? "Toutes les offres utilisées (aucune sélection)"
      : `${selected.size} offre${selected.size > 1 ? "s" : ""} sélectionnée${selected.size > 1 ? "s" : ""}`;

  return (
    <main className="d-page">
      <header className="d-header">
        <Link to="/host" className="d-btn d-btn--ghost d-btn--sm" style={{ marginBottom: "0.5rem" }}>
          ← Retour MJ
        </Link>
        <h1 className="d-title">Gérer les dilemmes</h1>
        <p className="d-subtitle">Ajoutez des offres, cochez celles à utiliser pour la prochaine partie.</p>
      </header>

      {error ? (
        <p className="d-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Ajouter une offre */}
      <section className="d-card">
        <h2>Ajouter un dilemme</h2>
        <div className="d-offers-add-row">
          <input
            ref={inputRef}
            type="text"
            className="d-input d-offers-add-input"
            placeholder="Ex. Tu peux voler mais tu dors les pieds en l'air..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addOffer();
            }}
            maxLength={500}
            disabled={adding}
          />
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

      {/* Sélection + liste */}
      <section className="d-card">
        <div className="d-offers-toolbar">
          <h2 style={{ margin: 0 }}>
            Offres ({offers.length})
          </h2>
          <div className="d-offers-toolbar-actions">
            <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={selectAll}>
              Tout cocher
            </button>
            <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={deselectAll}>
              Tout décocher
            </button>
          </div>
        </div>

        <p className="d-muted d-offers-selection-label">{selectionLabel}</p>

        {loading ? (
          <p className="d-connecting">Chargement…</p>
        ) : (
          <ul className="d-offers-list">
            {offers.map((offer) => (
              <li key={offer.id} className={`d-offers-item${selected.has(offer.id) ? " d-offers-item--selected" : ""}`}>
                <label className="d-offers-item-label">
                  <input
                    type="checkbox"
                    checked={selected.has(offer.id)}
                    onChange={() => toggle(offer.id)}
                    className="d-offers-checkbox"
                  />
                  <span className="d-offers-item-text">{offer.text}</span>
                </label>
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
            ))}
          </ul>
        )}

        <div className="d-offers-footer">
          <button
            type="button"
            className="d-btn d-btn--primary d-btn--block"
            onClick={saveSelection}
          >
            {saved ? "✓ Sélection enregistrée" : "Enregistrer la sélection"}
          </button>
          <p className="d-muted" style={{ fontSize: "0.8rem", marginTop: "0.4rem", textAlign: "center" }}>
            {selected.size === 0
              ? "Sans sélection, toutes les offres seront utilisées."
              : `Seules les ${selected.size} offres cochées seront utilisées pour la prochaine partie créée.`}
          </p>
        </div>
      </section>
    </main>
  );
}
