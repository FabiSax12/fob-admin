import { describe, expect, it } from "vitest";
import type { Member } from "#/features/members/members.types";
import { profileSummary } from "#/features/members/profile-summary";

function member(fields: Partial<Member>): Member {
	return {
		email: "ana@gmail.com",
		name: "Ana",
		role: "musician",
		part: "Trompeta 1",
		sectionIds: [],
		...fields,
	};
}

describe("profileSummary", () => {
	it("shows the initials of the first two names and the part with the role", () => {
		expect(profileSummary(member({ name: "ana maría López" }))).toEqual({
			initials: "AM",
			detail: "Trompeta 1 · Músico",
		});
	});

	it("uses one initial for a single name", () => {
		expect(profileSummary(member({ name: "  Beto " })).initials).toBe("B");
	});

	it("shows only the role for a member without a part", () => {
		expect(
			profileSummary(member({ name: "Sole Díaz", role: "sound", part: null })),
		).toEqual({ initials: "SD", detail: "Sonidista" });
	});

	it("labels the director with their part", () => {
		expect(
			profileSummary(member({ role: "director", part: "Saxofón" })).detail,
		).toBe("Saxofón · Director");
	});
});
