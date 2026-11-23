import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { PageHeader } from "#/components/PageHeader";
import {
	getActivity,
	getActivityFormData,
	updateActivity,
} from "#/features/activities/activities.functions";
import { ActivityForm } from "#/features/activities/components/ActivityForm";

export const Route = createFileRoute("/_app/actividades/$activityId/editar")({
	beforeLoad: ({ context }) => {
		if (context.member.role !== "director")
			throw redirect({ to: "/actividades" });
	},
	loader: async ({ params }) => {
		const [detail, formData] = await Promise.all([
			getActivity({ data: params.activityId }),
			getActivityFormData(),
		]);
		if (!detail) throw notFound();
		return { activity: detail.activity, ...formData };
	},
	notFoundComponent: () => (
		<p className="text-fob-subtle">No existe esa actividad.</p>
	),
	component: EditActivityPage,
});

function EditActivityPage() {
	const { activity, members, sections, songs } = Route.useLoaderData();
	const isPublished = activity.status === "published";

	return (
		<>
			<PageHeader eyebrow="Actividades" title="Editar Actividad" />
			{isPublished && (
				<p className="mb-6 max-w-[38ch] text-fob-subtle text-sm">
					Ya está publicada: al guardar, los convocados reciben los cambios en
					su calendario.
				</p>
			)}
			<ActivityForm
				key={activity.id}
				initialActivity={activity}
				members={members}
				sections={sections}
				songs={songs}
				submitLabel="Guardar cambios"
				save={(input) => updateActivity({ data: { id: activity.id, input } })}
			/>
		</>
	);
}
