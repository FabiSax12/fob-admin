const COMBINING_ACCENTS = /\p{Diacritic}/gu;

function normalizeForSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(COMBINING_ACCENTS, "")
		.toLowerCase()
		.trim();
}

/** Musicians type song names without accents on their phones, so "rebelion" finds "Rebelión". */
export function songMatchesSearch(songName: string, search: string): boolean {
	return normalizeForSearch(songName).includes(normalizeForSearch(search));
}
