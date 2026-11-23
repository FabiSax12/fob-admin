import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Activity } from "#/features/activities/activities.types";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import type { PersonalPdf } from "#/features/publishing/personal-pdf.types";
import { createPublishEffects } from "#/features/publishing/publish-effects";
import { createSongsService } from "#/features/songs/songs.service";
import type { Song } from "#/features/songs/songs.types";
import { createMemoryRepository } from "../../support/memory-repository";

const LETTER_SIZE = [612, 792];
const NOW = new Date("2026-12-01T12:00:00Z");

const director: Member = {
	email: "director@gmail.com",
	name: "Director",
	role: "director",
	part: "Saxofón",
	sectionIds: [],
};
const trumpet: Member = {
	email: "trompeta@gmail.com",
	name: "Trompeta",
	role: "musician",
	part: "Trompeta 1",
	sectionIds: [],
};
const conga: Member = {
	email: "conga@gmail.com",
	name: "Conga",
	role: "musician",
	part: "Conga",
	sectionIds: [],
};
const sound: Member = {
	email: "sonido@gmail.com",
	name: "Sonido",
	role: "sound",
	part: null,
	sectionIds: [],
};

async function fixturePdf(size: [number, number]) {
	const document = await PDFDocument.create();
	document.addPage(size);
	return document.save();
}

async function pageSizes(bytes: Uint8Array | undefined) {
	if (!bytes) throw new Error("PDF was not written");
	const document = await PDFDocument.load(bytes);
	return document.getPages().map((page) => [page.getWidth(), page.getHeight()]);
}

function activityWith(overrides: Partial<Activity>): Activity {
	return {
		id: "act-1",
		type: "presentacion",
		title: "Boda Rodríguez",
		startsAt: "2026-12-12T20:00:00-06:00",
		endsAt: "2026-12-12T23:00:00-06:00",
		location: "",
		notes: "",
		sectionId: null,
		attendees: [director.email, trumpet.email, sound.email],
		setlist: [],
		status: "published",
		calendarEventId: null,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

async function setup() {
	const memberRepo = createMemoryRepository<Member>((m) => m.email);
	for (const member of [director, trumpet, conga, sound])
		await memberRepo.put(member);

	const songs = createSongsService(createMemoryRepository<Song>((s) => s.id));
	const songA = await songs.create({ name: "Abusadora" });
	const songB = await songs.create({ name: "Rebelión" });
	const songC = await songs.create({ name: "Cumbia" });

	const scores = new Map<string, Uint8Array>([
		[`Abusadora/Trompeta 1`, await fixturePdf([100, 100])],
		[`Cumbia/Trompeta 1`, await fixturePdf([300, 300])],
		[`Abusadora/Saxofón`, await fixturePdf([110, 110])],
		[`Rebelión/Saxofón`, await fixturePdf([220, 220])],
		[`Cumbia/Saxofón`, await fixturePdf([330, 330])],
	]);
	const readPart = vi.fn(
		async (songName: string, part: string) =>
			scores.get(`${songName}/${part}`) ?? null,
	);

	const written = new Map<string, Uint8Array>();
	const writePdf = vi.fn(async (key: string, bytes: Uint8Array) => {
		written.set(key, bytes);
	});

	const activityRepo = createMemoryRepository<Activity>((a) => a.id);
	const setCalendarEventId = vi.fn(
		async (id: string, calendarEventId: string | null) => {
			const current = await activityRepo.get(id);
			if (current) await activityRepo.put({ ...current, calendarEventId });
		},
	);
	const sync = vi.fn(async (_activity: Activity) => "event-1");
	const pdfs = createMemoryRepository<PersonalPdf>((pdf) => pdf.id);

	const effects = createPublishEffects({
		activities: { get: activityRepo.get, setCalendarEventId },
		members: createMembersService(memberRepo),
		songs,
		scores: { readPart },
		output: { writePdf },
		pdfs,
		calendar: { sync },
		now: () => NOW,
	});

	async function savePresentation(overrides: Partial<Activity> = {}) {
		const activity = activityWith({
			setlist: [songA.id, songB.id, songC.id],
			...overrides,
		});
		await activityRepo.put(activity);
		return activity;
	}

	return {
		effects,
		pdfs,
		written,
		readPart,
		writePdf,
		sync,
		setCalendarEventId,
		activityRepo,
		savePresentation,
	};
}

function pdfOf(
	pdfs: { items: Map<string, PersonalPdf> },
	email: string,
): PersonalPdf | undefined {
	return pdfs.items.get(`act-1#${email}`);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("markPending", () => {
	it("marks a pending PDF for every attendee with a part, leaving out the sonidista and non-attendees", async () => {
		const { effects, pdfs, savePresentation } = await setup();
		const activity = await savePresentation();

		await effects.markPending(activity);

		expect([...pdfs.items.values()]).toEqual([
			{
				id: `act-1#${director.email}`,
				activityId: "act-1",
				email: director.email,
				part: "Saxofón",
				status: "pending",
				key: null,
				updatedAt: NOW.toISOString(),
				error: null,
			},
			{
				id: `act-1#${trumpet.email}`,
				activityId: "act-1",
				email: trumpet.email,
				part: "Trompeta 1",
				status: "pending",
				key: null,
				updatedAt: NOW.toISOString(),
				error: null,
			},
		]);
	});

	it("marks nothing for activities that are not presentations", async () => {
		const { effects, pdfs } = await setup();

		await effects.markPending(activityWith({ type: "ensayo" }));

		expect(pdfs.items.size).toBe(0);
	});
});

describe("run", () => {
	it("builds each musician's PDF in setlist order with a placeholder page for a missing part", async () => {
		const { effects, written, savePresentation } = await setup();
		await savePresentation();

		await effects.run("act-1");

		expect(
			await pageSizes(written.get("generados/act-1/trompeta@gmail.com.pdf")),
		).toEqual([[100, 100], LETTER_SIZE, [300, 300]]);
		expect(
			await pageSizes(written.get("generados/act-1/director@gmail.com.pdf")),
		).toEqual([
			[110, 110],
			[220, 220],
			[330, 330],
		]);
		expect(written.has("generados/act-1/sonido@gmail.com.pdf")).toBe(false);
		expect(written.has("generados/act-1/conga@gmail.com.pdf")).toBe(false);
	});

	it("marks each PDF ready with the key it was written to", async () => {
		const { effects, pdfs, savePresentation } = await setup();
		await effects.markPending(await savePresentation());

		await effects.run("act-1");

		expect(pdfOf(pdfs, trumpet.email)).toEqual({
			id: `act-1#${trumpet.email}`,
			activityId: "act-1",
			email: trumpet.email,
			part: "Trompeta 1",
			status: "ready",
			key: "generados/act-1/trompeta@gmail.com.pdf",
			updatedAt: NOW.toISOString(),
			error: null,
		});
		expect(pdfOf(pdfs, director.email)?.status).toBe("ready");
	});

	it("reads each part of a song once even when the song repeats", async () => {
		const { effects, readPart, savePresentation } = await setup();
		const first = await savePresentation();
		await savePresentation({ setlist: [first.setlist[0], first.setlist[0]] });

		await effects.run("act-1");

		expect(readPart).toHaveBeenCalledTimes(2);
	});

	it("marks one musician's PDF failed and still builds the others", async () => {
		const { effects, pdfs, writePdf, savePresentation } = await setup();
		await savePresentation();
		writePdf.mockImplementation(async (key: string) => {
			if (key.includes(director.email)) throw new Error("S3 no responde");
		});
		vi.spyOn(console, "error").mockImplementation(() => {});

		await effects.run("act-1");

		expect(pdfOf(pdfs, director.email)).toMatchObject({
			status: "failed",
			key: null,
			error: "S3 no responde",
		});
		expect(pdfOf(pdfs, trumpet.email)?.status).toBe("ready");
	});

	it("stores the calendar event id when the calendar returns a new one", async () => {
		const { effects, activityRepo, savePresentation } = await setup();
		await savePresentation();

		await effects.run("act-1");

		expect((await activityRepo.get("act-1"))?.calendarEventId).toBe("event-1");
	});

	it("leaves the activity untouched when the calendar keeps the same event", async () => {
		const { effects, setCalendarEventId, savePresentation } = await setup();
		await savePresentation({ calendarEventId: "event-1" });

		await effects.run("act-1");

		expect(setCalendarEventId).not.toHaveBeenCalled();
	});

	it("syncs the calendar for activities without a setlist and builds no PDF", async () => {
		const { effects, sync, writePdf, pdfs, activityRepo } = await setup();
		await activityRepo.put(activityWith({ type: "ensayo" }));

		await effects.run("act-1");

		expect(sync).toHaveBeenCalledOnce();
		expect(writePdf).not.toHaveBeenCalled();
		expect(pdfs.items.size).toBe(0);
	});

	it("rethrows a calendar failure only after every PDF is processed", async () => {
		const { effects, sync, pdfs, savePresentation } = await setup();
		await savePresentation();
		const calendarFailure = new Error("Google no responde");
		sync.mockRejectedValue(calendarFailure);
		vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(effects.run("act-1")).rejects.toBe(calendarFailure);

		expect(pdfOf(pdfs, director.email)?.status).toBe("ready");
		expect(pdfOf(pdfs, trumpet.email)?.status).toBe("ready");
	});

	it("does nothing for a draft", async () => {
		const { effects, sync, writePdf, pdfs, savePresentation } = await setup();
		await savePresentation({ status: "draft" });

		await effects.run("act-1");

		expect(sync).not.toHaveBeenCalled();
		expect(writePdf).not.toHaveBeenCalled();
		expect(pdfs.items.size).toBe(0);
	});

	it("does nothing for an activity that no longer exists", async () => {
		const { effects, sync, writePdf } = await setup();

		await effects.run("missing");

		expect(sync).not.toHaveBeenCalled();
		expect(writePdf).not.toHaveBeenCalled();
	});
});
