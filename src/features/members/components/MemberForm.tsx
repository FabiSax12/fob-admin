import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormField, hintIdOf } from "#/components/FormField";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type { Section } from "#/features/sections/sections.types";
import type { ActionResult } from "#/lib/action-result";
import { type Member, ROLE_LABELS, ROLES, type Role } from "../members.types";

const PART_HINT =
	"Tiene que llamarse igual que el PDF en cada carpeta de canción, por ejemplo Trompeta 1";
const SAVE_FAILED_MESSAGE = "No pudimos guardar los cambios. Probá de nuevo.";
const FIELD_CLASSES = "h-11 bg-fob-900";

const EMPTY_MEMBER: Member = {
	email: "",
	name: "",
	role: "musician",
	part: "",
	sectionIds: [],
};

interface MemberFormProps {
	initialMember?: Member;
	sections: Section[];
	submitLabel: string;
	save: (member: Member) => Promise<ActionResult<unknown>>;
}

/** Create and edit form for a member. The email is fixed once the member exists: it is their identity. */
export function MemberForm({
	initialMember,
	sections,
	submitLabel,
	save,
}: MemberFormProps) {
	const navigate = useNavigate();
	const [member, setMember] = useState<Member>(initialMember ?? EMPTY_MEMBER);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const isEditing = initialMember !== undefined;
	const hasPart = member.role !== "sound";

	function change(fields: Partial<Member>) {
		setMember((current) => ({ ...current, ...fields }));
	}

	function toggleSection(sectionId: string, isChecked: boolean) {
		const otherIds = member.sectionIds.filter((id) => id !== sectionId);
		change({ sectionIds: isChecked ? [...otherIds, sectionId] : otherIds });
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSaving(true);
		try {
			const result = await save(member);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			await navigate({ to: "/miembros" });
		} catch {
			setError(SAVE_FAILED_MESSAGE);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<form onSubmit={submit} className="flex flex-col gap-6" noValidate>
			<FormField id="member-email" label="Correo de Google">
				<Input
					id="member-email"
					type="email"
					inputMode="email"
					autoComplete="off"
					autoCapitalize="none"
					required
					readOnly={isEditing}
					className={FIELD_CLASSES}
					value={member.email}
					onChange={(event) => change({ email: event.target.value })}
				/>
			</FormField>

			<FormField id="member-name" label="Nombre">
				<Input
					id="member-name"
					required
					autoComplete="off"
					className={FIELD_CLASSES}
					value={member.name}
					onChange={(event) => change({ name: event.target.value })}
				/>
			</FormField>

			<FormField id="member-role" label="Rol">
				<Select
					value={member.role}
					onValueChange={(role) => change({ role: role as Role })}
				>
					<SelectTrigger id="member-role" className={`w-full ${FIELD_CLASSES}`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ROLES.map((role) => (
							<SelectItem key={role} value={role} className="min-h-11">
								{ROLE_LABELS[role]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			{hasPart && (
				<FormField id="member-part" label="Parte" hint={PART_HINT}>
					<Input
						id="member-part"
						required
						autoComplete="off"
						aria-describedby={hintIdOf("member-part")}
						className={FIELD_CLASSES}
						value={member.part ?? ""}
						onChange={(event) => change({ part: event.target.value })}
					/>
				</FormField>
			)}

			<SectionCheckboxes
				sections={sections}
				selectedIds={member.sectionIds}
				onToggle={toggleSection}
			/>

			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}

			<Button
				type="submit"
				className="h-11 self-start px-8"
				disabled={isSaving}
			>
				{isSaving ? "Guardando…" : submitLabel}
			</Button>
		</form>
	);
}

interface SectionCheckboxesProps {
	sections: Section[];
	selectedIds: string[];
	onToggle: (sectionId: string, isChecked: boolean) => void;
}

function SectionCheckboxes({
	sections,
	selectedIds,
	onToggle,
}: SectionCheckboxesProps) {
	return (
		<fieldset className="flex flex-col gap-1">
			<legend className="instrument-label mb-2">Secciones</legend>
			{sections.length === 0 && (
				<p className="text-fob-subtle text-sm">
					Todavía no hay secciones. Crealas desde Administrar secciones.
				</p>
			)}
			{sections.map((section) => {
				const checkboxId = `section-${section.id}`;
				return (
					<div key={section.id} className="flex min-h-11 items-center gap-3">
						<Checkbox
							id={checkboxId}
							checked={selectedIds.includes(section.id)}
							onCheckedChange={(checked) =>
								onToggle(section.id, checked === true)
							}
						/>
						<Label htmlFor={checkboxId} className="font-normal text-base">
							{section.name}
						</Label>
					</div>
				);
			})}
		</fieldset>
	);
}
