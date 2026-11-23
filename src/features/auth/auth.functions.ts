import { redirect } from "@tanstack/react-router";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import type { Member } from "#/features/members/members.types";
import { DomainError } from "#/shared/errors";
import { getAuthService, readSessionToken } from "./auth.server";

const DIRECTOR_ONLY_MESSAGE = "Solo el director puede hacer esto.";

const findCurrentMember = createServerOnlyFn(
	async (): Promise<Member | null> => {
		const token = readSessionToken();
		if (!token) return null;
		return getAuthService().resolveMember(token);
	},
);

export const getCurrentMember = createServerFn({ method: "GET" }).handler(() =>
	findCurrentMember(),
);

/** For server functions: the signed-in member, or a redirect to /login. */
export const requireMember = createServerOnlyFn(async (): Promise<Member> => {
	const member = await findCurrentMember();
	if (!member) throw redirect({ to: "/login" });
	return member;
});

/** For server functions: the signed-in director, or a forbidden error. */
export const requireDirector = createServerOnlyFn(async (): Promise<Member> => {
	const member = await requireMember();
	if (member.role !== "director")
		throw new DomainError("forbidden", DIRECTOR_ONLY_MESSAGE);
	return member;
});
