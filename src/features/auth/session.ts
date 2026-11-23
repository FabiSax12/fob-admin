import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { SessionPayload } from "./auth.types";

export const SESSION_COOKIE = "fob_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const sessionPayloadSchema = z.object({
	email: z.string().min(1),
	exp: z.number(),
});

function signatureOf(encodedPayload: string, secret: string): string {
	return createHmac("sha256", secret)
		.update(encodedPayload)
		.digest("base64url");
}

function isSameSignature(actual: string, expected: string): boolean {
	const actualBytes = Buffer.from(actual);
	const expectedBytes = Buffer.from(expected);
	if (actualBytes.length !== expectedBytes.length) return false;
	return timingSafeEqual(actualBytes, expectedBytes);
}

function decodePayload(encodedPayload: string): SessionPayload | null {
	try {
		const json = Buffer.from(encodedPayload, "base64url").toString("utf8");
		const result = sessionPayloadSchema.safeParse(JSON.parse(json));
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

export function signSession(payload: SessionPayload, secret: string): string {
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
		"base64url",
	);
	return `${encodedPayload}.${signatureOf(encodedPayload, secret)}`;
}

/** Returns the payload of a genuine, unexpired token; null for anything else. */
export function verifySession(
	token: string,
	secret: string,
	now: Date,
): SessionPayload | null {
	const parts = token.split(".");
	if (parts.length !== 2) return null;

	const [encodedPayload, signature] = parts;
	if (!isSameSignature(signature, signatureOf(encodedPayload, secret)))
		return null;

	const payload = decodePayload(encodedPayload);
	if (!payload) return null;
	if (payload.exp <= now.getTime()) return null;

	return payload;
}
