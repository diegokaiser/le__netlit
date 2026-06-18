type TmdbGenreResponse = Readonly<{
	id?: number | null;
	name?: string | null;
}>;

type TmdbCastMemberResponse = Readonly<{
	id?: number | null;
	name?: string | null;
	character?: string | null;
	profile_path?: string | null;
	order?: number | null;
}>;

type TmdbCreditsResponse = Readonly<{
	cast?: readonly TmdbCastMemberResponse[] | null;
}>;

type TmdbSeasonSummaryResponse = Readonly<{
	id?: number | null;
	season_number?: number | null;
	name?: string | null;
	overview?: string | null;
	poster_path?: string | null;
	episode_count?: number | null;
	air_date?: string | null;
}>;

export type TmdbMovieDetailsResponse = Readonly<{
	id?: number | null;
	title?: string | null;
	original_title?: string | null;
	overview?: string | null;
	poster_path?: string | null;
	backdrop_path?: string | null;
	genres?: readonly TmdbGenreResponse[] | null;
	vote_average?: number | null;
	vote_count?: number | null;
	release_date?: string | null;
	status?: string | null;
	tagline?: string | null;
	original_language?: string | null;
	runtime?: number | null;
	credits?: TmdbCreditsResponse | null;
}>;

export type TmdbSeriesDetailsResponse = Readonly<{
	id?: number | null;
	name?: string | null;
	original_name?: string | null;
	overview?: string | null;
	poster_path?: string | null;
	backdrop_path?: string | null;
	genres?: readonly TmdbGenreResponse[] | null;
	vote_average?: number | null;
	vote_count?: number | null;
	first_air_date?: string | null;
	status?: string | null;
	tagline?: string | null;
	original_language?: string | null;
	number_of_seasons?: number | null;
	number_of_episodes?: number | null;
	seasons?: readonly TmdbSeasonSummaryResponse[] | null;
	credits?: TmdbCreditsResponse | null;
}>;
