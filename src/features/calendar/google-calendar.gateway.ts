import { auth, calendar } from "@googleapis/calendar";
import { Resource } from "sst";
import {
	CalendarEventMissingError,
	type CalendarGateway,
	createCalendarService,
} from "./calendar.service";
import type { CalendarEvent } from "./calendar-event";

const BAND_CALENDAR_ID = "primary";
/** Google emails the invitation, update or cancellation to every attendee. */
const NOTIFY_ALL_ATTENDEES = "all";
const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;

function isMissingEventError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const status = (error as { status?: unknown }).status;
	return status === HTTP_NOT_FOUND || status === HTTP_GONE;
}

async function failingOnMissingEvent<T>(
	eventId: string,
	request: () => Promise<T>,
): Promise<T> {
	try {
		return await request();
	} catch (error) {
		if (isMissingEventError(error))
			throw new CalendarEventMissingError(eventId);
		throw error;
	}
}

/** Server-only: acts as the band's Google account through its stored refresh token. */
export function createGoogleCalendarGateway(): CalendarGateway {
	const bandAccount = new auth.OAuth2(
		Resource.GoogleClientId.value,
		Resource.GoogleClientSecret.value,
	);
	bandAccount.setCredentials({
		refresh_token: Resource.BandCalendarRefreshToken.value,
	});
	const { events } = calendar({ version: "v3", auth: bandAccount });

	return {
		async insert(event: CalendarEvent): Promise<string> {
			const response = await events.insert({
				calendarId: BAND_CALENDAR_ID,
				sendUpdates: NOTIFY_ALL_ATTENDEES,
				requestBody: event,
			});
			if (!response.data.id) {
				throw new Error("Google Calendar created an event without an id");
			}
			return response.data.id;
		},

		async update(eventId: string, event: CalendarEvent): Promise<void> {
			await failingOnMissingEvent(eventId, () =>
				events.patch({
					calendarId: BAND_CALENDAR_ID,
					eventId,
					sendUpdates: NOTIFY_ALL_ATTENDEES,
					requestBody: event,
				}),
			);
		},

		async cancel(eventId: string): Promise<void> {
			await failingOnMissingEvent(eventId, () =>
				events.delete({
					calendarId: BAND_CALENDAR_ID,
					eventId,
					sendUpdates: NOTIFY_ALL_ATTENDEES,
				}),
			);
		},
	};
}

export function createDefaultCalendarService() {
	return createCalendarService({
		gateway: createGoogleCalendarGateway(),
		appUrl: Resource.PublicUrl.value,
	});
}
