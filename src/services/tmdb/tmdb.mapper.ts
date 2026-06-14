import type {
	MediaItem,
	TmdbMovieResult,
	TmdbTrendingResult,
	TmdbTvResult,
} from "./tmdb.types";

const normalizeText = (value: string | undefined): string =>
	value?.trim() ?? "";

const normalizeDate = (value: string | undefined): string | undefined => {
	const normalizedValue = value?.trim();

	return normalizedValue ? normalizedValue : undefined;
};

const normalizeVoteAverage = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(10, value));
};

const normalizeGenreIds = (
	genreIds: number[] | undefined,
): readonly number[] => {
	if (!Array.isArray(genreIds)) {
		return [];
	}

	return genreIds.filter(
		(genreId): genreId is number =>
			typeof genreId === "number" && Number.isInteger(genreId),
	);
};

export const mapTmdbMovie = (movie: TmdbMovieResult): MediaItem => ({
	id: movie.id,
	mediaType: "movie",
	title:
		normalizeText(movie.title) ||
		normalizeText(movie.original_title) ||
		"Película sin título",
	overview: normalizeText(movie.overview),
	posterPath: movie.poster_path ?? null,
	backdropPath: movie.backdrop_path ?? null,
	voteAverage: normalizeVoteAverage(movie.vote_average),
	releaseDate: normalizeDate(movie.release_date),
	genreIds: normalizeGenreIds(movie.genre_ids),
});

export const mapTmdbTv = (series: TmdbTvResult): MediaItem => ({
	id: series.id,
	mediaType: "tv",
	title:
		normalizeText(series.name) ||
		normalizeText(series.original_name) ||
		"Serie sin título",
	overview: normalizeText(series.overview),
	posterPath: series.poster_path ?? null,
	backdropPath: series.backdrop_path ?? null,
	voteAverage: normalizeVoteAverage(series.vote_average),
	releaseDate: normalizeDate(series.first_air_date),
	genreIds: normalizeGenreIds(series.genre_ids),
});

export const mapTmdbTrendingItem = (
	item: TmdbTrendingResult,
): MediaItem | null => {
	if (item.media_type === "movie") {
		return mapTmdbMovie(item);
	}

	if (item.media_type === "tv") {
		return mapTmdbTv(item);
	}

	return null;
};
