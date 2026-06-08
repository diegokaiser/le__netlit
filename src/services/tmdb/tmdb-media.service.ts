import { tmdbFetch } from "./tmdb.client";

export type MediaType = "movie" | "tv";

export type TmdbListResponse<T> = {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
};

export type TmdbMediaItem = {
	id: number;
	title?: string;
	name?: string;
	overview: string;
	poster_path: string | null;
	backdrop_path: string | null;
	genre_ids: number[];
	vote_average: number;
	release_date?: string;
	first_air_date?: string;
};

export class TmdbMediaService {
	getPopularMovies(page = 1) {
		return tmdbFetch<TmdbListResponse<TmdbMediaItem>>("/movie/popular", {
			language: "es-ES",
			page,
		});
	}

	getPopularSeries(page = 1) {
		return tmdbFetch<TmdbListResponse<TmdbMediaItem>>("/tv/popular", {
			language: "es-ES",
			page,
		});
	}

	getMovieDetails(movieId: number) {
		return tmdbFetch(`/movie/${movieId}`, {
			language: "es-ES",
			append_to_response: "recommendations,credits,videos",
		});
	}

	getSeriesDetails(seriesId: number) {
		return tmdbFetch(`/tv/${seriesId}`, {
			language: "es-ES",
			append_to_response: "recommendations,credits,videos",
		});
	}

	getSeriesSeason(seriesId: number, seasonNumber: number) {
		return tmdbFetch(`/tv/${seriesId}/season/${seasonNumber}`, {
			language: "es-ES",
		});
	}
}

export const tmdbMediaService = new TmdbMediaService();
