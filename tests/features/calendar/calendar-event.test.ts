import { describe, expect, it } from "vitest";
import type { Activity } from "#/features/activities/activities.types";
import { toCalendarEvent } from "#/features/calendar/calendar-event";

const APP_URL = "https://fob.example.com";

function activity(overrides: Partial<Activity> = {}): Activity {
	return {
		id: "act-1",
		type: "presentacion",
		title: "Fiestas de Florencia",
		startsAt: "2025-03-15T19:00:00-06:00",
		endsAt: "2025-03-15T22:00:00-06:00",
		location: "Parque Central",
		notes: "Llegar 1 hora antes",
		sectionId: null,
		attendees: ["ana@gmail.com", "beto@gmail.com"],
		setlist: ["song-1", "song-2"],
		status: "published",
		calendarEventId: null,
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
		...overrides,
	};
}

describe("toCalendarEvent", () => {
	it.each([
		["ensayo", "Ensayo General · Fiestas de Florencia"],
		["presentacion", "Presentación · Fiestas de Florencia"],
		["seccional", "Seccional · Fiestas de Florencia"],
	] as const)("titles a %s with its type label and title", (type, summary) => {
		expect(
			toCalendarEvent(activity({ type }), { appUrl: APP_URL }).summary,
		).toBe(summary);
	});

	it("describes the notes followed by a link to the activity in the app", () => {
		const event = toCalendarEvent(activity(), { appUrl: APP_URL });

		expect(event.description).toBe(
			"Llegar 1 hora antes\n\nDetalles y partituras: https://fob.example.com/actividades/act-1",
		);
	});

	it("describes only the link when the activity has no notes", () => {
		const event = toCalendarEvent(activity({ notes: "" }), { appUrl: APP_URL });

		expect(event.description).toBe(
			"Detalles y partituras: https://fob.example.com/actividades/act-1",
		);
	});

	it("schedules start and end in Costa Rica time with the location", () => {
		const event = toCalendarEvent(activity(), { appUrl: APP_URL });

		expect(event.location).toBe("Parque Central");
		expect(event.start).toEqual({
			dateTime: "2025-03-15T19:00:00-06:00",
			timeZone: "America/Costa_Rica",
		});
		expect(event.end).toEqual({
			dateTime: "2025-03-15T22:00:00-06:00",
			timeZone: "America/Costa_Rica",
		});
	});

	it("invites every attendee by email without letting guests modify it", () => {
		const event = toCalendarEvent(activity(), { appUrl: APP_URL });

		expect(event.attendees).toEqual([
			{ email: "ana@gmail.com" },
			{ email: "beto@gmail.com" },
		]);
		expect(event.guestsCanModify).toBe(false);
		expect(event.reminders).toEqual({ useDefault: true });
	});

	it("leaves the setlist out of the event", () => {
		const event = toCalendarEvent(activity(), { appUrl: APP_URL });

		expect(JSON.stringify(event)).not.toContain("song-1");
	});
});
