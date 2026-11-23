/** Pure reordering for the setlist editor. Each returns a new list; impossible moves return it unchanged. */

export function canMoveUp(index: number): boolean {
	return index > 0;
}

export function canMoveDown<T>(items: readonly T[], index: number): boolean {
	return index >= 0 && index < items.length - 1;
}

function swap<T>(items: readonly T[], first: number, second: number): T[] {
	const swapped = [...items];
	[swapped[first], swapped[second]] = [swapped[second], swapped[first]];
	return swapped;
}

export function moveUp<T>(items: readonly T[], index: number): T[] {
	if (!canMoveUp(index) || index >= items.length) return [...items];
	return swap(items, index - 1, index);
}

export function moveDown<T>(items: readonly T[], index: number): T[] {
	if (!canMoveDown(items, index)) return [...items];
	return swap(items, index, index + 1);
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
	return items.filter((_, position) => position !== index);
}

export function addToSetlist<T>(items: readonly T[], item: T): T[] {
	if (items.includes(item)) return [...items];
	return [...items, item];
}
