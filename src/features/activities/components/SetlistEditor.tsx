import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { songMatchesSearch } from "#/features/songs/song-search";
import type { Song } from "#/features/songs/songs.types";
import { MISSING_SONG_NAME } from "../activities.types";
import {
	addToSetlist,
	canMoveDown,
	canMoveUp,
	moveDown,
	moveUp,
	removeAt,
} from "../setlist-order";

const ICON_BUTTON_CLASSES = "size-11 text-fob-subtle hover:text-fob-gold";

interface SetlistEditorProps {
	songs: Song[];
	/** Ordered song ids. */
	setlist: string[];
	onChange: (setlist: string[]) => void;
}

/** Builds the presentation's song order with buttons instead of dragging, so it works with a thumb. */
export function SetlistEditor({
	songs,
	setlist,
	onChange,
}: SetlistEditorProps) {
	const [announcement, setAnnouncement] = useState("");
	const nameById = new Map(songs.map((song) => [song.id, song.name]));
	const nameOf = (songId: string) => nameById.get(songId) ?? MISSING_SONG_NAME;

	function reorder(nextSetlist: string[], songId: string) {
		onChange(nextSetlist);
		setAnnouncement(
			`${nameOf(songId)} ahora va en la posición ${nextSetlist.indexOf(songId) + 1}`,
		);
	}

	function remove(index: number) {
		const songId = setlist[index];
		onChange(removeAt(setlist, index));
		setAnnouncement(`Quitaste ${nameOf(songId)}`);
	}

	function add(songId: string) {
		const nextSetlist = addToSetlist(setlist, songId);
		onChange(nextSetlist);
		setAnnouncement(
			`Agregaste ${nameOf(songId)} en la posición ${nextSetlist.length}`,
		);
	}

	return (
		<fieldset className="flex flex-col gap-4">
			<legend className="instrument-label mb-2">Orden de canciones</legend>
			{setlist.length === 0 ? (
				<p className="text-fob-subtle text-sm">
					Agregá canciones del repertorio en el orden en que se tocan.
				</p>
			) : (
				<ol className="border-fob-700 border-t">
					{setlist.map((songId, index) => (
						<li
							key={songId}
							className="flex items-center gap-2 border-fob-700 border-b py-2"
						>
							<span className="w-8 shrink-0 text-center font-serif text-fob-gold text-xl">
								{index + 1}
							</span>
							<span className="min-w-0 flex-1 truncate">{nameOf(songId)}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className={ICON_BUTTON_CLASSES}
								aria-label={`Subir ${nameOf(songId)}`}
								disabled={!canMoveUp(index)}
								onClick={() => reorder(moveUp(setlist, index), songId)}
							>
								<ArrowUp aria-hidden className="size-5" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className={ICON_BUTTON_CLASSES}
								aria-label={`Bajar ${nameOf(songId)}`}
								disabled={!canMoveDown(setlist, index)}
								onClick={() => reorder(moveDown(setlist, index), songId)}
							>
								<ArrowDown aria-hidden className="size-5" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className={ICON_BUTTON_CLASSES}
								aria-label={`Quitar ${nameOf(songId)}`}
								onClick={() => remove(index)}
							>
								<X aria-hidden className="size-5" />
							</Button>
						</li>
					))}
				</ol>
			)}
			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>
			<SongPicker
				songs={songs.filter((song) => !setlist.includes(song.id))}
				onPick={add}
			/>
		</fieldset>
	);
}

function SongPicker({
	songs,
	onPick,
}: {
	songs: Song[];
	onPick: (songId: string) => void;
}) {
	const [search, setSearch] = useState("");
	const matchingSongs = songs.filter((song) =>
		songMatchesSearch(song.name, search),
	);

	return (
		<div className="flex flex-col gap-2">
			<div className="relative">
				<Label htmlFor="setlist-search" className="sr-only">
					Buscar canción para agregar
				</Label>
				<Search
					aria-hidden
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fob-subtle"
				/>
				<Input
					id="setlist-search"
					type="search"
					placeholder="Buscar canción para agregar"
					autoComplete="off"
					className="h-11 bg-fob-900 pl-9"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
			</div>
			{matchingSongs.length === 0 ? (
				<p className="text-fob-subtle text-sm">
					{songs.length === 0
						? "Ya agregaste todas las canciones del repertorio."
						: "Ninguna canción coincide con la búsqueda."}
				</p>
			) : (
				<ul className="max-h-72 overflow-y-auto rounded-md border border-fob-700">
					{matchingSongs.map((song) => (
						<li
							key={song.id}
							className="border-fob-700 border-b last:border-b-0"
						>
							<button
								type="button"
								className="flex min-h-11 w-full items-center gap-3 px-3 text-left transition-colors hover:bg-fob-amber/10 hover:text-fob-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50"
								onClick={() => onPick(song.id)}
							>
								<Plus aria-hidden className="size-4 shrink-0 text-fob-amber" />
								<span className="min-w-0 flex-1 truncate">{song.name}</span>
								<span className="sr-only">Agregar</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
