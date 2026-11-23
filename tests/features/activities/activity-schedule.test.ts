import { describe, expect, it } from "vitest";
import {
	splitUpcomingAndPast,
	toCostaRicaIso,
	toCostaRicaLocal,
	toSchedule,
	toScheduleFields,
} from "#/features/activities/activity-schedule";

describe("toCostaRicaIso", () => {
	it("stamps the local date and time with the Costa Rica offset", () => {
		expect(toCostaRicaIso({ date: "2025-12-31", time: "20:30" })).toBe(
			"2025-12-31T20:30:00-06:00",
		);
	});

	it("keeps the same offset all year because Costa Rica has no daylight saving", () => {
		expect(toCostaRicaIso({ date: "2025-07-04", time: "07:05" })).toBe(
			"2025-07-04T07:05:00-06:00",
		);
	});
});

describe("toCostaRicaLocal", () => {
	it("reads back the date and time the director typed", () => {
		expect(toCostaRicaLocal("2025-12-31T20:30:00-06:00")).toEqual({
			date: "2025-12-31",
			time: "20:30",
		});
	});

	it("converts an instant stored in UTC to Costa Rica wall time, across midnight", () => {
		expect(toCostaRicaLocal("2026-01-01T02:30:00Z")).toEqual({
			date: "2025-12-31",
			time: "20:30",
		});
	});

	it("round-trips with toCostaRicaIso", () => {
		const local = { date: "2026-02-28", time: "23:59" };
		expect(toCostaRicaLocal(toCostaRicaIso(local))).toEqual(local);
	});
});

describe("splitUpcomingAndPast", () => {
	const NOW = new Date("2025-06-15T12:00:00-06:00");
	const lastMonth = {
		id: "last-month",
		startsAt: "2025-05-10T19:00:00-06:00",
		endsAt: "2025-05-10T23:00:00-06:00",
	};
	const yesterday = {
		id: "yesterday",
		startsAt: "2025-06-14T19:00:00-06:00",
		endsAt: "2025-06-14T23:00:00-06:00",
	};
	const happeningNow = {
		id: "happening-now",
		startsAt: "2025-06-15T11:00:00-06:00",
		endsAt: "2025-06-15T13:00:00-06:00",
	};
	const nextWeek = {
		id: "next-week",
		startsAt: "2025-06-22T19:00:00-06:00",
		endsAt: "2025-06-22T23:00:00-06:00",
	};
	const ids = (activities: { id: string }[]) =>
		activities.map((activity) => activity.id);

	it("lists upcoming activities soonest first and past ones most recent first", () => {
		const { upcoming, past } = splitUpcomingAndPast(
			[nextWeek, lastMonth, happeningNow, yesterday],
			NOW,
		);

		expect(ids(upcoming)).toEqual(["happening-now", "next-week"]);
		expect(ids(past)).toEqual(["yesterday", "last-month"]);
	});

	it("keeps an activity upcoming until it ends", () => {
		const endsNow = { ...happeningNow, endsAt: NOW.toISOString() };

		expect(ids(splitUpcomingAndPast([endsNow], NOW).past)).toEqual([
			"happening-now",
		]);
		expect(
			ids(
				splitUpcomingAndPast(
					[{ ...endsNow, endsAt: "2025-06-15T12:00:01-06:00" }],
					NOW,
				).upcoming,
			),
		).toEqual(["happening-now"]);
	});

	it("returns two empty groups for no activities", () => {
		expect(splitUpcomingAndPast([], NOW)).toEqual({ upcoming: [], past: [] });
	});
});

describe("toSchedule", () => {
	it("builds start and end on the same day", () => {
		expect(
			toSchedule({ date: "2025-08-02", startTime: "18:00", endTime: "21:00" }),
		).toEqual({
			startsAt: "2025-08-02T18:00:00-06:00",
			endsAt: "2025-08-02T21:00:00-06:00",
		});
	});

	it("moves an end time earlier than the start to the next day, for gigs past midnight", () => {
		expect(
			toSchedule({ date: "2025-12-31", startTime: "21:00", endTime: "02:00" })
				.endsAt,
		).toBe("2026-01-01T02:00:00-06:00");
	});

	it("keeps an end equal to the start on the same day so validation rejects it", () => {
		expect(
			toSchedule({ date: "2025-08-02", startTime: "18:00", endTime: "18:00" })
				.endsAt,
		).toBe("2025-08-02T18:00:00-06:00");
	});
});

describe("toScheduleFields", () => {
	it("refills the form from a stored activity that ends past midnight", () => {
		const fields = { date: "2025-12-31", startTime: "21:00", endTime: "02:00" };

		expect(toScheduleFields(toSchedule(fields))).toEqual(fields);
	});
});
