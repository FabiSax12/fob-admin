import { describe, expect, it } from "vitest";
import {
	addToSetlist,
	canMoveDown,
	canMoveUp,
	moveDown,
	moveUp,
	removeAt,
} from "#/features/activities/setlist-order";

const SETLIST = ["a", "b", "c"];

describe("moveUp", () => {
	it("swaps a song with the one before it", () => {
		expect(moveUp(SETLIST, 1)).toEqual(["b", "a", "c"]);
		expect(moveUp(SETLIST, 2)).toEqual(["a", "c", "b"]);
	});

	it("leaves the first song where it is", () => {
		expect(canMoveUp(0)).toBe(false);
		expect(moveUp(SETLIST, 0)).toEqual(SETLIST);
	});

	it("does not change the list it receives", () => {
		const setlist = [...SETLIST];
		moveUp(setlist, 1);
		expect(setlist).toEqual(SETLIST);
	});
});

describe("moveDown", () => {
	it("swaps a song with the one after it", () => {
		expect(moveDown(SETLIST, 0)).toEqual(["b", "a", "c"]);
		expect(moveDown(SETLIST, 1)).toEqual(["a", "c", "b"]);
	});

	it("leaves the last song where it is", () => {
		expect(canMoveDown(SETLIST, 2)).toBe(false);
		expect(moveDown(SETLIST, 2)).toEqual(SETLIST);
	});

	it("allows every song but the last to go down", () => {
		expect(canMoveDown(SETLIST, 0)).toBe(true);
		expect(canMoveDown(SETLIST, 1)).toBe(true);
		expect(canMoveUp(1)).toBe(true);
	});
});

describe("removeAt", () => {
	it("removes only the song at that position", () => {
		expect(removeAt(SETLIST, 0)).toEqual(["b", "c"]);
		expect(removeAt(SETLIST, 2)).toEqual(["a", "b"]);
	});

	it("ignores a position outside the list", () => {
		expect(removeAt(SETLIST, 3)).toEqual(SETLIST);
	});
});

describe("addToSetlist", () => {
	it("appends a song at the end", () => {
		expect(addToSetlist(SETLIST, "d")).toEqual(["a", "b", "c", "d"]);
	});

	it("does not add a song that is already in the setlist", () => {
		expect(addToSetlist(SETLIST, "b")).toEqual(SETLIST);
	});
});
