import { z } from "zod";
import { googleEmail, requiredName } from "#/shared/schemas";

export const ACTIVITY_TYPES = ["ensayo", "presentacion", "seccional"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
	ensayo: "Ensayo General",
	presentacion: "Presentación",
	seccional: "Seccional",
};

export type ActivityStatus = "draft" | "published";

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
	draft: "Borrador",
	published: "Publicada",
};

export interface Activity {
	id: string;
	type: ActivityType;
	title: string;
	/** ISO 8601 with offset. */
	startsAt: string;
	endsAt: string;
	location: string;
	notes: string;
	sectionId: string | null;
	/** Emails of the members called to this activity. */
	attendees: string[];
	/** Ordered song ids. Only presentations have one. */
	setlist: string[];
	status: ActivityStatus;
	calendarEventId: string | null;
	createdAt: string;
	updatedAt: string;
}

const isoDateTime = z.iso.datetime({
	offset: true,
	error: "Fecha y hora inválidas",
});

export const activityInputSchema = z
	.object({
		type: z.enum(ACTIVITY_TYPES, { error: "Elegí el tipo de actividad" }),
		title: requiredName,
		startsAt: isoDateTime,
		endsAt: isoDateTime,
		location: z.string().trim().default(""),
		notes: z.string().trim().default(""),
		sectionId: z
			.string()
			.nullish()
			.transform((value) => value || null),
		attendees: z.array(googleEmail).default([]),
		setlist: z.array(z.string()).default([]),
	})
	.superRefine((activity, ctx) => {
		if (Date.parse(activity.endsAt) <= Date.parse(activity.startsAt)) {
			ctx.addIssue({
				code: "custom",
				path: ["endsAt"],
				message: "La hora de fin tiene que ser después del inicio",
			});
		}
		if (activity.type === "seccional" && !activity.sectionId) {
			ctx.addIssue({
				code: "custom",
				path: ["sectionId"],
				message: "Elegí la sección del seccional",
			});
		}
		if (activity.type !== "presentacion" && activity.setlist.length > 0) {
			ctx.addIssue({
				code: "custom",
				path: ["setlist"],
				message: "Solo las presentaciones tienen orden de canciones",
			});
		}
	})
	.transform((activity) => ({
		...activity,
		attendees: [...new Set(activity.attendees)],
		sectionId: activity.type === "seccional" ? activity.sectionId : null,
	}));

export type ActivityInput = z.input<typeof activityInputSchema>;

/** Shown in a setlist for a song id the repertoire no longer has. */
export const MISSING_SONG_NAME = "Canción que ya no está en el repertorio";

export interface SetlistEntry {
	songId: string;
	songName: string;
}

export interface Attendee {
	email: string;
	name: string;
}

export interface ActivityDetail {
	activity: Activity;
	setlist: SetlistEntry[];
	/** Only the director gets the attendee names; null for everyone else. */
	attendees: Attendee[] | null;
}
