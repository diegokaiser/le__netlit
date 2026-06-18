import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	buildTmdbImageUrl: vi.fn(),
}));

vi.mock("../../../core/utils/build-tmdb-image-url", () => ({
	buildTmdbImageUrl: mocks.buildTmdbImageUrl,
}));

import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import { MEDIA_SELECT_EVENT, type MediaSelectEvent } from "../media.events";
import "./media-card";
import type { MediaCard } from "./media-card";

const MEDIA_CARD_TAG = "media-card";
const POSTER_URL = "https://images.test/w342/poster.jpg";

function createMedia(overrides: Partial<MediaItem> = {}): MediaItem {
	return {
		id: 101,
		mediaType: "movie",
		title: "Dune",
		overview: "Una historia ambientada en Arrakis.",
		posterPath: "/dune-poster.jpg",
		backdropPath: "/dune-backdrop.jpg",
		voteAverage: 8.2,
		releaseDate: "2021-10-22",
		genreIds: [12, 878],
		...overrides,
	};
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

function getShadowRoot(element: MediaCard): ShadowRoot {
	expect(element.shadowRoot).not.toBeNull();

	return element.shadowRoot as ShadowRoot;
}

async function renderMediaCard(media?: MediaItem): Promise<MediaCard> {
	const element = document.createElement(MEDIA_CARD_TAG) as MediaCard;

	if (media !== undefined) {
		element.media = media;
	}

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

function resetMocks(): void {
	mocks.buildTmdbImageUrl.mockReset().mockReturnValue(POSTER_URL);
}

describe("MediaCard", () => {
	beforeEach(() => {
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(MEDIA_CARD_TAG)).toBeDefined();
	});

	it("usa Shadow DOM", async () => {
		const element = await renderMediaCard(createMedia());

		expect(element.shadowRoot).not.toBeNull();
		expect(element.querySelector("a.card")).toBeNull();
		expect(element.shadowRoot?.querySelector("a.card")).not.toBeNull();
	});

	it("renderiza un único enlace semántico navegable por teclado", async () => {
		const media = createMedia({
			id: 101,
			mediaType: "movie",
			title: "Dune",
		});

		const element = await renderMediaCard(media);
		const shadowRoot = getShadowRoot(element);

		const links = shadowRoot.querySelectorAll<HTMLAnchorElement>("a.card");

		expect(links).toHaveLength(1);

		const link = links[0];

		expect(link).toBeDefined();
		expect(link?.tagName).toBe("A");
		expect(link?.getAttribute("href")).toBe("/media/movie/101");
		expect(link?.getAttribute("role")).toBeNull();
		expect(link?.tabIndex).toBe(0);

		expect(shadowRoot.querySelector("button")).toBeNull();
		expect(shadowRoot.querySelector('[role="button"]')).toBeNull();

		link?.focus();

		expect(shadowRoot.activeElement).toBe(link);
	});

	it("no renderiza contenido cuando no recibe media", async () => {
		const element = await renderMediaCard();
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector("a.card")).toBeNull();
		expect(shadowRoot.querySelector("img.poster")).toBeNull();
		expect(mocks.buildTmdbImageUrl).not.toHaveBeenCalled();
	});

	it("renderiza un enlace al detalle y el póster con atributos accesibles", async () => {
		const media = createMedia();
		const element = await renderMediaCard(media);
		const shadowRoot = getShadowRoot(element);

		const link = getRequiredElement<HTMLAnchorElement>(shadowRoot, "a.card");
		const poster = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.poster",
		);

		expect(mocks.buildTmdbImageUrl).toHaveBeenCalledTimes(1);
		expect(mocks.buildTmdbImageUrl).toHaveBeenCalledWith(
			media.posterPath,
			"w342",
		);

		expect(link.getAttribute("href")).toBe("/media/movie/101");
		expect(link.getAttribute("aria-label")).toBe("Ver detalles de Dune");

		expect(poster.getAttribute("src")).toBe(POSTER_URL);
		expect(poster.getAttribute("alt")).toBe("Póster de Dune");
		expect(poster.getAttribute("width")).toBe("342");
		expect(poster.getAttribute("height")).toBe("513");
		expect(poster.getAttribute("loading")).toBe("lazy");
		expect(poster.getAttribute("decoding")).toBe("async");
	});

	it("construye la ruta de detalle usando el tipo técnico tv", async () => {
		const media = createMedia({
			id: 202,
			mediaType: "tv",
			title: "Serie de prueba",
		});

		const element = await renderMediaCard(media);
		const shadowRoot = getShadowRoot(element);
		const link = getRequiredElement<HTMLAnchorElement>(shadowRoot, "a.card");

		expect(link.getAttribute("href")).toBe("/media/tv/202");
		expect(link.getAttribute("aria-label")).toBe(
			"Ver detalles de Serie de prueba",
		);
	});

	it("muestra título, año y valoración", async () => {
		const element = await renderMediaCard(
			createMedia({
				title: "Película de prueba",
				releaseDate: "2024-05-16",
				voteAverage: 7.65,
			}),
		);
		const shadowRoot = getShadowRoot(element);

		const title = getRequiredElement<HTMLElement>(shadowRoot, ".title");
		const metadata = getRequiredElement<HTMLElement>(shadowRoot, ".metadata");
		const rating = getRequiredElement<HTMLElement>(shadowRoot, ".rating");

		expect(title.textContent?.trim()).toBe("Película de prueba");
		expect(metadata.textContent).toContain("2024");
		expect(rating.textContent?.trim()).toBe("★ 7.7");
		expect(rating.getAttribute("aria-label")).toBe("Valoración 7.7 de 10");
	});

	it("no muestra año cuando la fecha no comienza con cuatro dígitos", async () => {
		const element = await renderMediaCard(
			createMedia({
				releaseDate: "fecha-desconocida",
				voteAverage: 8,
			}),
		);
		const shadowRoot = getShadowRoot(element);
		const metadata = getRequiredElement<HTMLElement>(shadowRoot, ".metadata");

		expect(metadata.textContent).not.toContain("fecha-desconocida");
		expect(metadata.textContent).toContain("★ 8.0");
	});

	it("no muestra valoración cuando es cero", async () => {
		const element = await renderMediaCard(
			createMedia({
				releaseDate: "2025-01-01",
				voteAverage: 0,
			}),
		);
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector(".rating")).toBeNull();
		expect(shadowRoot.querySelector(".metadata")?.textContent).toContain(
			"2025",
		);
	});

	it("muestra el fallback con el título cuando no existe póster", async () => {
		mocks.buildTmdbImageUrl.mockReturnValue(null);

		const media = createMedia({
			title: "Sin póster",
			posterPath: null,
		});
		const element = await renderMediaCard(media);
		const shadowRoot = getShadowRoot(element);

		const link = getRequiredElement<HTMLAnchorElement>(shadowRoot, "a.card");
		const fallback = getRequiredElement<HTMLElement>(shadowRoot, ".fallback");

		expect(mocks.buildTmdbImageUrl).toHaveBeenCalledWith(null, "w342");
		expect(shadowRoot.querySelector("img.poster")).toBeNull();

		expect(link.getAttribute("href")).toBe("/media/movie/101");
		expect(link.getAttribute("aria-label")).toBe("Ver detalles de Sin póster");

		expect(fallback.getAttribute("role")).toBe("img");
		expect(fallback.getAttribute("aria-label")).toBe(
			"Póster no disponible para Sin póster",
		);
		expect(fallback.textContent?.trim()).toBe("Sin póster");
	});

	it("sustituye la imagen por el fallback cuando el póster falla", async () => {
		const media = createMedia({
			title: "Póster defectuoso",
		});
		const element = await renderMediaCard(media);
		const shadowRoot = getShadowRoot(element);
		const poster = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.poster",
		);

		poster.dispatchEvent(new Event("error"));

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.poster")).toBeNull();

		const fallback = getRequiredElement<HTMLElement>(shadowRoot, ".fallback");

		expect(fallback.textContent?.trim()).toBe("Póster defectuoso");
	});

	it("restablece la imagen fallida cuando cambia el contenido", async () => {
		const element = await renderMediaCard(
			createMedia({
				id: 101,
				title: "Primer contenido",
			}),
		);
		const shadowRoot = getShadowRoot(element);
		const firstPoster = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.poster",
		);

		firstPoster.dispatchEvent(new Event("error"));

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.poster")).toBeNull();

		element.media = createMedia({
			id: 202,
			title: "Segundo contenido",
			posterPath: "/second-poster.jpg",
		});

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.poster")).not.toBeNull();
		expect(shadowRoot.querySelector(".fallback")).toBeNull();
		expect(mocks.buildTmdbImageUrl).toHaveBeenLastCalledWith(
			"/second-poster.jpg",
			"w342",
		);
	});

	it("emite media-select con el contenido, bubbles y composed", async () => {
		const media = createMedia();
		const element = await renderMediaCard(media);
		const link = getRequiredElement<HTMLAnchorElement>(
			getShadowRoot(element),
			"a.card",
		);

		let receivedEvent: MediaSelectEvent | undefined;

		document.body.addEventListener(
			MEDIA_SELECT_EVENT,
			(event) => {
				receivedEvent = event as MediaSelectEvent;
			},
			{ once: true },
		);

		link.addEventListener(
			"click",
			(event) => {
				event.preventDefault();
			},
			{ once: true },
		);

		link.click();

		expect(receivedEvent).toBeDefined();
		expect(receivedEvent?.detail).toEqual({
			media,
		});
		expect(receivedEvent?.detail.media).toBe(media);
		expect(receivedEvent?.bubbles).toBe(true);
		expect(receivedEvent?.composed).toBe(true);
	});
});
