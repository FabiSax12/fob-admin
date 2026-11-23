import { describe, expect, it } from "vitest";
import { songMatchesSearch } from "#/features/songs/song-search";

describe("songMatchesSearch", () => {
	it("matches any part of the name ignoring case and accents", () => {
		expect(songMatchesSearch("Rebelión", "rebelion")).toBe(true);
		expect(songMatchesSearch("La Bilirrubina", "BILI")).toBe(true);
	});

	it("matches every song when the search is blank", () => {
		expect(songMatchesSearch("Abusadora", "   ")).toBe(true);
	});

	it("does not match a song without the searched text", () => {
		expect(songMatchesSearch("Abusadora", "cumbia")).toBe(false);
	});
});
