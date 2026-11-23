import type { calendar_v3 } from "@googleapis/calendar";
import {
	ACTIVITY_TYPE_LABELS,
	type Activity,
} from "#/features/activities/activities.types";

export type CalendarEvent = calendar_v3.Schema$Event;

export interface CalendarEventOptions {
	appUrl: string;
}

const BAND_TIME_ZONE = "America/Costa_Rica";

function activityUrl(appUrl: string, activityId: string): string {
	return `${appUrl.replace(/\/$/, "")}/actividades/${activityId}`;
}

function describeActivity(activity: Activity, appUrl: string): string {
	const detailsLine = `Detalles y partituras: ${activityUrl(appUrl, activity.id)}`;
	if (!activity.notes) return detailsLine;
	return `${activity.notes}\n\n${detailsLine}`;
}

export function toCalendarEvent(
	activity: Activity,
	{ appUrl }: CalendarEventOptions,
): CalendarEvent {
	return {
		summary: `${ACTIVITY_TYPE_LABELS[activity.type]} · ${activity.title}`,
		location: activity.location,
		description: describeActivity(activity, appUrl),
		start: { dateTime: activity.startsAt, timeZone: BAND_TIME_ZONE },
		end: { dateTime: activity.endsAt, timeZone: BAND_TIME_ZONE },
		attendees: activity.attendees.map((email) => ({ email })),
		guestsCanModify: false,
		reminders: { useDefault: true },
	};
}
