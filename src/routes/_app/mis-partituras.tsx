import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/PageHeader";
import { ScoreWizard } from "#/features/songs/components/ScoreWizard";
import { getMyScoreProgress } from "#/features/songs/score-collection.functions";

export const Route = createFileRoute("/_app/mis-partituras")({
	loader: () => getMyScoreProgress(),
	component: MyScoresPage,
});

function MyScoresPage() {
	const progress = Route.useLoaderData();

	return (
		<>
			<PageHeader eyebrow="Tu parte" title="Mis partituras" />
			{!progress ? (
				<p className="text-fob-subtle text-sm">
					Tu perfil no tiene una parte, así que no tenés partituras para subir.
				</p>
			) : progress.songs.length === 0 ? (
				<p className="text-fob-subtle text-sm">
					Todavía no hay canciones en el repertorio.
				</p>
			) : (
				<>
					<p className="mb-6 max-w-[42ch] text-fob-subtle text-sm">
						Subí el PDF de tu parte para cada canción, con el nombre que tenga:
						lo guardamos como «{progress.part}.pdf». Si no la tenés, saltala.
					</p>
					<ScoreWizard progress={progress} />
				</>
			)}
		</>
	);
}
