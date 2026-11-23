import { describe, expect, it } from "vitest";
import type { Activity } from "#/features/activities/activities.types";
import {
	CalendarEventMissingError,
	type CalendarGateway,
	createCalendarService,
} from "#/features/calendar/calendar.service";
import {
	type CalendarEvent,
	toCalendarEvent,
} from "#/features/calendar/calendar-event";

const APP_URL = "https://fob.example.com";

function activity(overrides: Partial<Activity> = {}): Activity {
	return {
		id: "act-1",
		type: "ensayo",
		title: "Ensayo de marzo",
		startsAt: "2025-03-15T19:00:00-06:00",
		endsAt: "2025-03-15T21:00:00-06:00",
		location: "Salón comunal",
		notes: "",
		sectionId: null,
		attendees: ["ana@gmail.com"],
		setlist: [],
		status: "published",
		calendarEventId: null,
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
		...overrides,
	};
}

function createFakeGateway(options: { missingIds?: string[] } = {}) {
	const missingIds = new Set(options.missingIds ?? []);
	const inserted: CalendarEvent[] = [];
	const updated: { eventId: string; event: CalendarEvent }[] = [];
	const cancelled: string[] = [];

	const gateway: CalendarGateway = {
		async insert(event) {
			inserted.push(event);
			return `event-${inserted.length}`;
		},
		async update(eventId, event) {
			if (missingIds.has(eventId)) throw new CalendarEventMissingError(eventId);
			updated.push({ eventId, event });
		},
		async cancel(eventId) {
			cancelled.push(eventId);
		},
	};

	return { gateway, inserted, updated, cancelled };
}

function setup(options: { missingIds?: string[] } = {}) {
	const fake = createFakeGateway(options);
	const calendar = createCalendarService({
		gateway: fake.gateway,
		appUrl: APP_URL,
	});
	return { ...fake, calendar };
}

describe("calendar service", () => {
	it("inserts a new event when the activity has none and returns its id", async () => {
		const { calendar, inserted, updated } = setup();
		const subject = activity();

		const eventId = await calendar.sync(subject);

		expect(eventId).toBe("event-1");
		expect(inserted).toEqual([toCalendarEvent(subject, { appUrl: APP_URL })]);
		expect(updated).toEqual([]);
	});

	it("updates the existing event and keeps its id", async () => {
		const { calendar, inserted, updated } = setup();
		const subject = activity({ calendarEventId: "existing-7" });

		const eventId = await calendar.sync(subject);

		expect(eventId).toBe("existing-7");
		expect(updated).toEqual([
			{
				eventId: "existing-7",
				event: toCalendarEvent(subject, { appUrl: APP_URL }),
			},
		]);
		expect(inserted).toEqual([]);
	});

	it("inserts a replacement when the existing event was deleted in Google", async () => {
		const { calendar, inserted, updated } = setup({
			missingIds: ["deleted-3"],
		});
		const subject = activity({ calendarEventId: "deleted-3" });

		const eventId = await calendar.sync(subject);

		expect(eventId).toBe("event-1");
		expect(inserted).toEqual([toCalendarEvent(subject, { appUrl: APP_URL })]);
		expect(updated).toEqual([]);
	});

	it("propagates update failures other than a missing event", async () => {
		const { gateway, inserted } = createFakeGateway();
		gateway.update = async () => {
			throw new Error("quota exceeded");
		};
		const calendar = createCalendarService({ gateway, appUrl: APP_URL });

		await expect(
			calendar.sync(activity({ calendarEventId: "existing-7" })),
		).rejects.toThrow("quota exceeded");
		expect(inserted).toEqual([]);
	});

	it("does nothing on cancel when the activity has no event", async () => {
		const { calendar, cancelled } = setup();

		await calendar.cancel(activity());

		expect(cancelled).toEqual([]);
	});

	it("cancels the activity's event", async () => {
		const { calendar, cancelled } = setup();

		await calendar.cancel(activity({ calendarEventId: "existing-7" }));

		expect(cancelled).toEqual(["existing-7"]);
	});

	it("treats cancelling an event already deleted in Google as done", async () => {
		const { gateway } = createFakeGateway();
		gateway.cancel = async (eventId) => {
			throw new CalendarEventMissingError(eventId);
		};
		const calendar = createCalendarService({ gateway, appUrl: APP_URL });

		await expect(
			calendar.cancel(activity({ calendarEventId: "deleted-3" })),
		).resolves.toBeUndefined();
	});
});
