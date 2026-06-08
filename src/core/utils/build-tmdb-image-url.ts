import { env } from "../config/env";

type ImageSize =
	| "w92"
	| "w154"
	| "w185"
	| "w342"
	| "w500"
	| "w780"
	| "original";

export function buildTmdbImageUrl(
	filePath: string | null | undefined,
	size: ImageSize = "w500",
): string {
	if (!filePath) {
		return "/images/media-placeholder.png";
	}

	return `${env.tmdb.imageBaseUrl}/${size}${filePath}`;
}
