import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DEFAULT_API_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_READ_ACCESS_TOKEN = "test-read-access-token";

const mocks = vi.hoisted(() => ({
	env: {
		tmdb: {
			apiBaseUrl: "https://api.themoviedb.org/3",
			imageBaseUrl: "https://image.tmdb.org/t/p",
			readAccessToken: "test-read-access-token",
			apiKey: "test-api-key",
		},
	},
}));

vi.mock("../../core/config/env", () => ({
	env: mocks.env,
}));

import { TmdbHttpError, tmdbFetch } from "./tmdb.client";

const fetchMock = vi.fn<typeof fetch>();

function createJsonResponse<T>(body: T, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

function getFetchCall(): [URL, RequestInit] {
	expect(fetchMock).toHaveBeenCalledTimes(1);

	const call = fetchMock.mock.calls[0];

	expect(call).toBeDefined();

	const [input, init] = call as [RequestInfo | URL, RequestInit | undefined];

	expect(input).toBeInstanceOf(URL);
	expect(init).toBeDefined();

	return [input as URL, init as RequestInit];
}

beforeEach(() => {
	mocks.env.tmdb.apiBaseUrl = DEFAULT_API_BASE_URL;
	mocks.env.tmdb.readAccessToken = DEFAULT_READ_ACCESS_TOKEN;

	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("tmdbFetch", () => {
	it("realiza la petición contra la URL de TMDB", async () => {
		const responseBody = {
			page: 1,
			results: [],
		};

		fetchMock.mockResolvedValue(createJsonResponse(responseBody));

		await expect(
			tmdbFetch<typeof responseBody>("/movie/popular"),
		).resolves.toEqual(responseBody);

		const [url] = getFetchCall();

		expect(url.toString()).toBe("https://api.themoviedb.org/3/movie/popular");
	});

	it("convierte los parámetros string, number y boolean a query params", async () => {
		fetchMock.mockResolvedValue(
			createJsonResponse({
				results: [],
			}),
		);

		await tmdbFetch("/discover/movie", {
			language: "es-ES",
			page: 3,
			include_adult: false,
			include_video: true,
			unused: undefined,
		});

		const [url] = getFetchCall();

		expect(url.pathname).toBe("/3/discover/movie");
		expect(url.searchParams.get("language")).toBe("es-ES");
		expect(url.searchParams.get("page")).toBe("3");
		expect(url.searchParams.get("include_adult")).toBe("false");
		expect(url.searchParams.get("include_video")).toBe("true");
		expect(url.searchParams.has("unused")).toBe(false);
	});

	it("conserva los query params incluidos en el path y añade los nuevos", async () => {
		fetchMock.mockResolvedValue(
			createJsonResponse({
				results: [],
			}),
		);

		await tmdbFetch("/discover/movie?sort_by=popularity.desc", {
			language: "es-ES",
			page: 2,
		});

		const [url] = getFetchCall();

		expect(url.searchParams.get("sort_by")).toBe("popularity.desc");
		expect(url.searchParams.get("language")).toBe("es-ES");
		expect(url.searchParams.get("page")).toBe("2");
	});

	it("sobrescribe un query param existente cuando también se proporciona en params", async () => {
		fetchMock.mockResolvedValue(
			createJsonResponse({
				results: [],
			}),
		);

		await tmdbFetch("/movie/popular?page=1", {
			page: 4,
		});

		const [url] = getFetchCall();

		expect(url.searchParams.getAll("page")).toEqual(["4"]);
	});

	it("envía el Bearer token y el Content-Type esperado", async () => {
		fetchMock.mockResolvedValue(
			createJsonResponse({
				results: [],
			}),
		);

		await tmdbFetch("/trending/all/day");

		const [, requestInit] = getFetchCall();
		const headers = new Headers(requestInit.headers);

		expect(headers.get("Authorization")).toBe(
			`Bearer ${DEFAULT_READ_ACCESS_TOKEN}`,
		);
		expect(headers.get("Content-Type")).toBe("application/json;charset=utf-8");
	});

	it("reenvía el mismo AbortSignal a fetch", async () => {
		const abortController = new AbortController();

		fetchMock.mockResolvedValue(
			createJsonResponse({
				results: [],
			}),
		);

		await tmdbFetch(
			"/tv/popular",
			{
				language: "es-ES",
			},
			{
				signal: abortController.signal,
			},
		);

		const [, requestInit] = getFetchCall();

		expect(requestInit.signal).toBe(abortController.signal);
	});

	it("devuelve el JSON de una respuesta correcta", async () => {
		const responseBody = {
			id: 101,
			title: "Película de prueba",
			nested: {
				value: true,
			},
		};

		fetchMock.mockResolvedValue(createJsonResponse(responseBody));

		const result = await tmdbFetch<typeof responseBody>("/movie/101");

		expect(result).toEqual(responseBody);
		expect(result).not.toBe(responseBody);
	});

	it("lanza TmdbHttpError cuando la respuesta HTTP no es correcta", async () => {
		fetchMock.mockResolvedValue(
			createJsonResponse(
				{
					status_message: "Service unavailable",
				},
				503,
			),
		);

		let capturedError: unknown;

		try {
			await tmdbFetch("/movie/popular");
		} catch (error) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(TmdbHttpError);
		expect(capturedError).toMatchObject({
			name: "TmdbHttpError",
			message: "TMDB request failed with status 503.",
			status: 503,
		});
	});

	it("no expone el token ni la URL solicitada en el error HTTP", async () => {
		const privateToken = "private-super-secret-token";

		mocks.env.tmdb.readAccessToken = privateToken;

		fetchMock.mockResolvedValue(
			createJsonResponse(
				{
					status_message: "Unauthorized",
				},
				401,
			),
		);

		let capturedError: unknown;

		try {
			await tmdbFetch("/movie/12345", {
				language: "es-ES",
			});
		} catch (error) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(Error);

		const errorMessage = (capturedError as Error).message;

		expect(errorMessage).not.toContain(privateToken);
		expect(errorMessage).not.toContain("/movie/12345");
		expect(errorMessage).not.toContain(DEFAULT_API_BASE_URL);
	});

	it("propaga los errores de red originales", async () => {
		const networkError = new TypeError("Failed to fetch");

		fetchMock.mockRejectedValue(networkError);

		await expect(tmdbFetch("/movie/popular")).rejects.toBe(networkError);
	});

	it("propaga un AbortError producido por fetch", async () => {
		const abortError = new DOMException(
			"The operation was aborted.",
			"AbortError",
		);

		fetchMock.mockRejectedValue(abortError);

		await expect(
			tmdbFetch(
				"/movie/popular",
				{},
				{
					signal: new AbortController().signal,
				},
			),
		).rejects.toBe(abortError);
	});

	it("usa los valores actuales de configuración en cada petición", async () => {
		mocks.env.tmdb.apiBaseUrl = "https://example-tmdb.test/api/v3";
		mocks.env.tmdb.readAccessToken = "alternative-token";

		fetchMock.mockResolvedValue(
			createJsonResponse({
				results: [],
			}),
		);

		await tmdbFetch("/movie/popular");

		const [url, requestInit] = getFetchCall();
		const headers = new Headers(requestInit.headers);

		expect(url.toString()).toBe(
			"https://example-tmdb.test/api/v3/movie/popular",
		);
		expect(headers.get("Authorization")).toBe("Bearer alternative-token");
	});
});

describe("TmdbHttpError", () => {
	it("expone nombre, estado y mensaje controlado", () => {
		const error = new TmdbHttpError(404);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("TmdbHttpError");
		expect(error.status).toBe(404);
		expect(error.message).toBe("TMDB request failed with status 404.");
	});
});
