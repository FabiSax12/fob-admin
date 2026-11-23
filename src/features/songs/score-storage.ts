import { DomainError, parseOrThrow } from "#/shared/errors";
import { fileSafeName } from "#/shared/schemas";
import { songFolder } from "./songs.service";

const PDF_EXTENSION = /\.pdf$/i;
const NOT_A_PDF_MESSAGE = "Solo se aceptan archivos PDF";
const DIACRITICS = /\p{Diacritic}/gu;
const LETTER_DIGIT_BOUNDARY = /(\p{L})(\d)|(\d)(\p{L})/gu;
const NON_ALPHANUMERIC = /[^\p{L}\d]+/u;

export interface PartUploadChoice {
	fileName: string;
	part: string;
}

/** Where the part PDFs of each song live: one file per part inside the song folder. */
export interface ScoreStorage {
	listParts(songName: string): Promise<string[]>;
	createUploadUrl(songName: string, part: string): Promise<string>;
	createDownloadUrl(songName: string, part: string): Promise<string>;
	deletePart(songName: string, part: string): Promise<void>;
}

/** Lowercase words without accents, splitting "TROMPETA2" into "trompeta" and "2". */
function words(text: string): string[] {
	return text
		.normalize("NFD")
		.replace(DIACRITICS, "")
		.toLowerCase()
		.replace(LETTER_DIGIT_BOUNDARY, "$1$3 $2$4")
		.split(NON_ALPHANUMERIC)
		.filter(Boolean);
}

/**
 * The band part a PDF most likely holds, judged by its file name: the part whose words all
 * appear in it, preferring the most specific one. Null when no part fits or the file fits
 * several equally, so the director picks it.
 */
export function suggestPart(
	fileName: string,
	bandParts: string[],
): string | null {
	const fileWords = new Set(words(fileName.replace(PDF_EXTENSION, "")));
	const fitting = bandParts
		.map((part) => ({ part, partWords: words(part) }))
		.filter(
			({ partWords }) =>
				partWords.length > 0 && partWords.every((word) => fileWords.has(word)),
		);
	const mostWords = Math.max(0, ...fitting.map((f) => f.partWords.length));
	const best = fitting.filter((f) => f.partWords.length === mostWords);
	return best.length === 1 ? best[0].part : null;
}

/** Validates the part the director chose for each PDF. A part can receive only one file per upload. */
export function parsePartUploads(
	choices: PartUploadChoice[],
): PartUploadChoice[] {
	const seen = new Set<string>();
	return choices.map(({ fileName, part }) => {
		if (!isPdfFileName(fileName))
			throw new DomainError("invalid", NOT_A_PDF_MESSAGE);
		const parsedPart = parsePartName(part);
		if (seen.has(parsedPart))
			throw new DomainError(
				"invalid",
				`Elegiste la misma parte para dos archivos: ${parsedPart}`,
			);
		seen.add(parsedPart);
		return { fileName, part: parsedPart };
	});
}

export function isPdfFileName(fileName: string): boolean {
	return PDF_EXTENSION.test(fileName.trim());
}

export function parsePartName(part: string): string {
	return parseOrThrow(fileSafeName, part);
}

/** The part stored at an S3 key, or null when the key is not a PDF directly inside the song folder. */
export function partNameFromKey(songName: string, key: string): string | null {
	const folder = songFolder(songName);
	if (!key.startsWith(folder)) return null;

	const fileName = key.slice(folder.length);
	if (fileName.includes("/") || !PDF_EXTENSION.test(fileName)) return null;
	return fileName.replace(PDF_EXTENSION, "");
}

export function sortParts(parts: string[]): string[] {
	return [...parts].sort((a, b) => a.localeCompare(b, "es"));
}

/** Member parts that still have no PDF in the song. Names match exactly: the setlist PDF looks parts up by that name. */
export function missingParts(
	memberParts: Array<string | null>,
	uploadedParts: string[],
): string[] {
	const uploaded = new Set(uploadedParts);
	const assigned = new Set(
		memberParts.filter((part): part is string => part !== null),
	);
	return sortParts([...assigned].filter((part) => !uploaded.has(part)));
}

/** Parts the director can upload a PDF for: every member part plus the parts the song already has. */
export function uploadableParts(
	memberParts: Array<string | null>,
	uploadedParts: string[],
): string[] {
	const parts = new Set(
		memberParts.filter((part): part is string => part !== null),
	);
	for (const part of uploadedParts) parts.add(part);
	return sortParts([...parts]);
}
