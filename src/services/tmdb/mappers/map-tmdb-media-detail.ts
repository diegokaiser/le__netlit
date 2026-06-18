import type {
	TmdbMovieDetailsResponse,
	TmdbSeriesDetailsResponse,
} from "../tmdb-detail-api.types";
import type {
	MediaCastMember,
	MediaDetail,
	MediaGenre,
	MediaSeasonSummary,
} from "../tmdb.types";

const MAX_CAST_MEMBERS = 10;

function normalizeRequiredText(
	value: string | null | undefined,
	fallback: string,
): string {
	const normalizedValue = value?.trim();
	return normalizedValue ? normalizedValue : fallback;
}

function normalizeOptionalText(
	value: string | null | undefined,
): string | null {
	const normalizedValue = value?.trim();
	return normalizedValue ? normalizedValue : null;
}

function normalizePath(value: string | null | undefined): string | null {
	return normalizeOptionalText(value);
}

function normalizeNonNegativeNumber(value: number | null | undefined): number {
	return Number.isFinite(value) && (value ?? 0) >= 0 ? Number(value) : 0;
}

function normalizePositiveInteger(
	value: number | null | undefined,
): number | null {
	return Number.isSafeInteger(value) && (value ?? 0) > 0 ? Number(value) : null;
}

function mapGenres(
	genres: TmdbMovieDetailsResponse["genres"],
): readonly MediaGenre[] {
	if (!Array.isArray(genres)) {
		return [];
	}

	return genres
		.filter(
			(genre): genre is Readonly<{ id: number; name: string }> =>
				Number.isSafeInteger(genre.id) &&
				(genre.id ?? 0) > 0 &&
				typeof genre.name === "string" &&
				genre.name.trim().length > 0,
		)
		.map((genre) => ({
			id: genre.id,
			name: genre.name.trim(),
		}));
}

function mapCast(
	credits:
		| TmdbMovieDetailsResponse["credits"]
		| TmdbSeriesDetailsResponse["credits"],
): readonly MediaCastMember[] {
	const cast = credits?.cast;

	if (!Array.isArray(cast)) {
		return [];
	}

	return [...cast]
		.filter(
			(
				member,
			): member is typeof member &
				Readonly<{
					id: number;
					name: string;
				}> =>
				Number.isSafeInteger(member.id) &&
				(member.id ?? 0) > 0 &&
				typeof member.name === "string" &&
				member.name.trim().length > 0,
		)
		.sort((firstMember, secondMember) => {
			const firstOrder = Number.isFinite(firstMember.order)
				? Number(firstMember.order)
				: Number.MAX_SAFE_INTEGER;

			const secondOrder = Number.isFinite(secondMember.order)
				? Number(secondMember.order)
				: Number.MAX_SAFE_INTEGER;

			return firstOrder - secondOrder;
		})
		.slice(0, MAX_CAST_MEMBERS)
		.map((member) => ({
			id: member.id,
			name: member.name.trim(),
			character: normalizeOptionalText(member.character),
			profilePath: normalizePath(member.profile_path),
		}));
}

function mapSeasons(
	seasons: TmdbSeriesDetailsResponse["seasons"],
): readonly MediaSeasonSummary[] {
	if (!Array.isArray(seasons)) {
		return [];
	}

	return seasons
		.filter(
			(
				season,
			): season is typeof season &
				Readonly<{
					id: number;
					season_number: number;
				}> =>
				Number.isSafeInteger(season.id) &&
				(season.id ?? 0) > 0 &&
				Number.isSafeInteger(season.season_number) &&
				(season.season_number ?? 0) > 0,
		)
		.map((season) => ({
			id: season.id,
			seasonNumber: season.season_number,
			name: normalizeRequiredText(
				season.name,
				`Temporada ${season.season_number}`,
			),
			overview: normalizeRequiredText(season.overview, ""),
			posterPath: normalizePath(season.poster_path),
			episodeCount: normalizePositiveInteger(season.episode_count) ?? 0,
			airDate: normalizeOptionalText(season.air_date),
		}))
		.sort(
			(firstSeason, secondSeason) =>
				firstSeason.seasonNumber - secondSeason.seasonNumber,
		);
}

export function mapTmdbMovieDetail(
	response: TmdbMovieDetailsResponse,
): MediaDetail {
	const id = normalizePositiveInteger(response.id);

	if (id === null) {
		throw new TypeError("TMDB movie detail contains an invalid id.");
	}

	return {
		id,
		mediaType: "movie",
		title: normalizeRequiredText(response.title, "Película sin título"),
		originalTitle: normalizeOptionalText(response.original_title),
		overview: normalizeRequiredText(response.overview, ""),
		posterPath: normalizePath(response.poster_path),
		backdropPath: normalizePath(response.backdrop_path),
		genres: mapGenres(response.genres),
		voteAverage: normalizeNonNegativeNumber(response.vote_average),
		voteCount: normalizeNonNegativeNumber(response.vote_count),
		releaseDate: normalizeOptionalText(response.release_date),
		status: normalizeOptionalText(response.status),
		tagline: normalizeOptionalText(response.tagline),
		originalLanguage: normalizeOptionalText(response.original_language),

		runtime: normalizePositiveInteger(response.runtime),

		numberOfSeasons: null,
		numberOfEpisodes: null,
		seasons: [],

		cast: mapCast(response.credits),
	};
}

export function mapTmdbSeriesDetail(
	response: TmdbSeriesDetailsResponse,
): MediaDetail {
	const id = normalizePositiveInteger(response.id);

	if (id === null) {
		throw new TypeError("TMDB series detail contains an invalid id.");
	}

	return {
		id,
		mediaType: "tv",
		title: normalizeRequiredText(response.name, "Serie sin título"),
		originalTitle: normalizeOptionalText(response.original_name),
		overview: normalizeRequiredText(response.overview, ""),
		posterPath: normalizePath(response.poster_path),
		backdropPath: normalizePath(response.backdrop_path),
		genres: mapGenres(response.genres),
		voteAverage: normalizeNonNegativeNumber(response.vote_average),
		voteCount: normalizeNonNegativeNumber(response.vote_count),
		releaseDate: normalizeOptionalText(response.first_air_date),
		status: normalizeOptionalText(response.status),
		tagline: normalizeOptionalText(response.tagline),
		originalLanguage: normalizeOptionalText(response.original_language),

		runtime: null,

		numberOfSeasons: normalizePositiveInteger(response.number_of_seasons),
		numberOfEpisodes: normalizePositiveInteger(response.number_of_episodes),
		seasons: mapSeasons(response.seasons),

		cast: mapCast(response.credits),
	};
}
