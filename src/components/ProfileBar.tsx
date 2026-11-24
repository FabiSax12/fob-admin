import type { Member } from "#/features/members/members.types";
import { profileSummary } from "#/features/members/profile-summary";

/** Who is signed in: initials, name, and their part and role. */
export function ProfileBar({ member }: { member: Member }) {
	const { initials, detail } = profileSummary(member);

	return (
		<div className="mb-8 flex items-center gap-3">
			<span
				aria-hidden
				className="flex size-10 shrink-0 items-center justify-center rounded-full border border-fob-gold/40 bg-fob-800 font-semibold text-fob-gold text-sm"
			>
				{initials}
			</span>
			<div className="min-w-0 leading-tight">
				<p className="truncate font-medium text-fob-text">{member.name}</p>
				<p className="truncate text-fob-subtle text-xs">{detail}</p>
			</div>
		</div>
	);
}
