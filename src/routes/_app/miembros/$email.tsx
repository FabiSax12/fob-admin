import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmButton } from "#/components/ConfirmButton";
import { PageHeader } from "#/components/PageHeader";
import { MemberForm } from "#/features/members/components/MemberForm";
import {
	listMembers,
	removeMember,
	updateMember,
} from "#/features/members/members.functions";
import { listSections } from "#/features/sections/sections.functions";

const REMOVE_FAILED_MESSAGE = "No pudimos eliminar al miembro. Probá de nuevo.";

export const Route = createFileRoute("/_app/miembros/$email")({
	loader: async ({ params }) => {
		const [members, sections] = await Promise.all([
			listMembers(),
			listSections(),
		]);
		const member = members.find(
			(candidate) => candidate.email === params.email,
		);
		if (!member) throw notFound();
		return { member, sections };
	},
	notFoundComponent: () => (
		<p className="text-fob-subtle">No existe ese miembro.</p>
	),
	component: EditMemberPage,
});

function EditMemberPage() {
	const { member, sections } = Route.useLoaderData();
	const navigate = useNavigate();
	const [removeError, setRemoveError] = useState<string | null>(null);

	async function remove() {
		setRemoveError(null);
		const result = await removeMember({ data: member.email }).catch(() => ({
			ok: false as const,
			error: REMOVE_FAILED_MESSAGE,
		}));
		if (!result.ok) {
			setRemoveError(result.error);
			return;
		}
		await navigate({ to: "/miembros" });
	}

	return (
		<>
			<PageHeader eyebrow="Miembros" title={member.name} />
			<MemberForm
				key={member.email}
				initialMember={member}
				sections={sections}
				submitLabel="Guardar cambios"
				save={(changes) =>
					updateMember({ data: { email: member.email, input: changes } })
				}
			/>
			<div className="mt-12 border-fob-700 border-t pt-6">
				<ConfirmButton
					label="Eliminar miembro"
					question={`¿Eliminar a ${member.name} de la banda?`}
					onConfirm={remove}
				/>
				{removeError && (
					<p role="alert" className="mt-2 text-destructive text-sm">
						{removeError}
					</p>
				)}
			</div>
		</>
	);
}
