import { describe, expect, it } from "vitest";
import {
	NOT_A_MEMBER_MESSAGE,
	UNVERIFIED_EMAIL_MESSAGE,
} from "#/features/auth/auth.service";
import { loginErrorMessage } from "#/features/auth/login-errors";

describe("login error messages", () => {
	it("maps each known error code to its Spanish message", () => {
		expect(loginErrorMessage("not_member")).toBe(
			"Tu cuenta de Google no está registrada en la banda. Pedile al director que te agregue.",
		);
		expect(loginErrorMessage("unverified")).toBe(
			"Google no verificó el correo de esa cuenta. Probá con otra cuenta de Google.",
		);
		expect(loginErrorMessage("failed")).toBe(
			"No pudimos completar el ingreso con Google. Probá de nuevo.",
		);
	});

	it("uses the same wording the auth service uses for its rejections", () => {
		expect(loginErrorMessage("not_member")).toBe(NOT_A_MEMBER_MESSAGE);
		expect(loginErrorMessage("unverified")).toBe(UNVERIFIED_EMAIL_MESSAGE);
	});

	it("shows nothing for an unknown code or arbitrary text", () => {
		expect(
			loginErrorMessage("Tu cuenta fue bloqueada, llamá al 8888-8888"),
		).toBeNull();
		expect(loginErrorMessage("toString")).toBeNull();
		expect(loginErrorMessage("")).toBeNull();
		expect(loginErrorMessage(undefined)).toBeNull();
	});
});
