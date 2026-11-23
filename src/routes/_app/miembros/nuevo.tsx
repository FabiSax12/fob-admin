import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/PageHeader";
import { MemberForm } from "#/features/members/components/MemberForm";
import { createMember } from "#/features/members/members.functions";
import { listSections } from "#/features/sections/sections.functions";

export const Route = createFileRoute("/_app/miembros/nuevo")({
	loader: () => listSections(),
	component: NewMemberPage,
});

function NewMemberPage() {
	const sections = Route.useLoaderData();

	return (
		<>
			<PageHeader eyebrow="Miembros" title="Nuevo Miembro" />
			<MemberForm
				sections={sections}
				submitLabel="Agregar miembro"
				save={(member) => createMember({ data: member })}
			/>
		</>
	);
}
