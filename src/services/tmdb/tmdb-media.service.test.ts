import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	tmdbFetch: vi.fn(),
}));

vi.mock("./tmdb.client", () => ({
	tmdbFetch: mocks.tmdbFetch,
}));

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
	it("consulta el detalle de una película", async () => {
		const service = new TmdbMediaService();
		const abortController = new AbortController();
		const response = {
			id: 101,
			title: "Detalle de película",
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		await expect(
			service.getMovieDetails(101, abortController.signal),
		).resolves.toEqual(response);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/movie/101",
			{
				language: "es-ES",
				append_to_response: "recommendations,credits,videos",
			},
			{
				signal: abortController.signal,
			},
		);
	});

	it("consulta el detalle de una serie", async () => {
		const service = new TmdbMediaService();
		const response = {
			id: 202,
			name: "Detalle de serie",
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		await expect(service.getSeriesDetails(202)).resolves.toEqual(response);

		expect(mocks.tmdbFetch).toHaveBeenCalledWith(
			"/tv/202",
			{
				language: "es-ES",
				append_to_response: "recommendations,credits,videos",
			},
			{
				signal: undefined,
			},
		);
	});

	it("consulta una temporada de una serie", async () => {
		const service = new TmdbMediaService();
		const response = {
			id: 303,
			season_number: 2,
		};

		mocks.tmdbFetch.mockResolvedValue(response);

		await expect(service.getSeriesSeason(202, 2)).resolves.toEqual(response);

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
