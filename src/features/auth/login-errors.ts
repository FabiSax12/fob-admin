/**
 * The login page receives only an error code in its URL, never free text, so a crafted
 * link cannot make the page show arbitrary messages. Client-safe: no server imports.
 */
export const LOGIN_ERROR_MESSAGES = {
	not_member:
		"Tu cuenta de Google no está registrada en la banda. Pedile al director que te agregue.",
	unverified:
		"Google no verificó el correo de esa cuenta. Probá con otra cuenta de Google.",
	failed: "No pudimos completar el ingreso con Google. Probá de nuevo.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

function isLoginErrorCode(code: string): code is LoginErrorCode {
	return Object.hasOwn(LOGIN_ERROR_MESSAGES, code);
}

export function loginErrorMessage(code: string | undefined): string | null {
	if (!code || !isLoginErrorCode(code)) return null;
	return LOGIN_ERROR_MESSAGES[code];
}
