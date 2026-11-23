export interface EntityRepository<T> {
	get(id: string): Promise<T | null>;
	list(): Promise<T[]>;
	put(entity: T): Promise<void>;
	delete(id: string): Promise<void>;
}
