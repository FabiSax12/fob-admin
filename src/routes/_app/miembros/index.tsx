import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { listMembers } from "#/features/members/members.functions";
import { type Member, ROLE_LABELS } from "#/features/members/members.types";
import { listSections } from "#/features/sections/sections.functions";
import type { Section } from "#/features/sections/sections.types";

export const Route = createFileRoute("/_app/miembros/")({
	loader: async () => {
		const [members, sections] = await Promise.all([
			listMembers(),
			listSections(),
		]);
		return { members, sections };
	},
	component: MembersPage,
});

function MembersPage() {
	const { members, sections } = Route.useLoaderData();
	const sectionNameById = new Map(
		sections.map((section) => [section.id, section.name]),
	);

	return (
		<>
			<PageHeader
				eyebrow="La banda"
				title="Miembros"
				actions={
					<Button asChild className="h-11">
						<Link to="/miembros/nuevo">
							<Plus aria-hidden />
							Nuevo miembro
						</Link>
					</Button>
				}
			/>
			<Link
				to="/miembros/secciones"
				className="mb-6 inline-flex min-h-11 items-center gap-1 text-fob-gold text-sm underline-offset-4 hover:underline"
			>
				Administrar secciones
				<ChevronRight aria-hidden className="size-4" />
			</Link>
			{members.length === 0 ? (
				<p className="text-fob-subtle">Todavía no hay miembros.</p>
			) : (
				<ul className="border-fob-700 border-t">
					{members.map((member) => (
						<MemberRow
							key={member.email}
							member={member}
							sectionNames={sectionNamesOf(member, sectionNameById)}
						/>
					))}
				</ul>
			)}
		</>
	);
}

function sectionNamesOf(
	member: Member,
	sectionNameById: Map<Section["id"], Section["name"]>,
): string[] {
	return member.sectionIds.flatMap((id) => sectionNameById.get(id) ?? []);
}

function MemberRow({
	member,
	sectionNames,
}: {
	member: Member;
	sectionNames: string[];
}) {
	return (
		<li className="border-fob-700 border-b">
			<Link
				to="/miembros/$email"
				params={{ email: member.email }}
				className="group flex items-center gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50"
			>
				<div className="min-w-0 flex-1">
					<p className="card-title truncate text-fob-text transition-colors group-hover:text-fob-gold">
						{member.name}
					</p>
					{member.part && <p className="instrument-label">{member.part}</p>}
					<p className="text-fob-subtle text-sm">
						{ROLE_LABELS[member.role]}
						{sectionNames.length > 0 && ` · ${sectionNames.join(", ")}`}
					</p>
				</div>
				<ChevronRight aria-hidden className="size-5 text-fob-muted" />
			</Link>
		</li>
	);
}
