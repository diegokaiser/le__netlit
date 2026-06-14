import { afterEach, describe, expect, it, vi } from "vitest";

import { mapTmdbMovie, mapTmdbTrendingItem, mapTmdbTv } from "./tmdb.mapper";
import type {
	TmdbMovieResult,
	TmdbTrendingResult,
	TmdbTvResult,
} from "./tmdb.types";

function createMovie(
	overrides: Partial<TmdbMovieResult> = {},
): TmdbMovieResult {
	return {
		id: 101,
		title: "Dune",
		original_title: "Dune",
		overview: "Una historia ambientada en Arrakis.",
		poster_path: "/dune-poster.jpg",
		backdrop_path: "/dune-backdrop.jpg",
		vote_average: 8.2,
		release_date: "2021-10-22",
		genre_ids: [12, 878],
		...overrides,
	};
}

function createSeries(overrides: Partial<TmdbTvResult> = {}): TmdbTvResult {
	return {
		id: 202,
		name: "Dark",
		original_name: "Dark",
		overview: "Una serie sobre viajes en el tiempo.",
		poster_path: "/dark-poster.jpg",
		backdrop_path: "/dark-backdrop.jpg",
		vote_average: 8.7,
		first_air_date: "2017-12-01",
		genre_ids: [18, 9648],
		...overrides,
	};
}

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("mapTmdbMovie", () => {
	it("normaliza una película con todos sus campos", () => {
		const result = mapTmdbMovie(
			createMovie({
				title: "  Dune: Parte Uno  ",
				overview: "  Una historia ambientada en Arrakis.  ",
				release_date: "  2021-10-22  ",
			}),
		);

		expect(result).toEqual({
			id: 101,
			mediaType: "movie",
			title: "Dune: Parte Uno",
			overview: "Una historia ambientada en Arrakis.",
			posterPath: "/dune-poster.jpg",
			backdropPath: "/dune-backdrop.jpg",
			voteAverage: 8.2,
			releaseDate: "2021-10-22",
			genreIds: [12, 878],
		});
	});

	it("usa original_title cuando title no contiene texto válido", () => {
		const result = mapTmdbMovie(
			createMovie({
				title: "   ",
				original_title: "  Original Movie Title  ",
			}),
		);

		expect(result.title).toBe("Original Movie Title");
	});

	it("usa el título fallback cuando title y original_title están ausentes", () => {
		const result = mapTmdbMovie(
			createMovie({
				title: undefined,
				original_title: undefined,
			}),
		);

		expect(result.title).toBe("Película sin título");
	});

	it("usa el título fallback cuando los títulos solo contienen espacios", () => {
		const result = mapTmdbMovie(
			createMovie({
				title: "   ",
				original_title: "\t",
			}),
		);

		expect(result.title).toBe("Película sin título");
	});

	it("normaliza los campos opcionales ausentes", () => {
		const result = mapTmdbMovie({
			id: 303,
		});

		expect(result).toEqual({
			id: 303,
			mediaType: "movie",
			title: "Película sin título",
			overview: "",
			posterPath: null,
			backdropPath: null,
			voteAverage: 0,
			releaseDate: undefined,
			genreIds: [],
		});
	});

	it("convierte una fecha vacía en undefined", () => {
		const result = mapTmdbMovie(
			createMovie({
				release_date: "   ",
			}),
		);

		expect(result.releaseDate).toBeUndefined();
	});

	it.each([
		{
			description: "valor negativo",
			input: -3,
			expected: 0,
		},
		{
			description: "valor superior a diez",
			input: 14,
			expected: 10,
		},
		{
			description: "NaN",
			input: Number.NaN,
			expected: 0,
		},
		{
			description: "Infinity",
			input: Number.POSITIVE_INFINITY,
			expected: 0,
		},
		{
			description: "-Infinity",
			input: Number.NEGATIVE_INFINITY,
			expected: 0,
		},
		{
			description: "valor ausente",
			input: undefined,
			expected: 0,
		},
	] satisfies Array<{
		description: string;
		input: number | undefined;
		expected: number;
	}>)(
		"normaliza la valoración cuando recibe $description",
		({ input, expected }) => {
			const result = mapTmdbMovie(
				createMovie({
					vote_average: input,
				}),
			);

			expect(result.voteAverage).toBe(expected);
		},
	);

	it("mantiene una valoración válida dentro del rango", () => {
		const result = mapTmdbMovie(
			createMovie({
				vote_average: 7.45,
			}),
		);

		expect(result.voteAverage).toBe(7.45);
	});

	it("conserva únicamente identificadores de género enteros", () => {
		const malformedGenreIds = [
			12,
			878,
			2.5,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			"18",
			null,
			undefined,
		] as unknown as number[];

		const result = mapTmdbMovie(
			createMovie({
				genre_ids: malformedGenreIds,
			}),
		);

		expect(result.genreIds).toEqual([12, 878]);
	});

	it("devuelve una lista vacía cuando genre_ids no es un array", () => {
		const result = mapTmdbMovie(
			createMovie({
				genre_ids: "12,878" as unknown as number[],
			}),
		);

		expect(result.genreIds).toEqual([]);
	});
});

describe("mapTmdbTv", () => {
	it("normaliza una serie con todos sus campos", () => {
		const result = mapTmdbTv(
			createSeries({
				name: "  Dark  ",
				overview: "  Una serie sobre viajes en el tiempo.  ",
				first_air_date: "  2017-12-01  ",
			}),
		);

		expect(result).toEqual({
			id: 202,
			mediaType: "tv",
			title: "Dark",
			overview: "Una serie sobre viajes en el tiempo.",
			posterPath: "/dark-poster.jpg",
			backdropPath: "/dark-backdrop.jpg",
			voteAverage: 8.7,
			releaseDate: "2017-12-01",
			genreIds: [18, 9648],
		});
	});

	it("usa original_name cuando name no contiene texto válido", () => {
		const result = mapTmdbTv(
			createSeries({
				name: "   ",
				original_name: "  Original Series Name  ",
			}),
		);

		expect(result.title).toBe("Original Series Name");
	});

	it("usa el título fallback cuando name y original_name están ausentes", () => {
		const result = mapTmdbTv(
			createSeries({
				name: undefined,
				original_name: undefined,
			}),
		);

		expect(result.title).toBe("Serie sin título");
	});

	it("usa el título fallback cuando los nombres solo contienen espacios", () => {
		const result = mapTmdbTv(
			createSeries({
				name: "   ",
				original_name: "\t",
			}),
		);

		expect(result.title).toBe("Serie sin título");
	});

	it("normaliza los campos opcionales ausentes", () => {
		const result = mapTmdbTv({
			id: 404,
		});

		expect(result).toEqual({
			id: 404,
			mediaType: "tv",
			title: "Serie sin título",
			overview: "",
			posterPath: null,
			backdropPath: null,
			voteAverage: 0,
			releaseDate: undefined,
			genreIds: [],
		});
	});

	it("limita una valoración superior a diez", () => {
		const result = mapTmdbTv(
			createSeries({
				vote_average: 10.8,
			}),
		);

		expect(result.voteAverage).toBe(10);
	});

	it("limita una valoración negativa a cero", () => {
		const result = mapTmdbTv(
			createSeries({
				vote_average: -0.5,
			}),
		);

		expect(result.voteAverage).toBe(0);
	});
});

describe("mapTmdbTrendingItem", () => {
	it("normaliza una película de tendencias", () => {
		const trendingMovie: TmdbTrendingResult = {
			...createMovie(),
			media_type: "movie",
		};

		const result = mapTmdbTrendingItem(trendingMovie);

		expect(result).toMatchObject({
			id: 101,
			mediaType: "movie",
			title: "Dune",
		});
	});

	it("normaliza una serie de tendencias", () => {
		const trendingSeries: TmdbTrendingResult = {
			...createSeries(),
			media_type: "tv",
		};

		const result = mapTmdbTrendingItem(trendingSeries);

		expect(result).toMatchObject({
			id: 202,
			mediaType: "tv",
			title: "Dark",
		});
	});

	it("descarta personas recibidas desde tendencias", () => {
		const trendingPerson: TmdbTrendingResult = {
			id: 505,
			media_type: "person",
			name: "Actor de prueba",
			overview: "Persona devuelta por el endpoint de tendencias.",
			poster_path: "/person.jpg",
			backdrop_path: null,
			vote_average: 9,
			genre_ids: [],
		};

		expect(mapTmdbTrendingItem(trendingPerson)).toBeNull();
	});

	it("permite filtrar personas sin eliminar películas o series", () => {
		const trendingItems: TmdbTrendingResult[] = [
			{
				...createMovie(),
				media_type: "movie",
			},
			{
				id: 505,
				media_type: "person",
				name: "Actor de prueba",
			},
			{
				...createSeries(),
				media_type: "tv",
			},
		];

		const mappedItems = trendingItems
			.map(mapTmdbTrendingItem)
			.filter((item) => item !== null);

		expect(mappedItems).toHaveLength(2);
		expect(mappedItems.map((item) => item.mediaType)).toEqual(["movie", "tv"]);
	});
});
