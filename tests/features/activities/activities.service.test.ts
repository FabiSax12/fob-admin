import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createActivitiesService,
	defaultAttendees,
} from "#/features/activities/activities.service";
import type { Activity } from "#/features/activities/activities.types";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import { createSongsService } from "#/features/songs/songs.service";
import type { Song } from "#/features/songs/songs.types";
import { createMemoryRepository } from "../../support/memory-repository";

const director: Member = {
	email: "director@gmail.com",
	name: "Director",
	role: "director",
	part: "Saxofón",
	sectionIds: ["vientos"],
};
const trumpet: Member = {
	email: "trompeta@gmail.com",
	name: "Trompeta",
	role: "musician",
	part: "Trompeta 1",
	sectionIds: ["vientos"],
};
const conga: Member = {
	email: "conga@gmail.com",
	name: "Conga",
	role: "musician",
	part: "Conga",
	sectionIds: ["perc"],
};
const sound: Member = {
	email: "sonido@gmail.com",
	name: "Sonido",
	role: "sound",
	part: null,
	sectionIds: [],
};

async function setup() {
	const memberRepo = createMemoryRepository<Member>((m) => m.email);
	for (const m of [director, trumpet, conga, sound]) await memberRepo.put(m);
	const songRepo = createMemoryRepository<Song>((s) => s.id);
	const songs = createSongsService(songRepo);
	const a = await songs.create({ name: "Abusadora" });
	const b = await songs.create({ name: "Rebelión" });
	const repo = createMemoryRepository<Activity>((x) => x.id);
	const onPublished = vi.fn(async (_activity: Activity) => {});
	const service = createActivitiesService({
		repo,
		members: createMembersService(memberRepo),
		songs,
		onPublished,
	});
	return { repo, service, onPublished, songIds: [a.id, b.id] };
}

const presentation = {
	type: "presentacion",
	title: "Boda Rodríguez",
	startsAt: "2026-12-12T20:00:00-06:00",
	endsAt: "2026-12-13T00:00:00-06:00",
	location: "Hotel Tilajari",
	attendees: [director.email, trumpet.email],
};

describe("defaultAttendees", () => {
	const all = [director, trumpet, conga, sound];

	it("invites every musician, including the director, but not the sonidista", () => {
		expect(defaultAttendees("ensayo", all, null)).toEqual([
			director.email,
			trumpet.email,
			conga.email,
		]);
		expect(defaultAttendees("presentacion", all, null)).toEqual([
			director.email,
			trumpet.email,
			conga.email,
		]);
	});

	it("prefills a seccional with the members of that section", () => {
		expect(defaultAttendees("seccional", all, "vientos")).toEqual([
			director.email,
			trumpet.email,
		]);
	});
});

describe("activities service", () => {
	let ctx: Awaited<ReturnType<typeof setup>>;
	beforeEach(async () => {
		ctx = await setup();
	});

	it("creates a presentation as a draft with its ordered setlist", async () => {
		const setlist = [ctx.songIds[1], ctx.songIds[0]];

		const activity = await ctx.service.create({ ...presentation, setlist });

		expect(activity.status).toBe("draft");
		expect(activity.setlist).toEqual(setlist);
		expect(activity.attendees).toEqual([director.email, trumpet.email]);
	});

	it("includes the sonidista only when the director marks him", async () => {
		const activity = await ctx.service.create({
			...presentation,
			attendees: [director.email, sound.email],
			setlist: [],
		});

		expect(activity.attendees).toContain(sound.email);
	});

	it("rejects attendees who are not members", async () => {
		await expect(
			ctx.service.create({
				...presentation,
				attendees: ["extra@gmail.com"],
				setlist: [],
			}),
		).rejects.toThrow("extra@gmail.com no es miembro de la banda");
		expect(ctx.repo.items.size).toBe(0);
	});

	it("rejects a setlist song that is not in the repertoire", async () => {
		await expect(
			ctx.service.create({ ...presentation, setlist: ["nope"] }),
		).rejects.toThrow("Una de las canciones no está en el repertorio");
		expect(ctx.repo.items.size).toBe(0);
	});

	it("only accepts a setlist for presentations", async () => {
		await expect(
			ctx.service.create({
				...presentation,
				type: "ensayo",
				title: "Ensayo General",
				setlist: [ctx.songIds[0]],
			}),
		).rejects.toThrow("Solo las presentaciones tienen orden de canciones");
	});

	it("requires the section of a seccional", async () => {
		await expect(
			ctx.service.create({
				...presentation,
				type: "seccional",
				title: "Seccional",
				setlist: [],
			}),
		).rejects.toThrow("Elegí la sección del seccional");
	});

	it("rejects an end before the start", async () => {
		await expect(
			ctx.service.create({
				...presentation,
				endsAt: "2026-12-12T19:00:00-06:00",
				setlist: [],
			}),
		).rejects.toThrow("La hora de fin tiene que ser después del inicio");
	});

	it("hides drafts from musicians and shows them to the director", async () => {
		await ctx.service.create({ ...presentation, setlist: [ctx.songIds[0]] });

		expect(await ctx.service.listFor(trumpet)).toEqual([]);
		expect(await ctx.service.listFor(director)).toHaveLength(1);
	});

	it("publishes: attendees see it, others do not, and the effects run once", async () => {
		const draft = await ctx.service.create({
			...presentation,
			setlist: [ctx.songIds[0]],
		});

		const published = await ctx.service.publish(draft.id);

		expect(published.status).toBe("published");
		expect(ctx.onPublished).toHaveBeenCalledTimes(1);
		expect(ctx.onPublished).toHaveBeenCalledWith(published);
		expect((await ctx.service.listFor(trumpet)).map((a) => a.id)).toEqual([
			draft.id,
		]);
		expect(await ctx.service.listFor(conga)).toEqual([]);
		await expect(ctx.service.getFor(conga, draft.id)).rejects.toThrow(
			"No existe esa actividad",
		);
	});

	it("refuses to publish a presentation without songs", async () => {
		const draft = await ctx.service.create({ ...presentation, setlist: [] });

		await expect(ctx.service.publish(draft.id)).rejects.toThrow(
			"Agregá al menos una canción antes de publicar la presentación",
		);
		expect((await ctx.repo.get(draft.id))?.status).toBe("draft");
		expect(ctx.onPublished).not.toHaveBeenCalled();
	});

	it("re-runs the publish effects when a published activity is edited", async () => {
		const draft = await ctx.service.create({
			...presentation,
			setlist: [ctx.songIds[0]],
		});
		await ctx.service.publish(draft.id);

		const updated = await ctx.service.update(draft.id, {
			...presentation,
			setlist: [ctx.songIds[1], ctx.songIds[0]],
		});

		expect(updated.status).toBe("published");
		expect(updated.setlist).toEqual([ctx.songIds[1], ctx.songIds[0]]);
		expect(ctx.onPublished).toHaveBeenCalledTimes(2);
	});

	it("lists activities by start date", async () => {
		await ctx.service.create({
			...presentation,
			title: "Después",
			startsAt: "2026-12-20T20:00:00-06:00",
			endsAt: "2026-12-20T23:00:00-06:00",
			setlist: [],
		});
		await ctx.service.create({ ...presentation, title: "Antes", setlist: [] });

		expect((await ctx.service.listFor(director)).map((a) => a.title)).toEqual([
			"Antes",
			"Después",
		]);
	});
});
