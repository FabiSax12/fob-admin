import {
	ACTIVITY_STATUS_LABELS,
	type ActivityStatus,
} from "../activities.types";

/** Marks drafts for the director; published activities need no chip. */
export function DraftChip({ status }: { status: ActivityStatus }) {
	if (status !== "draft") return null;

	return (
		<span className="inline-flex items-center rounded-[2px] border border-fob-amber/40 bg-fob-amber/10 px-2 py-0.5 text-fob-gold text-xs">
			{ACTIVITY_STATUS_LABELS.draft}
		</span>
	);
}
