import type { EntityRepository } from "#/shared/entity-repository";

export function createMemoryRepository<T>(
	idOf: (entity: T) => string,
): EntityRepository<T> & { items: Map<string, T> } {
	const items = new Map<string, T>();
	return {
		items,
		async get(id) {
			const found = items.get(id);
			return found ? structuredClone(found) : null;
		},
		async list() {
			return [...items.values()].map((item) => structuredClone(item));
		},
		async put(entity) {
			items.set(idOf(entity), structuredClone(entity));
		},
		async delete(id) {
			items.delete(id);
		},
	};
}
