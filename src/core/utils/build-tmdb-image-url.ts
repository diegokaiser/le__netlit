import { env } from "../config/env";

export type TmdbImageSize =
	| "w92"
	| "w154"
	| "w185"
	| "w342"
	| "w500"
	| "w780"
	| "w1280"
	| "original";

const VALID_TMDB_PATH_PATTERN = /^\/[a-zA-Z0-9._-]+$/;

export function buildTmdbImageUrl(
	filePath: string | null | undefined,
	size: TmdbImageSize = "w500",
): string | null {
	if (!filePath) {
		return null;
	}

	const baseUrl = env.tmdb.imageBaseUrl.trim().replace(/\/+$/, "");

	if (!baseUrl) {
		return null;
	}

	const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;

	if (!VALID_TMDB_PATH_PATTERN.test(normalizedPath)) {
		return null;
	}

	return `${baseUrl}/${size}${normalizedPath}`;
}
