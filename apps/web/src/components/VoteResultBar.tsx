import type { LastVoteResult } from "@dilemme/shared";

type Props = {
  result: LastVoteResult;
  /** Barre plus basse pour la colonne « État » MJ */
  compact?: boolean;
};

export function VoteResultBar({ result, compact = false }: Props) {
  const { yesPct, noPct, yesCount, noCount, abstainCount } = result;
  const denom = yesCount + noCount;
  const hasSplit = denom > 0;

  const aria = hasSplit
    ? `Répartition des votes exprimés : ${yesPct.toFixed(1)} % oui (${yesCount} voix), ${noPct.toFixed(1)} % non (${noCount} voix). Abstentions : ${abstainCount}.`
    : `Aucun vote oui ou non exprimé. Abstentions : ${abstainCount}.`;

  return (
    <div
      className={`d-vote-bar${compact ? " d-vote-bar--compact" : ""}`}
      role="group"
      aria-label={aria}
    >
      <div className="d-vote-bar__ruler" aria-hidden>
        <span>0 %</span>
        <span>50 %</span>
        <span>100 %</span>
      </div>
      <div className="d-vote-bar__track-shell">
        {hasSplit ? <div className="d-vote-bar__mid" aria-hidden /> : null}
        <div className="d-vote-bar__track">
          {!hasSplit ? (
            <div className="d-vote-bar__empty">Aucun vote Oui / Non</div>
          ) : (
            <>
              <div
                className="d-vote-bar__yes"
                style={{ flex: `${yesCount} 1 0%` }}
                title={`Oui : ${yesPct.toFixed(1)} %`}
              />
              <div
                className="d-vote-bar__no"
                style={{ flex: `${noCount} 1 0%` }}
                title={`Non : ${noPct.toFixed(1)} %`}
              />
            </>
          )}
        </div>
      </div>
      <div className="d-vote-bar__legend">
        <span className="d-vote-bar__chip d-vote-bar__chip--yes">
          Oui <strong>{yesPct.toFixed(1)} %</strong>
          <span className="d-vote-bar__count">({yesCount})</span>
        </span>
        <span className="d-vote-bar__chip d-vote-bar__chip--no">
          Non <strong>{noPct.toFixed(1)} %</strong>
          <span className="d-vote-bar__count">({noCount})</span>
        </span>
        <span className="d-vote-bar__chip d-vote-bar__chip--abs">
          Abstention{abstainCount > 1 ? "s" : ""}{" "}
          <strong>{abstainCount}</strong>
        </span>
      </div>
    </div>
  );
}
