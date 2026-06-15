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
	discoverMovies: "/discover/movie",
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

export class TmdbRequestError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);

		this.name = "TmdbRequestError";
		this.status = status;
	}
}

export class TmdbMediaService {
	private documentaryGenreId: number | null = null;

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

	async getDocumentariesPage(
		page = 1,
		signal?: AbortSignal,
	): Promise<MediaPage> {
		const documentaryGenreId = await this.getDocumentaryGenreId(signal);

		const response = await tmdbFetch<TmdbListResponse<TmdbMovieResult>>(
			TMDB_PATHS.discoverMovies,
			{
				language: TMDB_LANGUAGE,
				page,
				sort_by: "popularity.desc",
				with_genres: documentaryGenreId,
				include_adult: false,
				include_video: false,
			},
			{
				signal,
			},
		);

		return mapTmdbPage(response, mapTmdbMovie);
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

	private async getDocumentaryGenreId(signal?: AbortSignal): Promise<number> {
		if (this.documentaryGenreId !== null) {
			return this.documentaryGenreId;
		}

		const response = await tmdbFetch<TmdbGenreListResponse>(
			TMDB_PATHS.movieGenres,
			{
				language: TMDB_GENRE_LANGUAGE,
			},
			{
				signal,
			},
		);

		const documentaryGenre = response.genres.find(
			(genre) => genre.name.trim().toLocaleLowerCase("en-US") === "documentary",
		);

		if (!documentaryGenre) {
			throw new TmdbRequestError("TMDB no devolvió el género Documentary.");
		}

		this.documentaryGenreId = documentaryGenre.id;

		return documentaryGenre.id;
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
