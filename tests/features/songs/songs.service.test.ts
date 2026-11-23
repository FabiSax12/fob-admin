import { describe, expect, it } from "vitest";
import { createSongsService, partKey } from "#/features/songs/songs.service";
import type { Song } from "#/features/songs/songs.types";
import { createMemoryRepository } from "../../support/memory-repository";

function setup() {
	const repo = createMemoryRepository<Song>((s) => s.id);
	return { repo, songs: createSongsService(repo) };
}

describe("songs service", () => {
	it("creates a song whose name is its folder", async () => {
		const { songs } = setup();

		const song = await songs.create({ name: "  La Bilirrubina " });

		expect(song.name).toBe("La Bilirrubina");
		expect(song.folder).toBe("repertorio/La Bilirrubina/");
	});

	it("builds the S3 key of a part from the song name and the part name", () => {
		expect(partKey("La Bilirrubina", "Trompeta 1")).toBe(
			"repertorio/La Bilirrubina/Trompeta 1.pdf",
		);
	});

	it("rejects a name with a slash because it would nest folders", async () => {
		const { songs, repo } = setup();

		await expect(songs.create({ name: "Cumbia / Mix" })).rejects.toThrow(
			"El nombre no puede contener / ni \\",
		);
		expect(repo.items.size).toBe(0);
	});

	it("rejects a duplicate song ignoring case", async () => {
		const { songs, repo } = setup();
		await songs.create({ name: "Rebelión" });

		await expect(songs.create({ name: "rebelión" })).rejects.toThrow(
			"Ya existe una canción con ese nombre",
		);
		expect(repo.items.size).toBe(1);
	});

	it("lists songs alphabetically", async () => {
		const { songs } = setup();
		for (const name of ["Rebelión", "Abusadora", "La Bilirrubina"]) {
			await songs.create({ name });
		}

		expect((await songs.list()).map((s) => s.name)).toEqual([
			"Abusadora",
			"La Bilirrubina",
			"Rebelión",
		]);
	});
});
