import type { ZodType } from "zod";

export type DomainErrorCode =
	| "invalid"
	| "conflict"
	| "not_found"
	| "forbidden";

export class DomainError extends Error {
	constructor(
		readonly code: DomainErrorCode,
		message: string,
	) {
		super(message);
		this.name = "DomainError";
	}
}

export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (result.success) return result.data;
	throw new DomainError(
		"invalid",
		result.error.issues[0]?.message ?? "Datos inválidos",
	);
}
