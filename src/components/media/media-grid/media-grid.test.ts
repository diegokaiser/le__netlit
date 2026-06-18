import { afterEach, describe, expect, it, vi } from "vitest";

import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import type { MediaCard } from "../media-card/media-card";
import { MediaGrid } from "./media-grid";

const MEDIA_GRID_TAG = "media-grid";

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

function getShadowRoot(element: MediaGrid): ShadowRoot {
	expect(element.shadowRoot).not.toBeNull();

	return element.shadowRoot as ShadowRoot;
}

async function renderMediaGrid(
	options: {
		items?: readonly MediaItem[];
		label?: string;
	} = {},
): Promise<MediaGrid> {
	const element = document.createElement(MEDIA_GRID_TAG) as MediaGrid;

	if (options.items !== undefined) {
		element.items = options.items;
	}

	if (options.label !== undefined) {
		element.label = options.label;
	}

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

describe("MediaGrid", () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(MEDIA_GRID_TAG)).toBe(MediaGrid);
	});

	it("usa Shadow DOM y renderiza una lista semántica", async () => {
		const element = await renderMediaGrid();

		expect(element.shadowRoot).not.toBeNull();
		expect(element.querySelector("ul")).toBeNull();

		const list = getRequiredElement<HTMLUListElement>(
			getShadowRoot(element),
			"ul",
		);

		expect(list.tagName).toBe("UL");
		expect(list.getAttribute("aria-label")).toBe("Contenido");
	});

	it("usa el aria-label recibido", async () => {
		const element = await renderMediaGrid({
			label: "Películas disponibles",
		});

		const list = getRequiredElement<HTMLUListElement>(
			getShadowRoot(element),
			"ul",
		);

		expect(list.getAttribute("aria-label")).toBe("Películas disponibles");
	});

	it("renderiza un li y un media-card por cada contenido", async () => {
		const items = [
			createMedia(1),
			createMedia(2, {
				mediaType: "tv",
				title: "Serie 2",
			}),
			createMedia(3),
		];

		const element = await renderMediaGrid({
			items,
		});

		const shadowRoot = getShadowRoot(element);
		const list = getRequiredElement<HTMLUListElement>(shadowRoot, "ul");
		const listItems = Array.from(list.children);
		const cards = Array.from(
			shadowRoot.querySelectorAll<MediaCard>("media-card"),
		);

		expect(listItems).toHaveLength(3);
		expect(cards).toHaveLength(3);

		for (const listItem of listItems) {
			expect(listItem.tagName).toBe("LI");
			expect(listItem.children).toHaveLength(1);
			expect(listItem.firstElementChild?.tagName.toLowerCase()).toBe(
				"media-card",
			);
		}
	});

	it("pasa el objeto MediaItem correcto a cada media-card", async () => {
		const firstMedia = createMedia(1);
		const secondMedia = createMedia(2, {
			mediaType: "tv",
			title: "Serie de prueba",
		});

		const element = await renderMediaGrid({
			items: [firstMedia, secondMedia],
		});

		const cards = Array.from(
			getShadowRoot(element).querySelectorAll<MediaCard>("media-card"),
		);

		expect(cards[0]?.media).toBe(firstMedia);
		expect(cards[1]?.media).toBe(secondMedia);
	});

	it("mantiene el ul vacío cuando no recibe contenidos", async () => {
		const element = await renderMediaGrid({
			items: [],
		});

		const shadowRoot = getShadowRoot(element);
		const list = getRequiredElement<HTMLUListElement>(shadowRoot, "ul");

		expect(list.children).toHaveLength(0);
		expect(shadowRoot.querySelectorAll("li")).toHaveLength(0);
		expect(shadowRoot.querySelectorAll("media-card")).toHaveLength(0);
	});

	it("actualiza el DOM cuando cambia la propiedad items", async () => {
		const initialItems = [createMedia(1), createMedia(2)];

		const element = await renderMediaGrid({
			items: initialItems,
		});

		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelectorAll("li")).toHaveLength(2);
		expect(shadowRoot.querySelectorAll("media-card")).toHaveLength(2);

		const replacementMedia = createMedia(3, {
			mediaType: "tv",
			title: "Nuevo contenido",
		});

		element.items = [replacementMedia];

		await element.updateComplete;

		const cards = Array.from(
			shadowRoot.querySelectorAll<MediaCard>("media-card"),
		);

		expect(shadowRoot.querySelectorAll("li")).toHaveLength(1);
		expect(cards).toHaveLength(1);
		expect(cards[0]?.media).toBe(replacementMedia);
		expect(cards[0]?.media?.title).toBe("Nuevo contenido");
	});

	it("conserva dos cards cuando movie y tv comparten el mismo id", async () => {
		const movie = createMedia(101, {
			mediaType: "movie",
			title: "Película 101",
		});

		const series = createMedia(101, {
			mediaType: "tv",
			title: "Serie 101",
		});

		const element = await renderMediaGrid({
			items: [movie, series],
		});

		const cards = Array.from(
			getShadowRoot(element).querySelectorAll<MediaCard>("media-card"),
		);

		expect(cards).toHaveLength(2);
		expect(cards[0]?.media).toBe(movie);
		expect(cards[1]?.media).toBe(series);
		expect(cards.map((card) => card.media?.mediaType)).toEqual(["movie", "tv"]);
	});

	it("reutiliza media-card sin duplicar su markup interno", async () => {
		const element = await renderMediaGrid({
			items: [createMedia(1)],
		});

		const shadowRoot = getShadowRoot(element);
		const card = getRequiredElement<MediaCard>(shadowRoot, "media-card");

		await card.updateComplete;

		expect(card.shadowRoot).not.toBeNull();

		expect(card.shadowRoot?.querySelector("a.card")).not.toBeNull();

		expect(shadowRoot.querySelector("a.card")).toBeNull();

		expect(shadowRoot.querySelector("img.poster")).toBeNull();
		expect(shadowRoot.querySelector(".poster-wrapper")).toBeNull();
		expect(shadowRoot.querySelector(".details")).toBeNull();
	});

	it("define la estructura CSS responsable del grid y del ancho de las cards", () => {
		const cssText = MediaGrid.styles.cssText;

		expect(cssText).toContain("display: grid");
		expect(cssText).toContain(
			"grid-template-columns: repeat(2, minmax(0, 1fr))",
		);
		expect(cssText).toContain("list-style: none");
		expect(cssText).toContain("--media-card-width: 100%");
	});
});
