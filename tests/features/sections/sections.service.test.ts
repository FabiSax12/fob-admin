import { describe, expect, it } from "vitest";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import { createSectionsService } from "#/features/sections/sections.service";
import type { Section } from "#/features/sections/sections.types";
import { createMemoryRepository } from "../../support/memory-repository";

function setup() {
	const memberRepo = createMemoryRepository<Member>((m) => m.email);
	const sectionRepo = createMemoryRepository<Section>((s) => s.id);
	const members = createMembersService(memberRepo);
	return {
		members,
		sectionRepo,
		sections: createSectionsService(sectionRepo, members),
	};
}

describe("sections service", () => {
	it("creates sections the director names", async () => {
		const { sections } = setup();

		const section = await sections.create({ name: " Percusión " });

		expect(section.name).toBe("Percusión");
		expect(section.id).toMatch(/.+/);
		expect(await sections.list()).toEqual([section]);
	});

	it("rejects a duplicate name ignoring case", async () => {
		const { sections, sectionRepo } = setup();
		await sections.create({ name: "Vientos" });

		await expect(sections.create({ name: "vientos" })).rejects.toThrow(
			"Ya existe una sección con ese nombre",
		);
		expect(sectionRepo.items.size).toBe(1);
	});

	it("rejects an empty name", async () => {
		const { sections } = setup();

		await expect(sections.create({ name: "  " })).rejects.toThrow(
			"El nombre es obligatorio",
		);
	});

	it("renames a section", async () => {
		const { sections } = setup();
		const section = await sections.create({ name: "Cantantes" });

		const renamed = await sections.rename(section.id, { name: "Voces" });

		expect(renamed).toEqual({ id: section.id, name: "Voces" });
	});

	it("deletes a section and unassigns its members", async () => {
		const { sections, members, sectionRepo } = setup();
		const section = await sections.create({ name: "Percusión" });
		await members.create({
			email: "a@gmail.com",
			name: "A",
			role: "musician",
			part: "Conga",
			sectionIds: [section.id],
		});

		await sections.remove(section.id);

		expect(sectionRepo.items.size).toBe(0);
		expect((await members.findByEmail("a@gmail.com"))?.sectionIds).toEqual([]);
	});
});
