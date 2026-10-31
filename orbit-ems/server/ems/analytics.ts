const DAY_MS = 24 * 60 * 60 * 1000;

type DailyCount = { workDate: Date; count: number };

export function buildAttendanceTrend(startDate: Date, records: DailyCount[]) {
  const counts = new Map(records.map((row) => [row.workDate.toISOString().slice(0, 10), row.count]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate.getTime() + index * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      day: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date),
      attendance: counts.get(key) ?? 0,
    };
  });
}
