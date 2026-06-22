import type { MediaType } from "../../services/tmdb/tmdb.types";

export type ValidMediaRoute = Readonly<{
	mediaType: MediaType;
	mediaId: number;
}>;

export type MediaRouteValidationResult =
	| Readonly<{
			valid: true;
			value: ValidMediaRoute;
	  }>
	| Readonly<{
			valid: false;
	  }>;

export type ValidSeasonRoute = Readonly<{
	seriesId: number;
	seasonNumber: number;
}>;

export type SeasonRouteValidationResult =
	| Readonly<{
			valid: true;
			value: ValidSeasonRoute;
	  }>
	| Readonly<{
			valid: false;
	  }>;

export function isMediaType(value: unknown): value is MediaType {
	return value === "movie" || value === "tv";
}

export function parsePositiveMediaId(value: unknown): number | null {
	if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
		return null;
	}

	const parsedValue = Number(value);

	if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
		return null;
	}

	return parsedValue;
}

export function parseNonNegativeSeasonNumber(value: unknown): number | null {
	if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
		return null;
	}

	const parsedValue = Number(value);

	if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
		return null;
	}

	return parsedValue;
}

export function validateMediaRoute(
	mediaTypeValue: unknown,
	mediaIdValue: unknown,
): MediaRouteValidationResult {
	if (!isMediaType(mediaTypeValue)) {
		return {
			valid: false,
		};
	}

	const mediaId = parsePositiveMediaId(mediaIdValue);

	if (mediaId === null) {
		return {
			valid: false,
		};
	}

	return {
		valid: true,
		value: {
			mediaType: mediaTypeValue,
			mediaId,
		},
	};
}

export function validateSeasonRoute(
	seriesIdValue: unknown,
	seasonNumberValue: unknown,
): SeasonRouteValidationResult {
	const seriesId = parsePositiveMediaId(seriesIdValue);
	const seasonNumber = parseNonNegativeSeasonNumber(seasonNumberValue);

	if (seriesId === null || seasonNumber === null) {
		return {
			valid: false,
		};
	}

	return {
		valid: true,
		value: {
			seriesId,
			seasonNumber,
		},
	};
}

export function buildMediaDetailPath(
	mediaType: MediaType,
	mediaId: number,
): string {
	if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
		throw new RangeError("mediaId must be a positive safe integer.");
	}

	return `/media/${mediaType}/${mediaId}`;
}

export function buildSeasonDetailPath(
	seriesId: number,
	seasonNumber: number,
): string {
	if (!Number.isSafeInteger(seriesId) || seriesId <= 0) {
		throw new RangeError("seriesId must be a positive safe integer.");
	}

	if (!Number.isSafeInteger(seasonNumber) || seasonNumber < 0) {
		throw new RangeError("seasonNumber must be a non-negative safe integer.");
	}

	return `/media/tv/${seriesId}/season/${seasonNumber}`;
}
