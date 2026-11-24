import { Resource } from "sst";
import { createActivitiesService } from "#/features/activities/activities.service";
import type { Activity } from "#/features/activities/activities.types";
import type { CalendarService } from "#/features/calendar/calendar.service";
import { createDefaultCalendarService } from "#/features/calendar/google-calendar.gateway";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import type { CalendarSync } from "#/features/publishing/calendar-sync.types";
import type { PersonalPdf } from "#/features/publishing/personal-pdf.types";
import { createPublishEffects } from "#/features/publishing/publish-effects";
import { triggerPublishEffects } from "#/features/publishing/publish-trigger";
import { createS3PersonalPdfStorage } from "#/features/publishing/s3-personal-pdf-storage";
import { createSectionsService } from "#/features/sections/sections.service";
import type { Section } from "#/features/sections/sections.types";
import { s3ScoreStorage } from "#/features/songs/s3-score-storage";
import {
	createScoreCollectionService,
	type ScoreSkip,
} from "#/features/songs/score-collection.service";
import { createSongsService } from "#/features/songs/songs.service";
import type { Song } from "#/features/songs/songs.types";
import { createDynamoRepository } from "#/shared/dynamo-repository";

/** Composition root: the only place that wires services to AWS. Server-only. */
const tableName = () => Resource.Data.name;

const members = createMembersService(
	createDynamoRepository<Member>({
		tableName,
		entity: "MEMBER",
		idOf: (m) => m.email,
		sortKeyOf: (m) => m.name,
	}),
);

const sections = createSectionsService(
	createDynamoRepository<Section>({
		tableName,
		entity: "SECTION",
		idOf: (s) => s.id,
		sortKeyOf: (s) => s.name,
	}),
	members,
);

const songs = createSongsService(
	createDynamoRepository<Song>({
		tableName,
		entity: "SONG",
		idOf: (s) => s.id,
		sortKeyOf: (s) => s.name,
	}),
);

const scoreCollection = createScoreCollectionService({
	songs,
	scores: s3ScoreStorage,
	skips: createDynamoRepository<ScoreSkip>({
		tableName,
		entity: "SCORE_SKIP",
		idOf: (skip) => skip.id,
		sortKeyOf: (skip) => skip.id,
	}),
	now: () => new Date(),
});

const activityRepo = createDynamoRepository<Activity>({
	tableName,
	entity: "ACTIVITY",
	idOf: (a) => a.id,
	sortKeyOf: (a) => a.startsAt,
});

const activities = createActivitiesService({
	repo: activityRepo,
	members,
	songs,
	onPublished: async (activity) => {
		await publishEffects.markPending(activity);
		await triggerPublishEffects(activity.id);
	},
});

const personalPdfs = createDynamoRepository<PersonalPdf>({
	tableName,
	entity: "PDF",
	idOf: (pdf) => pdf.id,
	sortKeyOf: (pdf) => pdf.id,
});

const calendarSyncs = createDynamoRepository<CalendarSync>({
	tableName,
	entity: "CALENDAR_SYNC",
	idOf: (calendarSync) => calendarSync.id,
	sortKeyOf: (calendarSync) => calendarSync.id,
});

const personalPdfStorage = createS3PersonalPdfStorage();

let calendarService: CalendarService | undefined;
/** Built on first use: only the PublishEffects Lambda talks to Google Calendar. */
function bandCalendar(): CalendarService {
	calendarService ??= createDefaultCalendarService();
	return calendarService;
}

const publishEffects = createPublishEffects({
	// Unscoped lookup: the effects run in the PublishEffects Lambda, without a signed-in member.
	activities: {
		get: (id) => activityRepo.get(id),
		setCalendarEventId: activities.setCalendarEventId,
	},
	members,
	songs,
	scores: personalPdfStorage,
	output: personalPdfStorage,
	pdfs: personalPdfs,
	calendarSyncs,
	calendar: { sync: (activity) => bandCalendar().sync(activity) },
	now: () => new Date(),
});

export const container = {
	members,
	sections,
	songs,
	scoreCollection,
	activities,
	personalPdfs,
	calendarSyncs,
	personalPdfStorage,
	publishEffects,
};
