import { cn } from "#/lib/utils";
import { dateBlockOf } from "../activity-schedule";

/** The gold day numeral over the month and year, as in the FOB EventCard. */
export function DateBlock({
	startsAt,
	isPast = false,
}: {
	startsAt: string;
	isPast?: boolean;
}) {
	const { day, month, year } = dateBlockOf(startsAt);

	return (
		<div className="flex w-14 shrink-0 flex-col items-center text-center">
			<span className={cn("date-numeral", isPast && "line-through")}>
				{day}
			</span>
			<span className="eyebrow">{month}</span>
			<span className="text-fob-muted text-xs">{year}</span>
		</div>
	);
}
