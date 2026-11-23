import {
	type Activity,
	MISSING_SONG_NAME,
} from "#/features/activities/activities.types";
import type { CalendarService } from "#/features/calendar/calendar.service";
import type { MembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import {
	buildSetlistPdf,
	type SetlistPdfEntry,
} from "#/features/pdf/setlist-pdf";
import type { SongsService } from "#/features/songs/songs.service";
import type { EntityRepository } from "#/shared/entity-repository";
import {
	personalPdfId,
	personalPdfKey,
	receivesPersonalPdf,
} from "./personal-pdf";
import type { PersonalPdf, PersonalPdfStatus } from "./personal-pdf.types";

const MAX_ERROR_LENGTH = 200;

/** Reads the PDF of one part of a song; null when that part was never uploaded. */
export interface ScoreReader {
	readPart(songName: string, part: string): Promise<Uint8Array | null>;
}

export interface GeneratedPdfWriter {
	writePdf(key: string, bytes: Uint8Array): Promise<void>;
}

/** The activities need an unscoped lookup here: the effects run without a signed-in member. */
export interface PublishedActivities {
	get(id: string): Promise<Activity | null>;
	setCalendarEventId(id: string, calendarEventId: string | null): Promise<void>;
}

interface Deps {
	activities: PublishedActivities;
	members: Pick<MembersService, "list">;
	songs: Pick<SongsService, "get">;
	scores: ScoreReader;
	output: GeneratedPdfWriter;
	pdfs: EntityRepository<PersonalPdf>;
	calendar: Pick<CalendarService, "sync">;
	now: () => Date;
}

type Musician = Member & { part: string };

interface SetlistSong {
	id: string;
	name: string;
	exists: boolean;
}

export type PublishEffects = ReturnType<typeof createPublishEffects>;

export function createPublishEffects({
	activities,
	members,
	songs,
	scores,
	output,
	pdfs,
	calendar,
	now,
}: Deps) {
	async function musiciansOf(activity: Activity): Promise<Musician[]> {
		return (await members.list()).filter((member) =>
			receivesPersonalPdf(activity, member),
		);
	}

	function savePdfStatus(
		activity: Activity,
		musician: Musician,
		changes: { status: PersonalPdfStatus; key?: string; error?: string },
	) {
		return pdfs.put({
			id: personalPdfId(activity.id, musician.email),
			activityId: activity.id,
			email: musician.email,
			part: musician.part,
			status: changes.status,
			key: changes.key ?? null,
			updatedAt: now().toISOString(),
			error: changes.error ?? null,
		});
	}

	async function syncCalendar(activity: Activity) {
		const calendarEventId = await calendar.sync(activity);
		if (calendarEventId === activity.calendarEventId) return;
		await activities.setCalendarEventId(activity.id, calendarEventId);
	}

	async function resolveSetlist(activity: Activity): Promise<SetlistSong[]> {
		return Promise.all(
			activity.setlist.map(async (songId) => {
				const song = await songs.get(songId);
				if (!song)
					return { id: songId, name: MISSING_SONG_NAME, exists: false };
				return { id: songId, name: song.name, exists: true };
			}),
		);
	}

	function createCachedPartReader() {
		const partsByKey = new Map<string, Promise<Uint8Array | null>>();
		return (song: SetlistSong, part: string) => {
			if (!song.exists) return Promise.resolve(null);
			const cacheKey = JSON.stringify([song.id, part]);
			let bytes = partsByKey.get(cacheKey);
			if (!bytes) {
				bytes = scores.readPart(song.name, part);
				partsByKey.set(cacheKey, bytes);
			}
			return bytes;
		};
	}

	async function buildMusicianPdf(
		activity: Activity,
		setlist: SetlistSong[],
		musician: Musician,
		readPart: ReturnType<typeof createCachedPartReader>,
	) {
		const entries: SetlistPdfEntry[] = await Promise.all(
			setlist.map(async (song) => ({
				songName: song.name,
				pdf: await readPart(song, musician.part),
			})),
		);
		const bytes = await buildSetlistPdf(entries, {
			title: `${activity.title} — ${musician.part}`,
		});
		const key = personalPdfKey(activity.id, musician.email);
		await output.writePdf(key, bytes);
		return key;
	}

	async function generatePersonalPdfs(activity: Activity) {
		const setlist = await resolveSetlist(activity);
		const readPart = createCachedPartReader();

		for (const musician of await musiciansOf(activity)) {
			try {
				const key = await buildMusicianPdf(
					activity,
					setlist,
					musician,
					readPart,
				);
				await savePdfStatus(activity, musician, { status: "ready", key });
			} catch (error) {
				console.error(`Personal PDF failed for ${musician.email}`, error);
				await savePdfStatus(activity, musician, {
					status: "failed",
					error: shortErrorMessage(error),
				});
			}
		}
	}

	return {
		/** Runs inside the publish request, so the attendees see "pending" before the async work starts. */
		async markPending(activity: Activity): Promise<void> {
			for (const musician of await musiciansOf(activity)) {
				await savePdfStatus(activity, musician, { status: "pending" });
			}
		},

		/**
		 * Calendar sync plus one PDF per musician. A calendar failure is rethrown only
		 * after the PDFs are done, so the async Lambda retry re-runs it; rebuilding the
		 * PDFs on that retry is harmless because every run overwrites the same keys.
		 */
		async run(activityId: string): Promise<void> {
			const activity = await activities.get(activityId);
			if (activity?.status !== "published") return;

			let calendarFailure: unknown = null;
			try {
				await syncCalendar(activity);
			} catch (error) {
				console.error(`Calendar sync failed for activity ${activityId}`, error);
				calendarFailure = error;
			}

			if (activity.type === "presentacion")
				await generatePersonalPdfs(activity);
			if (calendarFailure !== null) throw calendarFailure;
		},
	};
}

function shortErrorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.slice(0, MAX_ERROR_LENGTH);
}
