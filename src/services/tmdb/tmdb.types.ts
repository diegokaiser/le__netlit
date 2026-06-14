export type MediaType = "movie" | "tv";

export type MediaSectionId =
	| "trending"
	| "popular-movies"
	| "popular-series"
	| "documentaries";

export interface MediaItem {
	id: number;
	mediaType: MediaType;
	title: string;
	overview: string;
	posterPath: string | null;
	backdropPath: string | null;
	voteAverage: number;
	releaseDate?: string;
	genreIds: readonly number[];
}

export interface MediaSection {
	id: MediaSectionId;
	title: string;
	items: readonly MediaItem[];
}

export interface WelcomeContent {
	hero: MediaItem | null;
	sections: readonly MediaSection[];
	failedSections: readonly MediaSectionId[];
}

export interface TmdbListResponse<TItem> {
	page: number;
	results: TItem[];
	total_pages: number;
	total_results: number;
}

interface TmdbCommonResult {
	id: number;
	overview?: string;
	poster_path?: string | null;
	backdrop_path?: string | null;
	vote_average?: number;
	genre_ids?: number[];
}

export interface TmdbMovieResult extends TmdbCommonResult {
	title?: string;
	original_title?: string;
	release_date?: string;
}

export interface TmdbTvResult extends TmdbCommonResult {
	name?: string;
	original_name?: string;
	first_air_date?: string;
}

export interface TmdbTrendingResult extends TmdbCommonResult {
	media_type: "movie" | "tv" | "person";
	title?: string;
	original_title?: string;
	release_date?: string;
	name?: string;
	original_name?: string;
	first_air_date?: string;
}

export interface TmdbGenre {
	id: number;
	name: string;
}

export interface TmdbGenreListResponse {
	genres: TmdbGenre[];
}
