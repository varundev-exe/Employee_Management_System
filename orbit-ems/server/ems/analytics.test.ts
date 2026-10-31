import { describe, expect, it } from "vitest";
import { buildAttendanceTrend } from "./analytics";

describe("persisted attendance trend", () => {
  it("shows real counts and explicit zeros for all seven consecutive UTC days", () => {
    const start = new Date("2026-10-25T00:00:00.000Z");
    const trend = buildAttendanceTrend(start, [
      { workDate: new Date("2026-10-25T00:00:00.000Z"), count: 7 },
      { workDate: new Date("2026-10-27T00:00:00.000Z"), count: 2 },
      { workDate: new Date("2026-10-31T00:00:00.000Z"), count: 9 },
    ]);
    expect(trend).toHaveLength(7);
    expect(trend.map((day) => day.date)).toEqual([
      "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
    ]);
    expect(trend.map((day) => day.attendance)).toEqual([7, 0, 2, 0, 0, 0, 9]);
  });
});
