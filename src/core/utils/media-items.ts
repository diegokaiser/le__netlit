import type { MediaItem } from "../../services/tmdb/tmdb.types";

export function getMediaKey(media: MediaItem): string {
	return `${media.mediaType}-${media.id}`;
}

export function mergeUniqueMediaItems(
	currentItems: readonly MediaItem[],
	newItems: readonly MediaItem[],
): MediaItem[] {
	const knownKeys = new Set(currentItems.map(getMediaKey));

	const uniqueNewItems = newItems.filter((item) => {
		const key = getMediaKey(item);

		if (knownKeys.has(key)) {
			return false;
		}

		knownKeys.add(key);

		return true;
	});

	return [...currentItems, ...uniqueNewItems];
}
