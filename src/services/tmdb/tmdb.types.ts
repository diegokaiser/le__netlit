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

export interface MediaPage {
	items: readonly MediaItem[];
	page: number;
	totalPages: number;
	totalResults: number;
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

export type MediaGenre = Readonly<{
	id: number;
	name: string;
}>;

export type MediaSeasonSummary = Readonly<{
	id: number;
	seasonNumber: number;
	name: string;
	overview: string;
	posterPath: string | null;
	episodeCount: number;
	airDate: string | null;
}>;

export type MediaCastMember = Readonly<{
	id: number;
	name: string;
	character: string | null;
	profilePath: string | null;
}>;

export type MediaDetail = Readonly<{
	id: number;
	mediaType: MediaType;
	title: string;
	originalTitle: string | null;
	overview: string;
	posterPath: string | null;
	backdropPath: string | null;
	genres: readonly MediaGenre[];
	voteAverage: number;
	voteCount: number;
	releaseDate: string | null;
	status: string | null;
	tagline: string | null;
	originalLanguage: string | null;

	runtime: number | null;

	numberOfSeasons: number | null;
	numberOfEpisodes: number | null;
	seasons: readonly MediaSeasonSummary[];

	cast: readonly MediaCastMember[];
}>;

export type EpisodeDetail = Readonly<{
	id: number;
	episodeNumber: number;
	seasonNumber: number;
	name: string;
	overview: string;
	stillPath: string | null;
	airDate?: string;
	runtime?: number;
	voteAverage?: number;
	voteCount?: number;
}>;

export type SeasonDetail = Readonly<{
	id: number;
	seriesId: number;
	seasonNumber: number;
	name: string;
	overview: string;
	posterPath: string | null;
	airDate?: string;
	episodeCount: number;
	voteAverage?: number;
	episodes: readonly EpisodeDetail[];
}>;

export type TmdbEpisodeResponse = {
	id?: number | null;
	episode_number?: number | null;
	season_number?: number | null;
	name?: string | null;
	overview?: string | null;
	still_path?: string | null;
	air_date?: string | null;
	runtime?: number | null;
	vote_average?: number | null;
	vote_count?: number | null;
};

export type TmdbSeasonDetailResponse = {
	id?: number | null;
	season_number?: number | null;
	name?: string | null;
	overview?: string | null;
	poster_path?: string | null;
	air_date?: string | null;
	vote_average?: number | null;
	episodes?: TmdbEpisodeResponse[] | null;
};
