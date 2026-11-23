import type { EntityRepository } from "#/shared/entity-repository";
import { DomainError, parseOrThrow } from "#/shared/errors";
import { byName } from "#/shared/schemas";
import { type Member, memberInputSchema } from "./members.types";

export type MembersService = ReturnType<typeof createMembersService>;

export function createMembersService(repo: EntityRepository<Member>) {
	async function getOrThrow(email: string): Promise<Member> {
		const member = await repo.get(email.trim().toLowerCase());
		if (!member) throw new DomainError("not_found", "No existe ese miembro");
		return member;
	}

	return {
		async list(): Promise<Member[]> {
			return (await repo.list()).sort(byName);
		},

		findByEmail(email: string): Promise<Member | null> {
			return repo.get(email.trim().toLowerCase());
		},

		getOrThrow,

		async create(input: unknown): Promise<Member> {
			const member = parseOrThrow(memberInputSchema, input);
			if (await repo.get(member.email)) {
				throw new DomainError(
					"conflict",
					"Ya existe un miembro con ese correo",
				);
			}
			await repo.put(member);
			return member;
		},

		async update(email: string, input: unknown): Promise<Member> {
			const current = await getOrThrow(email);
			const member = parseOrThrow(memberInputSchema, {
				...(input as object),
				email: current.email,
			});
			await repo.put(member);
			return member;
		},

		async remove(email: string): Promise<void> {
			const member = await getOrThrow(email);
			await repo.delete(member.email);
		},

		async removeSection(sectionId: string): Promise<void> {
			const members = await repo.list();
			for (const member of members) {
				if (!member.sectionIds.includes(sectionId)) continue;
				await repo.put({
					...member,
					sectionIds: member.sectionIds.filter((id) => id !== sectionId),
				});
			}
		},
	};
}
