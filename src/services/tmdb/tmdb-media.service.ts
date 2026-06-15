import { tmdbFetch } from "./tmdb.client";
import {
	mapTmdbMovie,
	mapTmdbPage,
	mapTmdbTrendingItem,
	mapTmdbTv,
} from "./tmdb.mapper";
import type {
	MediaItem,
	MediaPage,
	MediaSection,
	MediaSectionId,
	MediaType,
	TmdbGenreListResponse,
	TmdbListResponse,
	TmdbMovieResult,
	TmdbTrendingResult,
	TmdbTvResult,
	WelcomeContent,
} from "./tmdb.types";

const TMDB_LANGUAGE = "es-ES";
const TMDB_GENRE_LANGUAGE = "en-US";

const TMDB_PATHS = {
	trending: "/trending/all/day",
	popularMovies: "/movie/popular",
	popularSeries: "/tv/popular",
	movieGenres: "/genre/movie/list",
	tvGenres: "/genre/tv/list",
	discoverMovies: "/discover/movie",
	discoverSeries: "/discover/tv",
} as const;

const SECTION_TITLES: Readonly<Record<MediaSectionId, string>> = {
	trending: "Tendencias",
	"popular-movies": "Películas populares",
	"popular-series": "Series populares",
	documentaries: "Documentales",
};

type SectionRequest = {
	id: MediaSectionId;
	load: () => Promise<readonly MediaItem[]>;
};

export type GetMediaByGenreParams = Readonly<{
	mediaType: MediaType;
	genreNames: readonly string[];
	page?: number;
	signal?: AbortSignal;
}>;

export class TmdbRequestError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);

		this.name = "TmdbRequestError";
		this.status = status;
	}
}

export class TmdbMediaService {
	private readonly genreCatalogCache = new Map<
		MediaType,
		ReadonlyMap<string, number>
	>();

	async getTrending(signal?: AbortSignal): Promise<readonly MediaItem[]> {
		const response = await tmdbFetch<TmdbListResponse<TmdbTrendingResult>>(
			TMDB_PATHS.trending,
			{
				language: TMDB_LANGUAGE,
			},
			{
				signal,
			},
		);

		return response.results
			.map(mapTmdbTrendingItem)
			.filter((item): item is MediaItem => item !== null);
	}

	async getMoviesPage(page = 1, signal?: AbortSignal): Promise<MediaPage> {
		const response = await tmdbFetch<TmdbListResponse<TmdbMovieResult>>(
			TMDB_PATHS.popularMovies,
			{
				language: TMDB_LANGUAGE,
				page,
			},
			{
				signal,
			},
		);

		return mapTmdbPage(response, mapTmdbMovie);
	}

	async getSeriesPage(page = 1, signal?: AbortSignal): Promise<MediaPage> {
		const response = await tmdbFetch<TmdbListResponse<TmdbTvResult>>(
			TMDB_PATHS.popularSeries,
			{
				language: TMDB_LANGUAGE,
				page,
			},
			{
				signal,
			},
		);

		return mapTmdbPage(response, mapTmdbTv);
	}

	async getByGenre({
		mediaType,
		genreNames,
		page = 1,
		signal,
	}: GetMediaByGenreParams): Promise<MediaPage> {
		const genreIds = await this.resolveGenreIds(mediaType, genreNames, signal);

		const firstGenreId = genreIds.at(0);

		const withGenres =
			genreIds.length === 1 && firstGenreId !== undefined
				? firstGenreId
				: genreIds.join(",");

		if (mediaType === "movie") {
			const response = await tmdbFetch<TmdbListResponse<TmdbMovieResult>>(
				TMDB_PATHS.discoverMovies,
				{
					language: TMDB_LANGUAGE,
					page,
					sort_by: "popularity.desc",
					with_genres: withGenres,
					include_adult: false,
					include_video: false,
				},
				{
					signal,
				},
			);

			return mapTmdbPage(response, mapTmdbMovie);
		}

		const response = await tmdbFetch<TmdbListResponse<TmdbTvResult>>(
			TMDB_PATHS.discoverSeries,
			{
				language: TMDB_LANGUAGE,
				page,
				sort_by: "popularity.desc",
				with_genres: withGenres,
				include_adult: false,
			},
			{
				signal,
			},
		);

		return mapTmdbPage(response, mapTmdbTv);
	}

	async getDocumentariesPage(
		page = 1,
		signal?: AbortSignal,
	): Promise<MediaPage> {
		return this.getByGenre({
			mediaType: "movie",
			genreNames: ["Documentary"],
			page,
			signal,
		});
	}

	async getPopularMovies(
		page = 1,
		signal?: AbortSignal,
	): Promise<readonly MediaItem[]> {
		const response = await this.getMoviesPage(page, signal);

		return response.items;
	}

	async getPopularSeries(
		page = 1,
		signal?: AbortSignal,
	): Promise<readonly MediaItem[]> {
		const response = await this.getSeriesPage(page, signal);

		return response.items;
	}

	async getDocumentaries(
		page = 1,
		signal?: AbortSignal,
	): Promise<readonly MediaItem[]> {
		const response = await this.getDocumentariesPage(page, signal);

		return response.items;
	}

	async getMovieDetails(
		movieId: number,
		signal?: AbortSignal,
	): Promise<Record<string, unknown>> {
		return tmdbFetch<Record<string, unknown>>(
			`/movie/${movieId}`,
			{
				language: TMDB_LANGUAGE,
				append_to_response: "recommendations,credits,videos",
			},
			{
				signal,
			},
		);
	}

	async getSeriesDetails(
		seriesId: number,
		signal?: AbortSignal,
	): Promise<Record<string, unknown>> {
		return tmdbFetch<Record<string, unknown>>(
			`/tv/${seriesId}`,
			{
				language: TMDB_LANGUAGE,
				append_to_response: "recommendations,credits,videos",
			},
			{
				signal,
			},
		);
	}

	async getSeriesSeason(
		seriesId: number,
		seasonNumber: number,
		signal?: AbortSignal,
	): Promise<Record<string, unknown>> {
		return tmdbFetch<Record<string, unknown>>(
			`/tv/${seriesId}/season/${seasonNumber}`,
			{
				language: TMDB_LANGUAGE,
			},
			{
				signal,
			},
		);
	}

	async getWelcomeContent(signal?: AbortSignal): Promise<WelcomeContent> {
		const sectionRequests: readonly SectionRequest[] = [
			{
				id: "trending",
				load: () => this.getTrending(signal),
			},
			{
				id: "popular-movies",
				load: () => this.getPopularMovies(1, signal),
			},
			{
				id: "popular-series",
				load: () => this.getPopularSeries(1, signal),
			},
			{
				id: "documentaries",
				load: () => this.getDocumentaries(1, signal),
			},
		];

		const results = await Promise.allSettled(
			sectionRequests.map((request) => request.load()),
		);

		if (signal?.aborted) {
			throw new DOMException("Request aborted", "AbortError");
		}

		const sections: MediaSection[] = [];
		const failedSections: MediaSectionId[] = [];

		results.forEach((result, index) => {
			const request = sectionRequests[index];

			if (!request) {
				return;
			}

			if (result.status === "rejected") {
				failedSections.push(request.id);
				return;
			}

			sections.push({
				id: request.id,
				title: SECTION_TITLES[request.id],
				items: result.value,
			});
		});

		if (failedSections.length === sectionRequests.length) {
			throw new TmdbRequestError("No se pudo cargar el contenido de Nexlit.");
		}

		return {
			hero: this.selectHero(sections),
			sections,
			failedSections,
		};
	}

	private async resolveGenreIds(
		mediaType: MediaType,
		genreNames: readonly string[],
		signal?: AbortSignal,
	): Promise<readonly number[]> {
		const genreCatalog = await this.getGenreCatalog(mediaType, signal);

		const genreIds: number[] = [];

		for (const genreName of genreNames) {
			const normalizedGenreName = this.normalizeGenreName(genreName);

			if (!normalizedGenreName) {
				continue;
			}

			const genreId = genreCatalog.get(normalizedGenreName);

			if (genreId === undefined) {
				throw new TmdbRequestError(`TMDB no devolvió el género ${genreName}.`);
			}

			if (!genreIds.includes(genreId)) {
				genreIds.push(genreId);
			}
		}

		if (genreIds.length === 0) {
			throw new TmdbRequestError(
				"Es necesario indicar al menos un género válido.",
			);
		}

		return genreIds;
	}

	private async getGenreCatalog(
		mediaType: MediaType,
		signal?: AbortSignal,
	): Promise<ReadonlyMap<string, number>> {
		const cachedCatalog = this.genreCatalogCache.get(mediaType);

		if (cachedCatalog) {
			return cachedCatalog;
		}

		const path =
			mediaType === "movie" ? TMDB_PATHS.movieGenres : TMDB_PATHS.tvGenres;

		const response = await tmdbFetch<TmdbGenreListResponse>(
			path,
			{
				language: TMDB_GENRE_LANGUAGE,
			},
			{
				signal,
			},
		);

		const genreCatalog = new Map<string, number>();

		for (const genre of response.genres) {
			const normalizedGenreName = this.normalizeGenreName(genre.name);

			if (!normalizedGenreName) {
				continue;
			}

			genreCatalog.set(normalizedGenreName, genre.id);
		}

		this.genreCatalogCache.set(mediaType, genreCatalog);

		return genreCatalog;
	}

	private normalizeGenreName(value: string): string {
		return value.trim().toLocaleLowerCase("en-US");
	}

	private selectHero(sections: readonly MediaSection[]): MediaItem | null {
		const items = sections.flatMap((section) => section.items);

		return (
			items.find(
				(item) => item.backdropPath !== null && item.overview.length > 0,
			) ??
			items.find((item) => item.backdropPath !== null) ??
			items[0] ??
			null
		);
	}
}

export const tmdbMediaService = new TmdbMediaService();
