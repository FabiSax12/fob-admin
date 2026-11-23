import type { MembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import type { SongsService } from "#/features/songs/songs.service";
import type { EntityRepository } from "#/shared/entity-repository";
import { DomainError, parseOrThrow } from "#/shared/errors";
import {
	type Activity,
	type ActivityType,
	activityInputSchema,
} from "./activities.types";

/**
 * Attendees preselected in the form. Every musician (the director plays too),
 * or the members of the section for a seccional. The sonidista is never preselected.
 */
export function defaultAttendees(
	type: ActivityType,
	members: Member[],
	sectionId: string | null,
): string[] {
	return members
		.filter((member) => member.role !== "sound")
		.filter(
			(member) =>
				type !== "seccional" ||
				(sectionId !== null && member.sectionIds.includes(sectionId)),
		)
		.map((member) => member.email);
}

export function canSee(member: Member, activity: Activity): boolean {
	if (member.role === "director") return true;
	return (
		activity.status === "published" && activity.attendees.includes(member.email)
	);
}

interface Deps {
	repo: EntityRepository<Activity>;
	members: MembersService;
	songs: SongsService;
	/** Runs after publishing and after every edit of a published activity: PDFs and calendar. */
	onPublished: (activity: Activity) => Promise<void>;
}

export type ActivitiesService = ReturnType<typeof createActivitiesService>;

export function createActivitiesService({
	repo,
	members,
	songs,
	onPublished,
}: Deps) {
	async function parseInput(input: unknown) {
		const data = parseOrThrow(activityInputSchema, input);
		for (const email of data.attendees) {
			if (!(await members.findByEmail(email))) {
				throw new DomainError("invalid", `${email} no es miembro de la banda`);
			}
		}
		for (const songId of data.setlist) {
			if (!(await songs.get(songId))) {
				throw new DomainError(
					"invalid",
					"Una de las canciones no está en el repertorio",
				);
			}
		}
		return data;
	}

	async function getOrThrow(id: string): Promise<Activity> {
		const activity = await repo.get(id);
		if (!activity)
			throw new DomainError("not_found", "No existe esa actividad");
		return activity;
	}

	function assertPublishable(activity: Activity) {
		if (activity.type === "presentacion" && activity.setlist.length === 0) {
			throw new DomainError(
				"invalid",
				"Agregá al menos una canción antes de publicar la presentación",
			);
		}
	}

	return {
		async listFor(member: Member): Promise<Activity[]> {
			return (await repo.list())
				.filter((activity) => canSee(member, activity))
				.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
		},

		async getFor(member: Member, id: string): Promise<Activity> {
			const activity = await getOrThrow(id);
			if (!canSee(member, activity)) {
				throw new DomainError("not_found", "No existe esa actividad");
			}
			return activity;
		},

		async create(input: unknown): Promise<Activity> {
			const data = await parseInput(input);
			const now = new Date().toISOString();
			const activity: Activity = {
				...data,
				id: crypto.randomUUID(),
				status: "draft",
				calendarEventId: null,
				createdAt: now,
				updatedAt: now,
			};
			await repo.put(activity);
			return activity;
		},

		async update(id: string, input: unknown): Promise<Activity> {
			const current = await getOrThrow(id);
			const data = await parseInput(input);
			const activity: Activity = {
				...current,
				...data,
				updatedAt: new Date().toISOString(),
			};
			if (activity.status === "published") assertPublishable(activity);
			await repo.put(activity);
			if (activity.status === "published") await onPublished(activity);
			return activity;
		},

		async publish(id: string): Promise<Activity> {
			const current = await getOrThrow(id);
			assertPublishable(current);
			const activity: Activity = {
				...current,
				status: "published",
				updatedAt: new Date().toISOString(),
			};
			await repo.put(activity);
			await onPublished(activity);
			return activity;
		},

		/** Stores the Google Calendar event id without re-running the publish effects. */
		async setCalendarEventId(id: string, calendarEventId: string | null) {
			const current = await getOrThrow(id);
			await repo.put({ ...current, calendarEventId });
		},
	};
}
