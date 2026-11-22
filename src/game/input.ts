export type FlightAction = "left" | "right" | "up" | "down" | "fire";
export type FlightInputState = Record<FlightAction, boolean>;

/** Separate sources let two fingers move and shoot without releasing each other. */
export class FlightInput {
  private held = new Map<string, FlightAction>();
  press(source: string, action: FlightAction) {
    this.held.set(source, action);
  }
  release(source: string) {
    this.held.delete(source);
  }
  reset() {
    this.held.clear();
  }
  snapshot(): FlightInputState {
    const state: FlightInputState = {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
    };
    for (const action of this.held.values()) state[action] = true;
    return state;
  }
}
