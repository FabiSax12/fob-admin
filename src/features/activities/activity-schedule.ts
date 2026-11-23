/** Costa Rica keeps UTC-6 all year (no daylight saving), so one fixed offset is exact. */
export const COSTA_RICA_UTC_OFFSET = "-06:00";
const COSTA_RICA_TIME_ZONE = "America/Costa_Rica";
const COSTA_RICA_OFFSET_MS = -6 * 60 * 60 * 1000;
const ISO_DATE_LENGTH = 10;
const ISO_TIME_START = 11;
const ISO_TIME_END = 16;

/** What the director types in the form: "YYYY-MM-DD" and "HH:mm", Costa Rica wall time. */
export interface LocalDateTime {
	date: string;
	time: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface Scheduled {
	startsAt: string;
	endsAt: string;
}

/** The form's single date with its start and end times. */
export interface ScheduleFields {
	date: string;
	startTime: string;
	endTime: string;
}

export function toCostaRicaIso({ date, time }: LocalDateTime): string {
	return `${date}T${time}:00${COSTA_RICA_UTC_OFFSET}`;
}

export function toCostaRicaLocal(iso: string): LocalDateTime {
	const shifted = new Date(
		Date.parse(iso) + COSTA_RICA_OFFSET_MS,
	).toISOString();
	return {
		date: shifted.slice(0, ISO_DATE_LENGTH),
		time: shifted.slice(ISO_TIME_START, ISO_TIME_END),
	};
}

function nextDay(date: string): string {
	return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS)
		.toISOString()
		.slice(0, ISO_DATE_LENGTH);
}

/** An end time earlier than the start means the activity runs past midnight, as gigs often do. */
export function toSchedule({
	date,
	startTime,
	endTime,
}: ScheduleFields): Scheduled {
	const endsNextDay = endTime < startTime;
	return {
		startsAt: toCostaRicaIso({ date, time: startTime }),
		endsAt: toCostaRicaIso({
			date: endsNextDay ? nextDay(date) : date,
			time: endTime,
		}),
	};
}

export function toScheduleFields({
	startsAt,
	endsAt,
}: Scheduled): ScheduleFields {
	const start = toCostaRicaLocal(startsAt);
	return {
		date: start.date,
		startTime: start.time,
		endTime: toCostaRicaLocal(endsAt).time,
	};
}

/** An activity stays upcoming until it ends. Upcoming soonest first, past most recent first. */
export function splitUpcomingAndPast<T extends Scheduled>(
	activities: T[],
	now: Date,
): { upcoming: T[]; past: T[] } {
	const hasEnded = (activity: T) =>
		Date.parse(activity.endsAt) <= now.getTime();
	const byStart = (a: T, b: T) =>
		Date.parse(a.startsAt) - Date.parse(b.startsAt);

	return {
		upcoming: activities
			.filter((activity) => !hasEnded(activity))
			.sort(byStart),
		past: activities.filter(hasEnded).sort((a, b) => byStart(b, a)),
	};
}

function formatInCostaRica(
	iso: string,
	options: Intl.DateTimeFormatOptions,
): string {
	return new Date(iso).toLocaleDateString("es-CR", {
		...options,
		timeZone: COSTA_RICA_TIME_ZONE,
	});
}

/** The pieces of the gold date block: day numeral, short month and year. */
export function dateBlockOf(iso: string) {
	return {
		day: formatInCostaRica(iso, { day: "numeric" }),
		month: formatInCostaRica(iso, { month: "short" }).replace(".", ""),
		year: formatInCostaRica(iso, { year: "numeric" }),
	};
}

export function formatLongDate(iso: string): string {
	return formatInCostaRica(iso, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

export function formatTimeRange({ startsAt, endsAt }: Scheduled): string {
	const timeOf = (iso: string) =>
		new Date(iso).toLocaleTimeString("es-CR", {
			hour: "numeric",
			minute: "2-digit",
			timeZone: COSTA_RICA_TIME_ZONE,
		});
	return `${timeOf(startsAt)} – ${timeOf(endsAt)}`;
}
