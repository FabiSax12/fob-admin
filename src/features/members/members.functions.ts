import { createServerFn } from "@tanstack/react-start";
import { requireDirector } from "#/features/auth/auth.functions";
import { toActionResult } from "#/lib/action-result";
import { container } from "#/server/container";
import type { MemberInput } from "./members.types";

interface MemberUpdate {
	email: string;
	input: MemberInput;
}

// Inputs pass through untouched: the members service validates them.
export const listMembers = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireDirector();
		return container.members.list();
	},
);

export const createMember = createServerFn({ method: "POST" })
	.validator((input: MemberInput) => input)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.members.create(data);
		}),
	);

export const updateMember = createServerFn({ method: "POST" })
	.validator((update: MemberUpdate) => update)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.members.update(data.email, data.input);
		}),
	);

export const removeMember = createServerFn({ method: "POST" })
	.validator((email: string) => email)
	.handler(({ data: email }) =>
		toActionResult(async () => {
			await requireDirector();
			await container.members.remove(email);
			return null;
		}),
	);
