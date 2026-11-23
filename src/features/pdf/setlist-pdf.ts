import { PDFDocument, type PDFFont, StandardFonts } from "pdf-lib";

export interface SetlistPdfEntry {
	songName: string;
	pdf: Uint8Array | null;
}

export interface SetlistPdfOptions {
	title?: string;
}

const LETTER_SIZE: [number, number] = [612, 792];
const PLACEHOLDER_FONT_SIZE = 36;
const PLACEHOLDER_MARGIN = 48;
const UNENCODABLE_REPLACEMENT = "?";

export async function buildSetlistPdf(
	entries: ReadonlyArray<SetlistPdfEntry>,
	options: SetlistPdfOptions = {},
): Promise<Uint8Array> {
	if (entries.length === 0) {
		throw new Error("La presentación no tiene canciones");
	}

	const setlist = await PDFDocument.create();
	const font = await setlist.embedFont(StandardFonts.Helvetica);
	if (options.title) setlist.setTitle(options.title);

	for (const entry of entries) {
		const part = await loadPart(entry.pdf);
		if (part) {
			await appendAllPages(setlist, part);
		} else {
			addPlaceholderPage(setlist, font, entry.songName);
		}
	}

	return setlist.save();
}

// Corrupt or encrypted parts count as missing, so the musician still gets the rest of the setlist.
async function loadPart(bytes: Uint8Array | null) {
	if (!bytes) return null;
	try {
		return await PDFDocument.load(bytes);
	} catch {
		return null;
	}
}

async function appendAllPages(setlist: PDFDocument, part: PDFDocument) {
	const copiedPages = await setlist.copyPages(part, part.getPageIndices());
	for (const page of copiedPages) setlist.addPage(page);
}

function addPlaceholderPage(
	setlist: PDFDocument,
	font: PDFFont,
	songName: string,
) {
	const page = setlist.addPage(LETTER_SIZE);
	const text = toEncodableText(font, songName);
	const size = fittingFontSize(font, text, page.getWidth());
	const textWidth = font.widthOfTextAtSize(text, size);

	page.drawText(text, {
		font,
		size,
		x: (page.getWidth() - textWidth) / 2,
		y: (page.getHeight() - size) / 2,
	});
}

function toEncodableText(font: PDFFont, text: string) {
	const encodableCodePoints = new Set(font.getCharacterSet());
	return Array.from(text, (character) =>
		encodableCodePoints.has(character.codePointAt(0) ?? -1)
			? character
			: UNENCODABLE_REPLACEMENT,
	).join("");
}

function fittingFontSize(font: PDFFont, text: string, pageWidth: number) {
	const availableWidth = pageWidth - PLACEHOLDER_MARGIN * 2;
	const widthAtDefaultSize = font.widthOfTextAtSize(
		text,
		PLACEHOLDER_FONT_SIZE,
	);
	if (widthAtDefaultSize <= availableWidth) return PLACEHOLDER_FONT_SIZE;
	return (PLACEHOLDER_FONT_SIZE * availableWidth) / widthAtDefaultSize;
}
