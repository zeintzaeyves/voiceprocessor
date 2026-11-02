import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  describeDueDate,
  formatDate,
  formatLongDate,
} from "./dates";

describe("formatDate", () => {
  it("formats a calendar date without time-zone drift", () => {
    expect(formatDate("2026-10-10")).toBe("Oct 10, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatLongDate("2026-12-31")).toBe("December 31, 2026");
  });

  it("accepts full ISO timestamps by their date part", () => {
    expect(formatDate("2026-10-10T23:59:59.000Z")).toBe("Oct 10, 2026");
  });

  it("handles missing and unparseable input", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("daysBetween", () => {
  it("counts whole days in either direction", () => {
    expect(daysBetween("2026-10-10", "2026-10-15")).toBe(5);
    expect(daysBetween("2026-10-15", "2026-10-10")).toBe(-5);
    expect(daysBetween("2026-10-10", "2026-10-10")).toBe(0);
  });

  it("is not skewed by daylight-saving changes or month ends", () => {
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysBetween("2026-10-01", "2026-11-01")).toBe(31);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2); // leap year
  });
});

describe("describeDueDate", () => {
  it.each([
    ["2026-10-15", "today"],
    ["2026-10-16", "tomorrow"],
    ["2026-10-14", "yesterday"],
    ["2026-10-20", "in 5 days"],
    ["2026-10-10", "5 days ago"],
  ])("%s relative to 2026-10-15 is %s", (due, expected) => {
    expect(describeDueDate(due, "2026-10-15")).toBe(expected);
  });

  it("falls back to the date until today is known", () => {
    expect(describeDueDate("2026-10-20", "")).toBe("Oct 20, 2026");
  });
});

describe("addDays", () => {
  it("adds across month, year and leap-day boundaries", () => {
    expect(addDays("2026-10-10", 14)).toBe("2026-10-24");
    expect(addDays("2026-10-25", 14)).toBe("2026-11-08");
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
    expect(addDays("2028-02-20", 14)).toBe("2028-03-05");
    expect(addDays("2026-10-10", 0)).toBe("2026-10-10");
    expect(addDays("2026-10-10", -10)).toBe("2026-09-30");
  });

  it("returns unparseable input unchanged", () => {
    expect(addDays("garbage", 5)).toBe("garbage");
  });
});
