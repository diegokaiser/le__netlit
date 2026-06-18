import type { MediaType } from "./tmdb.types";

export class TmdbMediaNotFoundError extends Error {
	readonly mediaType: MediaType;
	readonly mediaId: number;

	constructor(mediaType: MediaType, mediaId: number) {
		super("The requested media resource was not found.");

		this.name = "TmdbMediaNotFoundError";
		this.mediaType = mediaType;
		this.mediaId = mediaId;
	}
}

export function isTmdbMediaNotFoundError(
	error: unknown,
): error is TmdbMediaNotFoundError {
	return error instanceof TmdbMediaNotFoundError;
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
