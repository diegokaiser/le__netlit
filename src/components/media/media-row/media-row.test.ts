import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import type { MediaCard } from "../media-card/media-card";
import "./media-row";
import type { MediaRow } from "./media-row";

const MEDIA_ROW_TAG = "media-row";

function createMedia(
	index: number,
	overrides: Partial<MediaItem> = {},
): MediaItem {
	return {
		id: index,
		mediaType: "movie",
		title: `Contenido ${index}`,
		overview: `Descripción ${index}`,
		posterPath: `/poster-${index}.jpg`,
		backdropPath: `/backdrop-${index}.jpg`,
		voteAverage: 8,
		releaseDate: "2026-01-01",
		genreIds: [18],
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

function getShadowRoot(element: MediaRow): ShadowRoot {
	expect(element.shadowRoot).not.toBeNull();

	return element.shadowRoot as ShadowRoot;
}

async function renderMediaRow(
	options: {
		title?: string;
		items?: readonly MediaItem[];
	} = {},
): Promise<MediaRow> {
	const element = document.createElement(MEDIA_ROW_TAG) as MediaRow;

	if (options.title !== undefined) {
		element.title = options.title;
	}

	if (options.items !== undefined) {
		element.items = options.items;
	}

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

function createMediaQueryList(matches: boolean, query: string): MediaQueryList {
	return {
		matches,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	};
}

function mockReducedMotion(matches: boolean): void {
	vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
		createMediaQueryList(matches, query),
	);
}

function configureScrollRegion(scrollRegion: HTMLElement): void {
	Object.defineProperty(scrollRegion, "clientWidth", {
		configurable: true,
		value: 500,
	});

	Object.defineProperty(scrollRegion, "scrollWidth", {
		configurable: true,
		value: 1400,
	});
}

function dispatchKeyboardEvent(
	element: HTMLElement,
	key: string,
): KeyboardEvent {
	const event = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
	});

	element.dispatchEvent(event);

	return event;
}

describe("MediaRow", () => {
	beforeEach(() => {
		mockReducedMotion(false);
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(MEDIA_ROW_TAG)).toBeDefined();
	});

	it("usa Shadow DOM", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
		});

		expect(element.shadowRoot).not.toBeNull();
		expect(element.querySelector("section")).toBeNull();
		expect(element.shadowRoot?.querySelector("section")).not.toBeNull();
	});

	it("muestra el título y el estado vacío", async () => {
		const element = await renderMediaRow({
			title: "Documentales",
			items: [],
		});
		const shadowRoot = getShadowRoot(element);

		const title = getRequiredElement<HTMLHeadingElement>(
			shadowRoot,
			"#row-title",
		);
		const emptyMessage = getRequiredElement<HTMLElement>(shadowRoot, ".empty");

		expect(title.textContent?.trim()).toBe("Documentales");
		expect(emptyMessage.textContent?.trim()).toBe(
			"No hay contenido disponible en esta sección.",
		);
		expect(shadowRoot.querySelector(".scroll-region")).toBeNull();
		expect(shadowRoot.querySelector("ul")).toBeNull();
		expect(shadowRoot.querySelector("media-card")).toBeNull();
	});

	it("renderiza una card por cada contenido", async () => {
		const items = [
			createMedia(1),
			createMedia(2, {
				mediaType: "tv",
				title: "Serie 2",
			}),
			createMedia(3),
		];

		const element = await renderMediaRow({
			title: "Tendencias",
			items,
		});
		const shadowRoot = getShadowRoot(element);

		const scrollRegion = getRequiredElement<HTMLElement>(
			shadowRoot,
			".scroll-region",
		);
		const list = getRequiredElement<HTMLUListElement>(shadowRoot, "ul");
		const listItems = Array.from(shadowRoot.querySelectorAll("li"));
		const cards = Array.from(
			shadowRoot.querySelectorAll<MediaCard>("media-card"),
		);

		expect(scrollRegion.getAttribute("tabindex")).toBe("0");
		expect(scrollRegion.getAttribute("role")).toBe("region");
		expect(scrollRegion.getAttribute("aria-label")).toBe(
			"Tendencias. Lista desplazable horizontalmente",
		);
		expect(list.getAttribute("role")).toBe("list");

		expect(listItems).toHaveLength(3);
		expect(cards).toHaveLength(3);

		expect(cards[0]?.media).toBe(items[0]);
		expect(cards[1]?.media).toBe(items[1]);
		expect(cards[2]?.media).toBe(items[2]);

		expect(shadowRoot.querySelector(".empty")).toBeNull();
	});

	it("actualiza la lista cuando cambian los contenidos", async () => {
		const element = await renderMediaRow({
			title: "Películas populares",
			items: [createMedia(1), createMedia(2)],
		});

		expect(getShadowRoot(element).querySelectorAll("media-card")).toHaveLength(
			2,
		);

		element.items = [
			createMedia(3, {
				title: "Nuevo contenido",
			}),
		];

		await element.updateComplete;

		const cards = Array.from(
			getShadowRoot(element).querySelectorAll<MediaCard>("media-card"),
		);

		expect(cards).toHaveLength(1);
		expect(cards[0]?.media?.id).toBe(3);
		expect(cards[0]?.media?.title).toBe("Nuevo contenido");
	});

	it("ArrowRight desplaza hacia la derecha", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		configureScrollRegion(scrollRegion);

		const scrollBySpy = vi
			.spyOn(scrollRegion, "scrollBy")
			.mockImplementation(() => undefined);

		const event = dispatchKeyboardEvent(scrollRegion, "ArrowRight");

		expect(event.defaultPrevented).toBe(true);
		expect(scrollBySpy).toHaveBeenCalledTimes(1);
		expect(scrollBySpy).toHaveBeenCalledWith({
			left: 400,
			behavior: "smooth",
		});
	});

	it("ArrowLeft desplaza hacia la izquierda", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		configureScrollRegion(scrollRegion);

		const scrollBySpy = vi
			.spyOn(scrollRegion, "scrollBy")
			.mockImplementation(() => undefined);

		const event = dispatchKeyboardEvent(scrollRegion, "ArrowLeft");

		expect(event.defaultPrevented).toBe(true);
		expect(scrollBySpy).toHaveBeenCalledWith({
			left: -400,
			behavior: "smooth",
		});
	});

	it("usa una distancia mínima de 240 píxeles", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		Object.defineProperty(scrollRegion, "clientWidth", {
			configurable: true,
			value: 100,
		});

		const scrollBySpy = vi
			.spyOn(scrollRegion, "scrollBy")
			.mockImplementation(() => undefined);

		dispatchKeyboardEvent(scrollRegion, "ArrowRight");

		expect(scrollBySpy).toHaveBeenCalledWith({
			left: 240,
			behavior: "smooth",
		});
	});

	it("Home desplaza al inicio", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		configureScrollRegion(scrollRegion);

		const scrollToSpy = vi
			.spyOn(scrollRegion, "scrollTo")
			.mockImplementation(() => undefined);

		const event = dispatchKeyboardEvent(scrollRegion, "Home");

		expect(event.defaultPrevented).toBe(true);
		expect(scrollToSpy).toHaveBeenCalledWith({
			left: 0,
			behavior: "smooth",
		});
	});

	it("End desplaza hasta el ancho completo", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		configureScrollRegion(scrollRegion);

		const scrollToSpy = vi
			.spyOn(scrollRegion, "scrollTo")
			.mockImplementation(() => undefined);

		const event = dispatchKeyboardEvent(scrollRegion, "End");

		expect(event.defaultPrevented).toBe(true);
		expect(scrollToSpy).toHaveBeenCalledWith({
			left: 1400,
			behavior: "smooth",
		});
	});

	it("usa scroll auto cuando el usuario prefiere movimiento reducido", async () => {
		vi.restoreAllMocks();
		mockReducedMotion(true);

		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		configureScrollRegion(scrollRegion);

		const scrollBySpy = vi
			.spyOn(scrollRegion, "scrollBy")
			.mockImplementation(() => undefined);

		dispatchKeyboardEvent(scrollRegion, "ArrowRight");

		expect(window.matchMedia).toHaveBeenCalledWith(
			"(prefers-reduced-motion: reduce)",
		);
		expect(scrollBySpy).toHaveBeenCalledWith({
			left: 400,
			behavior: "auto",
		});
	});

	it("ignora teclas no relacionadas con el scroll", async () => {
		const element = await renderMediaRow({
			title: "Tendencias",
			items: [createMedia(1)],
		});
		const scrollRegion = getRequiredElement<HTMLElement>(
			getShadowRoot(element),
			".scroll-region",
		);

		configureScrollRegion(scrollRegion);

		const scrollBySpy = vi
			.spyOn(scrollRegion, "scrollBy")
			.mockImplementation(() => undefined);
		const scrollToSpy = vi
			.spyOn(scrollRegion, "scrollTo")
			.mockImplementation(() => undefined);

		const event = dispatchKeyboardEvent(scrollRegion, "Enter");

		expect(event.defaultPrevented).toBe(false);
		expect(scrollBySpy).not.toHaveBeenCalled();
		expect(scrollToSpy).not.toHaveBeenCalled();
	});
});
