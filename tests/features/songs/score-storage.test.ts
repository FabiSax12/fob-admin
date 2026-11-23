import { describe, expect, it } from "vitest";
import {
	missingParts,
	partNameFromFileName,
	partNameFromKey,
} from "#/features/songs/score-storage";

describe("partNameFromFileName", () => {
	it("takes the part name from a PDF file name", () => {
		expect(partNameFromFileName("Trompeta 1.pdf")).toBe("Trompeta 1");
	});

	it("accepts the PDF extension in any case", () => {
		expect(partNameFromFileName("Bajo.PDF")).toBe("Bajo");
	});

	it("trims spaces around the file name and the part name", () => {
		expect(partNameFromFileName("  Trompeta 2 .pdf ")).toBe("Trompeta 2");
	});

	it("rejects a file that is not a PDF", () => {
		expect(() => partNameFromFileName("Trompeta 1.docx")).toThrow(
			"Solo se aceptan archivos PDF",
		);
	});

	it("rejects a file name with a slash because it would nest folders", () => {
		expect(() => partNameFromFileName("Vientos/Trompeta 1.pdf")).toThrow(
			"El nombre no puede contener / ni \\",
		);
	});

	it("rejects a file name with a backslash", () => {
		expect(() => partNameFromFileName("Vientos\\Trompeta 1.pdf")).toThrow(
			"El nombre no puede contener / ni \\",
		);
	});

	it("rejects a PDF without a name", () => {
		expect(() => partNameFromFileName(".pdf")).toThrow(
			"El nombre es obligatorio",
		);
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
