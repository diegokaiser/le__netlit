import { afterEach, describe, expect, it, vi } from "vitest";

import {
	mapTmdbMovie,
	mapTmdbPage,
	mapTmdbTrendingItem,
	mapTmdbTv,
} from "./tmdb.mapper";
import type {
	MediaItem,
	TmdbListResponse,
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

describe("mapTmdbPage", () => {
	it("transforma los resultados mediante el mapper recibido", () => {
		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 2,
			results: [
				createMovie({
					id: 101,
					title: "Primera película",
				}),
				createMovie({
					id: 202,
					title: "Segunda película",
				}),
			],
			total_pages: 8,
			total_results: 150,
		};

		const result = mapTmdbPage(response, mapTmdbMovie);

		expect(result.items).toHaveLength(2);

		expect(result.items[0]).toMatchObject({
			id: 101,
			mediaType: "movie",
			title: "Primera película",
		});

		expect(result.items[1]).toMatchObject({
			id: 202,
			mediaType: "movie",
			title: "Segunda película",
		});
	});

	it("conserva page y normaliza la metadata paginada", () => {
		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 3,
			results: [createMovie()],
			total_pages: 12,
			total_results: 237,
		};

		const result = mapTmdbPage(response, mapTmdbMovie);

		expect(result.page).toBe(3);
		expect(result.totalPages).toBe(12);
		expect(result.totalResults).toBe(237);
	});

	it("invoca el mapper una vez por elemento y conserva el orden", () => {
		const firstMovie = createMovie({
			id: 101,
			title: "Primera",
		});

		const secondMovie = createMovie({
			id: 202,
			title: "Segunda",
		});

		const firstMedia: MediaItem = {
			id: 1001,
			mediaType: "movie",
			title: "Primera transformada",
			overview: "",
			posterPath: null,
			backdropPath: null,
			voteAverage: 0,
			genreIds: [],
		};

		const secondMedia: MediaItem = {
			id: 2002,
			mediaType: "movie",
			title: "Segunda transformada",
			overview: "",
			posterPath: null,
			backdropPath: null,
			voteAverage: 0,
			genreIds: [],
		};

		const mapper = vi
			.fn<(item: TmdbMovieResult) => MediaItem>()
			.mockReturnValueOnce(firstMedia)
			.mockReturnValueOnce(secondMedia);

		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 1,
			results: [firstMovie, secondMovie],
			total_pages: 1,
			total_results: 2,
		};

		const result = mapTmdbPage(response, mapper);

		expect(mapper).toHaveBeenCalledTimes(2);
		expect(mapper).toHaveBeenNthCalledWith(1, firstMovie, 0, response.results);
		expect(mapper).toHaveBeenNthCalledWith(2, secondMovie, 1, response.results);
		expect(result.items).toEqual([firstMedia, secondMedia]);
	});

	it("devuelve items vacíos y conserva la metadata cuando results está vacío", () => {
		const mapper = vi.fn<(item: TmdbMovieResult) => MediaItem>();

		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 4,
			results: [],
			total_pages: 4,
			total_results: 60,
		};

		const result = mapTmdbPage(response, mapper);

		expect(result).toEqual({
			items: [],
			page: 4,
			totalPages: 4,
			totalResults: 60,
		});

		expect(mapper).not.toHaveBeenCalled();
	});

	it("no muta la respuesta original ni sus resultados", () => {
		const firstMovie = createMovie({
			id: 101,
			title: "Película original",
			genre_ids: [12, 878],
		});

		const secondMovie = createMovie({
			id: 202,
			title: "Segunda película",
			genre_ids: [18],
		});

		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 2,
			results: [firstMovie, secondMovie],
			total_pages: 5,
			total_results: 90,
		};

		const originalSnapshot = structuredClone(response);
		const originalResultsReference = response.results;
		const originalFirstMovieReference = response.results[0];
		const originalSecondMovieReference = response.results[1];

		mapTmdbPage(response, mapTmdbMovie);

		expect(response).toEqual(originalSnapshot);
		expect(response.results).toBe(originalResultsReference);
		expect(response.results[0]).toBe(originalFirstMovieReference);
		expect(response.results[1]).toBe(originalSecondMovieReference);
	});
});
