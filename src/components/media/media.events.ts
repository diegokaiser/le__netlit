import type { MediaItem } from "../../services/tmdb/tmdb.types";

export const MEDIA_SELECT_EVENT = "media-select";

export interface MediaSelectEventDetail {
	media: MediaItem;
}

export type MediaSelectEvent = CustomEvent<MediaSelectEventDetail>;

export const createMediaSelectEvent = (media: MediaItem): MediaSelectEvent =>
	new CustomEvent<MediaSelectEventDetail>(MEDIA_SELECT_EVENT, {
		detail: {
			media,
		},
		bubbles: true,
		composed: true,
	});

declare global {
	interface GlobalEventHandlersEventMap {
		"media-select": MediaSelectEvent;
	}
}
