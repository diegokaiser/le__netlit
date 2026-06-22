import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	tmdbFetch: vi.fn(),
}));

vi.mock("./tmdb.client", () => ({
	tmdbFetch: mocks.tmdbFetch,
}));

import { TmdbMediaNotFoundError } from "./tmdb-media.errors";
import { TmdbMediaService, TmdbRequestError } from "./tmdb-media.service";
import type {
	MediaItem,
	TmdbGenreListResponse,
	TmdbListResponse,
	TmdbMovieResult,
	TmdbTrendingResult,
	TmdbTvResult,
} from "./tmdb.types";

function createMovieResult(
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

function createTvResult(overrides: Partial<TmdbTvResult> = {}): TmdbTvResult {
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

function createMediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
	return {
		id: 1,
		mediaType: "movie",
		title: "Contenido de prueba",
		overview: "Descripción del contenido.",
		posterPath: "/poster.jpg",
		backdropPath: "/backdrop.jpg",
		voteAverage: 8,
		releaseDate: "2026-01-01",
		genreIds: [18],
		...overrides,
	};
}

function createListResponse<TItem>(results: TItem[]): TmdbListResponse<TItem> {
	return {
		page: 1,
		results,
		total_pages: 1,
		total_results: results.length,
	};
}

function resetMocks(): void {
	mocks.tmdbFetch.mockReset();
}

beforeEach(() => {
	vi.restoreAllMocks();
	resetMocks();
});

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("TmdbMediaService.getTrending", () => {
	it("consulta tendencias, reenvía la señal y descarta personas", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const trendingResults: TmdbTrendingResult[] = [
			{
				...createMovieResult(),
				media_type: "movie",
			},
			{
				id: 303,
				media_type: "person",
				name: "Persona de prueba",
				poster_path: "/person.jpg",
			},
			{
				...createTvResult(),
				media_type: "tv",
			},
		];

		mocks.tmdbFetch.mockResolvedValue(createListResponse(trendingResults));

		const result = await service.getTrending(abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/trending/all/day",
			{
				language: "es-ES",
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toHaveLength(2);
		expect(result).toEqual([
			{
				id: 101,
				mediaType: "movie",
				title: "Dune",
				overview: "Una historia ambientada en Arrakis.",
				posterPath: "/dune-poster.jpg",
				backdropPath: "/dune-backdrop.jpg",
				voteAverage: 8.2,
				releaseDate: "2021-10-22",
				genreIds: [12, 878],
			},
			{
				id: 202,
				mediaType: "tv",
				title: "Dark",
				overview: "Una serie sobre viajes en el tiempo.",
				posterPath: "/dark-poster.jpg",
				backdropPath: "/dark-backdrop.jpg",
				voteAverage: 8.7,
				releaseDate: "2017-12-01",
				genreIds: [18, 9648],
			},
		]);
	});
});

describe("TmdbMediaService.getMoviesPage", () => {
	it("consulta películas populares, reenvía la señal y devuelve MediaPage normalizado", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 1,
			results: [
				createMovieResult({
					id: 404,
					title: "Película paginada",
				}),
			],
			total_pages: 8,
			total_results: 147,
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		const result = await service.getMoviesPage(1, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/popular",
			{
				language: "es-ES",
				page: 1,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toEqual({
			items: [
				{
					id: 404,
					mediaType: "movie",
					title: "Película paginada",
					overview: "Una historia ambientada en Arrakis.",
					posterPath: "/dune-poster.jpg",
					backdropPath: "/dune-backdrop.jpg",
					voteAverage: 8.2,
					releaseDate: "2021-10-22",
					genreIds: [12, 878],
				},
			],
			page: 1,
			totalPages: 8,
			totalResults: 147,
		});
	});

	it("conserva la metadata cuando TMDB devuelve una página vacía", async () => {
		const service = new TmdbMediaService();

		const response: TmdbListResponse<TmdbMovieResult> = {
			page: 6,
			results: [],
			total_pages: 6,
			total_results: 103,
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		await expect(service.getMoviesPage(6)).resolves.toEqual({
			items: [],
			page: 6,
			totalPages: 6,
			totalResults: 103,
		});
	});

	it("propaga los errores producidos por tmdbFetch", async () => {
		const service = new TmdbMediaService();
		const networkError = new TypeError("Failed to fetch");

		mocks.tmdbFetch.mockRejectedValue(networkError);

		await expect(service.getMoviesPage(1)).rejects.toBe(networkError);
	});

	it("propaga AbortError y reenvía la señal abortada", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();
		const abortError = new DOMException(
			"The operation was aborted.",
			"AbortError",
		);

		abortController.abort();

		mocks.tmdbFetch.mockRejectedValue(abortError);

		await expect(service.getMoviesPage(1, abortController.signal)).rejects.toBe(
			abortError,
		);

		expect(abortController.signal.aborted).toBe(true);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/popular",
			{
				language: "es-ES",
				page: 1,
			},
			{
				signal: abortController.signal,
			},
		);
	});
});

describe("TmdbMediaService.getSeriesPage", () => {
	it("consulta series populares y devuelve MediaPage normalizado", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const response: TmdbListResponse<TmdbTvResult> = {
			page: 2,
			results: [
				createTvResult({
					id: 505,
					name: "Serie paginada",
				}),
			],
			total_pages: 5,
			total_results: 84,
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		const result = await service.getSeriesPage(2, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/popular",
			{
				language: "es-ES",
				page: 2,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toEqual({
			items: [
				{
					id: 505,
					mediaType: "tv",
					title: "Serie paginada",
					overview: "Una serie sobre viajes en el tiempo.",
					posterPath: "/dark-poster.jpg",
					backdropPath: "/dark-backdrop.jpg",
					voteAverage: 8.7,
					releaseDate: "2017-12-01",
					genreIds: [18, 9648],
				},
			],
			page: 2,
			totalPages: 5,
			totalResults: 84,
		});
	});
});

describe("TmdbMediaService.getByGenre", () => {
	it("resuelve un género de película y devuelve MediaPage normalizado", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const genreResponse: TmdbGenreListResponse = {
			genres: [
				{
					id: 27,
					name: "Horror",
				},
				{
					id: 878,
					name: "Science Fiction",
				},
			],
		};

		const discoverResponse: TmdbListResponse<TmdbMovieResult> = {
			page: 3,
			results: [
				createMovieResult({
					id: 801,
					title: "Película de ciencia ficción",
					genre_ids: [878],
				}),
			],
			total_pages: 7,
			total_results: 132,
		};

		mocks.tmdbFetch
			.mockResolvedValueOnce(genreResponse)
			.mockResolvedValueOnce(discoverResponse);

		const result = await service.getByGenre({
			mediaType: "movie",
			genreNames: ["Science Fiction"],
			page: 3,
			signal: abortController.signal,
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(2);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			1,
			"/genre/movie/list",
			{
				language: "en-US",
			},
			{
				signal: abortController.signal,
			},
		);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			2,
			"/discover/movie",
			{
				language: "es-ES",
				page: 3,
				sort_by: "popularity.desc",
				with_genres: 878,
				include_adult: false,
				include_video: false,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toEqual({
			items: [
				{
					id: 801,
					mediaType: "movie",
					title: "Película de ciencia ficción",
					overview: "Una historia ambientada en Arrakis.",
					posterPath: "/dune-poster.jpg",
					backdropPath: "/dune-backdrop.jpg",
					voteAverage: 8.2,
					releaseDate: "2021-10-22",
					genreIds: [878],
				},
			],
			page: 3,
			totalPages: 7,
			totalResults: 132,
		});
	});

	it("resuelve un género de serie y consulta únicamente discover/tv", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const genreResponse: TmdbGenreListResponse = {
			genres: [
				{
					id: 35,
					name: "Comedy",
				},
				{
					id: 10765,
					name: "Sci-Fi & Fantasy",
				},
			],
		};

		const discoverResponse: TmdbListResponse<TmdbTvResult> = {
			page: 2,
			results: [
				createTvResult({
					id: 802,
					name: "Serie de ciencia ficción",
					genre_ids: [10765],
				}),
			],
			total_pages: 5,
			total_results: 86,
		};

		mocks.tmdbFetch
			.mockResolvedValueOnce(genreResponse)
			.mockResolvedValueOnce(discoverResponse);

		const result = await service.getByGenre({
			mediaType: "tv",
			genreNames: ["Sci-Fi & Fantasy"],
			page: 2,
			signal: abortController.signal,
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(2);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			1,
			"/genre/tv/list",
			{
				language: "en-US",
			},
			{
				signal: abortController.signal,
			},
		);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			2,
			"/discover/tv",
			{
				language: "es-ES",
				page: 2,
				sort_by: "popularity.desc",
				with_genres: 10765,
				include_adult: false,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(mocks.tmdbFetch).not.toHaveBeenCalledWith(
			"/discover/movie",
			expect.anything(),
			expect.anything(),
		);

		expect(result).toEqual({
			items: [
				{
					id: 802,
					mediaType: "tv",
					title: "Serie de ciencia ficción",
					overview: "Una serie sobre viajes en el tiempo.",
					posterPath: "/dark-poster.jpg",
					backdropPath: "/dark-backdrop.jpg",
					voteAverage: 8.7,
					releaseDate: "2017-12-01",
					genreIds: [10765],
				},
			],
			page: 2,
			totalPages: 5,
			totalResults: 86,
		});
	});

	it("serializa varios géneros mediante coma y elimina nombres e IDs duplicados", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch
			.mockResolvedValueOnce({
				genres: [
					{
						id: 35,
						name: "Comedy",
					},
					{
						id: 10749,
						name: "Romance",
					},
					{
						id: 35,
						name: "Comedy Alias",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce({
				page: 1,
				results: [],
				total_pages: 1,
				total_results: 0,
			} satisfies TmdbListResponse<TmdbMovieResult>);

		await service.getByGenre({
			mediaType: "movie",
			genreNames: [" Comedy ", "comedy", "Romance", "Comedy Alias"],
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(2);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			2,
			"/discover/movie",
			{
				language: "es-ES",
				page: 1,
				sort_by: "popularity.desc",
				with_genres: "35,10749",
				include_adult: false,
				include_video: false,
			},
			{
				signal: undefined,
			},
		);
	});

	it("lanza TmdbRequestError cuando no se indica ningún género válido", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValueOnce({
			genres: [
				{
					id: 35,
					name: "Comedy",
				},
			],
		} satisfies TmdbGenreListResponse);

		await expect(
			service.getByGenre({
				mediaType: "movie",
				genreNames: ["", "   "],
			}),
		).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "Es necesario indicar al menos un género válido.",
			status: undefined,
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/genre/movie/list",
			{
				language: "en-US",
			},
			{
				signal: undefined,
			},
		);

		const discoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/movie" || path === "/discover/tv",
		);

		expect(discoverRequests).toHaveLength(0);
	});

	it("lanza TmdbRequestError y no ejecuta discover cuando falta el género solicitado", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValueOnce({
			genres: [
				{
					id: 18,
					name: "Drama",
				},
				{
					id: 35,
					name: "Comedy",
				},
			],
		} satisfies TmdbGenreListResponse);

		await expect(
			service.getByGenre({
				mediaType: "tv",
				genreNames: ["Sci-Fi & Fantasy"],
				signal: abortController.signal,
			}),
		).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "TMDB no devolvió el género Sci-Fi & Fantasy.",
			status: undefined,
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/genre/tv/list",
			{
				language: "en-US",
			},
			{
				signal: abortController.signal,
			},
		);

		const discoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/movie" || path === "/discover/tv",
		);

		expect(discoverRequests).toHaveLength(0);
	});

	it("mantiene y reutiliza catálogos separados para movie y tv", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch
			.mockResolvedValueOnce({
				genres: [
					{
						id: 878,
						name: "Science Fiction",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce({
				page: 1,
				results: [],
				total_pages: 3,
				total_results: 0,
			} satisfies TmdbListResponse<TmdbMovieResult>)
			.mockResolvedValueOnce({
				genres: [
					{
						id: 10765,
						name: "Sci-Fi & Fantasy",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce({
				page: 1,
				results: [],
				total_pages: 4,
				total_results: 0,
			} satisfies TmdbListResponse<TmdbTvResult>)
			.mockResolvedValueOnce({
				page: 2,
				results: [],
				total_pages: 3,
				total_results: 0,
			} satisfies TmdbListResponse<TmdbMovieResult>)
			.mockResolvedValueOnce({
				page: 2,
				results: [],
				total_pages: 4,
				total_results: 0,
			} satisfies TmdbListResponse<TmdbTvResult>);

		await service.getByGenre({
			mediaType: "movie",
			genreNames: ["Science Fiction"],
			page: 1,
		});

		await service.getByGenre({
			mediaType: "tv",
			genreNames: ["Sci-Fi & Fantasy"],
			page: 1,
		});

		await service.getByGenre({
			mediaType: "movie",
			genreNames: ["Science Fiction"],
			page: 2,
		});

		await service.getByGenre({
			mediaType: "tv",
			genreNames: ["Sci-Fi & Fantasy"],
			page: 2,
		});

		const movieGenreRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/genre/movie/list",
		);

		const tvGenreRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/genre/tv/list",
		);

		const movieDiscoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/movie",
		);

		const tvDiscoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/tv",
		);

		expect(movieGenreRequests).toHaveLength(1);
		expect(tvGenreRequests).toHaveLength(1);

		expect(movieDiscoverRequests).toHaveLength(2);
		expect(tvDiscoverRequests).toHaveLength(2);

		expect(movieDiscoverRequests[0]?.[1]).toMatchObject({
			page: 1,
			with_genres: 878,
		});

		expect(movieDiscoverRequests[1]?.[1]).toMatchObject({
			page: 2,
			with_genres: 878,
		});

		expect(tvDiscoverRequests[0]?.[1]).toMatchObject({
			page: 1,
			with_genres: 10765,
		});

		expect(tvDiscoverRequests[1]?.[1]).toMatchObject({
			page: 2,
			with_genres: 10765,
		});
	});

	it("no cachea una respuesta fallida del catálogo de géneros", async () => {
		const service = new TmdbMediaService();
		const catalogError = new TypeError(
			"No se pudo cargar el catálogo de géneros",
		);

		mocks.tmdbFetch
			.mockRejectedValueOnce(catalogError)
			.mockResolvedValueOnce({
				genres: [
					{
						id: 35,
						name: "Comedy",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce({
				page: 1,
				results: [
					createMovieResult({
						id: 803,
						title: "Comedia recuperada",
						genre_ids: [35],
					}),
				],
				total_pages: 1,
				total_results: 1,
			} satisfies TmdbListResponse<TmdbMovieResult>);

		await expect(
			service.getByGenre({
				mediaType: "movie",
				genreNames: ["Comedy"],
			}),
		).rejects.toBe(catalogError);

		const recoveredResult = await service.getByGenre({
			mediaType: "movie",
			genreNames: ["Comedy"],
		});

		const genreRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/genre/movie/list",
		);

		const discoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/movie",
		);

		expect(genreRequests).toHaveLength(2);
		expect(discoverRequests).toHaveLength(1);

		expect(recoveredResult.items).toHaveLength(1);
		expect(recoveredResult.items[0]).toMatchObject({
			id: 803,
			mediaType: "movie",
			title: "Comedia recuperada",
		});
	});
});

describe("TmdbMediaService.getDocumentariesPage", () => {
	it("obtiene Documentary y consulta discover/movie con los filtros esperados", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const genreResponse: TmdbGenreListResponse = {
			genres: [
				{
					id: 18,
					name: "Drama",
				},
				{
					id: 99,
					name: "Documentary",
				},
			],
		};

		const documentariesResponse: TmdbListResponse<TmdbMovieResult> = {
			page: 3,
			results: [
				createMovieResult({
					id: 606,
					title: "Documental paginado",
					genre_ids: [99],
				}),
			],
			total_pages: 9,
			total_results: 173,
		};

		mocks.tmdbFetch
			.mockResolvedValueOnce(genreResponse)
			.mockResolvedValueOnce(documentariesResponse);

		const result = await service.getDocumentariesPage(
			3,
			abortController.signal,
		);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(2);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			1,
			"/genre/movie/list",
			{
				language: "en-US",
			},
			{
				signal: abortController.signal,
			},
		);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			2,
			"/discover/movie",
			{
				language: "es-ES",
				page: 3,
				sort_by: "popularity.desc",
				with_genres: 99,
				include_adult: false,
				include_video: false,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toEqual({
			items: [
				{
					id: 606,
					mediaType: "movie",
					title: "Documental paginado",
					overview: "Una historia ambientada en Arrakis.",
					posterPath: "/dune-poster.jpg",
					backdropPath: "/dune-backdrop.jpg",
					voteAverage: 8.2,
					releaseDate: "2021-10-22",
					genreIds: [99],
				},
			],
			page: 3,
			totalPages: 9,
			totalResults: 173,
		});
	});

	it("reutiliza el genreId cacheado en páginas documentales posteriores", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch
			.mockResolvedValueOnce({
				genres: [
					{
						id: 99,
						name: "Documentary",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce({
				page: 1,
				results: [
					createMovieResult({
						id: 701,
						title: "Primer documental",
					}),
				],
				total_pages: 4,
				total_results: 70,
			} satisfies TmdbListResponse<TmdbMovieResult>)
			.mockResolvedValueOnce({
				page: 2,
				results: [
					createMovieResult({
						id: 702,
						title: "Segundo documental",
					}),
				],
				total_pages: 4,
				total_results: 70,
			} satisfies TmdbListResponse<TmdbMovieResult>);

		const firstPage = await service.getDocumentariesPage(1);
		const secondPage = await service.getDocumentariesPage(2);

		expect(firstPage.items[0]?.title).toBe("Primer documental");
		expect(secondPage.items[0]?.title).toBe("Segundo documental");
		expect(firstPage.page).toBe(1);
		expect(secondPage.page).toBe(2);

		const genreRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/genre/movie/list",
		);

		const discoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/movie",
		);

		expect(genreRequests).toHaveLength(1);
		expect(discoverRequests).toHaveLength(2);

		expect(discoverRequests[0]?.[1]).toMatchObject({
			page: 1,
			with_genres: 99,
		});

		expect(discoverRequests[1]?.[1]).toMatchObject({
			page: 2,
			with_genres: 99,
		});
	});
});

describe("TmdbMediaService.getPopularMovies", () => {
	it("consulta y normaliza películas populares", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValue(
			createListResponse([
				createMovieResult({
					id: 404,
					title: "Película popular",
				}),
			]),
		);

		const result = await service.getPopularMovies(3, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/popular",
			{
				language: "es-ES",
				page: 3,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 404,
			mediaType: "movie",
			title: "Película popular",
		});
	});

	it("usa la primera página de forma predeterminada", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValue(createListResponse([]));

		await service.getPopularMovies();

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/popular",
			{
				language: "es-ES",
				page: 1,
			},
			{
				signal: undefined,
			},
		);
	});
});

describe("TmdbMediaService.getPopularSeries", () => {
	it("consulta y normaliza series populares", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValue(
			createListResponse([
				createTvResult({
					id: 505,
					name: "Serie popular",
				}),
			]),
		);

		const result = await service.getPopularSeries(2, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/popular",
			{
				language: "es-ES",
				page: 2,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 505,
			mediaType: "tv",
			title: "Serie popular",
		});
	});

	it("usa la primera página de forma predeterminada", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValue(createListResponse([]));

		await service.getPopularSeries();

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/popular",
			{
				language: "es-ES",
				page: 1,
			},
			{
				signal: undefined,
			},
		);
	});
});

describe("TmdbMediaService.getDocumentaries", () => {
	it("obtiene el género Documentary y consulta únicamente películas", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const genreResponse: TmdbGenreListResponse = {
			genres: [
				{
					id: 18,
					name: "Drama",
				},
				{
					id: 99,
					name: "  Documentary  ",
				},
			],
		};

		mocks.tmdbFetch.mockResolvedValueOnce(genreResponse).mockResolvedValueOnce(
			createListResponse([
				createMovieResult({
					id: 606,
					title: "Documental de prueba",
					genre_ids: [99],
				}),
			]),
		);

		const result = await service.getDocumentaries(4, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(2);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			1,
			"/genre/movie/list",
			{
				language: "en-US",
			},
			{
				signal: abortController.signal,
			},
		);

		expect(mocks.tmdbFetch).toHaveBeenNthCalledWith(
			2,
			"/discover/movie",
			{
				language: "es-ES",
				page: 4,
				sort_by: "popularity.desc",
				with_genres: 99,
				include_adult: false,
				include_video: false,
			},
			{
				signal: abortController.signal,
			},
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 606,
			mediaType: "movie",
			title: "Documental de prueba",
			genreIds: [99],
		});
	});

	it("cachea el identificador del género Documentary en la instancia", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch
			.mockResolvedValueOnce({
				genres: [
					{
						id: 99,
						name: "Documentary",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce(
				createListResponse([
					createMovieResult({
						id: 701,
						title: "Primer documental",
					}),
				]),
			)
			.mockResolvedValueOnce(
				createListResponse([
					createMovieResult({
						id: 702,
						title: "Segundo documental",
					}),
				]),
			);

		const firstResult = await service.getDocumentaries(1);
		const secondResult = await service.getDocumentaries(2);

		expect(firstResult[0]?.title).toBe("Primer documental");
		expect(secondResult[0]?.title).toBe("Segundo documental");

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(3);

		const genreRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/genre/movie/list",
		);
		const discoverRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/discover/movie",
		);

		expect(genreRequests).toHaveLength(1);
		expect(discoverRequests).toHaveLength(2);

		expect(discoverRequests[0]?.[1]).toMatchObject({
			page: 1,
			with_genres: 99,
		});
		expect(discoverRequests[1]?.[1]).toMatchObject({
			page: 2,
			with_genres: 99,
		});
	});

	it("mantiene la caché aislada entre instancias del servicio", async () => {
		const firstService = new TmdbMediaService();
		const secondService = new TmdbMediaService();

		mocks.tmdbFetch
			.mockResolvedValueOnce({
				genres: [
					{
						id: 99,
						name: "Documentary",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce(createListResponse([]))
			.mockResolvedValueOnce({
				genres: [
					{
						id: 99,
						name: "Documentary",
					},
				],
			} satisfies TmdbGenreListResponse)
			.mockResolvedValueOnce(createListResponse([]));

		await firstService.getDocumentaries();
		await secondService.getDocumentaries();

		const genreRequests = mocks.tmdbFetch.mock.calls.filter(
			([path]) => path === "/genre/movie/list",
		);

		expect(genreRequests).toHaveLength(2);
	});

	it("lanza TmdbRequestError cuando TMDB no devuelve Documentary", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValue({
			genres: [
				{
					id: 18,
					name: "Drama",
				},
				{
					id: 35,
					name: "Comedy",
				},
			],
		} satisfies TmdbGenreListResponse);

		await expect(service.getDocumentaries()).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "TMDB no devolvió el género Documentary.",
			status: undefined,
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).not.toHaveBeenCalledWith(
			"/discover/movie",
			expect.anything(),
			expect.anything(),
		);
	});
});

describe("TmdbMediaService detail requests", () => {
	it("getMediaDetails consulta y normaliza una película", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValue({
			id: 101,
			title: "Detalle de película",
			original_title: "Original movie title",
			overview: "Descripción de la película.",
			runtime: 125,
			genres: [
				{
					id: 18,
					name: "Drama",
				},
			],
			credits: {
				cast: [
					{
						id: 501,
						name: "Actor principal",
						character: "Personaje principal",
						profile_path: "/actor.jpg",
						order: 0,
					},
				],
			},
		});

		await expect(
			service.getMediaDetails("movie", 101, abortController.signal),
		).resolves.toEqual({
			id: 101,
			mediaType: "movie",
			title: "Detalle de película",
			originalTitle: "Original movie title",
			overview: "Descripción de la película.",
			posterPath: null,
			backdropPath: null,
			genres: [
				{
					id: 18,
					name: "Drama",
				},
			],
			voteAverage: 0,
			voteCount: 0,
			releaseDate: null,
			status: null,
			tagline: null,
			originalLanguage: null,
			runtime: 125,
			numberOfSeasons: null,
			numberOfEpisodes: null,
			seasons: [],
			cast: [
				{
					id: 501,
					name: "Actor principal",
					character: "Personaje principal",
					profilePath: "/actor.jpg",
				},
			],
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/101",
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it("getMediaDetails consulta y normaliza una serie", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValue({
			id: 202,
			name: "Detalle de serie",
			original_name: "Original series name",
			overview: "Descripción de la serie.",
			number_of_seasons: 2,
			number_of_episodes: 16,
			seasons: [
				{
					id: 302,
					season_number: 2,
					name: "Temporada 2",
					episode_count: 8,
				},
				{
					id: 300,
					season_number: 0,
					name: "Especiales",
					episode_count: 3,
				},
				{
					id: 301,
					season_number: 1,
					name: "Temporada 1",
					episode_count: 8,
				},
			],
		});

		await expect(
			service.getMediaDetails("tv", 202, abortController.signal),
		).resolves.toEqual({
			id: 202,
			mediaType: "tv",
			title: "Detalle de serie",
			originalTitle: "Original series name",
			overview: "Descripción de la serie.",
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
			numberOfSeasons: 2,
			numberOfEpisodes: 16,
			seasons: [
				{
					id: 301,
					seasonNumber: 1,
					name: "Temporada 1",
					overview: "",
					posterPath: null,
					episodeCount: 8,
					airDate: null,
				},
				{
					id: 302,
					seasonNumber: 2,
					name: "Temporada 2",
					overview: "",
					posterPath: null,
					episodeCount: 8,
					airDate: null,
				},
			],
			cast: [],
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/202",
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it("no solicita vídeos, recomendaciones, similares ni episodios al consultar una película", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValue({
			id: 101,
			title: "Película sin recursos adicionales",
		});

		await service.getMediaDetails("movie", 101);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);

		const call = mocks.tmdbFetch.mock.calls[0];

		expect(call).toBeDefined();

		const [path, params] = call ?? [];

		expect(path).toBe("/movie/101");
		expect(params).toEqual({
			language: "es-ES",
			append_to_response: "credits",
		});

		expect(params).not.toHaveProperty("videos");
		expect(params).not.toHaveProperty("recommendations");
		expect(params).not.toHaveProperty("similar");
		expect(params).not.toHaveProperty("episodes");
	});

	it("no solicita vídeos, recomendaciones, similares ni temporadas individuales al consultar una serie", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValue({
			id: 202,
			name: "Serie sin recursos adicionales",
		});

		await service.getMediaDetails("tv", 202);

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);

		const call = mocks.tmdbFetch.mock.calls[0];

		expect(call).toBeDefined();

		const [path, params] = call ?? [];

		expect(path).toBe("/tv/202");
		expect(params).toEqual({
			language: "es-ES",
			append_to_response: "credits",
		});

		expect(params).not.toHaveProperty("videos");
		expect(params).not.toHaveProperty("recommendations");
		expect(params).not.toHaveProperty("similar");
		expect(params).not.toHaveProperty("episodes");

		const seasonRequests = mocks.tmdbFetch.mock.calls.filter(([requestPath]) =>
			String(requestPath).includes("/season/"),
		);

		expect(seasonRequests).toHaveLength(0);
	});

	it("getMovieDetails reenvía exactamente el mismo AbortSignal", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValue({
			id: 101,
			title: "Detalle de película",
		});

		await service.getMovieDetails(101, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/101",
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it("getSeriesDetails reenvía exactamente el mismo AbortSignal", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		mocks.tmdbFetch.mockResolvedValue({
			id: 202,
			name: "Detalle de serie",
		});

		await service.getSeriesDetails(202, abortController.signal);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/202",
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("getMediaDetails rechaza el mediaId inválido %s", async (mediaId) => {
		const service = new TmdbMediaService();

		await expect(
			service.getMediaDetails("movie", mediaId),
		).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "mediaId debe ser un entero positivo válido.",
		});

		expect(mocks.tmdbFetch).not.toHaveBeenCalled();
	});

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("getMovieDetails rechaza el movieId inválido %s", async (movieId) => {
		const service = new TmdbMediaService();

		await expect(service.getMovieDetails(movieId)).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "movieId debe ser un entero positivo válido.",
		});

		expect(mocks.tmdbFetch).not.toHaveBeenCalled();
	});

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("getSeriesDetails rechaza el seriesId inválido %s", async (seriesId) => {
		const service = new TmdbMediaService();

		await expect(service.getSeriesDetails(seriesId)).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "seriesId debe ser un entero positivo válido.",
		});

		expect(mocks.tmdbFetch).not.toHaveBeenCalled();
	});

	it("acepta Number.MAX_SAFE_INTEGER como mediaId", async () => {
		const service = new TmdbMediaService();
		const mediaId = Number.MAX_SAFE_INTEGER;

		mocks.tmdbFetch.mockResolvedValue({
			id: mediaId,
			title: "Película con identificador máximo",
		});

		await expect(
			service.getMediaDetails("movie", mediaId),
		).resolves.toMatchObject({
			id: mediaId,
			mediaType: "movie",
			title: "Película con identificador máximo",
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			`/movie/${Number.MAX_SAFE_INTEGER}`,
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: undefined,
			},
		);
	});

	it("rechaza un mediaType técnico no soportado sin llamar a TMDB", async () => {
		const service = new TmdbMediaService();

		await expect(
			service.getMediaDetails("documentary" as never, 101),
		).rejects.toMatchObject({
			name: "TmdbRequestError",
			message: "El tipo de contenido documentary no es válido.",
		});

		expect(mocks.tmdbFetch).not.toHaveBeenCalled();
	});

	it("transforma un 404 de película en TmdbMediaNotFoundError", async () => {
		const service = new TmdbMediaService();

		const httpError = Object.assign(new Error("Not found"), {
			status: 404,
		});

		mocks.tmdbFetch.mockRejectedValue(httpError);

		let capturedError: unknown;

		try {
			await service.getMovieDetails(101);
		} catch (error: unknown) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(TmdbMediaNotFoundError);
		expect(capturedError).toMatchObject({
			name: "TmdbMediaNotFoundError",
			message: "The requested media resource was not found.",
			mediaType: "movie",
			mediaId: 101,
		});
	});

	it("transforma un 404 de serie en TmdbMediaNotFoundError", async () => {
		const service = new TmdbMediaService();

		const httpError = Object.assign(new Error("Not found"), {
			status: 404,
		});

		mocks.tmdbFetch.mockRejectedValue(httpError);

		let capturedError: unknown;

		try {
			await service.getSeriesDetails(202);
		} catch (error: unknown) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(TmdbMediaNotFoundError);
		expect(capturedError).toMatchObject({
			name: "TmdbMediaNotFoundError",
			message: "The requested media resource was not found.",
			mediaType: "tv",
			mediaId: 202,
		});
	});

	it("no transforma en not-found un error cuyo status no es numérico", async () => {
		const service = new TmdbMediaService();

		const malformedHttpError = Object.assign(new Error("Malformed status"), {
			status: "404",
		});

		mocks.tmdbFetch.mockRejectedValue(malformedHttpError);

		await expect(service.getMovieDetails(101)).rejects.toBe(malformedHttpError);
	});

	it("propaga sin envolver los errores generales de película", async () => {
		const service = new TmdbMediaService();
		const networkError = new TypeError("Failed to fetch");

		mocks.tmdbFetch.mockRejectedValue(networkError);

		await expect(service.getMovieDetails(101)).rejects.toBe(networkError);
	});

	it("propaga sin envolver los errores generales de serie", async () => {
		const service = new TmdbMediaService();
		const networkError = new TypeError("Failed to fetch");

		mocks.tmdbFetch.mockRejectedValue(networkError);

		await expect(service.getSeriesDetails(202)).rejects.toBe(networkError);
	});

	it("propaga el mismo AbortError al consultar una película", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const abortError = new DOMException(
			"The operation was aborted.",
			"AbortError",
		);

		mocks.tmdbFetch.mockRejectedValue(abortError);

		await expect(
			service.getMediaDetails("movie", 101, abortController.signal),
		).rejects.toBe(abortError);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/101",
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it("propaga el mismo AbortError al consultar una serie", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const abortError = new DOMException(
			"The operation was aborted.",
			"AbortError",
		);

		mocks.tmdbFetch.mockRejectedValue(abortError);

		await expect(
			service.getMediaDetails("tv", 202, abortController.signal),
		).rejects.toBe(abortError);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/202",
			{
				language: "es-ES",
				append_to_response: "credits",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it("consulta y normaliza una temporada de una serie", async () => {
		const service = new TmdbMediaService();

		const response = {
			id: 303,
			season_number: 2,
			name: "Temporada dos",
			overview: "La segunda temporada.",
			poster_path: "/season-poster.jpg",
			air_date: "2012-01-01",
			vote_average: 8.4,
			episodes: [
				{
					id: 9002,
					episode_number: 2,
					season_number: 2,
					name: "Segundo episodio",
					overview: "Continúa la historia.",
					still_path: "/episode-2.jpg",
					air_date: "2012-01-08",
					runtime: 47,
					vote_average: 8.5,
					vote_count: 123,
				},
				{
					id: 9001,
					episode_number: 1,
					season_number: 2,
					name: "Primer episodio",
					overview: "Comienza la temporada.",
					still_path: "/episode-1.jpg",
					air_date: "2012-01-01",
					runtime: 45,
					vote_average: 8.1,
					vote_count: 100,
				},
			],
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		await expect(service.getSeriesSeason(202, 2)).resolves.toEqual({
			id: 303,
			seriesId: 202,
			seasonNumber: 2,
			name: "Temporada dos",
			overview: "La segunda temporada.",
			posterPath: "/season-poster.jpg",
			airDate: "2012-01-01",
			episodeCount: 2,
			voteAverage: 8.4,
			episodes: [
				{
					id: 9001,
					episodeNumber: 1,
					seasonNumber: 2,
					name: "Primer episodio",
					overview: "Comienza la temporada.",
					stillPath: "/episode-1.jpg",
					airDate: "2012-01-01",
					runtime: 45,
					voteAverage: 8.1,
					voteCount: 100,
				},
				{
					id: 9002,
					episodeNumber: 2,
					seasonNumber: 2,
					name: "Segundo episodio",
					overview: "Continúa la historia.",
					stillPath: "/episode-2.jpg",
					airDate: "2012-01-08",
					runtime: 47,
					voteAverage: 8.5,
					voteCount: 123,
				},
			],
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/202/season/2",
			{
				language: "es-ES",
			},
			{
				signal: undefined,
			},
		);
	});

	it("permite consultar la temporada 0 de especiales", async () => {
		const service = new TmdbMediaService();

		mocks.tmdbFetch.mockResolvedValue({
			id: 300,
			season_number: 0,
			name: "",
			overview: "",
			poster_path: null,
			air_date: null,
			vote_average: 0,
			episodes: [],
		});

		await expect(service.getSeriesSeason(202, 0)).resolves.toEqual({
			id: 300,
			seriesId: 202,
			seasonNumber: 0,
			name: "Especiales",
			overview: "",
			posterPath: null,
			episodeCount: 0,
			voteAverage: 0,
			episodes: [],
		});

		expect(mocks.tmdbFetch).toHaveBeenCalledTimes(1);
		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/202/season/0",
			{
				language: "es-ES",
			},
			{
				signal: undefined,
			},
		);
	});
});

describe("TmdbMediaService.getWelcomeContent", () => {
	it("carga todas las secciones mediante sus métodos públicos", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		const trendingItems = [
			createMediaItem({
				id: 1,
				title: "Tendencia",
			}),
		];
		const movieItems = [
			createMediaItem({
				id: 2,
				title: "Película popular",
			}),
		];
		const seriesItems = [
			createMediaItem({
				id: 3,
				mediaType: "tv",
				title: "Serie popular",
			}),
		];
		const documentaryItems = [
			createMediaItem({
				id: 4,
				title: "Documental",
			}),
		];

		const getTrendingSpy = vi
			.spyOn(service, "getTrending")
			.mockResolvedValue(trendingItems);
		const getPopularMoviesSpy = vi
			.spyOn(service, "getPopularMovies")
			.mockResolvedValue(movieItems);
		const getPopularSeriesSpy = vi
			.spyOn(service, "getPopularSeries")
			.mockResolvedValue(seriesItems);
		const getDocumentariesSpy = vi
			.spyOn(service, "getDocumentaries")
			.mockResolvedValue(documentaryItems);

		const result = await service.getWelcomeContent(abortController.signal);

		expect(getTrendingSpy).toHaveBeenCalledWith(abortController.signal);
		expect(getPopularMoviesSpy).toHaveBeenCalledWith(1, abortController.signal);
		expect(getPopularSeriesSpy).toHaveBeenCalledWith(1, abortController.signal);
		expect(getDocumentariesSpy).toHaveBeenCalledWith(1, abortController.signal);

		expect(result.sections).toEqual([
			{
				id: "trending",
				title: "Tendencias",
				items: trendingItems,
			},
			{
				id: "popular-movies",
				title: "Películas populares",
				items: movieItems,
			},
			{
				id: "popular-series",
				title: "Series populares",
				items: seriesItems,
			},
			{
				id: "documentaries",
				title: "Documentales",
				items: documentaryItems,
			},
		]);
		expect(result.failedSections).toEqual([]);
		expect(result.hero).toBe(trendingItems[0]);
	});

	it("usa Promise.allSettled y espera a que finalicen todas las secciones", async () => {
		const service = new TmdbMediaService();

		let resolveTrending: ((items: readonly MediaItem[]) => void) | undefined;

		const pendingTrending = new Promise<readonly MediaItem[]>((resolve) => {
			resolveTrending = resolve;
		});

		vi.spyOn(service, "getTrending").mockReturnValue(pendingTrending);
		vi.spyOn(service, "getPopularMovies").mockRejectedValue(
			new Error("Movies unavailable"),
		);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([
			createMediaItem({
				id: 3,
				mediaType: "tv",
			}),
		]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([
			createMediaItem({
				id: 4,
			}),
		]);

		let settled = false;

		const resultPromise = service.getWelcomeContent();

		void resultPromise.then(
			() => {
				settled = true;
			},
			() => {
				settled = true;
			},
		);

		await Promise.resolve();

		expect(settled).toBe(false);

		resolveTrending?.([
			createMediaItem({
				id: 1,
			}),
		]);

		const result = await resultPromise;

		expect(settled).toBe(true);
		expect(result.failedSections).toEqual(["popular-movies"]);
		expect(result.sections.map((section) => section.id)).toEqual([
			"trending",
			"popular-series",
			"documentaries",
		]);
	});

	it("mantiene las secciones correctas cuando una sección falla", async () => {
		const service = new TmdbMediaService();

		const trendingItem = createMediaItem({
			id: 1,
			title: "Tendencia disponible",
		});

		vi.spyOn(service, "getTrending").mockResolvedValue([trendingItem]);
		vi.spyOn(service, "getPopularMovies").mockResolvedValue([
			createMediaItem({
				id: 2,
				title: "Película disponible",
			}),
		]);
		vi.spyOn(service, "getPopularSeries").mockRejectedValue(
			new Error("Series unavailable"),
		);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([
			createMediaItem({
				id: 4,
				title: "Documental disponible",
			}),
		]);

		const result = await service.getWelcomeContent();

		expect(result.failedSections).toEqual(["popular-series"]);
		expect(result.sections.map((section) => section.id)).toEqual([
			"trending",
			"popular-movies",
			"documentaries",
		]);
		expect(result.sections).not.toContainEqual(
			expect.objectContaining({
				id: "popular-series",
			}),
		);
		expect(result.hero).toBe(trendingItem);
	});

	it("registra varias secciones fallidas manteniendo las disponibles", async () => {
		const service = new TmdbMediaService();

		const seriesItem = createMediaItem({
			id: 3,
			mediaType: "tv",
			title: "Serie disponible",
		});

		vi.spyOn(service, "getTrending").mockRejectedValue(
			new Error("Trending unavailable"),
		);
		vi.spyOn(service, "getPopularMovies").mockRejectedValue(
			new Error("Movies unavailable"),
		);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([seriesItem]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([]);

		const result = await service.getWelcomeContent();

		expect(result.failedSections).toEqual(["trending", "popular-movies"]);
		expect(result.sections.map((section) => section.id)).toEqual([
			"popular-series",
			"documentaries",
		]);
		expect(result.hero).toBe(seriesItem);
	});

	it("lanza un error global cuando fallan todas las secciones", async () => {
		const service = new TmdbMediaService();

		vi.spyOn(service, "getTrending").mockRejectedValue(
			new Error("Trending unavailable"),
		);
		vi.spyOn(service, "getPopularMovies").mockRejectedValue(
			new Error("Movies unavailable"),
		);
		vi.spyOn(service, "getPopularSeries").mockRejectedValue(
			new Error("Series unavailable"),
		);
		vi.spyOn(service, "getDocumentaries").mockRejectedValue(
			new Error("Documentaries unavailable"),
		);

		let capturedError: unknown;

		try {
			await service.getWelcomeContent();
		} catch (error) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(TmdbRequestError);
		expect(capturedError).toMatchObject({
			name: "TmdbRequestError",
			message: "No se pudo cargar el contenido de Nexlit.",
			status: undefined,
		});
	});

	it("propaga un AbortError cuando la señal está abortada", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();

		abortController.abort();

		vi.spyOn(service, "getTrending").mockResolvedValue([]);
		vi.spyOn(service, "getPopularMovies").mockResolvedValue([]);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([]);

		let capturedError: unknown;

		try {
			await service.getWelcomeContent(abortController.signal);
		} catch (error) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(DOMException);
		expect(capturedError).toMatchObject({
			name: "AbortError",
			message: "Request aborted",
		});
	});

	it("prioriza para el hero un elemento con backdrop y overview", async () => {
		const service = new TmdbMediaService();

		const firstItem = createMediaItem({
			id: 1,
			title: "Solo backdrop",
			overview: "",
			backdropPath: "/first.jpg",
		});
		const preferredItem = createMediaItem({
			id: 2,
			title: "Backdrop y overview",
			overview: "Descripción disponible.",
			backdropPath: "/preferred.jpg",
		});

		vi.spyOn(service, "getTrending").mockResolvedValue([firstItem]);
		vi.spyOn(service, "getPopularMovies").mockResolvedValue([preferredItem]);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([]);

		const result = await service.getWelcomeContent();

		expect(result.hero).toBe(preferredItem);
	});

	it("usa un elemento con backdrop cuando ninguno tiene overview", async () => {
		const service = new TmdbMediaService();

		const firstItem = createMediaItem({
			id: 1,
			title: "Sin backdrop",
			overview: "",
			backdropPath: null,
		});
		const backdropItem = createMediaItem({
			id: 2,
			title: "Con backdrop",
			overview: "",
			backdropPath: "/backdrop.jpg",
		});

		vi.spyOn(service, "getTrending").mockResolvedValue([
			firstItem,
			backdropItem,
		]);
		vi.spyOn(service, "getPopularMovies").mockResolvedValue([]);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([]);

		const result = await service.getWelcomeContent();

		expect(result.hero).toBe(backdropItem);
	});

	it("usa el primer contenido cuando ninguno tiene backdrop", async () => {
		const service = new TmdbMediaService();

		const firstItem = createMediaItem({
			id: 1,
			title: "Primer contenido",
			overview: "",
			backdropPath: null,
		});
		const secondItem = createMediaItem({
			id: 2,
			title: "Segundo contenido",
			overview: "Con descripción pero sin backdrop.",
			backdropPath: null,
		});

		vi.spyOn(service, "getTrending").mockResolvedValue([firstItem, secondItem]);
		vi.spyOn(service, "getPopularMovies").mockResolvedValue([]);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([]);

		const result = await service.getWelcomeContent();

		expect(result.hero).toBe(firstItem);
	});

	it("devuelve hero null cuando todas las secciones están vacías", async () => {
		const service = new TmdbMediaService();

		vi.spyOn(service, "getTrending").mockResolvedValue([]);
		vi.spyOn(service, "getPopularMovies").mockResolvedValue([]);
		vi.spyOn(service, "getPopularSeries").mockResolvedValue([]);
		vi.spyOn(service, "getDocumentaries").mockResolvedValue([]);

		const result = await service.getWelcomeContent();

		expect(result.hero).toBeNull();
		expect(result.failedSections).toEqual([]);
		expect(result.sections).toHaveLength(4);
		expect(result.sections.every((section) => section.items.length === 0)).toBe(
			true,
		);
	});
});

describe("TmdbRequestError", () => {
	it("expone nombre, mensaje y status opcional", () => {
		const error = new TmdbRequestError("TMDB request failed.", 503);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("TmdbRequestError");
		expect(error.message).toBe("TMDB request failed.");
		expect(error.status).toBe(503);
	});
});
