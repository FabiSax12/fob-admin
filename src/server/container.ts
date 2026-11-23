import { Resource } from "sst";
import { createActivitiesService } from "#/features/activities/activities.service";
import type { Activity } from "#/features/activities/activities.types";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import { createSectionsService } from "#/features/sections/sections.service";
import type { Section } from "#/features/sections/sections.types";
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

const activities = createActivitiesService({
	repo: createDynamoRepository<Activity>({
		tableName,
		entity: "ACTIVITY",
		idOf: (a) => a.id,
		sortKeyOf: (a) => a.startsAt,
	}),
	members,
	songs,
	// Wired to PDF generation (T8) and Google Calendar (T9).
	onPublished: async () => {},
});

export const container = { members, sections, songs, activities };
