import { describe, expect, it } from "vitest";

import type {
	TmdbMovieDetailsResponse,
	TmdbSeriesDetailsResponse,
} from "../tmdb-detail-api.types";
import {
	mapTmdbMovieDetail,
	mapTmdbSeriesDetail,
} from "./map-tmdb-media-detail";

function createMovieDetail(
	overrides: Partial<TmdbMovieDetailsResponse> = {},
): TmdbMovieDetailsResponse {
	return {
		id: 101,
		title: "Dune",
		original_title: "Dune",
		overview: "Una historia ambientada en Arrakis.",
		poster_path: "/dune-poster.jpg",
		backdrop_path: "/dune-backdrop.jpg",
		genres: [
			{
				id: 12,
				name: "Aventura",
			},
			{
				id: 878,
				name: "Ciencia ficción",
			},
		],
		vote_average: 8.2,
		vote_count: 12_345,
		release_date: "2021-10-22",
		status: "Released",
		tagline: "Beyond fear, destiny awaits.",
		original_language: "en",
		runtime: 155,
		credits: {
			cast: [
				{
					id: 201,
					name: "Timothée Chalamet",
					character: "Paul Atreides",
					profile_path: "/timothee.jpg",
					order: 0,
				},
				{
					id: 202,
					name: "Rebecca Ferguson",
					character: "Lady Jessica",
					profile_path: "/rebecca.jpg",
					order: 1,
				},
			],
		},
		...overrides,
	};
}

function createSeriesDetail(
	overrides: Partial<TmdbSeriesDetailsResponse> = {},
): TmdbSeriesDetailsResponse {
	return {
		id: 202,
		name: "Dark",
		original_name: "Dark",
		overview: "Una serie sobre viajes en el tiempo.",
		poster_path: "/dark-poster.jpg",
		backdrop_path: "/dark-backdrop.jpg",
		genres: [
			{
				id: 18,
				name: "Drama",
			},
			{
				id: 9648,
				name: "Misterio",
			},
		],
		vote_average: 8.7,
		vote_count: 7_100,
		first_air_date: "2017-12-01",
		status: "Ended",
		tagline: "Everything is connected.",
		original_language: "de",
		number_of_seasons: 3,
		number_of_episodes: 26,
		seasons: [
			{
				id: 301,
				season_number: 1,
				name: "Temporada 1",
				overview: "Comienza el ciclo.",
				poster_path: "/dark-season-1.jpg",
				episode_count: 10,
				air_date: "2017-12-01",
			},
			{
				id: 302,
				season_number: 2,
				name: "Temporada 2",
				overview: "El ciclo continúa.",
				poster_path: "/dark-season-2.jpg",
				episode_count: 8,
				air_date: "2019-06-21",
			},
		],
		credits: {
			cast: [
				{
					id: 401,
					name: "Louis Hofmann",
					character: "Jonas Kahnwald",
					profile_path: "/louis.jpg",
					order: 0,
				},
			],
		},
		...overrides,
	};
}

describe("mapTmdbMovieDetail", () => {
	it("normaliza una película completa", () => {
		const result = mapTmdbMovieDetail(
			createMovieDetail({
				title: "  Dune: Parte Uno  ",
				original_title: "  Dune  ",
				overview: "  Una historia ambientada en Arrakis.  ",
				status: "  Released  ",
				tagline: "  Beyond fear, destiny awaits.  ",
				original_language: "  en  ",
			}),
		);

		expect(result).toEqual({
			id: 101,
			mediaType: "movie",
			title: "Dune: Parte Uno",
			originalTitle: "Dune",
			overview: "Una historia ambientada en Arrakis.",
			posterPath: "/dune-poster.jpg",
			backdropPath: "/dune-backdrop.jpg",
			genres: [
				{
					id: 12,
					name: "Aventura",
				},
				{
					id: 878,
					name: "Ciencia ficción",
				},
			],
			voteAverage: 8.2,
			voteCount: 12_345,
			releaseDate: "2021-10-22",
			status: "Released",
			tagline: "Beyond fear, destiny awaits.",
			originalLanguage: "en",
			runtime: 155,
			numberOfSeasons: null,
			numberOfEpisodes: null,
			seasons: [],
			cast: [
				{
					id: 201,
					name: "Timothée Chalamet",
					character: "Paul Atreides",
					profilePath: "/timothee.jpg",
				},
				{
					id: 202,
					name: "Rebecca Ferguson",
					character: "Lady Jessica",
					profilePath: "/rebecca.jpg",
				},
			],
		});
	});

	it("normaliza una película con valores mínimos", () => {
		expect(
			mapTmdbMovieDetail({
				id: 303,
			}),
		).toEqual({
			id: 303,
			mediaType: "movie",
			title: "Película sin título",
			originalTitle: null,
			overview: "",
			posterPath: null,
			backdropPath: null,
			genres: [],
			voteAverage: 0,
			voteCount: 0,
			releaseDate: null,
			status: null,
			tagline: null,
			originalLanguage: null,
			runtime: null,
			numberOfSeasons: null,
			numberOfEpisodes: null,
			seasons: [],
			cast: [],
		});
	});

	it("normaliza title y original_title de forma independiente", () => {
		const result = mapTmdbMovieDetail(
			createMovieDetail({
				title: "   ",
				original_title: "  Original Movie Title  ",
			}),
		);

		expect(result.title).toBe("Película sin título");
		expect(result.originalTitle).toBe("Original Movie Title");
	});

	it("descarta géneros inválidos y limpia sus nombres", () => {
		const result = mapTmdbMovieDetail(
			createMovieDetail({
				genres: [
					{
						id: 12,
						name: "  Aventura  ",
					},
					{
						id: 0,
						name: "Identificador cero",
					},
					{
						id: -1,
						name: "Identificador negativo",
					},
					{
						id: 2.5,
						name: "Identificador decimal",
					},
					{
						id: 18,
						name: "   ",
					},
					{
						id: 35,
						name: null,
					},
					{},
				],
			}),
		);

		expect(result.genres).toEqual([
			{
				id: 12,
				name: "Aventura",
			},
		]);
	});

	it("ordena el reparto por order y lo limita a diez miembros", () => {
		const cast = Array.from({ length: 12 }, (_, index) => ({
			id: index + 1,
			name: `Actor ${index + 1}`,
			character: `Personaje ${index + 1}`,
			profile_path: `/actor-${index + 1}.jpg`,
			order: 11 - index,
		}));

		const originalOrder = cast.map((member) => member.name);

		const result = mapTmdbMovieDetail(
			createMovieDetail({
				credits: {
					cast,
				},
			}),
		);

		expect(result.cast).toHaveLength(10);
		expect(result.cast.map((member) => member.name)).toEqual([
			"Actor 12",
			"Actor 11",
			"Actor 10",
			"Actor 9",
			"Actor 8",
			"Actor 7",
			"Actor 6",
			"Actor 5",
			"Actor 4",
			"Actor 3",
		]);

		expect(cast.map((member) => member.name)).toEqual(originalOrder);
	});

	it("normaliza profilePath y character vacíos a null", () => {
		const result = mapTmdbMovieDetail(
			createMovieDetail({
				credits: {
					cast: [
						{
							id: 501,
							name: "Actor sin imagen",
							character: "   ",
							profile_path: null,
							order: 0,
						},
						{
							id: 502,
							name: "Actriz con path vacío",
							character: null,
							profile_path: "   ",
							order: 1,
						},
					],
				},
			}),
		);

		expect(result.cast).toEqual([
			{
				id: 501,
				name: "Actor sin imagen",
				character: null,
				profilePath: null,
			},
			{
				id: 502,
				name: "Actriz con path vacío",
				character: null,
				profilePath: null,
			},
		]);
	});

	it("descarta miembros inválidos del reparto", () => {
		const result = mapTmdbMovieDetail(
			createMovieDetail({
				credits: {
					cast: [
						{
							id: 601,
							name: "  Actor válido  ",
							order: 0,
						},
						{
							id: 0,
							name: "Id inválido",
							order: 1,
						},
						{
							id: 602,
							name: "   ",
							order: 2,
						},
						{
							id: 2.5,
							name: "Id decimal",
							order: 3,
						},
						{},
					],
				},
			}),
		);

		expect(result.cast).toEqual([
			{
				id: 601,
				name: "Actor válido",
				character: null,
				profilePath: null,
			},
		]);
	});

	it.each([
		undefined,
		null,
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("rechaza el id de película inválido %s", (id) => {
		expect(() =>
			mapTmdbMovieDetail(
				createMovieDetail({
					id,
				}),
			),
		).toThrowError("TMDB movie detail contains an invalid id.");
	});
});

describe("mapTmdbSeriesDetail", () => {
	it("normaliza una serie completa", () => {
		const result = mapTmdbSeriesDetail(
			createSeriesDetail({
				name: "  Dark  ",
				original_name: "  Dark  ",
				overview: "  Una serie sobre viajes en el tiempo.  ",
				status: "  Ended  ",
				tagline: "  Everything is connected.  ",
				original_language: "  de  ",
			}),
		);

		expect(result).toEqual({
			id: 202,
			mediaType: "tv",
			title: "Dark",
			originalTitle: "Dark",
			overview: "Una serie sobre viajes en el tiempo.",
			posterPath: "/dark-poster.jpg",
			backdropPath: "/dark-backdrop.jpg",
			genres: [
				{
					id: 18,
					name: "Drama",
				},
				{
					id: 9648,
					name: "Misterio",
				},
			],
			voteAverage: 8.7,
			voteCount: 7_100,
			releaseDate: "2017-12-01",
			status: "Ended",
			tagline: "Everything is connected.",
			originalLanguage: "de",
			runtime: null,
			numberOfSeasons: 3,
			numberOfEpisodes: 26,
			seasons: [
				{
					id: 301,
					seasonNumber: 1,
					name: "Temporada 1",
					overview: "Comienza el ciclo.",
					posterPath: "/dark-season-1.jpg",
					episodeCount: 10,
					airDate: "2017-12-01",
				},
				{
					id: 302,
					seasonNumber: 2,
					name: "Temporada 2",
					overview: "El ciclo continúa.",
					posterPath: "/dark-season-2.jpg",
					episodeCount: 8,
					airDate: "2019-06-21",
				},
			],
			cast: [
				{
					id: 401,
					name: "Louis Hofmann",
					character: "Jonas Kahnwald",
					profilePath: "/louis.jpg",
				},
			],
		});
	});

	it("normaliza una serie con valores mínimos", () => {
		expect(
			mapTmdbSeriesDetail({
				id: 404,
			}),
		).toEqual({
			id: 404,
			mediaType: "tv",
			title: "Serie sin título",
			originalTitle: null,
			overview: "",
			posterPath: null,
			backdropPath: null,
			genres: [],
			voteAverage: 0,
			voteCount: 0,
			releaseDate: null,
			status: null,
			tagline: null,
			originalLanguage: null,
			runtime: null,
			numberOfSeasons: null,
			numberOfEpisodes: null,
			seasons: [],
			cast: [],
		});
	});

	it("normaliza name y original_name de forma independiente", () => {
		const result = mapTmdbSeriesDetail(
			createSeriesDetail({
				name: "   ",
				original_name: "  Original Series Name  ",
			}),
		);

		expect(result.title).toBe("Serie sin título");
		expect(result.originalTitle).toBe("Original Series Name");
	});

	it("ordena las temporadas y excluye seasonNumber cero", () => {
		const result = mapTmdbSeriesDetail(
			createSeriesDetail({
				seasons: [
					{
						id: 703,
						season_number: 3,
						name: "Temporada 3",
						episode_count: 8,
					},
					{
						id: 700,
						season_number: 0,
						name: "Especiales",
						episode_count: 4,
					},
					{
						id: 701,
						season_number: 1,
						name: "Temporada 1",
						episode_count: 10,
					},
					{
						id: 702,
						season_number: 2,
						name: "Temporada 2",
						episode_count: 8,
					},
				],
			}),
		);

		expect(result.seasons.map((season) => season.seasonNumber)).toEqual([
			1, 2, 3,
		]);

		expect(result.seasons.some((season) => season.seasonNumber === 0)).toBe(
			false,
		);
	});

	it("descarta temporadas inválidas y normaliza los campos opcionales", () => {
		const result = mapTmdbSeriesDetail(
			createSeriesDetail({
				seasons: [
					{
						id: 0,
						season_number: 1,
						name: "Id cero",
					},
					{
						id: -1,
						season_number: 2,
						name: "Id negativo",
					},
					{
						id: 801,
						season_number: 0,
						name: "Especiales",
					},
					{
						id: 802,
						season_number: 1.5,
						name: "Número decimal",
					},
					{
						id: 803,
						season_number: 3,
						name: "   ",
						overview: "   ",
						poster_path: "   ",
						episode_count: -1,
						air_date: "   ",
					},
					{},
				],
			}),
		);

		expect(result.seasons).toEqual([
			{
				id: 803,
				seasonNumber: 3,
				name: "Temporada 3",
				overview: "",
				posterPath: null,
				episodeCount: 0,
				airDate: null,
			},
		]);
	});

	it("normaliza contadores de temporadas y episodios inválidos", () => {
		const result = mapTmdbSeriesDetail(
			createSeriesDetail({
				number_of_seasons: 0,
				number_of_episodes: 26.5,
			}),
		);

		expect(result.numberOfSeasons).toBeNull();
		expect(result.numberOfEpisodes).toBeNull();
	});

	it.each([
		undefined,
		null,
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("rechaza el id de serie inválido %s", (id) => {
		expect(() =>
			mapTmdbSeriesDetail(
				createSeriesDetail({
					id,
				}),
			),
		).toThrowError("TMDB series detail contains an invalid id.");
	});
});
