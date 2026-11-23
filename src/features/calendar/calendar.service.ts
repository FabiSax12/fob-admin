import type { Activity } from "#/features/activities/activities.types";
import { type CalendarEvent, toCalendarEvent } from "./calendar-event";

/** Port to the band's calendar. Implementations must notify attendees of every change. */
export interface CalendarGateway {
	insert(event: CalendarEvent): Promise<string>;
	update(eventId: string, event: CalendarEvent): Promise<void>;
	cancel(eventId: string): Promise<void>;
}

/** The event no longer exists in the calendar, for example someone deleted it by hand. */
export class CalendarEventMissingError extends Error {
	constructor(readonly eventId: string) {
		super(`Calendar event ${eventId} no longer exists`);
		this.name = "CalendarEventMissingError";
	}
}

export type CalendarService = ReturnType<typeof createCalendarService>;

export function createCalendarService({
	gateway,
	appUrl,
}: {
	gateway: CalendarGateway;
	appUrl: string;
}) {
	async function updateOrReplace(
		eventId: string,
		event: CalendarEvent,
	): Promise<string> {
		try {
			await gateway.update(eventId, event);
			return eventId;
		} catch (error) {
			if (error instanceof CalendarEventMissingError) {
				return gateway.insert(event);
			}
			throw error;
		}
	}

	return {
		/** Creates or updates the activity's event and returns the event id to store. */
		async sync(activity: Activity): Promise<string> {
			const event = toCalendarEvent(activity, { appUrl });
			if (!activity.calendarEventId) return gateway.insert(event);
			return updateOrReplace(activity.calendarEventId, event);
		},

		async cancel(activity: Activity): Promise<void> {
			if (!activity.calendarEventId) return;
			try {
				await gateway.cancel(activity.calendarEventId);
			} catch (error) {
				const isAlreadyGone = error instanceof CalendarEventMissingError;
				if (!isAlreadyGone) throw error;
			}
		},
	};
}
