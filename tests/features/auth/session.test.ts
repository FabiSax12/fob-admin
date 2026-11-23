import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "#/features/auth/session";

const SECRET = "test-session-secret";
const NOW = new Date("2025-06-01T12:00:00Z");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PAYLOAD = {
	email: "ana.mora@gmail.com",
	exp: NOW.getTime() + ONE_DAY_MS,
};

function base64url(text: string): string {
	return Buffer.from(text).toString("base64url");
}

describe("session token", () => {
	it("verifies a token it signed and returns its payload", () => {
		const token = signSession(PAYLOAD, SECRET);

		expect(verifySession(token, SECRET, NOW)).toEqual(PAYLOAD);
	});

	it("rejects a token whose payload was changed", () => {
		const [, signature] = signSession(PAYLOAD, SECRET).split(".");
		const forgedPayload = base64url(
			JSON.stringify({ ...PAYLOAD, email: "intruso@gmail.com" }),
		);

		expect(
			verifySession(`${forgedPayload}.${signature}`, SECRET, NOW),
		).toBeNull();
	});

	it("rejects a token whose signature was changed", () => {
		const token = signSession(PAYLOAD, SECRET);
		const lastChar = token.at(-1);
		const tampered = `${token.slice(0, -1)}${lastChar === "A" ? "B" : "A"}`;

		expect(verifySession(tampered, SECRET, NOW)).toBeNull();
		expect(verifySession(token, "another-secret", NOW)).toBeNull();
	});

	it("rejects a token after it expires", () => {
		const token = signSession(PAYLOAD, SECRET);

		expect(verifySession(token, SECRET, new Date(PAYLOAD.exp))).toBeNull();
		expect(verifySession(token, SECRET, new Date(PAYLOAD.exp + 1))).toBeNull();
	});

	it("rejects malformed tokens", () => {
		const signedNonJson = signSession(PAYLOAD, SECRET).split(".")[1];
		const malformed = [
			"",
			"garbage",
			"a.b.c",
			".",
			`${base64url("not json")}.${signedNonJson}`,
			`${base64url(JSON.stringify({ email: 1, exp: "x" }))}.${signedNonJson}`,
		];

		for (const token of malformed) {
			expect(verifySession(token, SECRET, NOW)).toBeNull();
		}
	});

	it("rejects validly signed payloads with an invalid shape", () => {
		const forge = (payload: string, secret = SECRET) => {
			const encoded = Buffer.from(payload).toString("base64url");
			const signature = createHmac("sha256", secret)
				.update(encoded)
				.digest("base64url");
			return `${encoded}.${signature}`;
		};
		for (const payload of [
			'{"email":"a@b.c","exp":null}',
			'{"email":"a@b.c"}',
			'{"email":"","exp":9999999999999}',
			"[]",
			"null",
		]) {
			expect(verifySession(forge(payload), SECRET, NOW)).toBeNull();
		}
		expect(
			verifySession(
				forge('{"email":"a@b.c","exp":9999999999999}', "other-secret"),
				SECRET,
				NOW,
			),
		).toBeNull();
	});
});
