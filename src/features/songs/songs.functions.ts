import { createServerFn } from "@tanstack/react-start";
import { requireDirector, requireMember } from "#/features/auth/auth.functions";
import { toActionResult } from "#/lib/action-result";
import { container } from "#/server/container";
import { s3ScoreStorage } from "./s3-score-storage";
import {
	missingParts,
	parsePartName,
	partNameFromFileName,
} from "./score-storage";
import type { Song } from "./songs.types";

export interface SongDetail {
	song: Song;
	parts: string[];
	/** Member parts with no PDF yet. Only the director gets it; null for everyone else. */
	missingParts: string[] | null;
}

export interface PartUpload {
	fileName: string;
	part: string;
	uploadUrl: string;
}

interface PartUploadRequest {
	songId: string;
	fileNames: string[];
}

interface PartRef {
	songId: string;
	part: string;
}

// Inputs pass through untouched: the songs service and the part-name helpers validate them.
export const listSongs = createServerFn({ method: "GET" }).handler(async () => {
	await requireMember();
	return container.songs.list();
});

export const getSong = createServerFn({ method: "GET" })
	.validator((songId: string) => songId)
	.handler(async ({ data: songId }): Promise<SongDetail | null> => {
		const member = await requireMember();
		const song = await container.songs.get(songId);
		if (!song) return null;

		const parts = await s3ScoreStorage.listParts(song.name);
		if (member.role !== "director") return { song, parts, missingParts: null };

		const members = await container.members.list();
		return {
			song,
			parts,
			missingParts: missingParts(
				members.map((bandMember) => bandMember.part),
				parts,
			),
		};
	});

export const createSong = createServerFn({ method: "POST" })
	.validator((name: string) => name)
	.handler(({ data: name }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.songs.create({ name });
		}),
	);

/** Uploading a part that already exists replaces its PDF. */
export const requestPartUploads = createServerFn({ method: "POST" })
	.validator((request: PartUploadRequest) => request)
	.handler(({ data }) =>
		toActionResult(async (): Promise<PartUpload[]> => {
			await requireDirector();
			const song = await container.songs.getOrThrow(data.songId);
			const uploads = data.fileNames.map((fileName) => ({
				fileName,
				part: partNameFromFileName(fileName),
			}));
			return Promise.all(
				uploads.map(async (upload) => ({
					...upload,
					uploadUrl: await s3ScoreStorage.createUploadUrl(
						song.name,
						upload.part,
					),
				})),
			);
		}),
	);

export const getPartDownloadUrl = createServerFn({ method: "POST" })
	.validator((ref: PartRef) => ref)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireMember();
			const song = await container.songs.getOrThrow(data.songId);
			return s3ScoreStorage.createDownloadUrl(
				song.name,
				parsePartName(data.part),
			);
		}),
	);

export const deletePart = createServerFn({ method: "POST" })
	.validator((ref: PartRef) => ref)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireDirector();
			const song = await container.songs.getOrThrow(data.songId);
			await s3ScoreStorage.deletePart(song.name, parsePartName(data.part));
			return null;
		}),
	);
