import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ConfirmButton } from "#/components/ConfirmButton";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	createSection,
	listSections,
	removeSection,
	renameSection,
} from "#/features/sections/sections.functions";
import type { Section } from "#/features/sections/sections.types";
import type { ActionResult } from "#/lib/action-result";

const ACTION_FAILED_MESSAGE = "No pudimos guardar los cambios. Probá de nuevo.";
const FIELD_CLASSES = "h-11 bg-fob-900";

export const Route = createFileRoute("/_app/miembros/secciones")({
	loader: () => listSections(),
	component: SectionsPage,
});

/** Runs a section mutation, reloads the list on success and returns the message to show on failure. */
function useSectionAction() {
	const router = useRouter();

	return async function run(
		action: () => Promise<ActionResult<unknown>>,
	): Promise<string | null> {
		try {
			const result = await action();
			if (!result.ok) return result.error;
			await router.invalidate();
			return null;
		} catch {
			return ACTION_FAILED_MESSAGE;
		}
	};
}

function SectionsPage() {
	const sections = Route.useLoaderData();

	return (
		<>
			<PageHeader eyebrow="Miembros" title="Secciones" />
			<p className="mb-8 max-w-[38ch] text-fob-subtle">
				Al crear un seccional, los convocados se llenan con los miembros de esa
				sección.
			</p>
			<NewSectionForm />
			{sections.length === 0 ? (
				<p className="mt-8 text-fob-subtle">Todavía no hay secciones.</p>
			) : (
				<ul className="mt-8 border-fob-700 border-t">
					{sections.map((section) => (
						<SectionRow key={section.id} section={section} />
					))}
				</ul>
			)}
		</>
	);
}

function NewSectionForm() {
	const runAction = useSectionAction();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		const failure = await runAction(() => createSection({ data: name }));
		setIsSaving(false);
		setError(failure);
		if (!failure) setName("");
	}

	return (
		<form onSubmit={submit} className="flex flex-col gap-2">
			<Label htmlFor="new-section" className="instrument-label font-normal">
				Nueva sección
			</Label>
			<div className="flex gap-2">
				<Input
					id="new-section"
					placeholder="Por ejemplo, Vientos"
					autoComplete="off"
					className={FIELD_CLASSES}
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
				<Button type="submit" className="h-11" disabled={isSaving}>
					Agregar
				</Button>
			</div>
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</form>
	);
}

function SectionRow({ section }: { section: Section }) {
	const runAction = useSectionAction();
	const [name, setName] = useState(section.name);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const inputId = `section-name-${section.id}`;
	const isRenamed = name.trim() !== section.name;

	async function rename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setError(
			await runAction(() => renameSection({ data: { id: section.id, name } })),
		);
		setIsSaving(false);
	}

	async function remove() {
		setError(await runAction(() => removeSection({ data: section.id })));
	}

	return (
		<li className="flex flex-col gap-2 border-fob-700 border-b py-5">
			<form onSubmit={rename} className="flex gap-2">
				<Label htmlFor={inputId} className="sr-only">
					Nombre de la sección
				</Label>
				<Input
					id={inputId}
					autoComplete="off"
					className={`font-serif text-lg ${FIELD_CLASSES}`}
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
				{isRenamed && (
					<Button type="submit" className="h-11" disabled={isSaving}>
						Guardar
					</Button>
				)}
			</form>
			<ConfirmButton
				label="Eliminar sección"
				question={`¿Eliminar ${section.name}? Sus miembros quedan sin esa sección.`}
				onConfirm={remove}
			/>
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</li>
	);
}
