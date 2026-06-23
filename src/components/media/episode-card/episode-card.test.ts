import { afterEach, describe, expect, it, vi } from "vitest";

import type { EpisodeDetail } from "../../../services/tmdb/tmdb.types";
import "./episode-card";

type EpisodeCardElement = HTMLElement & {
	episode?: EpisodeDetail;
	updateComplete: Promise<boolean>;
};

const getNormalizedText = (element: HTMLElement): string =>
	element.textContent?.replace(/\s+/g, " ").trim() ?? "";

const createEpisode = (
	overrides: Partial<EpisodeDetail> = {},
): EpisodeDetail => ({
	id: 1001,
	episodeNumber: 1,
	seasonNumber: 1,
	name: "Winter Is Coming",
	overview: "El inicio de la historia.",
	stillPath: "/episode-1.jpg",
	airDate: "2011-04-17",
	runtime: 62,
	voteAverage: 8.4,
	voteCount: 120,
	...overrides,
});

const renderEpisodeCard = async (
	episode?: EpisodeDetail,
): Promise<EpisodeCardElement> => {
	const element = document.createElement(
		"app-episode-card",
	) as EpisodeCardElement;

	if (episode) {
		element.episode = episode;
	}

	document.body.appendChild(element);
	await element.updateComplete;

	return element;
};

afterEach(() => {
	document.body.replaceChildren();
});

describe("app-episode-card", () => {
	it("registra el custom element", () => {
		expect(customElements.get("app-episode-card")).toBeDefined();
	});

	it("usa Light DOM", async () => {
		const element = await renderEpisodeCard(createEpisode());

		expect(element.shadowRoot).toBeNull();
	});

	it("no renderiza contenido si no recibe episode", async () => {
		const element = await renderEpisodeCard();

		expect(element.textContent?.trim()).toBe("");
	});

	it("renderiza número y nombre de episodio", async () => {
		const element = await renderEpisodeCard(createEpisode());

		expect(element.textContent).toContain("Episodio 1");
		expect(element.textContent).toContain("Winter Is Coming");
	});

	it("renderiza sinopsis", async () => {
		const element = await renderEpisodeCard(createEpisode());

		expect(element.textContent).toContain("El inicio de la historia.");
	});

	it("no renderiza botón de reproducción", async () => {
		const element = await renderEpisodeCard(createEpisode());

		expect(element.querySelector("button")).toBeNull();
	});

	it("renderiza duración con formatRuntime", async () => {
		const element = await renderEpisodeCard(
			createEpisode({
				runtime: 62,
			}),
		);

		expect(getNormalizedText(element)).toContain("Duración: 1 h 2 min");
	});

	it("renderiza fecha con formatReleaseDate", async () => {
		const element = await renderEpisodeCard(
			createEpisode({
				airDate: "2011-04-17",
			}),
		);

		expect(getNormalizedText(element)).toContain(
			"Estreno: 17 de abril de 2011",
		);
	});

	it("renderiza valoración solo si voteAverage es mayor que cero", async () => {
		const element = await renderEpisodeCard(
			createEpisode({
				voteAverage: 8.4,
			}),
		);

		expect(element.textContent).toContain("8.4");
	});

	it("no renderiza valoración si voteAverage es cero", async () => {
		const element = await renderEpisodeCard(
			createEpisode({
				voteAverage: 0,
			}),
		);

		expect(element.textContent).not.toContain("0.0");
	});

	it("usa buildTmdbImageUrl cuando hay stillPath", async () => {
		const element = await renderEpisodeCard(
			createEpisode({
				stillPath: "/episode-1.jpg",
			}),
		);

		const image = element.querySelector("img");

		expect(image?.getAttribute("src")).toContain("/episode-1.jpg");
	});

	it("usa placeholder cuando no hay stillPath", async () => {
		const element = await renderEpisodeCard(
			createEpisode({
				stillPath: null,
			}),
		);

		const image = element.querySelector("img");

		expect(image?.getAttribute("src")).toBeTruthy();
		expect(image?.getAttribute("src")).not.toContain("/episode-1.jpg");
	});

	it("define alt accesible", async () => {
		const element = await renderEpisodeCard(createEpisode());

		const image = element.querySelector("img");

		expect(image?.getAttribute("alt")).toContain("Winter Is Coming");
	});

	it("no emite navegación ni eventos de selección", async () => {
		const element = await renderEpisodeCard(createEpisode());
		const navigateListener = vi.fn();
		const selectListener = vi.fn();

		element.addEventListener("navigate", navigateListener);
		element.addEventListener("episode-select", selectListener);

		element.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
			}),
		);

		element.click();

		expect(navigateListener).not.toHaveBeenCalled();
		expect(selectListener).not.toHaveBeenCalled();
	});
});
