import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { listActivities } from "#/features/activities/activities.functions";
import { splitUpcomingAndPast } from "#/features/activities/activity-schedule";
import { ActivityRow } from "#/features/activities/components/ActivityRow";

export const Route = createFileRoute("/_app/actividades/")({
	loader: () => listActivities(),
	component: ActivitiesPage,
});

function ActivitiesPage() {
	const activities = Route.useLoaderData();
	const { member } = Route.useRouteContext();
	const isDirector = member.role === "director";
	const { upcoming, past } = splitUpcomingAndPast(activities, new Date());

	return (
		<>
			<PageHeader
				eyebrow="La banda"
				title="Actividades"
				actions={
					isDirector && (
						<Button asChild className="h-11">
							<Link to="/actividades/nueva">
								<Plus aria-hidden />
								Nueva actividad
							</Link>
						</Button>
					)
				}
			/>
			{upcoming.length === 0 ? (
				<p className="text-fob-subtle">
					{isDirector
						? "No hay actividades próximas. Creá la siguiente con Nueva actividad."
						: "No tenés actividades próximas."}
				</p>
			) : (
				<ul className="border-fob-700 border-t">
					{upcoming.map((activity) => (
						<ActivityRow key={activity.id} activity={activity} />
					))}
				</ul>
			)}
			{past.length > 0 && (
				<section aria-labelledby="past-activities" className="mt-12">
					<h2 id="past-activities" className="eyebrow mb-2">
						Pasadas
					</h2>
					<ul className="border-fob-700 border-t">
						{past.map((activity) => (
							<ActivityRow key={activity.id} activity={activity} isPast />
						))}
					</ul>
				</section>
			)}
		</>
	);
}
