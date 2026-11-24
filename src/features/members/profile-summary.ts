import { type Member, ROLE_LABELS } from "./members.types";

export interface ProfileSummary {
	/** Up to two letters, from the first two names. */
	initials: string;
	/** "Trompeta 1 · Músico", or just the role for a member without a part. */
	detail: string;
}

export function profileSummary({
	name,
	role,
	part,
}: Pick<Member, "name" | "role" | "part">): ProfileSummary {
	const initials = name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word.charAt(0).toLocaleUpperCase("es"))
		.join("");
	const roleLabel = ROLE_LABELS[role];
	return { initials, detail: part ? `${part} · ${roleLabel}` : roleLabel };
}
