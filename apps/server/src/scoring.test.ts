import { describe, expect, it } from "vitest";
import { computeRoundPodiumDeltas, computeVoteDisplay } from "./scoring.js";

describe("computeVoteDisplay", () => {
  it("50/50 parfait", () => {
    const r = computeVoteDisplay(3, 3, 0);
    expect(r.masterclass).toBe(true);
    expect(r.distance).toBe(0);
    expect(r.yesPct).toBe(50);
  });

  it("abstentions seules", () => {
    const r = computeVoteDisplay(0, 0, 5);
    expect(r.distance).toBe(50);
    expect(r.masterclass).toBe(false);
  });

  it("49/51", () => {
    const r = computeVoteDisplay(49, 51, 0);
    expect(r.distance).toBeCloseTo(1, 5);
  });
});

describe("computeRoundPodiumDeltas", () => {
  it("classement simple + masterclass", () => {
    const m = computeRoundPodiumDeltas([
      { playerId: "a", distance: 10, masterclass: false },
      { playerId: "b", distance: 2, masterclass: true },
      { playerId: "c", distance: 5, masterclass: false },
    ]);
    expect(m.get("b")).toBe(3 + 5);
    expect(m.get("c")).toBe(2);
    expect(m.get("a")).toBe(1);
  });

  it("ex-aequo sur la distance", () => {
    const m = computeRoundPodiumDeltas([
      { playerId: "a", distance: 1, masterclass: false },
      { playerId: "b", distance: 1, masterclass: false },
      { playerId: "c", distance: 8, masterclass: false },
    ]);
    expect(m.get("a")).toBe(3);
    expect(m.get("b")).toBe(3);
    expect(m.get("c")).toBe(2);
  });

  it("4e rang et suivants : 0 pt podium (3/2/1 seulement)", () => {
    const m = computeRoundPodiumDeltas([
      { playerId: "a", distance: 1, masterclass: false },
      { playerId: "b", distance: 2, masterclass: false },
      { playerId: "c", distance: 3, masterclass: false },
      { playerId: "d", distance: 40, masterclass: false },
    ]);
    expect(m.get("a")).toBe(3);
    expect(m.get("b")).toBe(2);
    expect(m.get("c")).toBe(1);
    expect(m.get("d")).toBeUndefined();
  });
});
