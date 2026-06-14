import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	buildTmdbImageUrl: vi.fn(),
}));

vi.mock("../../../core/utils/build-tmdb-image-url", () => ({
	buildTmdbImageUrl: mocks.buildTmdbImageUrl,
}));

import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import { MEDIA_SELECT_EVENT, type MediaSelectEvent } from "../media.events";
import "./hero-banner";
import type { HeroBanner } from "./hero-banner";

const HERO_BANNER_TAG = "hero-banner";
const BACKDROP_URL = "https://images.test/w1280/backdrop.jpg";

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

function getShadowRoot(element: HeroBanner): ShadowRoot {
	expect(element.shadowRoot).not.toBeNull();

	return element.shadowRoot as ShadowRoot;
}

async function renderHeroBanner(media?: MediaItem): Promise<HeroBanner> {
	const element = document.createElement(HERO_BANNER_TAG) as HeroBanner;

	if (media !== undefined) {
		element.media = media;
	}

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

function resetMocks(): void {
	mocks.buildTmdbImageUrl.mockReset().mockReturnValue(BACKDROP_URL);
}

describe("HeroBanner", () => {
	beforeEach(() => {
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(HERO_BANNER_TAG)).toBeDefined();
	});

	it("usa Shadow DOM", async () => {
		const element = await renderHeroBanner(createMedia());

		expect(element.shadowRoot).not.toBeNull();
		expect(element.querySelector("section")).toBeNull();
		expect(element.shadowRoot?.querySelector("section")).not.toBeNull();
	});

	it("no renderiza contenido cuando no recibe media", async () => {
		const element = await renderHeroBanner();
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector("section")).toBeNull();
		expect(mocks.buildTmdbImageUrl).not.toHaveBeenCalled();
	});

	it("renderiza el backdrop con sus atributos", async () => {
		const media = createMedia();
		const element = await renderHeroBanner(media);
		const shadowRoot = getShadowRoot(element);

		const backdrop = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.backdrop",
		);

		expect(mocks.buildTmdbImageUrl).toHaveBeenCalledWith(
			media.backdropPath,
			"w1280",
		);
		expect(backdrop.getAttribute("src")).toBe(BACKDROP_URL);
		expect(backdrop.getAttribute("alt")).toBe("Imagen destacada de Dune");
		expect(backdrop.getAttribute("width")).toBe("1280");
		expect(backdrop.getAttribute("height")).toBe("720");
		expect(backdrop.getAttribute("decoding")).toBe("async");
		expect(backdrop.getAttribute("fetchpriority")).toBe("high");
	});

	it("muestra título, sinopsis, año, valoración y tipo película", async () => {
		const element = await renderHeroBanner(
			createMedia({
				title: "Película destacada",
				overview: "Sinopsis de la película destacada.",
				releaseDate: "2024-02-10",
				voteAverage: 8.56,
				mediaType: "movie",
			}),
		);
		const shadowRoot = getShadowRoot(element);

		const title = getRequiredElement<HTMLHeadingElement>(
			shadowRoot,
			"#hero-title",
		);
		const overview = getRequiredElement<HTMLElement>(shadowRoot, ".overview");
		const metadata = getRequiredElement<HTMLElement>(shadowRoot, ".metadata");
		const rating = getRequiredElement<HTMLElement>(shadowRoot, ".rating");

		expect(title.textContent?.trim()).toBe("Película destacada");
		expect(overview.textContent?.trim()).toBe(
			"Sinopsis de la película destacada.",
		);
		expect(metadata.textContent).toContain("2024");
		expect(metadata.textContent).toContain("Película");
		expect(rating.textContent?.trim()).toBe("★ 8.6");
		expect(rating.getAttribute("aria-label")).toBe("Valoración 8.6 de 10");
	});

	it("muestra el tipo serie", async () => {
		const element = await renderHeroBanner(
			createMedia({
				mediaType: "tv",
			}),
		);
		const metadata = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".metadata",
		);

		expect(metadata.textContent).toContain("Serie");
		expect(metadata.textContent).not.toContain("Película");
	});

	it("muestra una sinopsis fallback cuando overview está vacío", async () => {
		const element = await renderHeroBanner(
			createMedia({
				overview: "",
			}),
		);
		const overview = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".overview",
		);

		expect(overview.textContent?.trim()).toBe(
			"La sinopsis de este contenido todavía no está disponible.",
		);
	});

	it("no muestra año inválido ni valoración cero", async () => {
		const element = await renderHeroBanner(
			createMedia({
				releaseDate: "desconocida",
				voteAverage: 0,
			}),
		);
		const shadowRoot = getShadowRoot(element);
		const metadata = getRequiredElement<HTMLElement>(shadowRoot, ".metadata");

		expect(metadata.textContent).not.toContain("desconocida");
		expect(shadowRoot.querySelector(".rating")).toBeNull();
	});

	it("mantiene el contenido cuando no existe backdrop", async () => {
		mocks.buildTmdbImageUrl.mockReturnValue(null);

		const element = await renderHeroBanner(
			createMedia({
				title: "Sin backdrop",
				backdropPath: null,
			}),
		);
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector("img.backdrop")).toBeNull();
		expect(shadowRoot.querySelector("#hero-title")?.textContent).toContain(
			"Sin backdrop",
		);
		expect(shadowRoot.querySelector(".overlay")).not.toBeNull();
		expect(shadowRoot.querySelector(".content")).not.toBeNull();
	});

	it("elimina el backdrop cuando la imagen falla", async () => {
		const element = await renderHeroBanner(
			createMedia({
				title: "Backdrop defectuoso",
			}),
		);
		const shadowRoot = getShadowRoot(element);
		const backdrop = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.backdrop",
		);

		backdrop.dispatchEvent(new Event("error"));

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.backdrop")).toBeNull();
		expect(shadowRoot.querySelector("#hero-title")?.textContent).toContain(
			"Backdrop defectuoso",
		);
	});

	it("restablece el backdrop cuando cambia el contenido", async () => {
		const element = await renderHeroBanner(
			createMedia({
				id: 101,
				title: "Primer contenido",
			}),
		);
		const shadowRoot = getShadowRoot(element);
		const backdrop = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.backdrop",
		);

		backdrop.dispatchEvent(new Event("error"));

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.backdrop")).toBeNull();

		element.media = createMedia({
			id: 202,
			title: "Segundo contenido",
			backdropPath: "/second-backdrop.jpg",
		});

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.backdrop")).not.toBeNull();
		expect(mocks.buildTmdbImageUrl).toHaveBeenLastCalledWith(
			"/second-backdrop.jpg",
			"w1280",
		);
	});

	it("el CTA emite media-select con el contenido", async () => {
		const media = createMedia();
		const element = await renderHeroBanner(media);
		const button = getRequiredElement<HTMLButtonElement>(
			getShadowRoot(element),
			"button.cta",
		);

		let receivedEvent: MediaSelectEvent | undefined;

		document.body.addEventListener(
			MEDIA_SELECT_EVENT,
			(event) => {
				receivedEvent = event as MediaSelectEvent;
			},
			{ once: true },
		);

		expect(button.type).toBe("button");
		expect(button.textContent?.trim()).toBe("Más información");

		button.click();

		expect(receivedEvent).toBeDefined();
		expect(receivedEvent?.detail).toEqual({
			media,
		});
		expect(receivedEvent?.detail.media).toBe(media);
		expect(receivedEvent?.bubbles).toBe(true);
		expect(receivedEvent?.composed).toBe(true);
	});
});
