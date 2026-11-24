import type { Member } from "#/features/members/members.types";
import type { EntityRepository } from "#/shared/entity-repository";
import { DomainError } from "#/shared/errors";
import { partKey, type SongsService } from "./songs.service";

const NO_PART_MESSAGE = "Tu perfil no tiene una parte asignada";
const NOT_UPLOADED_MESSAGE =
	"No encontramos el archivo subido. Probá de nuevo.";
const TOO_BIG_MESSAGE = "El PDF pesa más de 20 MB";
const NOT_A_PDF_MESSAGE = "El archivo no es un PDF válido";
const PDF_SIGNATURE = "%PDF-";

export const STAGED_CHANGED_MESSAGE =
	"El archivo cambió mientras lo revisábamos. Probá de nuevo.";
export const MAX_SCORE_BYTES = 20 * 1024 * 1024;
export const STAGING_PREFIX = "staging/";

/** What the server reads of a staged upload: its size and its first bytes. */
export interface StagedFile {
	size: number;
	/** First bytes as latin1 text; a PDF starts with `%PDF-`. */
	header: string;
	/** Identifies the checked version, so a later re-upload is never promoted unchecked. */
	etag: string;
}

/** A member said they do not have the PDF of their part for a song. */
export interface ScoreSkip {
	/** `<songId>#<email>`: one skip per member and song. */
	id: string;
	songId: string;
	email: string;
	memberName: string;
	part: string;
	skippedAt: string;
}

export interface WizardSong {
	songId: string;
	songName: string;
	/** The member's part already has a PDF in this song. */
	hasPdf: boolean;
	skipped: boolean;
}

export interface WizardProgress {
	part: string;
	songs: WizardSong[];
	/** First song with neither a PDF nor a skip; 0 when every song is done. */
	startIndex: number;
}

export interface OwnPartUpload {
	part: string;
	uploadUrl: string;
}

/** Where a member's upload waits for the server check before it replaces the score. */
export function stagedUploadKey(email: string, songId: string): string {
	return `${STAGING_PREFIX}${email}/${songId}.pdf`;
}

interface Dependencies {
	songs: Pick<SongsService, "list" | "getOrThrow">;
	scores: {
		/** Every key under the repertoire prefix, in one listing instead of one per song. */
		listScoreKeys(): Promise<string[]>;
		createStagedUploadUrl(stagingKey: string): Promise<string>;
		inspectStaged(stagingKey: string): Promise<StagedFile | null>;
		/**
		 * Copies the checked staged version over the part PDF of the song. Throws a conflict
		 * with {@link STAGED_CHANGED_MESSAGE} when the staged file changed after the check.
		 */
		promoteStaged(
			stagingKey: string,
			etag: string,
			songName: string,
			part: string,
		): Promise<void>;
		discardStaged(stagingKey: string): Promise<void>;
	};
	skips: EntityRepository<ScoreSkip>;
	now: () => Date;
}

export type ScoreCollectionService = ReturnType<
	typeof createScoreCollectionService
>;

function skipId(songId: string, email: string): string {
	return `${songId}#${email}`;
}

function partOf(member: Member): string {
	if (!member.part) throw new DomainError("forbidden", NO_PART_MESSAGE);
	return member.part;
}

/**
 * Lets each member upload the PDF of their own part, song by song. The part comes from the
 * member's profile, so the uploaded file name never decides where the PDF is stored.
 */
export function createScoreCollectionService({
	songs,
	scores,
	skips,
	now,
}: Dependencies) {
	return {
		async progress(member: Member): Promise<WizardProgress> {
			const part = partOf(member);
			const [allSongs, keys, allSkips] = await Promise.all([
				songs.list(),
				scores.listScoreKeys(),
				skips.list(),
			]);
			const uploaded = new Set(keys);
			const skippedSongs = new Set(
				allSkips
					.filter((skip) => skip.email === member.email)
					.map((skip) => skip.songId),
			);
			const wizardSongs = allSongs.map((song) => ({
				songId: song.id,
				songName: song.name,
				hasPdf: uploaded.has(partKey(song.name, part)),
				skipped: skippedSongs.has(song.id),
			}));
			const firstPending = wizardSongs.findIndex(
				(song) => !song.hasPdf && !song.skipped,
			);
			return {
				part,
				songs: wizardSongs,
				startIndex: Math.max(0, firstPending),
			};
		},

		async skip(member: Member, songId: string): Promise<ScoreSkip> {
			const part = partOf(member);
			const song = await songs.getOrThrow(songId);
			const skip: ScoreSkip = {
				id: skipId(song.id, member.email),
				songId: song.id,
				email: member.email,
				memberName: member.name,
				part,
				skippedAt: now().toISOString(),
			};
			await skips.put(skip);
			return skip;
		},

		/**
		 * The browser uploads to a staging key; nothing replaces the score until
		 * {@link confirmUpload} checks the file.
		 */
		async requestUpload(
			member: Member,
			songId: string,
		): Promise<OwnPartUpload> {
			const part = partOf(member);
			const song = await songs.getOrThrow(songId);
			const uploadUrl = await scores.createStagedUploadUrl(
				stagedUploadKey(member.email, song.id),
			);
			return { part, uploadUrl };
		},

		/**
		 * Replaces the member's part PDF with their staged upload when it is a PDF of at most
		 * 20 MB, and clears their skip: they did have the PDF after all. A rejected file is
		 * discarded and leaves the stored score and the skip as they were.
		 */
		async confirmUpload(
			member: Member,
			songId: string,
		): Promise<{ part: string }> {
			const part = partOf(member);
			const song = await songs.getOrThrow(songId);
			const stagingKey = stagedUploadKey(member.email, song.id);
			const staged = await scores.inspectStaged(stagingKey);
			if (!staged) throw new DomainError("invalid", NOT_UPLOADED_MESSAGE);

			// "Not within the limit", so an unknown (NaN) size is rejected too.
			const problem = !(staged.size <= MAX_SCORE_BYTES)
				? TOO_BIG_MESSAGE
				: !staged.header.startsWith(PDF_SIGNATURE)
					? NOT_A_PDF_MESSAGE
					: null;
			if (problem) {
				await scores.discardStaged(stagingKey);
				throw new DomainError("invalid", problem);
			}

			await scores.promoteStaged(stagingKey, staged.etag, song.name, part);
			await skips.delete(skipId(song.id, member.email));
			// The score is already replaced; a leftover staged file expires with the bucket lifecycle.
			await scores.discardStaged(stagingKey).catch(() => {});
			return { part };
		},

		/** Skips whose part still has no PDF: another member with that part may have uploaded it. */
		async skipsForSong(
			songId: string,
			uploadedParts: string[],
		): Promise<ScoreSkip[]> {
			const uploaded = new Set(uploadedParts);
			return (await skips.list())
				.filter((skip) => skip.songId === songId && !uploaded.has(skip.part))
				.sort((a, b) => a.memberName.localeCompare(b.memberName, "es"));
		},
	};
}
