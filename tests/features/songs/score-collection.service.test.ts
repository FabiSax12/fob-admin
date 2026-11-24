import { describe, expect, it } from "vitest";
import type { Member } from "#/features/members/members.types";
import {
	createScoreCollectionService,
	MAX_SCORE_BYTES,
	type ScoreSkip,
	STAGED_CHANGED_MESSAGE,
	type StagedFile,
	stagedUploadKey,
} from "#/features/songs/score-collection.service";
import { createSongsService, partKey } from "#/features/songs/songs.service";
import type { Song } from "#/features/songs/songs.types";
import { DomainError } from "#/shared/errors";
import { createMemoryRepository } from "../../support/memory-repository";

const NOW = new Date("2025-05-01T12:00:00.000Z");
const PDF: StagedFile = { size: 120_000, header: "%PDF-", etag: '"v1"' };

const trumpet: Member = {
	email: "ana@gmail.com",
	name: "Ana",
	role: "musician",
	part: "Trompeta 1",
	sectionIds: [],
};

const bass: Member = {
	email: "beto@gmail.com",
	name: "Beto",
	role: "musician",
	part: "Bajo",
	sectionIds: [],
};

const soundEngineer: Member = {
	email: "sole@gmail.com",
	name: "Sole",
	role: "sound",
	part: null,
	sectionIds: [],
};

async function setup() {
	const songs = createSongsService(createMemoryRepository<Song>((s) => s.id));
	const skips = createMemoryRepository<ScoreSkip>((skip) => skip.id);
	const keys = new Set<string>();
	const staged = new Map<string, StagedFile>();
	const stagedUrls: string[] = [];
	const promotedEtags: string[] = [];
	const scores = {
		listScoreKeys: async () => [...keys],
		createStagedUpload: async (stagingKey: string) => {
			stagedUrls.push(stagingKey);
			return { url: "https://s3.test/", fields: { key: stagingKey } };
		},
		inspectStaged: async (stagingKey: string): Promise<StagedFile | null> =>
			staged.get(stagingKey) ?? null,
		promoteStaged: async (
			stagingKey: string,
			etag: string,
			songName: string,
			part: string,
		) => {
			promotedEtags.push(etag);
			if (!staged.has(stagingKey)) throw new Error("nothing staged");
			keys.add(partKey(songName, part));
		},
		discardStaged: async (stagingKey: string) => {
			staged.delete(stagingKey);
		},
	};
	const collection = createScoreCollectionService({
		songs,
		scores,
		skips,
		now: () => NOW,
	});
	const rebelion = await songs.create({ name: "Rebelión" });
	const amor = await songs.create({ name: "Amor de mis amores" });
	const cumbia = await songs.create({ name: "Cumbia del sol" });
	return {
		collection,
		skips,
		keys,
		staged,
		stagedUrls,
		promotedEtags,
		scores,
		rebelion,
		amor,
		cumbia,
	};
}

describe("score collection service", () => {
	it("lists every song by name with the member's PDF and skip state, starting at the first pending one", async () => {
		const { collection, keys, amor, rebelion, cumbia } = await setup();
		keys.add(partKey("Amor de mis amores", "Trompeta 1"));
		keys.add(partKey("Cumbia del sol", "Bajo"));
		await collection.skip(trumpet, cumbia.id);

		const progress = await collection.progress(trumpet);

		expect(progress).toEqual({
			part: "Trompeta 1",
			startIndex: 2,
			songs: [
				{
					songId: amor.id,
					songName: "Amor de mis amores",
					hasPdf: true,
					skipped: false,
				},
				{
					songId: cumbia.id,
					songName: "Cumbia del sol",
					hasPdf: false,
					skipped: true,
				},
				{
					songId: rebelion.id,
					songName: "Rebelión",
					hasPdf: false,
					skipped: false,
				},
			],
		});
	});

	it("starts at the first song when nothing is pending", async () => {
		const { collection, keys } = await setup();
		for (const name of ["Rebelión", "Amor de mis amores", "Cumbia del sol"])
			keys.add(partKey(name, "Bajo"));

		const progress = await collection.progress(bass);

		expect(progress.startIndex).toBe(0);
		expect(progress.songs.every((song) => song.hasPdf)).toBe(true);
	});

	it("keeps one member's skip out of another member's progress", async () => {
		const { collection, rebelion } = await setup();
		await collection.skip(trumpet, rebelion.id);

		const progress = await collection.progress(bass);

		expect(progress.songs.some((song) => song.skipped)).toBe(false);
	});

	it("records a skip once per member and song", async () => {
		const { collection, skips, rebelion } = await setup();

		await collection.skip(trumpet, rebelion.id);
		await collection.skip(trumpet, rebelion.id);

		expect([...skips.items.values()]).toEqual([
			{
				id: `${rebelion.id}#ana@gmail.com`,
				songId: rebelion.id,
				email: "ana@gmail.com",
				memberName: "Ana",
				part: "Trompeta 1",
				skippedAt: NOW.toISOString(),
			},
		]);
	});

	it("hands out an upload form for the member's own staging key, leaving the score and the skip untouched", async () => {
		const { collection, skips, keys, stagedUrls, rebelion } = await setup();
		await collection.skip(trumpet, rebelion.id);

		const upload = await collection.requestUpload(trumpet, rebelion.id);

		expect(stagedUploadKey("ana@gmail.com", rebelion.id)).toBe(
			`staging/ana@gmail.com/${rebelion.id}.pdf`,
		);
		expect(upload).toEqual({
			part: "Trompeta 1",
			url: "https://s3.test/",
			fields: { key: `staging/ana@gmail.com/${rebelion.id}.pdf` },
		});
		expect(stagedUrls).toEqual([`staging/ana@gmail.com/${rebelion.id}.pdf`]);
		expect(keys.size).toBe(0);
		expect(skips.items.size).toBe(1);
	});

	it("on confirm, stores the staged PDF under the member's part, never the file name, and clears only their skip", async () => {
		const { promotedEtags, collection, skips, keys, staged, rebelion } =
			await setup();
		await collection.skip(trumpet, rebelion.id);
		await collection.skip(bass, rebelion.id);
		staged.set(stagedUploadKey(trumpet.email, rebelion.id), PDF);

		const confirmed = await collection.confirmUpload(trumpet, rebelion.id);

		expect(confirmed).toEqual({ part: "Trompeta 1" });
		expect(promotedEtags).toEqual(['"v1"']);
		expect([...keys]).toEqual(["repertorio/Rebelión/Trompeta 1.pdf"]);
		expect(staged.size).toBe(0);
		expect([...skips.items.values()].map((skip) => skip.email)).toEqual([
			"beto@gmail.com",
		]);
	});

	it("still confirms and clears the skip when removing the staged file fails after the copy", async () => {
		const { collection, skips, keys, staged, scores, rebelion } = await setup();
		await collection.skip(trumpet, rebelion.id);
		staged.set(stagedUploadKey(trumpet.email, rebelion.id), PDF);
		scores.discardStaged = async () => {
			throw new Error("S3 delete failed");
		};

		await expect(
			collection.confirmUpload(trumpet, rebelion.id),
		).resolves.toEqual({
			part: "Trompeta 1",
		});

		expect([...keys]).toEqual(["repertorio/Rebelión/Trompeta 1.pdf"]);
		expect(skips.items.size).toBe(0);
	});

	it("keeps the skip when the copy fails, for example after a re-upload", async () => {
		const { collection, skips, keys, staged, scores, rebelion } = await setup();
		await collection.skip(trumpet, rebelion.id);
		staged.set(stagedUploadKey(trumpet.email, rebelion.id), PDF);
		scores.promoteStaged = async () => {
			throw new DomainError("conflict", STAGED_CHANGED_MESSAGE);
		};

		await expect(
			collection.confirmUpload(trumpet, rebelion.id),
		).rejects.toThrow(
			"El archivo cambió mientras lo revisábamos. Probá de nuevo.",
		);

		expect(keys.size).toBe(0);
		expect(skips.items.size).toBe(1);
	});

	it("accepts a PDF of exactly the size limit", async () => {
		const { collection, keys, staged, rebelion } = await setup();
		staged.set(stagedUploadKey(trumpet.email, rebelion.id), {
			size: MAX_SCORE_BYTES,
			header: "%PDF-",
			etag: '"v1"',
		});

		await collection.confirmUpload(trumpet, rebelion.id);

		expect(keys.size).toBe(1);
	});

	it.each([
		[
			"a file bigger than 20 MB",
			{ size: MAX_SCORE_BYTES + 1, header: "%PDF-", etag: '"v1"' },
			"El PDF pesa más de 20 MB",
		],
		[
			"a file whose size is unknown",
			{ size: Number.NaN, header: "%PDF-", etag: '"v1"' },
			"El PDF pesa más de 20 MB",
		],
		[
			"a file that is not a PDF",
			{ size: 2_000, header: "PK\u0003\u0004\u0014", etag: '"v1"' },
			"El archivo no es un PDF válido",
		],
	])("rejects %s, discards it and keeps the stored score and the skip", async (_case, file, message) => {
		const { collection, skips, keys, staged, rebelion } = await setup();
		keys.add(partKey("Rebelión", "Trompeta 1"));
		await collection.skip(trumpet, rebelion.id);
		staged.set(stagedUploadKey(trumpet.email, rebelion.id), file);

		await expect(
			collection.confirmUpload(trumpet, rebelion.id),
		).rejects.toThrow(message);

		expect([...keys]).toEqual(["repertorio/Rebelión/Trompeta 1.pdf"]);
		expect(staged.size).toBe(0);
		expect(skips.items.size).toBe(1);
	});

	it.each([
		[
			"a file bigger than 20 MB",
			{ size: MAX_SCORE_BYTES + 1, header: "%PDF-", etag: '"v1"' },
			"El PDF pesa más de 20 MB",
		],
		[
			"a file that is not a PDF",
			{ size: 2_000, header: "PK\u0003\u0004\u0014", etag: '"v1"' },
			"El archivo no es un PDF válido",
		],
	])("still explains the rejection of %s when discarding it fails", async (_case, file, message) => {
		const { collection, skips, keys, staged, scores, rebelion } = await setup();
		keys.add(partKey("Rebelión", "Trompeta 1"));
		await collection.skip(trumpet, rebelion.id);
		staged.set(stagedUploadKey(trumpet.email, rebelion.id), file);
		scores.discardStaged = async () => {
			throw new Error("S3 delete failed");
		};

		await expect(
			collection.confirmUpload(trumpet, rebelion.id),
		).rejects.toMatchObject({ code: "invalid", message });

		expect([...keys]).toEqual(["repertorio/Rebelión/Trompeta 1.pdf"]);
		expect(skips.items.size).toBe(1);
	});

	it("rejects a confirm with nothing uploaded and keeps the skip", async () => {
		const { collection, skips, keys, rebelion } = await setup();
		await collection.skip(trumpet, rebelion.id);

		await expect(
			collection.confirmUpload(trumpet, rebelion.id),
		).rejects.toThrow("No encontramos el archivo subido. Probá de nuevo.");

		expect(keys.size).toBe(0);
		expect(skips.items.size).toBe(1);
	});

	it("does not confirm another member's staged file", async () => {
		const { collection, keys, staged, rebelion } = await setup();
		staged.set(stagedUploadKey(bass.email, rebelion.id), PDF);

		await expect(
			collection.confirmUpload(trumpet, rebelion.id),
		).rejects.toThrow("No encontramos el archivo subido. Probá de nuevo.");

		expect(keys.size).toBe(0);
		expect(staged.size).toBe(1);
	});

	it("lists who skipped a song by member name, leaving out parts that already have a PDF", async () => {
		const { collection, rebelion, amor } = await setup();
		await collection.skip(bass, rebelion.id);
		await collection.skip(trumpet, rebelion.id);
		await collection.skip(trumpet, amor.id);

		expect(
			(await collection.skipsForSong(rebelion.id, [])).map((skip) => [
				skip.memberName,
				skip.part,
			]),
		).toEqual([
			["Ana", "Trompeta 1"],
			["Beto", "Bajo"],
		]);
		expect(
			(await collection.skipsForSong(rebelion.id, ["Bajo"])).map(
				(skip) => skip.memberName,
			),
		).toEqual(["Ana"]);
	});

	it("rejects a member without a part and stores nothing", async () => {
		const { collection, skips, stagedUrls, keys, rebelion } = await setup();
		const message = "Tu perfil no tiene una parte asignada";

		await expect(collection.progress(soundEngineer)).rejects.toThrow(message);
		await expect(collection.skip(soundEngineer, rebelion.id)).rejects.toThrow(
			message,
		);
		await expect(
			collection.requestUpload(soundEngineer, rebelion.id),
		).rejects.toThrow(message);
		await expect(
			collection.confirmUpload(soundEngineer, rebelion.id),
		).rejects.toThrow(message);
		expect(skips.items.size).toBe(0);
		expect(stagedUrls).toEqual([]);
		expect(keys.size).toBe(0);
	});

	it("rejects an unknown song and stores nothing", async () => {
		const { collection, skips, stagedUrls, keys } = await setup();

		for (const songId of ["missing", "../x", ""]) {
			await expect(collection.skip(trumpet, songId)).rejects.toThrow(
				"No existe esa canción",
			);
			await expect(collection.requestUpload(trumpet, songId)).rejects.toThrow(
				"No existe esa canción",
			);
			await expect(collection.confirmUpload(trumpet, songId)).rejects.toThrow(
				"No existe esa canción",
			);
		}
		expect(skips.items.size).toBe(0);
		expect(stagedUrls).toEqual([]);
		expect(keys.size).toBe(0);
	});
});
