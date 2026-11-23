import { beforeEach, describe, expect, it } from "vitest";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import { DomainError } from "#/shared/errors";
import { createMemoryRepository } from "../../support/memory-repository";

function setup() {
	const repo = createMemoryRepository<Member>((member) => member.email);
	return { repo, service: createMembersService(repo) };
}

describe("members service", () => {
	let ctx: ReturnType<typeof setup>;
	beforeEach(() => {
		ctx = setup();
	});

	it("stores the Google email normalized to lowercase", async () => {
		const member = await ctx.service.create({
			email: "  Ana.Mora@Gmail.com ",
			name: "Ana Mora",
			role: "musician",
			part: "Trompeta 1",
		});

		expect(member).toEqual({
			email: "ana.mora@gmail.com",
			name: "Ana Mora",
			role: "musician",
			part: "Trompeta 1",
			sectionIds: [],
		});
		expect(await ctx.service.findByEmail("ANA.MORA@gmail.com")).toEqual(member);
	});

	it("requires a part for the director and for musicians", async () => {
		for (const role of ["director", "musician"] as const) {
			await expect(
				ctx.service.create({ email: `${role}@gmail.com`, name: "X", role }),
			).rejects.toThrow("Asigná la parte que toca (por ejemplo, Trompeta 1)");
		}
		expect(ctx.repo.items.size).toBe(0);
	});

	it("stores the sonidista without a part", async () => {
		const member = await ctx.service.create({
			email: "sonido@gmail.com",
			name: "Luis",
			role: "sound",
			part: "Bajo",
		});

		expect(member.part).toBeNull();
	});

	it("rejects a part name that cannot be a file name", async () => {
		await expect(
			ctx.service.create({
				email: "a@gmail.com",
				name: "A",
				role: "musician",
				part: "Trompeta 1/2",
			}),
		).rejects.toThrow("El nombre no puede contener / ni \\");
		expect(ctx.repo.items.size).toBe(0);
	});

	it("rejects a duplicate email and keeps the original member", async () => {
		const input = {
			email: "a@gmail.com",
			name: "A",
			role: "musician",
			part: "Bajo",
		};
		await ctx.service.create(input);

		const error = await ctx.service
			.create({ ...input, name: "Otro", email: "A@gmail.com" })
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(DomainError);
		expect((error as DomainError).code).toBe("conflict");
		expect((error as DomainError).message).toBe(
			"Ya existe un miembro con ese correo",
		);
		expect((await ctx.service.findByEmail("a@gmail.com"))?.name).toBe("A");
	});

	it("rejects an invalid email", async () => {
		await expect(
			ctx.service.create({
				email: "no-es-correo",
				name: "A",
				role: "musician",
				part: "Bajo",
			}),
		).rejects.toThrow("Correo inválido");
	});

	it("updates a member but never its email", async () => {
		await ctx.service.create({
			email: "a@gmail.com",
			name: "A",
			role: "musician",
			part: "Bajo",
		});

		const updated = await ctx.service.update("a@gmail.com", {
			email: "otro@gmail.com",
			name: "A B",
			role: "director",
			part: "Saxofón",
			sectionIds: ["s1"],
		});

		expect(updated).toEqual({
			email: "a@gmail.com",
			name: "A B",
			role: "director",
			part: "Saxofón",
			sectionIds: ["s1"],
		});
		expect(ctx.repo.items.has("otro@gmail.com")).toBe(false);
	});

	it("fails to update a member that does not exist", async () => {
		await expect(
			ctx.service.update("nadie@gmail.com", {
				name: "X",
				role: "sound",
			}),
		).rejects.toThrow("No existe ese miembro");
	});

	it("lists members sorted by name", async () => {
		for (const name of ["Zoe", "ana", "Bruno"]) {
			await ctx.service.create({
				email: `${name}@gmail.com`,
				name,
				role: "sound",
			});
		}

		expect((await ctx.service.list()).map((m) => m.name)).toEqual([
			"ana",
			"Bruno",
			"Zoe",
		]);
	});

	it("removes a section from every member", async () => {
		await ctx.service.create({
			email: "a@gmail.com",
			name: "A",
			role: "musician",
			part: "Conga",
			sectionIds: ["perc", "vientos"],
		});

		await ctx.service.removeSection("perc");

		expect((await ctx.service.findByEmail("a@gmail.com"))?.sectionIds).toEqual([
			"vientos",
		]);
	});
});
