import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server";
import {
	decodeIdToken,
	Google,
	generateCodeVerifier,
	generateState,
} from "arctic";
import { Resource } from "sst";
import { z } from "zod";
import { container } from "#/server/container";
import { DomainError } from "#/shared/errors";
import { createAuthService } from "./auth.service";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session";

const OAUTH_STATE_COOKIE = "fob_oauth_state";
const OAUTH_VERIFIER_COOKIE = "fob_oauth_verifier";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
const GOOGLE_SCOPES = ["openid", "email", "profile"];
const LOGIN_FAILED_MESSAGE =
	"No pudimos completar el ingreso con Google. Probá de nuevo.";

const PRIVATE_COOKIE = {
	httpOnly: true,
	secure: true,
	sameSite: "lax",
	path: "/",
} as const;

const googleClaimsSchema = z.object({
	email: z.string(),
	email_verified: z.boolean().default(false),
});

/** Server-only: wires the auth service to the SST-linked values and the members table. */
export function getAuthService() {
	return createAuthService({
		members: container.members,
		secret: Resource.SessionSecret.value,
		now: () => new Date(),
	});
}

/** The callback URL is pinned to the configured public URL: behind CloudFront the request host is the Lambda origin. */
function createGoogleClient(): Google {
	const redirectUri = new URL(
		GOOGLE_CALLBACK_PATH,
		Resource.PublicUrl.value,
	).toString();
	return new Google(
		Resource.GoogleClientId.value,
		Resource.GoogleClientSecret.value,
		redirectUri,
	);
}

function redirectTo(location: string): Response {
	return new Response(null, { status: 302, headers: { Location: location } });
}

function redirectToLoginWithError(message: string): Response {
	return redirectTo(`/login?${new URLSearchParams({ error: message })}`);
}

export function readSessionToken(): string | undefined {
	return getCookie(SESSION_COOKIE);
}

export function startGoogleLogin(): Response {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	const authorizationUrl = createGoogleClient().createAuthorizationURL(
		state,
		codeVerifier,
		GOOGLE_SCOPES,
	);

	const oauthCookie = {
		...PRIVATE_COOKIE,
		maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
	};
	setCookie(OAUTH_STATE_COOKIE, state, oauthCookie);
	setCookie(OAUTH_VERIFIER_COOKIE, codeVerifier, oauthCookie);
	return redirectTo(authorizationUrl.toString());
}

async function readGoogleIdentity(request: Request) {
	const params = new URL(request.url).searchParams;
	const code = params.get("code");
	const state = params.get("state");
	const storedState = getCookie(OAUTH_STATE_COOKIE);
	const codeVerifier = getCookie(OAUTH_VERIFIER_COOKIE);
	if (!code || !state || !codeVerifier || state !== storedState) return null;

	const tokens = await createGoogleClient().validateAuthorizationCode(
		code,
		codeVerifier,
	);
	return googleClaimsSchema.parse(decodeIdToken(tokens.idToken()));
}

export async function completeGoogleLogin(request: Request): Promise<Response> {
	deleteCookie(OAUTH_STATE_COOKIE, PRIVATE_COOKIE);
	deleteCookie(OAUTH_VERIFIER_COOKIE, PRIVATE_COOKIE);

	try {
		const identity = await readGoogleIdentity(request);
		if (!identity) return redirectToLoginWithError(LOGIN_FAILED_MESSAGE);

		const token = await getAuthService().completeLogin(
			identity.email,
			identity.email_verified,
		);
		setCookie(SESSION_COOKIE, token, {
			...PRIVATE_COOKIE,
			maxAge: SESSION_MAX_AGE_SECONDS,
		});
		return redirectTo("/");
	} catch (error) {
		if (error instanceof DomainError)
			return redirectToLoginWithError(error.message);
		console.error("Google login failed", error);
		return redirectToLoginWithError(LOGIN_FAILED_MESSAGE);
	}
}

export function logout(): Response {
	deleteCookie(SESSION_COOKIE, PRIVATE_COOKIE);
	return redirectTo("/login");
}
