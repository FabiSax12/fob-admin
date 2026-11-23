import { beforeEach, describe, expect, it } from "vitest";
import { createAuthService } from "#/features/auth/auth.service";
import { createMembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import { DomainError } from "#/shared/errors";
import { createMemoryRepository } from "../../support/memory-repository";

const SECRET = "test-session-secret";
const NOW = new Date("2025-06-01T12:00:00Z");
const NOT_REGISTERED_MESSAGE =
	"Tu cuenta de Google no está registrada en la banda. Pedile al director que te agregue.";

async function setup() {
	const members = createMembersService(
		createMemoryRepository<Member>((member) => member.email),
	);
	const ana = await members.create({
		email: "ana.mora@gmail.com",
		name: "Ana Mora",
		role: "musician",
		part: "Trompeta 1",
	});
	const auth = createAuthService({ members, secret: SECRET, now: () => NOW });
	return { members, auth, ana };
}

describe("auth service", () => {
	let ctx: Awaited<ReturnType<typeof setup>>;
	beforeEach(async () => {
		ctx = await setup();
	});

	it("rejects a Google account whose email is not verified", async () => {
		const login = ctx.auth.completeLogin("ana.mora@gmail.com", false);

		await expect(login).rejects.toBeInstanceOf(DomainError);
		await expect(login).rejects.toMatchObject({ code: "forbidden" });
	});

	it("rejects a Google account that is not a registered member", async () => {
		const login = ctx.auth.completeLogin("desconocido@gmail.com", true);

		await expect(login).rejects.toBeInstanceOf(DomainError);
		await expect(login).rejects.toMatchObject({
			code: "forbidden",
			message: NOT_REGISTERED_MESSAGE,
		});
	});

	it("logs in a registered member regardless of email casing", async () => {
		const token = await ctx.auth.completeLogin("Ana.Mora@Gmail.COM", true);

		expect(await ctx.auth.resolveMember(token)).toEqual(ctx.ana);
	});

	it("resolves no member once the member was removed", async () => {
		const token = await ctx.auth.completeLogin("ana.mora@gmail.com", true);

		await ctx.members.remove("ana.mora@gmail.com");

		expect(await ctx.auth.resolveMember(token)).toBeNull();
	});
});
