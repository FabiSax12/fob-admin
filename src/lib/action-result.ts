import { DomainError } from "#/shared/errors";

/**
 * Mutations return their domain failures as values so forms can show the Spanish
 * message next to the fields. Anything else (redirects, bugs) still throws.
 */
export type ActionResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string };

export async function toActionResult<T>(
	action: () => Promise<T>,
): Promise<ActionResult<T>> {
	try {
		return { ok: true, data: await action() };
	} catch (error) {
		if (error instanceof DomainError)
			return { ok: false, error: error.message };
		throw error;
	}
}
