import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import {
	getActivity,
	publishActivity,
} from "#/features/activities/activities.functions";
import {
	ACTIVITY_STATUS_LABELS,
	ACTIVITY_TYPE_LABELS,
	type Activity,
	type Attendee,
	type SetlistEntry,
} from "#/features/activities/activities.types";
import {
	formatLongDate,
	formatTimeRange,
} from "#/features/activities/activity-schedule";
import { PersonalPdfSlot } from "#/features/activities/components/PersonalPdfSlot";
import { PublishButton } from "#/features/activities/components/PublishButton";
import { DraftChip } from "#/features/activities/components/StatusChip";
import { PdfStatusList } from "#/features/publishing/components/PdfStatusList";

const PUBLISH_FAILED_MESSAGE =
	"No pudimos publicar la actividad. Probá de nuevo.";

export const Route = createFileRoute("/_app/actividades/$activityId/")({
	loader: async ({ params }) => {
		const detail = await getActivity({ data: params.activityId });
		if (!detail) throw notFound();
		return detail;
	},
	notFoundComponent: () => (
		<p className="text-fob-subtle">No existe esa actividad.</p>
	),
	component: ActivityPage,
});

function ActivityPage() {
	const { activity, setlist, attendees } = Route.useLoaderData();

	return (
		<>
			<PageHeader
				eyebrow={ACTIVITY_TYPE_LABELS[activity.type]}
				title={activity.title}
			/>
			<ActivitySummary activity={activity} />
			<PersonalPdfSlot activity={activity} />
			{activity.type === "presentacion" && <Setlist entries={setlist} />}
			{attendees && <DirectorPanel activity={activity} attendees={attendees} />}
		</>
	);
}

function ActivitySummary({ activity }: { activity: Activity }) {
	return (
		<dl className="flex flex-col gap-3">
			<SummaryLine icon={<CalendarDays aria-hidden />} label="Fecha">
				<span className="first-letter:uppercase">
					{formatLongDate(activity.startsAt)}
				</span>
			</SummaryLine>
			<SummaryLine icon={<Clock aria-hidden />} label="Hora">
				{formatTimeRange(activity)}
			</SummaryLine>
			{activity.location && (
				<SummaryLine icon={<MapPin aria-hidden />} label="Lugar">
					{activity.location}
				</SummaryLine>
			)}
			{activity.notes && (
				<div className="mt-3">
					<dt className="instrument-label">Notas</dt>
					<dd className="max-w-[46rem] whitespace-pre-line text-fob-text">
						{activity.notes}
					</dd>
				</div>
			)}
		</dl>
	);
}

function SummaryLine({
	icon,
	label,
	children,
}: {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-fob-amber">
			{icon}
			<dt className="sr-only">{label}</dt>
			<dd>{children}</dd>
		</div>
	);
}

function Setlist({ entries }: { entries: SetlistEntry[] }) {
	return (
		<section aria-labelledby="setlist-title" className="mt-12">
			<h2 id="setlist-title" className="card-title mb-4 text-fob-text">
				Orden de canciones
			</h2>
			{entries.length === 0 ? (
				<p className="text-fob-subtle">Todavía no tiene canciones.</p>
			) : (
				<ol className="border-fob-700 border-t">
					{entries.map((entry, index) => (
						<li
							key={entry.songId}
							className="flex items-center gap-4 border-fob-700 border-b py-3"
						>
							<span className="w-8 shrink-0 text-center font-serif text-fob-gold text-xl">
								{index + 1}
							</span>
							<span className="min-w-0 flex-1">{entry.songName}</span>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}

function DirectorPanel({
	activity,
	attendees,
}: {
	activity: Activity;
	attendees: Attendee[];
}) {
	const router = useRouter();
	const [publishError, setPublishError] = useState<string | null>(null);
	const isDraft = activity.status === "draft";
	const hasPersonalPdfs = !isDraft && activity.type === "presentacion";

	async function publish() {
		setPublishError(null);
		const result = await publishActivity({ data: activity.id }).catch(() => ({
			ok: false as const,
			error: PUBLISH_FAILED_MESSAGE,
		}));
		if (!result.ok) {
			setPublishError(result.error);
			return;
		}
		await router.invalidate();
	}

	return (
		<section
			aria-labelledby="director-panel-title"
			className="mt-12 flex flex-col gap-6 border-fob-700 border-t pt-6"
		>
			<div className="flex flex-wrap items-center gap-3">
				<h2 id="director-panel-title" className="instrument-label">
					Estado
				</h2>
				{isDraft ? (
					<DraftChip status={activity.status} />
				) : (
					<span className="text-fob-text text-sm">
						{ACTIVITY_STATUS_LABELS[activity.status]}
					</span>
				)}
			</div>

			<div>
				<h3 className="instrument-label mb-2">
					Convocados · {attendees.length}
				</h3>
				{attendees.length === 0 ? (
					<p className="text-fob-subtle text-sm">Nadie convocado todavía.</p>
				) : (
					<ul className="flex flex-col gap-1">
						{attendees.map((attendee) => (
							<li key={attendee.email}>{attendee.name}</li>
						))}
					</ul>
				)}
			</div>

			{hasPersonalPdfs && <PdfStatusList activity={activity} />}

			<div className="flex flex-col gap-3">
				<Button asChild variant="outline" className="h-11 self-start px-6">
					<Link
						to="/actividades/$activityId/editar"
						params={{ activityId: activity.id }}
					>
						<Pencil aria-hidden />
						Editar
					</Link>
				</Button>
				{isDraft && <PublishButton onConfirm={publish} />}
				{publishError && (
					<p role="alert" className="text-destructive text-sm">
						{publishError}
					</p>
				)}
			</div>
		</section>
	);
}
