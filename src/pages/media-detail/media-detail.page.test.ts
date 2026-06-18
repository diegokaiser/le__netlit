import type { RouterLocation } from "@vaadin/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getMediaDetails: vi.fn(),
	buildTmdbImageUrl: vi.fn(),
}));

vi.mock("../../components/layout/app-navbar/app-navbar", () => ({}));

vi.mock("../../core/utils/build-tmdb-image-url", () => ({
	buildTmdbImageUrl: mocks.buildTmdbImageUrl,
}));

vi.mock("../../services/tmdb/tmdb-media.service", () => ({
	tmdbMediaService: {
		getMediaDetails: mocks.getMediaDetails,
	},
}));

import { TmdbMediaNotFoundError } from "../../services/tmdb/tmdb-media.errors";
import type {
	MediaDetail,
	MediaSeasonSummary,
} from "../../services/tmdb/tmdb.types";
import "./media-detail.page";
import type { MediaDetailPage } from "./media-detail.page";

const MEDIA_DETAIL_PAGE_TAG = "app-media-detail-page";
const IMAGE_PLACEHOLDER_PATH = "/images/media-placeholder.svg";

class AppNavbarStub extends HTMLElement {}

if (!customElements.get("app-navbar")) {
	customElements.define("app-navbar", AppNavbarStub);
}

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});

	return {
		promise,
		resolve,
		reject,
	};
}

function createMovieDetail(overrides: Partial<MediaDetail> = {}): MediaDetail {
	return {
		id: 101,
		mediaType: "movie",
		title: "Dune",
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
				id: 501,
				name: "Timothée Chalamet",
				character: "Paul Atreides",
				profilePath: "/timothee.jpg",
			},
			{
				id: 502,
				name: "Rebecca Ferguson",
				character: "Lady Jessica",
				profilePath: "/rebecca.jpg",
			},
		],
		...overrides,
	};
}

function createSeriesDetail(overrides: Partial<MediaDetail> = {}): MediaDetail {
	const seasons: readonly MediaSeasonSummary[] = [
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
	];

	return {
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
		numberOfSeasons: 2,
		numberOfEpisodes: 18,
		seasons,
		cast: [
			{
				id: 601,
				name: "Louis Hofmann",
				character: "Jonas Kahnwald",
				profilePath: "/louis.jpg",
			},
		],
		...overrides,
	};
}

function createRouterLocation(
	mediaType: unknown,
	mediaId: unknown,
): RouterLocation {
	return {
		params: {
			mediaType,
			mediaId,
		},
	} as unknown as RouterLocation;
}

function getRequiredElement<T extends Element>(
	root: ParentNode,
	selector: string,
): T {
	const element = root.querySelector<T>(selector);

	expect(
		element,
		`Expected element with selector "${selector}" to exist`,
	).not.toBeNull();

	return element as T;
}

function getButtonByText(root: ParentNode, text: string): HTMLButtonElement {
	const button = Array.from(
		root.querySelectorAll<HTMLButtonElement>("button"),
	).find((candidate) => candidate.textContent?.trim() === text);

	expect(button, `Expected button with text "${text}" to exist`).toBeDefined();

	return button as HTMLButtonElement;
}

async function renderPage(): Promise<MediaDetailPage> {
	const page = document.createElement(MEDIA_DETAIL_PAGE_TAG) as MediaDetailPage;

	document.body.appendChild(page);

	await page.updateComplete;

	return page;
}

async function settle(page: MediaDetailPage, cycles = 4): Promise<void> {
	for (let cycle = 0; cycle < cycles; cycle += 1) {
		await Promise.resolve();
		await page.updateComplete;
	}
}

async function waitForCondition(
	page: MediaDetailPage,
	condition: () => boolean,
	message: string,
): Promise<void> {
	for (let attempt = 0; attempt < 30; attempt += 1) {
		await settle(page, 1);

		if (condition()) {
			return;
		}
	}

	throw new Error(message);
}

function getCallSignal(callIndex: number): AbortSignal {
	const signal = mocks.getMediaDetails.mock.calls[callIndex]?.[2];

	expect(signal).toBeInstanceOf(AbortSignal);

	return signal as AbortSignal;
}

function normalizeText(value: string | null | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

function resetMocks(): void {
	mocks.getMediaDetails.mockReset();
	mocks.buildTmdbImageUrl.mockReset();
}

describe("MediaDetailPage", () => {
	let originalDocumentTitle: string;

	beforeEach(() => {
		originalDocumentTitle = document.title;

		vi.restoreAllMocks();
		resetMocks();

		mocks.buildTmdbImageUrl.mockImplementation(
			(filePath: string | null | undefined, size = "w500"): string | null => {
				if (!filePath) {
					return null;
				}

				return `https://images.test/${size}${filePath}`;
			},
		);
	});

	afterEach(() => {
		document.body.replaceChildren();
		document.title = originalDocumentTitle;

		vi.restoreAllMocks();
	});

	it("registra el custom element, usa Light DOM y renderiza app-navbar", async () => {
		document.title = "Título anterior";

		const page = await renderPage();

		expect(customElements.get(MEDIA_DETAIL_PAGE_TAG)).toBeDefined();
		expect(page.shadowRoot).toBeNull();
		expect(page.querySelector("main")).not.toBeNull();
		expect(page.querySelector("app-navbar")).not.toBeNull();

		expect(document.title).toBe("Título anterior");
		expect(mocks.getMediaDetails).not.toHaveBeenCalled();
	});

	it.each([
		{
			mediaType: "movie",
			mediaId: "101",
			expectedMediaType: "movie" as const,
			expectedMediaId: 101,
			detail: createMovieDetail(),
		},
		{
			mediaType: "tv",
			mediaId: "202",
			expectedMediaType: "tv" as const,
			expectedMediaId: 202,
			detail: createSeriesDetail(),
		},
	])(
		"lee $mediaType/$mediaId desde RouterLocation",
		async ({
			mediaType,
			mediaId,
			expectedMediaType,
			expectedMediaId,
			detail,
		}) => {
			mocks.getMediaDetails.mockResolvedValue(detail);

			const page = await renderPage();

			page.onBeforeEnter(createRouterLocation(mediaType, mediaId));

			await waitForCondition(
				page,
				() => page.querySelector("#media-detail-title") !== null,
				"Expected media detail to become ready.",
			);

			expect(mocks.getMediaDetails).toHaveBeenCalledTimes(1);
			expect(mocks.getMediaDetails).toHaveBeenCalledWith(
				expectedMediaType,
				expectedMediaId,
				expect.any(AbortSignal),
			);
		},
	);

	it.each([
		{
			description: "documentary",
			mediaType: "documentary",
			mediaId: "101",
		},
		{
			description: "mediaType vacío",
			mediaType: "",
			mediaId: "101",
		},
		{
			description: "mediaId vacío",
			mediaType: "movie",
			mediaId: "",
		},
		{
			description: "mediaId cero",
			mediaType: "movie",
			mediaId: "0",
		},
		{
			description: "mediaId negativo",
			mediaType: "movie",
			mediaId: "-1",
		},
		{
			description: "mediaId decimal",
			mediaType: "movie",
			mediaId: "1.5",
		},
		{
			description: "mediaId NaN",
			mediaType: "movie",
			mediaId: "NaN",
		},
		{
			description: "mediaId en notación exponencial",
			mediaType: "movie",
			mediaId: "1e3",
		},
		{
			description: "mediaId ausente",
			mediaType: "movie",
			mediaId: undefined,
		},
	])(
		"renderiza invalid-route sin consultar TMDB para $description",
		async ({ mediaType, mediaId }) => {
			const page = await renderPage();

			page.onBeforeEnter(createRouterLocation(mediaType, mediaId));

			await page.updateComplete;

			expect(page.querySelectorAll("h1")).toHaveLength(1);

			expect(
				getRequiredElement<HTMLHeadingElement>(page, "h1").textContent?.trim(),
			).toBe("No podemos abrir esta dirección");

			expect(normalizeText(page.textContent)).toContain(
				"No se realizó ninguna petición al servicio de contenidos.",
			);

			expect(
				getRequiredElement<HTMLElement>(
					page,
					'[aria-live="polite"]',
				).getAttribute("aria-busy"),
			).toBeNull();

			expect(page.querySelector('a[href="/welcome"]')).not.toBeNull();

			expect(document.title).toBe("Ruta no válida | Nexlit");

			expect(mocks.getMediaDetails).not.toHaveBeenCalled();
		},
	);

	it("renderiza loading con aria-live, aria-busy y título accesible", async () => {
		const request = createDeferred<MediaDetail>();

		mocks.getMediaDetails.mockReturnValue(request.promise);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		await page.updateComplete;

		const loadingRegion = getRequiredElement<HTMLElement>(
			page,
			'[aria-live="polite"][aria-busy="true"]',
		);

		expect(loadingRegion.getAttribute("aria-live")).toBe("polite");
		expect(loadingRegion.getAttribute("aria-busy")).toBe("true");

		expect(normalizeText(loadingRegion.textContent)).toContain(
			"Cargando información del contenido.",
		);

		expect(loadingRegion.querySelector('[aria-hidden="true"]')).not.toBeNull();

		expect(page.querySelector("#media-detail-title")).toBeNull();
		expect(page.querySelector("app-navbar")).not.toBeNull();

		expect(document.title).toBe("Cargando contenido | Nexlit");

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(1);
		expect(mocks.getMediaDetails).toHaveBeenCalledWith(
			"movie",
			101,
			expect.any(AbortSignal),
		);

		request.resolve(createMovieDetail());

		await waitForCondition(
			page,
			() => page.querySelector("#media-detail-title") !== null,
			"Expected loading request to resolve.",
		);
	});

	it("renderiza ready para una película", async () => {
		const detail = createMovieDetail();

		mocks.getMediaDetails.mockResolvedValue(detail);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		await waitForCondition(
			page,
			() => page.querySelector("#media-detail-title") !== null,
			"Expected movie detail.",
		);

		expect(page.querySelectorAll("h1")).toHaveLength(1);

		const heading = getRequiredElement<HTMLHeadingElement>(
			page,
			"#media-detail-title",
		);

		expect(heading.textContent?.trim()).toBe("Dune");
		expect(heading.getAttribute("tabindex")).toBe("-1");

		expect(page.textContent).toContain("Una historia ambientada en Arrakis.");

		const metadata = getRequiredElement<HTMLUListElement>(
			page,
			'ul[aria-label="Información principal"]',
		);

		const metadataText = normalizeText(metadata.textContent);

		expect(metadataText).toContain("2021");
		expect(metadataText).toContain("2 h 35 min");
		expect(metadataText).toContain("8.2/10");
		expect(metadataText).toContain("12.345 votos");

		const rating = getRequiredElement<HTMLLIElement>(
			metadata,
			'li[aria-label="Valoración 8.2/10, basada en 12.345 votos"]',
		);

		expect(rating).not.toBeNull();

		const genres = getRequiredElement<HTMLUListElement>(
			page,
			'ul[aria-label="Géneros"]',
		);

		expect(normalizeText(genres.textContent)).toContain("Aventura");
		expect(normalizeText(genres.textContent)).toContain("Ciencia ficción");

		expect(
			getRequiredElement<HTMLElement>(
				page,
				"#cast-heading",
			).textContent?.trim(),
		).toBe("Reparto principal");

		expect(page.textContent).toContain("Timothée Chalamet");
		expect(page.textContent).toContain("Paul Atreides");
		expect(page.textContent).toContain("Rebecca Ferguson");

		const breadcrumb = getRequiredElement<HTMLElement>(
			page,
			'nav[aria-label="Breadcrumb"]',
		);

		expect(
			breadcrumb
				.querySelector('a[href="/category/movies"]')
				?.textContent?.trim(),
		).toBe("Películas");

		expect(
			breadcrumb.querySelector('[aria-current="page"]')?.textContent?.trim(),
		).toBe("Dune");

		const poster = getRequiredElement<HTMLImageElement>(
			page,
			'img[alt="Póster de Dune"]',
		);

		expect(poster.getAttribute("src")).toBe(
			"https://images.test/w500/dune-poster.jpg",
		);

		const heroBackground = Array.from(
			page.querySelectorAll<HTMLElement>('article [aria-hidden="true"]'),
		).find((element) =>
			element.getAttribute("style")?.includes("background-image"),
		);

		expect(heroBackground).toBeDefined();
		expect(heroBackground?.getAttribute("style")).toContain(
			"https://images.test/w500/dune-backdrop.jpg",
		);

		expect(page.querySelector("#seasons-heading")).toBeNull();
		expect(page.querySelectorAll('a[href*="/season/"]')).toHaveLength(0);

		expect(document.title).toBe("Dune | Nexlit");
	});

	it("renderiza ready para una serie y sus enlaces de temporada", async () => {
		const detail = createSeriesDetail();

		mocks.getMediaDetails.mockResolvedValue(detail);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("tv", "202"));

		await waitForCondition(
			page,
			() => page.querySelector("#seasons-heading") !== null,
			"Expected series seasons.",
		);

		expect(page.querySelectorAll("h1")).toHaveLength(1);

		expect(
			getRequiredElement<HTMLHeadingElement>(
				page,
				"#media-detail-title",
			).textContent?.trim(),
		).toBe("Dark");

		const metadata = getRequiredElement<HTMLUListElement>(
			page,
			'ul[aria-label="Información principal"]',
		);

		const metadataText = normalizeText(metadata.textContent);

		expect(metadataText).toContain("2017");
		expect(metadataText).toContain("2 temporadas");
		expect(metadataText).toContain("18 episodios");
		expect(metadataText).not.toContain(" h ");

		const breadcrumb = getRequiredElement<HTMLElement>(
			page,
			'nav[aria-label="Breadcrumb"]',
		);

		expect(
			breadcrumb
				.querySelector('a[href="/category/series"]')
				?.textContent?.trim(),
		).toBe("Series");

		expect(
			getRequiredElement<HTMLElement>(
				page,
				"#seasons-heading",
			).textContent?.trim(),
		).toBe("Temporadas");

		const seasonLinks = page.querySelectorAll<HTMLAnchorElement>(
			'a[href*="/media/tv/202/season/"]',
		);

		expect(seasonLinks).toHaveLength(2);

		const firstSeasonLink = getRequiredElement<HTMLAnchorElement>(
			page,
			'a[href="/media/tv/202/season/1"]',
		);

		const secondSeasonLink = getRequiredElement<HTMLAnchorElement>(
			page,
			'a[href="/media/tv/202/season/2"]',
		);

		expect(firstSeasonLink.getAttribute("aria-label")).toBe(
			"Abrir Temporada 1",
		);

		expect(secondSeasonLink.getAttribute("aria-label")).toBe(
			"Abrir Temporada 2",
		);

		expect(normalizeText(firstSeasonLink.textContent)).toContain(
			"10 episodios · 2017",
		);

		expect(normalizeText(secondSeasonLink.textContent)).toContain(
			"8 episodios · 2019",
		);

		expect(page.querySelector('a[href="/media/tv/202/season/0"]')).toBeNull();

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(1);
		expect(mocks.getMediaDetails).toHaveBeenCalledWith(
			"tv",
			202,
			expect.any(AbortSignal),
		);

		expect(document.title).toBe("Dark | Nexlit");
	});

	it("no renderiza headings de secciones vacías", async () => {
		const detail = createSeriesDetail({
			originalTitle: null,
			overview: "",
			genres: [],
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

		mocks.getMediaDetails.mockResolvedValue(detail);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("tv", "202"));

		await waitForCondition(
			page,
			() => page.querySelector("#media-detail-title") !== null,
			"Expected minimal series detail.",
		);

		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(page.querySelectorAll("h2")).toHaveLength(0);

		expect(page.querySelector("#details-heading")).toBeNull();
		expect(page.querySelector("#cast-heading")).toBeNull();
		expect(page.querySelector("#seasons-heading")).toBeNull();

		expect(page.querySelector('ul[aria-label="Géneros"]')).toBeNull();

		expect(page.textContent).toContain("Sin descripción disponible.");
	});

	it("usa el fallback local para póster, reparto y temporadas", async () => {
		mocks.buildTmdbImageUrl.mockImplementation(
			(filePath: string | null | undefined, size = "w500"): string | null => {
				if (!filePath || filePath === "/broken-poster.jpg") {
					return null;
				}

				return `https://images.test/${size}${filePath}`;
			},
		);

		const detail = createSeriesDetail({
			posterPath: "/broken-poster.jpg",
			backdropPath: null,
			cast: [
				{
					id: 701,
					name: "Actor sin fotografía",
					character: null,
					profilePath: null,
				},
			],
			seasons: [
				{
					id: 801,
					seasonNumber: 1,
					name: "Temporada sin póster",
					overview: "",
					posterPath: null,
					episodeCount: 0,
					airDate: null,
				},
			],
		});

		mocks.getMediaDetails.mockResolvedValue(detail);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("tv", "202"));

		await waitForCondition(
			page,
			() => page.querySelector("#seasons-heading") !== null,
			"Expected series with image fallbacks.",
		);

		const mainPoster = getRequiredElement<HTMLImageElement>(
			page,
			'img[alt="Póster de Dark"]',
		);

		const castImage = getRequiredElement<HTMLImageElement>(
			page,
			'img[alt="Imagen no disponible para Actor sin fotografía"]',
		);

		const seasonImage = getRequiredElement<HTMLImageElement>(
			page,
			'img[alt="Imagen no disponible para Temporada sin póster"]',
		);

		expect(mainPoster.getAttribute("src")).toBe(IMAGE_PLACEHOLDER_PATH);

		expect(castImage.getAttribute("src")).toBe(IMAGE_PLACEHOLDER_PATH);

		expect(seasonImage.getAttribute("src")).toBe(IMAGE_PLACEHOLDER_PATH);

		expect(mocks.buildTmdbImageUrl).toHaveBeenCalledWith("/broken-poster.jpg");
	});

	it("renderiza not-found para una serie inexistente", async () => {
		mocks.getMediaDetails.mockRejectedValue(
			new TmdbMediaNotFoundError("tv", 404),
		);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("tv", "404"));

		await waitForCondition(
			page,
			() =>
				page.querySelector("h1")?.textContent?.trim() ===
				"Este contenido no está disponible",
			"Expected not-found state.",
		);

		expect(page.querySelectorAll("h1")).toHaveLength(1);

		expect(page.textContent).toContain(
			"El recurso solicitado no existe o ya no está disponible.",
		);

		expect(
			getRequiredElement<HTMLElement>(
				page,
				'[aria-live="polite"]',
			).getAttribute("aria-busy"),
		).toBeNull();

		expect(
			page.querySelector('a[href="/category/series"]')?.textContent?.trim(),
		).toBe("Volver a series");

		expect(page.querySelector('a[href="/welcome"]')).not.toBeNull();

		expect(document.title).toBe("Contenido no encontrado | Nexlit");

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(1);
	});

	it("renderiza un error de red controlado", async () => {
		mocks.getMediaDetails.mockRejectedValue(
			new TypeError("Private network error"),
		);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		await waitForCondition(
			page,
			() =>
				page.querySelector("h1")?.textContent?.trim() ===
				"No pudimos cargar el contenido",
			"Expected network error state.",
		);

		expect(page.querySelectorAll("h1")).toHaveLength(1);

		const errorRegion = getRequiredElement<HTMLElement>(
			page,
			'[aria-live="assertive"]',
		);

		expect(errorRegion.textContent).toContain(
			"Comprueba tu conexión y vuelve a intentarlo.",
		);

		expect(errorRegion.textContent).not.toContain("Private network error");

		const retryButton = getButtonByText(page, "Reintentar");

		expect(retryButton.type).toBe("button");

		expect(page.querySelector('a[href="/welcome"]')).not.toBeNull();

		expect(document.title).toBe("Error al cargar contenido | Nexlit");
	});

	it("Reintentar reutiliza los mismos parámetros y evita peticiones duplicadas", async () => {
		const retryRequest = createDeferred<MediaDetail>();

		mocks.getMediaDetails
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockReturnValueOnce(retryRequest.promise);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		await waitForCondition(
			page,
			() =>
				page.querySelector("h1")?.textContent?.trim() ===
				"No pudimos cargar el contenido",
			"Expected error before retry.",
		);

		const retryButton = getButtonByText(page, "Reintentar");

		retryButton.click();
		retryButton.click();

		await waitForCondition(
			page,
			() => mocks.getMediaDetails.mock.calls.length === 2,
			"Expected one retry request.",
		);

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(2);

		expect(mocks.getMediaDetails.mock.calls[0]?.[0]).toBe("movie");

		expect(mocks.getMediaDetails.mock.calls[0]?.[1]).toBe(101);

		expect(mocks.getMediaDetails.mock.calls[1]?.[0]).toBe("movie");

		expect(mocks.getMediaDetails.mock.calls[1]?.[1]).toBe(101);

		const initialSignal = getCallSignal(0);
		const retrySignal = getCallSignal(1);

		expect(retrySignal).not.toBe(initialSignal);
		expect(retrySignal.aborted).toBe(false);

		expect(document.title).toBe("Cargando contenido | Nexlit");

		retryRequest.resolve(
			createMovieDetail({
				title: "Película tras reintento",
			}),
		);

		await waitForCondition(
			page,
			() =>
				page.querySelector("#media-detail-title")?.textContent?.trim() ===
				"Película tras reintento",
			"Expected successful retry.",
		);

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(2);

		expect(document.title).toBe("Película tras reintento | Nexlit");
	});

	it("aborta la petición anterior al cambiar rápidamente entre IDs", async () => {
		const firstRequest = createDeferred<MediaDetail>();
		const secondRequest = createDeferred<MediaDetail>();

		mocks.getMediaDetails
			.mockReturnValueOnce(firstRequest.promise)
			.mockReturnValueOnce(secondRequest.promise);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(1);

		const firstSignal = getCallSignal(0);

		expect(firstSignal.aborted).toBe(false);

		page.onBeforeEnter(createRouterLocation("movie", "202"));

		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(2);
		expect(firstSignal.aborted).toBe(true);

		const secondSignal = getCallSignal(1);

		expect(secondSignal.aborted).toBe(false);

		expect(mocks.getMediaDetails.mock.calls[0]?.[0]).toBe("movie");

		expect(mocks.getMediaDetails.mock.calls[0]?.[1]).toBe(101);

		expect(mocks.getMediaDetails.mock.calls[1]?.[0]).toBe("movie");

		expect(mocks.getMediaDetails.mock.calls[1]?.[1]).toBe(202);

		secondRequest.resolve(
			createMovieDetail({
				id: 202,
				title: "Contenido actual",
			}),
		);

		await waitForCondition(
			page,
			() =>
				page.querySelector("#media-detail-title")?.textContent?.trim() ===
				"Contenido actual",
			"Expected second route to become ready.",
		);

		expect(document.title).toBe("Contenido actual | Nexlit");

		firstRequest.resolve(
			createMovieDetail({
				id: 101,
				title: "Respuesta obsoleta",
			}),
		);

		await settle(page, 5);

		expect(page.querySelector("#media-detail-title")?.textContent?.trim()).toBe(
			"Contenido actual",
		);

		expect(page.textContent).not.toContain("Respuesta obsoleta");

		expect(document.title).toBe("Contenido actual | Nexlit");
	});

	it("aborta la petición activa al cambiar a una ruta inválida", async () => {
		const request = createDeferred<MediaDetail>();

		mocks.getMediaDetails.mockReturnValue(request.promise);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("tv", "202"));

		const signal = getCallSignal(0);

		expect(signal.aborted).toBe(false);

		page.onBeforeEnter(createRouterLocation("documentary", "202"));

		await page.updateComplete;

		expect(signal.aborted).toBe(true);
		expect(mocks.getMediaDetails).toHaveBeenCalledTimes(1);

		expect(page.querySelector("h1")?.textContent?.trim()).toBe(
			"No podemos abrir esta dirección",
		);

		expect(document.title).toBe("Ruta no válida | Nexlit");

		request.resolve(createSeriesDetail());

		await settle(page, 4);

		expect(page.querySelector("h1")?.textContent?.trim()).toBe(
			"No podemos abrir esta dirección",
		);
	});

	it("aborta la petición activa en disconnectedCallback", async () => {
		const request = createDeferred<MediaDetail>();

		mocks.getMediaDetails.mockReturnValue(request.promise);

		const page = await renderPage();

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		const signal = getCallSignal(0);

		expect(signal.aborted).toBe(false);

		page.remove();

		expect(signal.aborted).toBe(true);

		request.resolve(
			createMovieDetail({
				title: "Respuesta tras desconexión",
			}),
		);

		await Promise.resolve();
		await Promise.resolve();

		expect(page.querySelector("#media-detail-title")).toBeNull();
	});

	it("mantiene document.title alineado con todos los estados de carga", async () => {
		const loadingRequest = createDeferred<MediaDetail>();

		mocks.getMediaDetails.mockReturnValueOnce(loadingRequest.promise);

		const page = await renderPage();

		document.title = "Título inicial";

		expect(document.title).toBe("Título inicial");

		page.onBeforeEnter(createRouterLocation("movie", "101"));

		expect(document.title).toBe("Cargando contenido | Nexlit");

		loadingRequest.resolve(createMovieDetail());

		await waitForCondition(
			page,
			() => document.title === "Dune | Nexlit",
			"Expected ready title.",
		);

		page.onBeforeEnter(createRouterLocation("documentary", "101"));

		expect(document.title).toBe("Ruta no válida | Nexlit");

		mocks.getMediaDetails.mockRejectedValueOnce(
			new TmdbMediaNotFoundError("movie", 404),
		);

		page.onBeforeEnter(createRouterLocation("movie", "404"));

		await waitForCondition(
			page,
			() => document.title === "Contenido no encontrado | Nexlit",
			"Expected not-found title.",
		);

		mocks.getMediaDetails.mockRejectedValueOnce(
			new TypeError("Failed to fetch"),
		);

		page.onBeforeEnter(createRouterLocation("movie", "500"));

		await waitForCondition(
			page,
			() => document.title === "Error al cargar contenido | Nexlit",
			"Expected error title.",
		);
	});
});
