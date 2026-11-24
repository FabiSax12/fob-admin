import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { PartList } from "#/features/songs/components/PartList";
import { PartUploader } from "#/features/songs/components/PartUploader";
import { getSong } from "#/features/songs/songs.functions";

export const Route = createFileRoute("/_app/repertorio/$songId")({
	loader: async ({ params }) => {
		const detail = await getSong({ data: params.songId });
		if (!detail) throw notFound();
		return detail;
	},
	notFoundComponent: () => (
		<p className="text-fob-subtle">No existe esa canción.</p>
	),
	component: SongPage,
});

function SongPage() {
	const { song, parts, missingParts, bandParts, skippedBy } =
		Route.useLoaderData();
	const { member } = Route.useRouteContext();
	const isDirector = member.role === "director";

	return (
		<>
			<Link
				to="/repertorio"
				className="mb-4 inline-flex min-h-11 items-center gap-1 text-fob-subtle text-sm hover:text-fob-text"
			>
				<ChevronLeft aria-hidden className="size-4" />
				Repertorio
			</Link>
			<PageHeader eyebrow="Repertorio" title={song.name} />
			{missingParts && <MissingParts parts={missingParts} />}
			{skippedBy && skippedBy.length > 0 && <SkippedBy skips={skippedBy} />}
			<PartList songId={song.id} parts={parts} canDelete={isDirector} />
			{isDirector && bandParts && (
				<div className="mt-12 border-fob-700 border-t pt-6">
					<PartUploader songId={song.id} bandParts={bandParts} />
				</div>
			)}
		</>
	);
}

function MissingParts({ parts }: { parts: string[] }) {
	if (parts.length === 0) {
		return (
			<p className="mb-6 text-fob-subtle text-sm">
				Están todas las partes de los miembros.
			</p>
		);
	}

	return (
		<p className="mb-6 text-sm">
			<span className="text-fob-amber">Faltan: </span>
			<span className="text-fob-text">{parts.join(", ")}</span>
		</p>
	);
}

function SkippedBy({
	skips,
}: {
	skips: Array<{ memberName: string; part: string }>;
}) {
	return (
		<p className="-mt-4 mb-6 text-sm">
			<span className="text-fob-subtle">No la tienen: </span>
			<span className="text-fob-text">
				{skips
					.map(({ memberName, part }) => `${memberName} (${part})`)
					.join(", ")}
			</span>
		</p>
	);
}
