"use client";

type ArcadePullOverlayProps = {
  phase: "spinning" | "revealing";
  rarity?: number;
};

export function ArcadePullOverlay({
  phase,
  rarity = 3,
}: ArcadePullOverlayProps) {
  const isRevealing = phase === "revealing";

  return (
    <div
      className="arcade-overlay"
      role="status"
      aria-live="assertive"
      aria-label={
        isRevealing
          ? "Menampilkan hasil gacha"
          : "Mesin gacha sedang bekerja"
      }
    >
      <div className="arcade-machine">
        <div className="arcade-machine-header">
          <span className="arcade-light" />
          <span className="arcade-title">LEARNING GACHA</span>
          <span className="arcade-light" />
        </div>

        <div className="arcade-screen">
          {isRevealing ? (
            <div className="arcade-reveal">
              <div className="arcade-star">✦</div>
              <p className="arcade-reveal-title">
                {rarity >= 6
                  ? "LEGENDARY!"
                  : rarity >= 5
                    ? "SUPER RARE!"
                    : "CHARACTER GET!"}
              </p>
              <p className="arcade-reveal-subtitle">
                YOUR REWARD IS READY
              </p>
            </div>
          ) : (
            <div className="arcade-capsule-container">
              <div className="arcade-capsule">✦</div>
              <p className="arcade-loading-text">SUMMONING...</p>
            </div>
          )}
        </div>

        <div className="arcade-machine-footer">
          <div className="arcade-slot" />
          <div className="arcade-button">
            {isRevealing ? "COMPLETE" : "PROCESSING"}
          </div>
        </div>
      </div>

      <p className="arcade-bottom-text">
        {isRevealing ? "A NEW ADVENTURE BEGINS" : "PLEASE WAIT..."}
      </p>
    </div>
  );
}