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

export class TmdbSeasonNotFoundError extends Error {
	readonly seriesId: number;
	readonly seasonNumber: number;

	constructor(seriesId: number, seasonNumber: number) {
		super("The requested season resource was not found.");

		this.name = "TmdbSeasonNotFoundError";
		this.seriesId = seriesId;
		this.seasonNumber = seasonNumber;
	}
}

export function isTmdbMediaNotFoundError(
	error: unknown,
): error is TmdbMediaNotFoundError {
	return error instanceof TmdbMediaNotFoundError;
}

export function isTmdbSeasonNotFoundError(
	error: unknown,
): error is TmdbSeasonNotFoundError {
	return error instanceof TmdbSeasonNotFoundError;
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
