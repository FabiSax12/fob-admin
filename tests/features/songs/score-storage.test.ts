import { describe, expect, it } from "vitest";
import {
	missingParts,
	parsePartUploads,
	partNameFromKey,
	suggestPart,
	uploadableParts,
} from "#/features/songs/score-storage";

describe("suggestPart", () => {
	const bandParts = ["Bajo", "Saxofón Alto", "Trompeta 1", "Trompeta 2"];

	it("suggests the part when the file name is the part", () => {
		expect(suggestPart("Trompeta 1.pdf", bandParts)).toBe("Trompeta 1");
	});

	it("ignores case, accents, the song name and punctuation", () => {
		expect(suggestPart("El año viejo- SAXOFON ALTO.pdf", bandParts)).toBe(
			"Saxofón Alto",
		);
	});

	it("matches a part number written next to the instrument", () => {
		expect(suggestPart("Cumbia - TROMPETA2.pdf", bandParts)).toBe("Trompeta 2");
	});

	it("suggests nothing when the file fits more than one part", () => {
		expect(suggestPart("El año viejo- TROMPETA.pdf", bandParts)).toBeNull();
	});

	it("suggests nothing when no part fits", () => {
		expect(suggestPart("Guitarra.pdf", bandParts)).toBeNull();
	});
});

describe("parsePartUploads", () => {
	it("keeps each file with the part chosen for it, trimmed", () => {
		expect(
			parsePartUploads([
				{ fileName: "El año viejo- TROMPETA.pdf", part: " Trompeta 1 " },
				{ fileName: "bajo.PDF", part: "Bajo" },
			]),
		).toEqual([
			{ fileName: "El año viejo- TROMPETA.pdf", part: "Trompeta 1" },
			{ fileName: "bajo.PDF", part: "Bajo" },
		]);
	});

	it("rejects a file that is not a PDF", () => {
		expect(() =>
			parsePartUploads([{ fileName: "Trompeta 1.docx", part: "Trompeta 1" }]),
		).toThrow("Solo se aceptan archivos PDF");
	});

	it("rejects a file without a part", () => {
		expect(() =>
			parsePartUploads([{ fileName: "Trompeta.pdf", part: "" }]),
		).toThrow("El nombre es obligatorio");
	});

	it("rejects a part with a slash because it would nest folders", () => {
		expect(() =>
			parsePartUploads([{ fileName: "a.pdf", part: "Vientos/Trompeta 1" }]),
		).toThrow("El nombre no puede contener / ni \\");
	});

	it("rejects two files for the same part", () => {
		expect(() =>
			parsePartUploads([
				{ fileName: "a.pdf", part: "Bajo" },
				{ fileName: "b.pdf", part: "Bajo" },
			]),
		).toThrow("Elegiste la misma parte para dos archivos: Bajo");
	});
});

describe("partNameFromKey", () => {
	it("reads the part name from a key inside the song folder", () => {
		expect(
			partNameFromKey("La Bilirrubina", "repertorio/La Bilirrubina/Bajo.pdf"),
		).toBe("Bajo");
	});

	it("ignores keys that are not a PDF directly inside the song folder", () => {
		expect(
			partNameFromKey("La Bilirrubina", "repertorio/La Bilirrubina/notas.txt"),
		).toBeNull();
		expect(
			partNameFromKey(
				"La Bilirrubina",
				"repertorio/La Bilirrubina/viejo/Bajo.pdf",
			),
		).toBeNull();
		expect(
			partNameFromKey("La Bilirrubina", "repertorio/Rebelión/Bajo.pdf"),
		).toBeNull();
	});
});

describe("missingParts", () => {
	it("lists each member part without a PDF once, alphabetically", () => {
		const memberParts = ["Trompeta 2", "Bajo", null, "Trompeta 1", "Bajo"];
		const uploadedParts = ["Trompeta 1"];

		expect(missingParts(memberParts, uploadedParts)).toEqual([
			"Bajo",
			"Trompeta 2",
		]);
	});

	it("is empty when every member part has its PDF", () => {
		expect(missingParts(["Bajo", null], ["Bajo", "Güiro"])).toEqual([]);
	});

	it("matches part names exactly, because the PDF is looked up by its exact name", () => {
		expect(missingParts(["Trompeta 1"], ["trompeta 1"])).toEqual([
			"Trompeta 1",
		]);
	});
});

describe("uploadableParts", () => {
	it("lists member parts and already uploaded parts once, alphabetically", () => {
		expect(
			uploadableParts(
				["Trompeta 1", null, "Bajo", "Trompeta 1"],
				["Güiro", "Bajo"],
			),
		).toEqual(["Bajo", "Güiro", "Trompeta 1"]);
	});
});
