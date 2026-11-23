import { useQuery } from "@tanstack/react-query";
import type { Activity } from "#/features/activities/activities.types";
import type { CalendarSyncStatus as Status } from "../calendar-sync.types";
import { getCalendarSync } from "../publishing.functions";

const PENDING_POLL_INTERVAL_MS = 5000;
const RETRY_HINT =
	"Revisá la configuración de Google Calendar y guardá la actividad de nuevo para reintentar.";

const STATUS_LABELS: Record<Status, string> = {
	pending: "Enviando invitaciones…",
	sent: "Invitaciones enviadas",
	failed: "No se pudieron enviar las invitaciones",
};

const STATUS_CLASSES: Record<Status, string> = {
	pending: "text-fob-subtle",
	sent: "text-fob-gold",
	failed: "text-destructive",
};

/** Director view of the Google Calendar invitations, refreshed while they are being sent. */
export function CalendarSyncStatus({ activity }: { activity: Activity }) {
	const { data: calendarSync } = useQuery({
		queryKey: ["calendar-sync", activity.id, activity.updatedAt],
		queryFn: () => getCalendarSync({ data: activity.id }),
		refetchInterval: (query) =>
			query.state.data?.status === "pending" ? PENDING_POLL_INTERVAL_MS : false,
	});

	if (!calendarSync) return null;

	return (
		<div>
			<h3 className="instrument-label mb-2">Calendario</h3>
			<p className={`text-sm ${STATUS_CLASSES[calendarSync.status]}`}>
				{STATUS_LABELS[calendarSync.status]}
			</p>
			{calendarSync.status === "failed" && (
				<div className="mt-1 flex flex-col gap-1 text-sm">
					{calendarSync.error && (
						<p className="break-words text-fob-subtle">{calendarSync.error}</p>
					)}
					<p className="text-fob-subtle">{RETRY_HINT}</p>
				</div>
			)}
		</div>
	);
}
