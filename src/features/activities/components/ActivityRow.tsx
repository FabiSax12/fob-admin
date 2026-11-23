import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "#/lib/utils";
import { ACTIVITY_TYPE_LABELS, type Activity } from "../activities.types";
import { formatTimeRange } from "../activity-schedule";
import { DateBlock } from "./DateBlock";
import { DraftChip } from "./StatusChip";

/** One activity in the list: a row under a hairline, date block on the left. Past ones fade to 50%. */
export function ActivityRow({
	activity,
	isPast = false,
}: {
	activity: Activity;
	isPast?: boolean;
}) {
	return (
		<li className={cn("border-fob-700 border-b", isPast && "opacity-50")}>
			<Link
				to="/actividades/$activityId"
				params={{ activityId: activity.id }}
				className="group flex items-start gap-4 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50"
			>
				<DateBlock startsAt={activity.startsAt} isPast={isPast} />
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="instrument-label">
							{ACTIVITY_TYPE_LABELS[activity.type]}
						</p>
						<DraftChip status={activity.status} />
					</div>
					<p className="card-title text-fob-text transition-colors group-hover:text-fob-gold">
						{activity.title}
					</p>
					<p className="text-fob-subtle text-sm">{formatTimeRange(activity)}</p>
					{activity.location && (
						<p className="flex items-center gap-1 text-fob-subtle text-sm">
							<MapPin aria-hidden className="size-4 shrink-0" />
							<span className="truncate">{activity.location}</span>
						</p>
					)}
				</div>
				<ChevronRight
					aria-hidden
					className="mt-2 size-5 shrink-0 text-fob-muted"
				/>
			</Link>
		</li>
	);
}
