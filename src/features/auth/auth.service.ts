import type { MembersService } from "#/features/members/members.service";
import type { Member } from "#/features/members/members.types";
import { DomainError } from "#/shared/errors";
import { SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./session";

export const NOT_A_MEMBER_MESSAGE =
	"Tu cuenta de Google no está registrada en la banda. Pedile al director que te agregue.";
export const UNVERIFIED_EMAIL_MESSAGE =
	"Google no verificó el correo de esa cuenta. Probá con otra cuenta de Google.";

const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

export type AuthService = ReturnType<typeof createAuthService>;

interface AuthServiceDeps {
	members: MembersService;
	secret: string;
	now: () => Date;
}

export function createAuthService({ members, secret, now }: AuthServiceDeps) {
	return {
		/** Turns a Google identity into a session token, only for registered members. */
		async completeLogin(
			googleEmail: string,
			emailVerified: boolean,
		): Promise<string> {
			if (!emailVerified)
				throw new DomainError("forbidden", UNVERIFIED_EMAIL_MESSAGE);

			const member = await members.findByEmail(googleEmail);
			if (!member) throw new DomainError("forbidden", NOT_A_MEMBER_MESSAGE);

			return signSession(
				{ email: member.email, exp: now().getTime() + SESSION_MAX_AGE_MS },
				secret,
			);
		},

		/** Re-reads the member on every call so a removed member loses access immediately. */
		async resolveMember(token: string): Promise<Member | null> {
			const session = verifySession(token, secret, now());
			if (!session) return null;
			return members.findByEmail(session.email);
		},
	};
}
