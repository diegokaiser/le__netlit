import type {
	EpisodeDetail,
	SeasonDetail,
	TmdbEpisodeResponse,
	TmdbSeasonDetailResponse,
} from "../tmdb.types";

function isPositiveSafeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function normalizeText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeImagePath(value: unknown): string | null {
	const path = normalizeText(value);
	return path.length > 0 ? path : null;
}

function normalizeDate(value: unknown): string | undefined {
	const date = normalizeText(value);

	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return undefined;
	}

	const [year, month, day] = date.split("-").map(Number);
	const parsedDate = new Date(Date.UTC(year, month - 1, day, 12));

	if (
		parsedDate.getUTCFullYear() !== year ||
		parsedDate.getUTCMonth() !== month - 1 ||
		parsedDate.getUTCDate() !== day
	) {
		return undefined;
	}

	return date;
}

function normalizeRuntime(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
		return undefined;
	}

	return value;
}

function normalizeVoteAverage(value: unknown): number | undefined {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 10
	) {
		return undefined;
	}

	return value;
}

function normalizeVoteCount(value: unknown): number | undefined {
	if (!isNonNegativeSafeInteger(value)) {
		return undefined;
	}

	return value;
}

function getSeasonFallbackName(seasonNumber: number): string {
	return seasonNumber === 0 ? "Especiales" : `Temporada ${seasonNumber}`;
}

function getEpisodeFallbackName(episodeNumber: number): string {
	return `Episodio ${episodeNumber}`;
}

function mapEpisode(
	episode: TmdbEpisodeResponse,
	requestedSeasonNumber: number,
): EpisodeDetail | null {
	if (
		!isPositiveSafeInteger(episode.id) ||
		!isPositiveSafeInteger(episode.episode_number)
	) {
		return null;
	}

	const episodeNumber = episode.episode_number;
	const normalizedName = normalizeText(episode.name);
	const airDate = normalizeDate(episode.air_date);
	const runtime = normalizeRuntime(episode.runtime);
	const voteAverage = normalizeVoteAverage(episode.vote_average);
	const voteCount = normalizeVoteCount(episode.vote_count);

	return {
		id: episode.id,
		episodeNumber,
		seasonNumber: requestedSeasonNumber,
		name:
			normalizedName.length > 0
				? normalizedName
				: getEpisodeFallbackName(episodeNumber),
		overview: normalizeText(episode.overview),
		stillPath: normalizeImagePath(episode.still_path),
		...(airDate === undefined ? {} : { airDate }),
		...(runtime === undefined ? {} : { runtime }),
		...(voteAverage === undefined ? {} : { voteAverage }),
		...(voteCount === undefined ? {} : { voteCount }),
	};
}

function removeDuplicatedEpisodesById(
	episodes: readonly EpisodeDetail[],
): EpisodeDetail[] {
	const seenEpisodeIds = new Set<number>();

	return episodes.filter((episode) => {
		if (seenEpisodeIds.has(episode.id)) {
			return false;
		}

		seenEpisodeIds.add(episode.id);
		return true;
	});
}

export function mapTmdbSeasonDetail(
	response: TmdbSeasonDetailResponse,
	seriesId: number,
	requestedSeasonNumber: number,
): SeasonDetail {
	if (!isPositiveSafeInteger(seriesId)) {
		throw new RangeError("seriesId must be a positive safe integer");
	}

	if (!isNonNegativeSafeInteger(requestedSeasonNumber)) {
		throw new RangeError("seasonNumber must be a non-negative safe integer");
	}

	if (!isPositiveSafeInteger(response.id)) {
		throw new TypeError("TMDB season response contains an invalid id");
	}

	const normalizedName = normalizeText(response.name);
	const airDate = normalizeDate(response.air_date);
	const voteAverage = normalizeVoteAverage(response.vote_average);

	const episodes = removeDuplicatedEpisodesById(
		(response.episodes ?? [])
			.map((episode) => mapEpisode(episode, requestedSeasonNumber))
			.filter((episode): episode is EpisodeDetail => episode !== null),
	).sort(
		(firstEpisode, secondEpisode) =>
			firstEpisode.episodeNumber - secondEpisode.episodeNumber,
	);

	return {
		id: response.id,
		seriesId,
		seasonNumber: requestedSeasonNumber,
		name:
			normalizedName.length > 0
				? normalizedName
				: getSeasonFallbackName(requestedSeasonNumber),
		overview: normalizeText(response.overview),
		posterPath: normalizeImagePath(response.poster_path),
		episodeCount: episodes.length,
		episodes,
		...(airDate === undefined ? {} : { airDate }),
		...(voteAverage === undefined ? {} : { voteAverage }),
	};
}
