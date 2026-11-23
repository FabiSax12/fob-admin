import { DomainError, parseOrThrow } from "#/shared/errors";
import { fileSafeName } from "#/shared/schemas";
import { songFolder } from "./songs.service";

const PDF_EXTENSION = /\.pdf$/i;
const NOT_A_PDF_MESSAGE = "Solo se aceptan archivos PDF";

/** Where the part PDFs of each song live: one file per part inside the song folder. */
export interface ScoreStorage {
	listParts(songName: string): Promise<string[]>;
	createUploadUrl(songName: string, part: string): Promise<string>;
	createDownloadUrl(songName: string, part: string): Promise<string>;
	deletePart(songName: string, part: string): Promise<void>;
}

/** The file name of a part PDF is the part itself, so "Trompeta 1.pdf" holds the part "Trompeta 1". */
export function partNameFromFileName(fileName: string): string {
	const trimmedFileName = fileName.trim();
	if (!PDF_EXTENSION.test(trimmedFileName))
		throw new DomainError("invalid", NOT_A_PDF_MESSAGE);
	return parsePartName(trimmedFileName.replace(PDF_EXTENSION, ""));
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
