import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { songMatchesSearch } from "#/features/songs/song-search";
import { listSongs } from "#/features/songs/songs.functions";
import type { Song } from "#/features/songs/songs.types";

export const Route = createFileRoute("/_app/repertorio/")({
	loader: () => listSongs(),
	component: RepertoirePage,
});

function RepertoirePage() {
	const songs = Route.useLoaderData();
	const { member } = Route.useRouteContext();
	const [search, setSearch] = useState("");
	const visibleSongs = songs.filter((song) =>
		songMatchesSearch(song.name, search),
	);

	return (
		<>
			<PageHeader
				eyebrow="La banda"
				title="Repertorio"
				actions={
					member.role === "director" && (
						<Button asChild className="h-11">
							<Link to="/repertorio/nueva">
								<Plus aria-hidden />
								Nueva canción
							</Link>
						</Button>
					)
				}
			/>
			{songs.length === 0 ? (
				<p className="text-fob-subtle">Todavía no hay canciones.</p>
			) : (
				<>
					<SongSearch value={search} onChange={setSearch} />
					<SongList songs={visibleSongs} />
				</>
			)}
		</>
	);
}

function SongSearch({
	value,
	onChange,
}: {
	value: string;
	onChange: (search: string) => void;
}) {
	return (
		<div className="relative mb-6">
			<Label htmlFor="song-search" className="sr-only">
				Buscar canción
			</Label>
			<Search
				aria-hidden
				className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fob-subtle"
			/>
			<Input
				id="song-search"
				type="search"
				placeholder="Buscar canción"
				autoComplete="off"
				className="h-11 bg-fob-900 pl-9"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

function SongList({ songs }: { songs: Song[] }) {
	if (songs.length === 0) {
		return (
			<p className="text-fob-subtle">
				Ninguna canción coincide con esa búsqueda.
			</p>
		);
	}

	return (
		<ul className="border-fob-700 border-t">
			{songs.map((song) => (
				<li key={song.id} className="border-fob-700 border-b">
					<Link
						to="/repertorio/$songId"
						params={{ songId: song.id }}
						className="group flex items-center gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50"
					>
						<p className="card-title min-w-0 flex-1 truncate text-fob-text transition-colors group-hover:text-fob-gold">
							{song.name}
						</p>
						<ChevronRight aria-hidden className="size-5 text-fob-muted" />
					</Link>
				</li>
			))}
		</ul>
	);
}
