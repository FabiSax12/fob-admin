import { useQuery } from "@tanstack/react-query";
import type { Activity } from "#/features/activities/activities.types";
import type { PersonalPdfStatus } from "../personal-pdf.types";
import { getPdfStatuses } from "../publishing.functions";

const PENDING_POLL_INTERVAL_MS = 5000;

const PDF_STATUS_LABELS: Record<PersonalPdfStatus, string> = {
	pending: "Generando…",
	ready: "Listo",
	failed: "Falló",
};
const NOT_REQUESTED_LABEL = "Sin generar";

const PDF_STATUS_CLASSES: Record<PersonalPdfStatus, string> = {
	pending: "text-fob-subtle",
	ready: "text-fob-gold",
	failed: "text-destructive",
};

/** Director view of each called musician's PDF, refreshed while any is still being built. */
export function PdfStatusList({ activity }: { activity: Activity }) {
	const { data: rows } = useQuery({
		queryKey: ["pdf-statuses", activity.id, activity.updatedAt],
		queryFn: () => getPdfStatuses({ data: activity.id }),
		refetchInterval: (query) =>
			query.state.data?.some((row) => row.status === "pending")
				? PENDING_POLL_INTERVAL_MS
				: false,
	});

	if (!rows || rows.length === 0) return null;

	return (
		<div>
			<h3 className="instrument-label mb-2">PDF de cada músico</h3>
			<ul className="flex flex-col gap-1 text-sm">
				{rows.map((row) => (
					<li key={row.email} className="flex items-baseline gap-3">
						<span className="min-w-0 flex-1 truncate">
							{row.name}
							<span className="text-fob-subtle"> · {row.part}</span>
						</span>
						<span
							className={
								row.status ? PDF_STATUS_CLASSES[row.status] : "text-fob-subtle"
							}
						>
							{row.status ? PDF_STATUS_LABELS[row.status] : NOT_REQUESTED_LABEL}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
