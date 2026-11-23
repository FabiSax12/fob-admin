import type { EntityRepository } from "#/shared/entity-repository";
import { DomainError, parseOrThrow } from "#/shared/errors";
import { byName, sameName } from "#/shared/schemas";
import { type Song, songInputSchema } from "./songs.types";

export const REPERTOIRE_PREFIX = "repertorio/";

export function songFolder(songName: string): string {
	return `${REPERTOIRE_PREFIX}${songName}/`;
}

export function partKey(songName: string, part: string): string {
	return `${songFolder(songName)}${part}.pdf`;
}

export type SongsService = ReturnType<typeof createSongsService>;

export function createSongsService(repo: EntityRepository<Song>) {
	return {
		async list(): Promise<Song[]> {
			return (await repo.list()).sort(byName);
		},

		get(id: string): Promise<Song | null> {
			return repo.get(id);
		},

		async getOrThrow(id: string): Promise<Song> {
			const song = await repo.get(id);
			if (!song) throw new DomainError("not_found", "No existe esa canción");
			return song;
		},

		async create(input: unknown): Promise<Song> {
			const { name } = parseOrThrow(songInputSchema, input);
			const clash = (await repo.list()).some((song) =>
				sameName(song.name, name),
			);
			if (clash) {
				throw new DomainError(
					"conflict",
					"Ya existe una canción con ese nombre",
				);
			}
			const song: Song = {
				id: crypto.randomUUID(),
				name,
				folder: songFolder(name),
				createdAt: new Date().toISOString(),
			};
			await repo.put(song);
			return song;
		},
	};
}
