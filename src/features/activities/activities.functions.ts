import { createServerFn } from "@tanstack/react-start";
import { requireDirector, requireMember } from "#/features/auth/auth.functions";
import type { Member } from "#/features/members/members.types";
import { toActionResult } from "#/lib/action-result";
import { container } from "#/server/container";
import { DomainError } from "#/shared/errors";
import {
	type Activity,
	type ActivityDetail,
	type ActivityInput,
	type Attendee,
	MISSING_SONG_NAME,
	type SetlistEntry,
} from "./activities.types";

interface ActivityUpdate {
	id: string;
	input: ActivityInput;
}

async function resolveSetlist(activity: Activity): Promise<SetlistEntry[]> {
	const songs = await container.songs.list();
	const nameById = new Map(songs.map((song) => [song.id, song.name]));
	return activity.setlist.map((songId) => ({
		songId,
		songName: nameById.get(songId) ?? MISSING_SONG_NAME,
	}));
}

async function resolveAttendees(activity: Activity): Promise<Attendee[]> {
	const members = await container.members.list();
	const nameByEmail = new Map(
		members.map((member) => [member.email, member.name]),
	);
	return activity.attendees.map((email) => ({
		email,
		name: nameByEmail.get(email) ?? email,
	}));
}

async function describeActivity(
	viewer: Member,
	activity: Activity,
): Promise<ActivityDetail> {
	const isDirector = viewer.role === "director";
	return {
		activity,
		setlist: await resolveSetlist(activity),
		attendees: isDirector ? await resolveAttendees(activity) : null,
	};
}

// Inputs pass through untouched: the activities service validates them.
export const listActivities = createServerFn({ method: "GET" }).handler(
	async () => {
		const member = await requireMember();
		return container.activities.listFor(member);
	},
);

/** The activity as the signed-in member may see it, or null when it does not exist for them. */
export const getActivity = createServerFn({ method: "GET" })
	.validator((id: string) => id)
	.handler(async ({ data: id }): Promise<ActivityDetail | null> => {
		const member = await requireMember();
		try {
			return await describeActivity(
				member,
				await container.activities.getFor(member, id),
			);
		} catch (error) {
			if (error instanceof DomainError && error.code === "not_found")
				return null;
			throw error;
		}
	});

export const getActivityFormData = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireDirector();
		const [members, sections, songs] = await Promise.all([
			container.members.list(),
			container.sections.list(),
			container.songs.list(),
		]);
		return { members, sections, songs };
	},
);

export const createActivity = createServerFn({ method: "POST" })
	.validator((input: ActivityInput) => input)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.activities.create(data);
		}),
	);

export const updateActivity = createServerFn({ method: "POST" })
	.validator((update: ActivityUpdate) => update)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.activities.update(data.id, data.input);
		}),
	);

export const publishActivity = createServerFn({ method: "POST" })
	.validator((id: string) => id)
	.handler(({ data: id }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.activities.publish(id);
		}),
	);
