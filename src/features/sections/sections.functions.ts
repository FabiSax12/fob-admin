import { createServerFn } from "@tanstack/react-start";
import { requireDirector, requireMember } from "#/features/auth/auth.functions";
import { toActionResult } from "#/lib/action-result";
import { container } from "#/server/container";

interface SectionRename {
	id: string;
	name: string;
}

// Inputs pass through untouched: the sections service validates them.
export const listSections = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireMember();
		return container.sections.list();
	},
);

export const createSection = createServerFn({ method: "POST" })
	.validator((name: string) => name)
	.handler(({ data: name }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.sections.create({ name });
		}),
	);

export const renameSection = createServerFn({ method: "POST" })
	.validator((rename: SectionRename) => rename)
	.handler(({ data }) =>
		toActionResult(async () => {
			await requireDirector();
			return container.sections.rename(data.id, { name: data.name });
		}),
	);

export const removeSection = createServerFn({ method: "POST" })
	.validator((id: string) => id)
	.handler(({ data: id }) =>
		toActionResult(async () => {
			await requireDirector();
			await container.sections.remove(id);
			return null;
		}),
	);
