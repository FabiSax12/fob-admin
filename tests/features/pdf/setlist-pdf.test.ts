import {
	decodePDFRawStream,
	PDFArray,
	PDFDocument,
	type PDFPage,
	PDFRawStream,
	StandardFonts,
} from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildSetlistPdf } from "#/features/pdf/setlist-pdf";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

async function createFixturePdf(pageSizes: Array<[number, number]>) {
	const document = await PDFDocument.create();
	for (const size of pageSizes) document.addPage(size);
	return document.save();
}

async function loadPages(bytes: Uint8Array) {
	const document = await PDFDocument.load(bytes);
	return document.getPages();
}

function pageSizes(pages: PDFPage[]) {
	return pages.map((page) => [page.getWidth(), page.getHeight()]);
}

function decodedContent(page: PDFPage) {
	const contents = page.node.Contents();
	const streams =
		contents instanceof PDFArray
			? contents.asArray().map((ref) => page.doc.context.lookup(ref))
			: [contents];

	return streams
		.filter((stream) => stream instanceof PDFRawStream)
		.map((stream) =>
			new TextDecoder("latin1").decode(decodePDFRawStream(stream).decode()),
		)
		.join("\n");
}

async function helveticaHex(text: string) {
	const document = await PDFDocument.create();
	const font = await document.embedFont(StandardFonts.Helvetica);
	return font.encodeText(text).toString();
}

describe("buildSetlistPdf", () => {
	it("copies every page of available parts in order and adds a placeholder for a missing part", async () => {
		const songA = await createFixturePdf([
			[100, 100],
			[200, 200],
		]);
		const songC = await createFixturePdf([[300, 300]]);

		const output = await buildSetlistPdf([
			{ songName: "A", pdf: songA },
			{ songName: "B", pdf: null },
			{ songName: "C", pdf: songC },
		]);

		const pages = await loadPages(output);
		expect(pageSizes(pages)).toEqual([
			[100, 100],
			[200, 200],
			[LETTER_WIDTH, LETTER_HEIGHT],
			[300, 300],
		]);
		expect(decodedContent(pages[2])).toContain(await helveticaHex("B"));
	});

	it("adds a placeholder with the song name when the part bytes cannot be loaded", async () => {
		const corrupt = new TextEncoder().encode("esto no es un pdf");

		const output = await buildSetlistPdf([
			{ songName: "La Bilirrubina", pdf: corrupt },
		]);

		const pages = await loadPages(output);
		expect(pageSizes(pages)).toEqual([[LETTER_WIDTH, LETTER_HEIGHT]]);
		expect(decodedContent(pages[0])).toContain(
			await helveticaHex("La Bilirrubina"),
		);
	});

	it("renders Spanish characters in a placeholder song name", async () => {
		const output = await buildSetlistPdf([
			{ songName: "Rebelión ñ ¿Sí?", pdf: null },
		]);

		const pages = await loadPages(output);
		expect(decodedContent(pages[0])).toContain(
			await helveticaHex("Rebelión ñ ¿Sí?"),
		);
	});

	it("replaces characters Helvetica cannot encode instead of failing", async () => {
		const output = await buildSetlistPdf([
			{ songName: "Cumbia 🎺 Ω", pdf: null },
		]);

		const pages = await loadPages(output);
		expect(decodedContent(pages[0])).toContain(
			await helveticaHex("Cumbia ? ?"),
		);
	});

	it("repeats the pages of a song that appears twice in the setlist", async () => {
		const song = await createFixturePdf([
			[100, 100],
			[200, 200],
		]);

		const output = await buildSetlistPdf([
			{ songName: "A", pdf: song },
			{ songName: "A", pdf: song },
		]);

		expect(pageSizes(await loadPages(output))).toEqual([
			[100, 100],
			[200, 200],
			[100, 100],
			[200, 200],
		]);
	});

	it("rejects an empty setlist", async () => {
		await expect(buildSetlistPdf([])).rejects.toThrow(
			new Error("La presentación no tiene canciones"),
		);
	});

	it("sets the title metadata when a title is given", async () => {
		const output = await buildSetlistPdf([{ songName: "A", pdf: null }], {
			title: "Concierto de Navidad — Trompeta 1",
		});

		const document = await PDFDocument.load(output);
		expect(document.getTitle()).toBe("Concierto de Navidad — Trompeta 1");
	});
});
