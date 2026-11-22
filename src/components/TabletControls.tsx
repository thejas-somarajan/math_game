import { useEffect, useState } from "react";
import type { Controller } from "../game/controller";
import type { FlightAction } from "../game/input";
import { Icon } from "./Icons";

export function TabletControls({
  game,
  onHeld,
  onReset,
  onAuto,
}: {
  game: Controller | null;
  onHeld: (source: string, action: FlightAction | undefined) => void;
  onReset: () => void;
  onAuto: () => void;
}) {
  const [pressed, setPressed] = useState<Record<number, FlightAction>>({});
  const enabled = game?.phase === "flight" && !game.stopped;
  useEffect(() => {
    if (!enabled) {
      setPressed({});
      onReset();
    }
  }, [enabled]);
  function release(e: React.PointerEvent<HTMLButtonElement>) {
    onHeld("touch:" + e.pointerId, undefined);
    setPressed((s) => {
      const next = { ...s };
      delete next[e.pointerId];
      return next;
    });
  }
  function heldButton(
    action: FlightAction,
    label: string,
    content: React.ReactNode,
    className: string,
  ) {
    return (
      <button
        type="button"
        className={
          className + (Object.values(pressed).includes(action) ? " held" : "")
        }
        aria-label={label}
        disabled={!enabled}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (!enabled) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          onHeld("touch:" + e.pointerId, action);
          setPressed((s) => ({ ...s, [e.pointerId]: action }));
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        {content}
      </button>
    );
  }
  return (
    <section className="tablet-controls" aria-label="Tablet flight controls">
      <div className="touch-heading">
        <span>PILOT CONTROLS</span>
        <small>
          {enabled
            ? "Hold arrows to move · hold FIRE to shoot"
            : "Controls wait while you think"}
        </small>
      </div>
      <div className="touch-deck">
        <div className="direction-pad" role="group" aria-label="Move your jet">
          {heldButton("up", "Move up", "↑", "move-up")}
          {heldButton("left", "Move left", "←", "move-left")}
          <span className="pad-centre">
            <Icon name="plane" size={21} />
          </span>
          {heldButton("right", "Move right", "→", "move-right")}
          {heldButton("down", "Move down", "↓", "move-down")}
        </div>
        <div className="touch-actions">
          {heldButton(
            "fire",
            "Hold to fire",
            <>
              <Icon name="spark" size={20} />
              <span>
                FIRE<small>HOLD TO SHOOT</small>
              </span>
            </>,
            "fire-control",
          )}
          <button
            type="button"
            className="bomb-control"
            disabled={!enabled || !game?.w.bombs}
            onClick={() => game?.bomb()}
          >
            BOMB <span>× {game?.w.bombs ?? 0}</span>
          </button>
          <button
            type="button"
            aria-label="Toggle auto-fire"
            aria-pressed={game?.auto ?? true}
            className="auto-control"
            onClick={onAuto}
          >
            AUTO-FIRE <strong>{game?.auto ? "ON" : "OFF"}</strong>
          </button>
        </div>
      </div>
    </section>
  );
}
