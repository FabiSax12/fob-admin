import { describe, expect, it } from "vitest";
import type { Activity } from "#/features/activities/activities.types";
import type { Member } from "#/features/members/members.types";
import {
	attachmentDisposition,
	canDownload,
	pdfStatusRows,
	personalPdfFileName,
	personalPdfKey,
} from "#/features/publishing/personal-pdf";
import type { PersonalPdf } from "#/features/publishing/personal-pdf.types";

const trumpet: Member = {
	email: "trompeta@gmail.com",
	name: "Ana",
	role: "musician",
	part: "Trompeta 1",
	sectionIds: [],
};
const sound: Member = {
	email: "sonido@gmail.com",
	name: "Beto",
	role: "sound",
	part: null,
	sectionIds: [],
};
const conga: Member = {
	email: "conga@gmail.com",
	name: "Carla",
	role: "musician",
	part: "Conga",
	sectionIds: [],
};

function presentation(overrides: Partial<Activity> = {}): Activity {
	return {
		id: "act-1",
		type: "presentacion",
		title: "Boda",
		startsAt: "2026-12-12T20:00:00-06:00",
		endsAt: "2026-12-12T23:00:00-06:00",
		location: "",
		notes: "",
		sectionId: null,
		attendees: [trumpet.email, sound.email],
		setlist: ["song-a"],
		status: "published",
		calendarEventId: null,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("canDownload", () => {
	it("lets an attendee with a part download the PDF of a published presentation", () => {
		expect(canDownload(presentation(), trumpet)).toBe(true);
	});

	it("refuses a draft presentation", () => {
		expect(canDownload(presentation({ status: "draft" }), trumpet)).toBe(false);
	});

	it("refuses activities that are not presentations", () => {
		expect(
			canDownload(presentation({ type: "ensayo", setlist: [] }), trumpet),
		).toBe(false);
	});

	it("refuses members who were not called", () => {
		expect(canDownload(presentation(), conga)).toBe(false);
	});

	it("refuses the sonidista, who has no part", () => {
		expect(canDownload(presentation(), sound)).toBe(false);
	});
});

describe("personal PDF naming", () => {
	it("stores the generated PDF under generados/<activity>/<email>.pdf", () => {
		expect(personalPdfKey("act-1", "ana@gmail.com")).toBe(
			"generados/act-1/ana@gmail.com.pdf",
		);
	});

	it("downloads as an attachment named after the activity and the part, accents included", () => {
		const fileName = personalPdfFileName("Boda (Tilarán)", "Trompeta 1");

		expect(fileName).toBe("Boda (Tilarán) - Trompeta 1.pdf");
		expect(attachmentDisposition(fileName)).toBe(
			"attachment; filename*=UTF-8''Boda%20%28Tilar%C3%A1n%29%20-%20Trompeta%201.pdf",
		);
	});
});

describe("pdfStatusRows", () => {
	it("lists every attendee with a part and the status of their PDF", () => {
		const activity = presentation({
			attendees: [trumpet.email, sound.email, conga.email],
		});
		const pdfs: PersonalPdf[] = [
			{
				id: `act-1#${trumpet.email}`,
				activityId: "act-1",
				email: trumpet.email,
				part: "Trompeta 1",
				status: "ready",
				key: personalPdfKey("act-1", trumpet.email),
				updatedAt: "2026-01-01T00:00:00Z",
				error: null,
			},
		];

		expect(pdfStatusRows(activity, [trumpet, sound, conga], pdfs)).toEqual([
			{
				email: trumpet.email,
				name: "Ana",
				part: "Trompeta 1",
				status: "ready",
			},
			{ email: conga.email, name: "Carla", part: "Conga", status: null },
		]);
	});
});
