import type { MembersService } from "#/features/members/members.service";
import type { EntityRepository } from "#/shared/entity-repository";
import { DomainError, parseOrThrow } from "#/shared/errors";
import { byName, sameName } from "#/shared/schemas";
import { type Section, sectionInputSchema } from "./sections.types";

export type SectionsService = ReturnType<typeof createSectionsService>;

export function createSectionsService(
	repo: EntityRepository<Section>,
	members: MembersService,
) {
	async function assertUniqueName(name: string, exceptId?: string) {
		const clash = (await repo.list()).some(
			(section) => section.id !== exceptId && sameName(section.name, name),
		);
		if (clash) {
			throw new DomainError("conflict", "Ya existe una sección con ese nombre");
		}
	}

	async function getOrThrow(id: string): Promise<Section> {
		const section = await repo.get(id);
		if (!section) throw new DomainError("not_found", "No existe esa sección");
		return section;
	}

	return {
		async list(): Promise<Section[]> {
			return (await repo.list()).sort(byName);
		},

		async create(input: unknown): Promise<Section> {
			const { name } = parseOrThrow(sectionInputSchema, input);
			await assertUniqueName(name);
			const section = { id: crypto.randomUUID(), name };
			await repo.put(section);
			return section;
		},

		async rename(id: string, input: unknown): Promise<Section> {
			const current = await getOrThrow(id);
			const { name } = parseOrThrow(sectionInputSchema, input);
			await assertUniqueName(name, id);
			const section = { ...current, name };
			await repo.put(section);
			return section;
		},

		async remove(id: string): Promise<void> {
			await getOrThrow(id);
			await members.removeSection(id);
			await repo.delete(id);
		},
	};
}
