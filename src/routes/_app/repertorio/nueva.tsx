import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormField, hintIdOf } from "#/components/FormField";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { createSong } from "#/features/songs/songs.functions";

const NAME_HINT =
	"Este nombre es también el de la carpeta en el repositorio y no se puede cambiar";
const SAVE_FAILED_MESSAGE = "No pudimos crear la canción. Probá de nuevo.";

export const Route = createFileRoute("/_app/repertorio/nueva")({
	beforeLoad: ({ context }) => {
		if (context.member.role !== "director")
			throw redirect({ to: "/repertorio" });
	},
	component: NewSongPage,
});

function NewSongPage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSaving(true);
		try {
			const result = await createSong({ data: name });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			await navigate({
				to: "/repertorio/$songId",
				params: { songId: result.data.id },
			});
		} catch {
			setError(SAVE_FAILED_MESSAGE);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<PageHeader eyebrow="Repertorio" title="Nueva canción" />
			<form onSubmit={submit} className="flex flex-col gap-6" noValidate>
				<FormField id="song-name" label="Nombre" hint={NAME_HINT}>
					<Input
						id="song-name"
						required
						autoComplete="off"
						aria-describedby={hintIdOf("song-name")}
						className="h-11 bg-fob-900"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</FormField>
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
					{isSaving ? "Creando…" : "Crear canción"}
				</Button>
			</form>
		</>
	);
}
