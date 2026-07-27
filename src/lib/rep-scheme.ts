// Rep-scheme JSON (spec §5) and the ladder-rung maths.
import { roundToIncrement } from "./metrics";

export type RepRound = {
  round: number;
  loadPct: number;
  repMin: number;
  repMax: number;
  rir: number | null;
  toFailure: boolean;
};

export type RepScheme = {
  type: "descending";
  rounds: RepRound[];
};

export const HEAVY_SCHEME: RepScheme = {
  type: "descending",
  rounds: [
    { round: 1, loadPct: 1.0, repMin: 8, repMax: 10, rir: 2, toFailure: false },
    { round: 2, loadPct: 0.85, repMin: 10, repMax: 12, rir: 1, toFailure: false },
    { round: 3, loadPct: 0.72, repMin: 12, repMax: 15, rir: null, toFailure: true },
  ],
};

export const VOLUME_SCHEME: RepScheme = {
  type: "descending",
  rounds: [
    { round: 1, loadPct: 1.0, repMin: 12, repMax: 15, rir: 3, toFailure: false },
    { round: 2, loadPct: 0.9, repMin: 15, repMax: 18, rir: 2, toFailure: false },
    { round: 3, loadPct: 0.81, repMin: 18, repMax: 20, rir: 1, toFailure: false },
  ],
};

export function schemeFor(intent: string): RepScheme {
  return intent === "volume" ? VOLUME_SCHEME : HEAVY_SCHEME;
}

export type Rung = {
  round: number;
  targetLoad: number | null; // null when we have no base weight yet
  repMin: number;
  repMax: number;
  toFailure: boolean;
  rir: number | null;
};

/**
 * Ladder rungs for one exercise. loadPct multiplies the Round-1 working weight
 * (last logged), rounded to the increment. With no history, loads are null and
 * the user sets Round 1 by feel.
 */
export function computeRungs(
  scheme: RepScheme,
  baseWeight: number | null,
  increment = 2.5,
): Rung[] {
  return scheme.rounds.map((r) => ({
    round: r.round,
    targetLoad:
      baseWeight == null
        ? null
        : roundToIncrement(baseWeight * r.loadPct, increment),
    repMin: r.repMin,
    repMax: r.repMax,
    toFailure: r.toFailure,
    rir: r.rir,
  }));
}
