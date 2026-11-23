import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageHeader } from "#/components/PageHeader";
import {
	createActivity,
	getActivityFormData,
} from "#/features/activities/activities.functions";
import { ActivityForm } from "#/features/activities/components/ActivityForm";

export const Route = createFileRoute("/_app/actividades/nueva")({
	beforeLoad: ({ context }) => {
		if (context.member.role !== "director")
			throw redirect({ to: "/actividades" });
	},
	loader: () => getActivityFormData(),
	component: NewActivityPage,
});

function NewActivityPage() {
	const { members, sections, songs } = Route.useLoaderData();

	return (
		<>
			<PageHeader eyebrow="Actividades" title="Nueva Actividad" />
			<ActivityForm
				members={members}
				sections={sections}
				songs={songs}
				submitLabel="Guardar borrador"
				save={(input) => createActivity({ data: input })}
			/>
		</>
	);
}
