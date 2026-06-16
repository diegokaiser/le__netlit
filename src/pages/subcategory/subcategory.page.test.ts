import { provide } from "@lit/context";
import type { RouterLocation } from "@vaadin/router";
import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES, buildCategoryRoute } from "../../core/config/routes";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	getActiveProfile: vi.fn(),
	getByGenre: vi.fn(),
	routerGo: vi.fn(),
}));

vi.mock("../../router/auth.guard", () => ({
	requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("../../services/profile/profile.service", () => ({
	profileService: {
		getActiveProfile: mocks.getActiveProfile,
	},
}));

vi.mock("../../services/tmdb/tmdb-media.service", () => ({
	tmdbMediaService: {
		getByGenre: mocks.getByGenre,
	},
}));

vi.mock("@vaadin/router", () => ({
	Router: {
		go: mocks.routerGo,
	},
}));

import type { AppNavbar } from "../../components/layout/app-navbar/app-navbar";
import type { MediaGrid } from "../../components/media/media-grid/media-grid";
import {
	activeProfileContext,
	type ActiveProfileChangedEvent,
	type ActiveProfileContextValue,
} from "../../core/context/active-profile.context";
import type { Profile } from "../../services/profile/profile.types";
import type { MediaItem, MediaPage } from "../../services/tmdb/tmdb.types";
import "./subcategory.page";
import type { SubcategoryPage } from "./subcategory.page";

const SUBCATEGORY_PAGE_TAG = "subcategory-page";
const TEST_PROVIDER_TAG = "subcategory-active-profile-test-provider";

class SubcategoryActiveProfileTestProvider extends LitElement {
	@provide({
		context: activeProfileContext,
	})
	@property({
		attribute: false,
	})
	activeProfile: ActiveProfileContextValue = undefined;

	protected createRenderRoot(): HTMLElement {
		return this;
	}

	private handleActiveProfileChanged(event: ActiveProfileChangedEvent): void {
		this.activeProfile = event.detail.profile;
	}

	protected render() {
		return html`
			<div
				data-testid="provider-outlet"
				@active-profile-changed=${this.handleActiveProfileChanged}
			>
				<subcategory-page></subcategory-page>
			</div>
		`;
	}
}

if (!customElements.get(TEST_PROVIDER_TAG)) {
	customElements.define(
		TEST_PROVIDER_TAG,
		SubcategoryActiveProfileTestProvider,
	);
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

function createProfile(overrides: Partial<Profile> = {}): Profile {
	return {
		id: "profile-1",
		userId: "user-1",
		name: "Diego",
		avatarId: "avatar-blue",
		isKids: false,
		...overrides,
	};
}

function createMovie(overrides: Partial<MediaItem> = {}): MediaItem {
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

function createSeries(overrides: Partial<MediaItem> = {}): MediaItem {
	return createMovie({
		id: 202,
		mediaType: "tv",
		title: "Dark",
		releaseDate: "2017-12-01",
		...overrides,
	});
}

function createMediaPage(overrides: Partial<MediaPage> = {}): MediaPage {
	return {
		items: [createMovie()],
		page: 1,
		totalPages: 1,
		totalResults: 1,
		...overrides,
	};
}

function createRouterLocation(
	category: unknown,
	subcategory: unknown,
): RouterLocation {
	return {
		params: {
			category,
			subcategory,
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

function getHeadingText(page: SubcategoryPage): string {
	return (
		getRequiredElement<HTMLHeadingElement>(page, "h1").textContent?.trim() ?? ""
	);
}

function getButtonByText(root: ParentNode, text: string): HTMLButtonElement {
	const button = Array.from(
		root.querySelectorAll<HTMLButtonElement>("button"),
	).find((candidate) => candidate.textContent?.trim() === text);

	expect(button, `Expected button with text "${text}" to exist`).toBeDefined();

	return button as HTMLButtonElement;
}

function getAccessibleStatus(page: SubcategoryPage): string {
	const liveRegion = getRequiredElement<HTMLElement>(
		page,
		'[aria-live="polite"][aria-atomic="true"]',
	);

	return liveRegion.textContent?.trim() ?? "";
}

async function renderWithProvider(
	activeProfile: ActiveProfileContextValue,
): Promise<{
	provider: SubcategoryActiveProfileTestProvider;
	page: SubcategoryPage;
}> {
	const provider = document.createElement(
		TEST_PROVIDER_TAG,
	) as SubcategoryActiveProfileTestProvider;

	provider.activeProfile = activeProfile;

	document.body.appendChild(provider);

	await provider.updateComplete;

	const page = getRequiredElement<SubcategoryPage>(
		provider,
		SUBCATEGORY_PAGE_TAG,
	);

	await page.updateComplete;
	await settle(provider, page);

	return {
		provider,
		page,
	};
}

async function settle(
	provider: SubcategoryActiveProfileTestProvider,
	page: SubcategoryPage,
	cycles = 4,
): Promise<void> {
	for (let cycle = 0; cycle < cycles; cycle += 1) {
		await Promise.resolve();
		await provider.updateComplete;
		await page.updateComplete;
	}
}

async function waitForCondition(
	provider: SubcategoryActiveProfileTestProvider,
	page: SubcategoryPage,
	condition: () => boolean,
	message: string,
): Promise<void> {
	for (let attempt = 0; attempt < 30; attempt += 1) {
		await settle(provider, page, 1);

		if (condition()) {
			return;
		}
	}

	throw new Error(message);
}

function resetMocks(): void {
	mocks.requireAuthenticatedUser.mockReset();
	mocks.getActiveProfile.mockReset();
	mocks.getByGenre.mockReset();
	mocks.routerGo.mockReset();
}

describe("SubcategoryPage", () => {
	let originalDocumentTitle: string;
	let originalPath: string;

	beforeEach(() => {
		originalDocumentTitle = document.title;
		originalPath =
			window.location.pathname + window.location.search + window.location.hash;

		vi.restoreAllMocks();
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		document.title = originalDocumentTitle;
		window.history.replaceState({}, "", originalPath);

		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(SUBCATEGORY_PAGE_TAG)).toBeDefined();
	});

	it("usa Light DOM y reutiliza app-navbar y media-grid", async () => {
		const profile = createProfile();

		const response = createMediaPage({
			items: [
				createMovie({
					id: 301,
					title: "Película de terror",
					genreIds: [27],
				}),
			],
		});

		mocks.getByGenre.mockResolvedValue(response);

		const { provider, page } = await renderWithProvider(profile);

		page.onBeforeEnter(createRouterLocation("movies", "terror"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected subcategory media grid.",
		);

		expect(page.shadowRoot).toBeNull();
		expect(page.querySelector("main")).not.toBeNull();
		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getHeadingText(page)).toBe("Películas de terror");

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		const grid = getRequiredElement<MediaGrid>(page, "media-grid");

		await navbar.updateComplete;
		await grid.updateComplete;

		expect(navbar.profileName).toBe("Diego");
		expect(grid.items).toEqual(response.items);
		expect(grid.items).not.toBe(response.items);
		expect(grid.items[0]).toBe(response.items[0]);

		expect(grid.label).toBe("Películas de terror. 1 resultados cargados");
	});

	it.each([
		{
			category: "movies",
			subcategory: "terror",
			mediaType: "movie",
			genreNames: ["Horror"],
			expectedHeading: "Películas de terror",
			expectedDocumentTitle: "Terror en Películas | Nexlit",
		},
		{
			category: "movies",
			subcategory: "sci-fi",
			mediaType: "movie",
			genreNames: ["Science Fiction"],
			expectedHeading: "Películas de ciencia ficción",
			expectedDocumentTitle: "Ciencia ficción en Películas | Nexlit",
		},
		{
			category: "movies",
			subcategory: "humor",
			mediaType: "movie",
			genreNames: ["Comedy"],
			expectedHeading: "Películas de humor",
			expectedDocumentTitle: "Humor en Películas | Nexlit",
		},
		{
			category: "movies",
			subcategory: "romance",
			mediaType: "movie",
			genreNames: ["Romance"],
			expectedHeading: "Películas de romance",
			expectedDocumentTitle: "Romance en Películas | Nexlit",
		},
		{
			category: "series",
			subcategory: "sci-fi",
			mediaType: "tv",
			genreNames: ["Sci-Fi & Fantasy"],
			expectedHeading: "Series de ciencia ficción",
			expectedDocumentTitle: "Ciencia ficción en Series | Nexlit",
		},
		{
			category: "series",
			subcategory: "humor",
			mediaType: "tv",
			genreNames: ["Comedy"],
			expectedHeading: "Series de humor",
			expectedDocumentTitle: "Humor en Series | Nexlit",
		},
	] as const)(
		"carga $category/$subcategory desde RouterLocation",
		async ({
			category,
			subcategory,
			mediaType,
			genreNames,
			expectedHeading,
			expectedDocumentTitle,
		}) => {
			const item = mediaType === "movie" ? createMovie() : createSeries();

			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items: [item],
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation(category, subcategory));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				`Expected ${category}/${subcategory} content.`,
			);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(1);
			expect(mocks.getByGenre).toHaveBeenCalledWith({
				mediaType,
				genreNames,
				page: 1,
				signal: expect.any(AbortSignal),
			});

			expect(getHeadingText(page)).toBe(expectedHeading);
			expect(document.title).toBe(expectedDocumentTitle);
			expect(page.querySelectorAll("h1")).toHaveLength(1);
		},
	);

	it("usa RouterLocation aunque window.location contenga otra ruta", async () => {
		window.history.replaceState({}, "", "/category/series/humor");

		mocks.getByGenre.mockResolvedValue(
			createMediaPage({
				items: [createMovie()],
			}),
		);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies", "terror"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected RouterLocation parameters to win.",
		);

		expect(window.location.pathname).toBe("/category/series/humor");

		expect(mocks.getByGenre).toHaveBeenCalledWith({
			mediaType: "movie",
			genreNames: ["Horror"],
			page: 1,
			signal: expect.any(AbortSignal),
		});

		expect(getHeadingText(page)).toBe("Películas de terror");
		expect(document.title).toBe("Terror en Películas | Nexlit");
	});

	it("muestra not-found cuando category es inválida", async () => {
		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("anime", "terror"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#subcategory-not-found-title") !== null,
			"Expected subcategory not-found state.",
		);

		expect(mocks.getByGenre).not.toHaveBeenCalled();

		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(page.querySelector("media-grid")).toBeNull();

		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getHeadingText(page)).toBe("Subcategoría no encontrada");

		expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

		expect(document.title).toBe("Subcategoría no encontrada | Nexlit");
	});

	it("muestra not-found y conserva el enlace de categoría cuando subcategory es inválida", async () => {
		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies", "action"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#subcategory-not-found-title") !== null,
			"Expected invalid subcategory state.",
		);

		expect(mocks.getByGenre).not.toHaveBeenCalled();

		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(page.querySelector("media-grid")).toBeNull();

		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getHeadingText(page)).toBe("Subcategoría no encontrada");

		expect(
			page.querySelector(`a[href="${buildCategoryRoute("movies")}"]`),
		).not.toBeNull();

		expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

		expect(document.title).toBe("Subcategoría no encontrada | Nexlit");
	});

	it.each([
		{
			category: "series",
			subcategory: "terror",
			categoryRoute: "/category/series",
		},
		{
			category: "series",
			subcategory: "romance",
			categoryRoute: "/category/series",
		},
		{
			category: "documentaries",
			subcategory: "terror",
			categoryRoute: "/category/documentaries",
		},
		{
			category: "documentaries",
			subcategory: "sci-fi",
			categoryRoute: "/category/documentaries",
		},
		{
			category: "documentaries",
			subcategory: "humor",
			categoryRoute: "/category/documentaries",
		},
		{
			category: "documentaries",
			subcategory: "romance",
			categoryRoute: "/category/documentaries",
		},
	] as const)(
		"muestra unsupported para $category/$subcategory sin consultar TMDB",
		async ({ category, subcategory, categoryRoute }) => {
			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation(category, subcategory));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#unsupported-subcategory-title") !== null,
				`Expected unsupported state for ${category}/${subcategory}.`,
			);

			expect(mocks.getByGenre).not.toHaveBeenCalled();

			expect(page.querySelector("app-navbar")).not.toBeNull();
			expect(page.querySelector("media-grid")).toBeNull();

			expect(page.querySelectorAll("h1")).toHaveLength(1);
			expect(getHeadingText(page)).toBe("Subcategoría no disponible");

			expect(page.querySelector(`a[href="${categoryRoute}"]`)).not.toBeNull();

			expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

			expect(document.title).toBe("Subcategoría no disponible | Nexlit");
		},
	);

	describe("perfil y sesión", () => {
		it("usa el perfil activo del contexto sin consultar Appwrite", async () => {
			const profile = createProfile({
				name: "Perfil existente",
				avatarId: "avatar-red",
			});

			mocks.getByGenre.mockResolvedValue(createMediaPage());

			const { provider, page } = await renderWithProvider(profile);

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected content using the existing profile.",
			);

			expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
			expect(mocks.getActiveProfile).not.toHaveBeenCalled();

			expect(mocks.getByGenre).toHaveBeenCalledTimes(1);

			const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

			await navbar.updateComplete;

			expect(navbar.profileName).toBe("Perfil existente");
		});

		it("recupera el perfil activo y emite el cambio cuando el contexto está undefined", async () => {
			const profile = createProfile({
				id: "profile-recovered",
				name: "Perfil recuperado",
			});

			mocks.requireAuthenticatedUser.mockResolvedValue({
				$id: "user-1",
			});

			mocks.getActiveProfile.mockResolvedValue(profile);
			mocks.getByGenre.mockResolvedValue(createMediaPage());

			const { provider, page } = await renderWithProvider(undefined);

			page.onBeforeEnter(createRouterLocation("movies", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected content after recovering the active profile.",
			);

			expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);

			expect(mocks.getActiveProfile).toHaveBeenCalledTimes(1);
			expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");

			expect(provider.activeProfile).toBe(profile);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(1);
			expect(mocks.getByGenre).toHaveBeenCalledWith({
				mediaType: "movie",
				genreNames: ["Science Fiction"],
				page: 1,
				signal: expect.any(AbortSignal),
			});

			const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

			await navbar.updateComplete;

			expect(navbar.profileName).toBe("Perfil recuperado");
		});

		it("redirige a login cuando no existe sesión", async () => {
			mocks.requireAuthenticatedUser.mockResolvedValue(null);

			const { provider, page } = await renderWithProvider(undefined);

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() =>
					mocks.routerGo.mock.calls.some(([route]) => route === ROUTES.login),
				"Expected login redirection.",
			);

			expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
			expect(mocks.getActiveProfile).not.toHaveBeenCalled();

			expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.login);
			expect(mocks.getByGenre).not.toHaveBeenCalled();

			expect(page.querySelector("app-navbar")).toBeNull();
			expect(page.querySelector("media-grid")).toBeNull();
		});

		it("redirige a perfiles cuando no existe perfil activo", async () => {
			mocks.requireAuthenticatedUser.mockResolvedValue({
				$id: "user-1",
			});

			mocks.getActiveProfile.mockResolvedValue(null);

			const { provider, page } = await renderWithProvider(undefined);

			page.onBeforeEnter(createRouterLocation("series", "humor"));

			await waitForCondition(
				provider,
				page,
				() =>
					mocks.routerGo.mock.calls.some(
						([route]) => route === ROUTES.profiles,
					),
				"Expected profiles redirection.",
			);

			expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");

			expect(provider.activeProfile).toBeNull();

			expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.profiles);

			expect(mocks.getByGenre).not.toHaveBeenCalled();

			expect(page.querySelector("app-navbar")).toBeNull();
			expect(page.querySelector("media-grid")).toBeNull();
		});

		it("no inicia la carga de contenido antes de disponer de perfil activo", async () => {
			const authenticatedUserRequest = createDeferred<{ $id: string } | null>();

			const profile = createProfile({
				name: "Perfil diferido",
			});

			mocks.requireAuthenticatedUser.mockReturnValue(
				authenticatedUserRequest.promise,
			);

			mocks.getActiveProfile.mockResolvedValue(profile);
			mocks.getByGenre.mockResolvedValue(createMediaPage());

			const { provider, page } = await renderWithProvider(undefined);

			page.onBeforeEnter(createRouterLocation("movies", "humor"));

			await settle(provider, page, 3);

			expect(mocks.getByGenre).not.toHaveBeenCalled();

			const loadingRegion = getRequiredElement<HTMLElement>(
				page,
				'[aria-label="Cargando perfil activo"]',
			);

			expect(loadingRegion.getAttribute("aria-busy")).toBe("true");

			expect(page.textContent).toContain("Cargando el perfil activo…");

			expect(getAccessibleStatus(page)).toBe("Cargando el perfil activo.");

			authenticatedUserRequest.resolve({
				$id: "user-1",
			});

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected content after the active profile became available.",
			);

			expect(provider.activeProfile).toBe(profile);
			expect(mocks.getByGenre).toHaveBeenCalledTimes(1);
		});

		it("muestra un error controlado cuando falla la recuperación del perfil", async () => {
			mocks.requireAuthenticatedUser.mockRejectedValue(
				new Error("Private authentication error"),
			);

			const { provider, page } = await renderWithProvider(undefined);

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#profile-error-title") !== null,
				"Expected profile error state.",
			);

			expect(
				page.querySelector("#profile-error-title")?.textContent?.trim(),
			).toBe("No pudimos cargar tu perfil");

			expect(page.textContent).toContain(
				"No se pudo cargar el perfil activo. Comprueba tu conexión e inténtalo de nuevo.",
			);

			expect(page.textContent).not.toContain("Private authentication error");

			const retryButton = getButtonByText(page, "Reintentar");

			expect(retryButton.type).toBe("button");

			expect(page.querySelector(`a[href="${ROUTES.profiles}"]`)).not.toBeNull();

			expect(getAccessibleStatus(page)).toBe(
				"No se pudo cargar el perfil activo. Comprueba tu conexión e inténtalo de nuevo.",
			);

			expect(mocks.getByGenre).not.toHaveBeenCalled();
		});

		it("permite reintentar la recuperación del perfil", async () => {
			const profile = createProfile({
				name: "Perfil tras reintento",
			});

			mocks.requireAuthenticatedUser
				.mockRejectedValueOnce(new Error("Authentication unavailable"))
				.mockResolvedValueOnce({
					$id: "user-1",
				});

			mocks.getActiveProfile.mockResolvedValue(profile);
			mocks.getByGenre.mockResolvedValue(createMediaPage());

			const { provider, page } = await renderWithProvider(undefined);

			page.onBeforeEnter(createRouterLocation("movies", "romance"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#profile-error-title") !== null,
				"Expected profile error before retry.",
			);

			getButtonByText(page, "Reintentar").click();

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected content after retrying the profile.",
			);

			expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(2);

			expect(mocks.getActiveProfile).toHaveBeenCalledTimes(1);
			expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");

			expect(provider.activeProfile).toBe(profile);
			expect(mocks.getByGenre).toHaveBeenCalledTimes(1);

			expect(page.querySelector("#profile-error-title")).toBeNull();

			expect(page.querySelector("app-navbar")).not.toBeNull();
		});
	});

	describe("carga inicial", () => {
		it("muestra loading mientras la petición inicial está pendiente", async () => {
			const request = createDeferred<MediaPage>();

			mocks.getByGenre.mockReturnValue(request.promise);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector('[aria-label="Cargando contenido"]') !== null,
				"Expected initial subcategory loading state.",
			);

			const loadingRegion = getRequiredElement<HTMLElement>(
				page,
				'[aria-label="Cargando contenido"]',
			);

			expect(loadingRegion.getAttribute("aria-busy")).toBe("true");

			expect(page.textContent).toContain("Cargando contenido…");

			expect(page.querySelector("media-grid")).toBeNull();
			expect(page.querySelector("app-navbar")).not.toBeNull();

			expect(page.querySelectorAll("h1")).toHaveLength(1);
			expect(getHeadingText(page)).toBe("Películas de terror");

			expect(getAccessibleStatus(page)).toBe(
				"Cargando contenido de la subcategoría.",
			);

			expect(mocks.getByGenre).toHaveBeenCalledWith({
				mediaType: "movie",
				genreNames: ["Horror"],
				page: 1,
				signal: expect.any(AbortSignal),
			});

			request.resolve(createMediaPage());

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected content after initial loading.",
			);
		});

		it("renderiza ready y entrega los MediaItem normalizados al grid", async () => {
			const items = [
				createMovie({
					id: 301,
					title: "Primera película de terror",
					genreIds: [27],
				}),
				createMovie({
					id: 302,
					title: "Segunda película de terror",
					genreIds: [27],
				}),
			];

			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items,
					page: 1,
					totalPages: 3,
					totalResults: 42,
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected ready subcategory state.",
			);

			const grid = getRequiredElement<MediaGrid>(page, "media-grid");

			await grid.updateComplete;

			expect(grid.items).toEqual(items);
			expect(grid.items).not.toBe(items);

			expect(grid.items[0]).toBe(items[0]);
			expect(grid.items[1]).toBe(items[1]);

			expect(grid.label).toBe("Películas de terror. 2 resultados cargados");

			expect(page.querySelectorAll("h1")).toHaveLength(1);

			expect(getAccessibleStatus(page)).toBe("2 contenidos cargados.");
		});

		it("renderiza empty cuando la respuesta no contiene elementos", async () => {
			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items: [],
					page: 1,
					totalPages: 1,
					totalResults: 0,
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("series", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() =>
					page.textContent?.includes("No hay contenido disponible") === true,
				"Expected empty subcategory state.",
			);

			expect(page.querySelector("media-grid")).toBeNull();
			expect(page.querySelector("app-navbar")).not.toBeNull();

			expect(page.querySelectorAll("h1")).toHaveLength(1);
			expect(getHeadingText(page)).toBe("Series de ciencia ficción");

			expect(page.textContent).toContain(
				"No encontramos series de ciencia ficción disponibles en este momento.",
			);

			expect(getButtonByText(page, "Reintentar").type).toBe("button");

			expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

			expect(getAccessibleStatus(page)).toBe(
				"La subcategoría no contiene resultados.",
			);
		});

		it("renderiza un error controlado cuando falla la carga inicial", async () => {
			mocks.getByGenre.mockRejectedValue(
				new Error("Private TMDB technical error"),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "humor"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#subcategory-error-title") !== null,
				"Expected initial subcategory error.",
			);

			const errorRegion = getRequiredElement<HTMLElement>(
				page,
				'[role="alert"][aria-labelledby="subcategory-error-title"]',
			);

			expect(errorRegion).not.toBeNull();

			expect(
				page.querySelector("#subcategory-error-title")?.textContent?.trim(),
			).toBe("No pudimos cargar la subcategoría");

			expect(page.textContent).toContain(
				"No se pudo cargar esta subcategoría. Comprueba tu conexión e inténtalo de nuevo.",
			);

			expect(page.textContent).not.toContain("Private TMDB technical error");

			expect(page.querySelector("media-grid")).toBeNull();
			expect(page.querySelector("app-navbar")).not.toBeNull();

			expect(page.querySelectorAll("h1")).toHaveLength(1);
			expect(getHeadingText(page)).toBe("Películas de humor");

			expect(getButtonByText(page, "Reintentar").type).toBe("button");

			expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

			expect(getAccessibleStatus(page)).toBe(
				"No se pudo cargar esta subcategoría. Comprueba tu conexión e inténtalo de nuevo.",
			);
		});

		it("reintenta la página 1 después de un error inicial", async () => {
			const successfulPage = createMediaPage({
				items: [
					createMovie({
						id: 909,
						title: "Romance tras reintento",
						genreIds: [10749],
					}),
				],
				page: 1,
				totalPages: 2,
				totalResults: 21,
			});

			mocks.getByGenre
				.mockRejectedValueOnce(new Error("TMDB unavailable"))
				.mockResolvedValueOnce(successfulPage);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "romance"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#subcategory-error-title") !== null,
				"Expected subcategory error before retry.",
			);

			getButtonByText(page, "Reintentar").click();

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected subcategory content after retry.",
			);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(2);

			const firstRequest = mocks.getByGenre.mock.calls[0]?.[0];

			const secondRequest = mocks.getByGenre.mock.calls[1]?.[0];

			expect(firstRequest).toMatchObject({
				mediaType: "movie",
				genreNames: ["Romance"],
				page: 1,
			});

			expect(secondRequest).toMatchObject({
				mediaType: "movie",
				genreNames: ["Romance"],
				page: 1,
			});

			expect(firstRequest?.signal).toBeInstanceOf(AbortSignal);
			expect(secondRequest?.signal).toBeInstanceOf(AbortSignal);

			expect(secondRequest?.signal).not.toBe(firstRequest?.signal);

			const grid = getRequiredElement<MediaGrid>(page, "media-grid");

			expect(grid.items).toEqual(successfulPage.items);

			expect(page.querySelector("#subcategory-error-title")).toBeNull();

			expect(page.textContent).not.toContain("TMDB unavailable");
		});
	});

	describe("paginación", () => {
		it("muestra Cargar más mientras existan páginas adicionales y lo oculta en la última", async () => {
			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items: [createMovie()],
					page: 1,
					totalPages: 2,
					totalResults: 2,
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() =>
					Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
						(button) => button.textContent?.trim() === "Cargar más",
					),
				"Expected load more button.",
			);

			const button = getButtonByText(page, "Cargar más");

			expect(button.type).toBe("button");
			expect(button.disabled).toBe(false);
			expect(button.getAttribute("aria-busy")).toBe("false");

			mocks.getByGenre.mockResolvedValueOnce(
				createMediaPage({
					items: [
						createMovie({
							id: 202,
							title: "Página final",
						}),
					],
					page: 2,
					totalPages: 2,
					totalResults: 2,
				}),
			);

			button.click();

			await waitForCondition(
				provider,
				page,
				() => {
					const grid = page.querySelector<MediaGrid>("media-grid");

					return (
						grid?.items.length === 2 &&
						!Array.from(
							page.querySelectorAll<HTMLButtonElement>("button"),
						).some(
							(candidate) => candidate.textContent?.trim() === "Cargar más",
						)
					);
				},
				"Expected final page without load more button.",
			);
		});

		it("solicita currentPage + 1 y mantiene el grid durante la carga", async () => {
			const nextPageRequest = createDeferred<MediaPage>();

			const initialItems = [
				createMovie({
					id: 101,
					title: "Primera película",
				}),
			];

			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: initialItems,
						page: 1,
						totalPages: 3,
						totalResults: 2,
					}),
				)
				.mockReturnValueOnce(nextPageRequest.promise);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected initial grid.",
			);

			const grid = getRequiredElement<MediaGrid>(page, "media-grid");

			const initialItemsReference = grid.items;

			getButtonByText(page, "Cargar más").click();

			await waitForCondition(
				provider,
				page,
				() =>
					Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
						(button) => button.textContent?.trim() === "Cargando…",
					),
				"Expected incremental loading state.",
			);

			const loadingButton = getButtonByText(page, "Cargando…");

			expect(mocks.getByGenre).toHaveBeenCalledTimes(2);

			expect(mocks.getByGenre.mock.calls[1]?.[0]).toMatchObject({
				mediaType: "movie",
				genreNames: ["Science Fiction"],
				page: 2,
			});

			expect(mocks.getByGenre.mock.calls[1]?.[0]?.signal).toBeInstanceOf(
				AbortSignal,
			);

			expect(loadingButton.disabled).toBe(true);
			expect(loadingButton.getAttribute("aria-busy")).toBe("true");

			expect(page.querySelector("media-grid")).toBe(grid);
			expect(grid.items).toBe(initialItemsReference);
			expect(grid.items).toEqual(initialItems);

			expect(
				page.querySelector('[aria-label="Cargando contenido"]'),
			).toBeNull();

			expect(getAccessibleStatus(page)).toBe("Cargando más resultados.");

			nextPageRequest.resolve(
				createMediaPage({
					items: [
						createMovie({
							id: 202,
							title: "Segunda película",
						}),
					],
					page: 2,
					totalPages: 3,
					totalResults: 2,
				}),
			);

			await waitForCondition(
				provider,
				page,
				() => grid.items.length === 2,
				"Expected additional results.",
			);

			expect(grid.items).not.toBe(initialItemsReference);
		});

		it("evita solicitudes simultáneas ante pulsaciones rápidas", async () => {
			const nextPageRequest = createDeferred<MediaPage>();

			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: [createMovie()],
						page: 1,
						totalPages: 3,
						totalResults: 2,
					}),
				)
				.mockReturnValueOnce(nextPageRequest.promise);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "humor"));

			await waitForCondition(
				provider,
				page,
				() =>
					Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
						(button) => button.textContent?.trim() === "Cargar más",
					),
				"Expected load more button.",
			);

			const button = getButtonByText(page, "Cargar más");

			button.click();
			button.click();

			await settle(provider, page, 3);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(2);

			expect(mocks.getByGenre.mock.calls[1]?.[0]).toMatchObject({
				page: 2,
			});

			nextPageRequest.resolve(
				createMediaPage({
					items: [
						createMovie({
							id: 202,
							title: "Resultado adicional",
						}),
					],
					page: 2,
					totalPages: 3,
					totalResults: 2,
				}),
			);

			await waitForCondition(
				provider,
				page,
				() =>
					getRequiredElement<MediaGrid>(page, "media-grid").items.length === 2,
				"Expected pending page to resolve.",
			);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(2);
		});

		it("deduplica resultados y conserva los elementos existentes", async () => {
			const initialMovie = createMovie({
				id: 101,
				title: "Película inicial",
			});

			const seriesWithSameId = createSeries({
				id: 101,
				title: "Serie con el mismo id",
			});

			const additionalMovie = createMovie({
				id: 202,
				title: "Película adicional",
			});

			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: [initialMovie, seriesWithSameId],
						page: 1,
						totalPages: 2,
						totalResults: 5,
					}),
				)
				.mockResolvedValueOnce(
					createMediaPage({
						items: [
							createMovie({
								id: 101,
								title: "Duplicado de película",
							}),
							createSeries({
								id: 101,
								title: "Duplicado de serie",
							}),
							additionalMovie,
						],
						page: 2,
						totalPages: 2,
						totalResults: 5,
					}),
				);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "romance"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected initial grid.",
			);

			const grid = getRequiredElement<MediaGrid>(page, "media-grid");

			const initialItemsReference = grid.items;

			getButtonByText(page, "Cargar más").click();

			await waitForCondition(
				provider,
				page,
				() => grid.items.length === 3,
				"Expected deduplicated results.",
			);

			expect(grid.items).not.toBe(initialItemsReference);

			expect(grid.items).toEqual([
				initialMovie,
				seriesWithSameId,
				additionalMovie,
			]);

			expect(grid.items.map((item) => `${item.mediaType}-${item.id}`)).toEqual([
				"movie-101",
				"tv-101",
				"movie-202",
			]);

			expect(grid.items[0]).toBe(initialMovie);
			expect(grid.items[1]).toBe(seriesWithSameId);
			expect(grid.items[2]).toBe(additionalMovie);
		});

		it("conserva los elementos y permite reintentar la misma página tras un error", async () => {
			const initialItem = createMovie({
				id: 101,
				title: "Contenido conservado",
			});

			const recoveredItem = createMovie({
				id: 202,
				title: "Contenido recuperado",
			});

			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: [initialItem],
						page: 1,
						totalPages: 3,
						totalResults: 2,
					}),
				)
				.mockRejectedValueOnce(new Error("Private incremental error"))
				.mockResolvedValueOnce(
					createMediaPage({
						items: [recoveredItem],
						page: 2,
						totalPages: 3,
						totalResults: 2,
					}),
				);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("series", "humor"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected initial content.",
			);

			const grid = getRequiredElement<MediaGrid>(page, "media-grid");

			const initialItemsReference = grid.items;

			getButtonByText(page, "Cargar más").click();

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#load-more-error") !== null,
				"Expected load more error.",
			);

			const error = getRequiredElement<HTMLElement>(page, "#load-more-error");

			expect(error.getAttribute("role")).toBe("alert");

			expect(error.textContent?.trim()).toBe(
				"No se pudieron cargar más resultados. El contenido anterior sigue disponible.",
			);

			expect(page.textContent).not.toContain("Private incremental error");

			expect(grid.items).toBe(initialItemsReference);
			expect(grid.items).toEqual([initialItem]);

			expect(mocks.getByGenre.mock.calls[1]?.[0]).toMatchObject({
				page: 2,
			});

			const retryButton = getButtonByText(page, "Reintentar carga");

			expect(retryButton.type).toBe("button");
			expect(retryButton.disabled).toBe(false);
			expect(retryButton.getAttribute("aria-busy")).toBe("false");
			expect(retryButton.getAttribute("aria-describedby")).toBe(
				"load-more-error",
			);

			expect(getAccessibleStatus(page)).toBe(
				"No se pudieron cargar más resultados. El contenido anterior sigue disponible.",
			);

			retryButton.click();

			await waitForCondition(
				provider,
				page,
				() =>
					grid.items.length === 2 &&
					page.querySelector("#load-more-error") === null,
				"Expected load more retry to succeed.",
			);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(3);

			expect(mocks.getByGenre.mock.calls[2]?.[0]).toMatchObject({
				page: 2,
			});

			expect(grid.items).toEqual([initialItem, recoveredItem]);
		});
	});

	describe("condiciones de carrera", () => {
		it("aborta la carga anterior y conserva únicamente la nueva combinación", async () => {
			const moviesRequest = createDeferred<MediaPage>();

			const seriesItems = [
				createSeries({
					id: 501,
					title: "Serie vigente",
				}),
			];

			mocks.getByGenre
				.mockReturnValueOnce(moviesRequest.promise)
				.mockResolvedValueOnce(
					createMediaPage({
						items: seriesItems,
						page: 1,
						totalPages: 1,
						totalResults: 1,
					}),
				);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => mocks.getByGenre.mock.calls.length === 1,
				"Expected pending movies/terror request.",
			);

			const moviesSignal = mocks.getByGenre.mock.calls[0]?.[0]
				?.signal as AbortSignal;

			expect(moviesSignal).toBeInstanceOf(AbortSignal);
			expect(moviesSignal.aborted).toBe(false);

			page.onBeforeEnter(createRouterLocation("series", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() => {
					const grid = page.querySelector<MediaGrid>("media-grid");

					return (
						getHeadingText(page) === "Series de ciencia ficción" &&
						grid?.items[0]?.title === "Serie vigente"
					);
				},
				"Expected current series/sci-fi combination.",
			);

			expect(moviesSignal.aborted).toBe(true);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(2);

			expect(mocks.getByGenre.mock.calls[1]?.[0]).toMatchObject({
				mediaType: "tv",
				genreNames: ["Sci-Fi & Fantasy"],
				page: 1,
			});

			const currentGrid = getRequiredElement<MediaGrid>(page, "media-grid");

			expect(currentGrid.items).toEqual(seriesItems);
			expect(document.title).toBe("Ciencia ficción en Series | Nexlit");

			moviesRequest.resolve(
				createMediaPage({
					items: [
						createMovie({
							id: 999,
							title: "Película obsoleta",
						}),
					],
					page: 4,
					totalPages: 8,
					totalResults: 100,
				}),
			);

			await settle(provider, page, 6);

			expect(currentGrid.items).toEqual(seriesItems);
			expect(currentGrid.items).toHaveLength(1);

			expect(page.textContent).not.toContain("Película obsoleta");

			expect(getHeadingText(page)).toBe("Series de ciencia ficción");

			expect(document.title).toBe("Ciencia ficción en Series | Nexlit");
		});

		it("ignora el rechazo tardío de una combinación anterior", async () => {
			const obsoleteRequest = createDeferred<MediaPage>();

			mocks.getByGenre
				.mockReturnValueOnce(obsoleteRequest.promise)
				.mockResolvedValueOnce(
					createMediaPage({
						items: [
							createMovie({
								id: 601,
								title: "Comedia vigente",
							}),
						],
						page: 1,
						totalPages: 1,
						totalResults: 1,
					}),
				);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => mocks.getByGenre.mock.calls.length === 1,
				"Expected obsolete pending request.",
			);

			const obsoleteSignal = mocks.getByGenre.mock.calls[0]?.[0]
				?.signal as AbortSignal;

			page.onBeforeEnter(createRouterLocation("movies", "humor"));

			await waitForCondition(
				provider,
				page,
				() => {
					const grid = page.querySelector<MediaGrid>("media-grid");

					return (
						getHeadingText(page) === "Películas de humor" &&
						grid?.items[0]?.title === "Comedia vigente"
					);
				},
				"Expected current movies/humor content.",
			);

			expect(obsoleteSignal.aborted).toBe(true);

			obsoleteRequest.reject(new Error("Error tardío de la ruta anterior"));

			await settle(provider, page, 6);

			expect(page.querySelector("#subcategory-error-title")).toBeNull();

			expect(page.querySelector("media-grid")).not.toBeNull();

			expect(page.textContent).not.toContain(
				"Error tardío de la ruta anterior",
			);

			expect(getHeadingText(page)).toBe("Películas de humor");

			expect(document.title).toBe("Humor en Películas | Nexlit");
		});

		it("ignora una carga adicional antigua al cambiar de combinación", async () => {
			const obsoleteLoadMoreRequest = createDeferred<MediaPage>();

			const initialMovie = createMovie({
				id: 101,
				title: "Película inicial",
			});

			const currentSeries = createSeries({
				id: 202,
				title: "Serie actual",
			});

			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: [initialMovie],
						page: 1,
						totalPages: 3,
						totalResults: 3,
					}),
				)
				.mockReturnValueOnce(obsoleteLoadMoreRequest.promise)
				.mockResolvedValueOnce(
					createMediaPage({
						items: [currentSeries],
						page: 1,
						totalPages: 1,
						totalResults: 1,
					}),
				);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "romance"));

			await waitForCondition(
				provider,
				page,
				() =>
					Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
						(button) => button.textContent?.trim() === "Cargar más",
					),
				"Expected load more button for movies/romance.",
			);

			getButtonByText(page, "Cargar más").click();

			await waitForCondition(
				provider,
				page,
				() => mocks.getByGenre.mock.calls.length === 2,
				"Expected obsolete incremental request.",
			);

			const loadMoreSignal = mocks.getByGenre.mock.calls[1]?.[0]
				?.signal as AbortSignal;

			expect(mocks.getByGenre.mock.calls[1]?.[0]).toMatchObject({
				mediaType: "movie",
				genreNames: ["Romance"],
				page: 2,
			});

			expect(loadMoreSignal.aborted).toBe(false);

			page.onBeforeEnter(createRouterLocation("series", "humor"));

			await waitForCondition(
				provider,
				page,
				() => {
					const grid = page.querySelector<MediaGrid>("media-grid");

					return (
						getHeadingText(page) === "Series de humor" &&
						grid?.items[0]?.title === "Serie actual"
					);
				},
				"Expected current series/humor content.",
			);

			expect(loadMoreSignal.aborted).toBe(true);

			expect(mocks.getByGenre).toHaveBeenCalledTimes(3);

			expect(mocks.getByGenre.mock.calls[2]?.[0]).toMatchObject({
				mediaType: "tv",
				genreNames: ["Comedy"],
				page: 1,
			});

			obsoleteLoadMoreRequest.resolve(
				createMediaPage({
					items: [
						createMovie({
							id: 303,
							title: "Romance incremental obsoleto",
						}),
					],
					page: 2,
					totalPages: 3,
					totalResults: 3,
				}),
			);

			await settle(provider, page, 6);

			const currentGrid = getRequiredElement<MediaGrid>(page, "media-grid");

			expect(currentGrid.items).toEqual([currentSeries]);
			expect(currentGrid.items).toHaveLength(1);

			expect(page.textContent).not.toContain("Romance incremental obsoleto");

			expect(page.querySelector("#load-more-error")).toBeNull();

			expect(getHeadingText(page)).toBe("Series de humor");
			expect(document.title).toBe("Humor en Series | Nexlit");
		});
	});

	describe("título y ciclo de vida", () => {
		it("enfoca el h1 al activar una combinación y conserva su contrato accesible", async () => {
			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items: [createMovie()],
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => {
					const heading = page.querySelector<HTMLHeadingElement>(
						"#subcategory-heading",
					);

					return heading !== null && document.activeElement === heading;
				},
				"Expected the subcategory heading to receive focus.",
			);

			const heading = getRequiredElement<HTMLHeadingElement>(
				page,
				"#subcategory-heading",
			);

			expect(heading.tagName).toBe("H1");
			expect(heading.textContent?.trim()).toBe("Películas de terror");

			expect(heading.getAttribute("tabindex")).toBe("-1");
			expect(document.activeElement).toBe(heading);

			expect(page.querySelectorAll<HTMLHeadingElement>("h1")).toHaveLength(1);

			expect(document.title).toBe("Terror en Películas | Nexlit");
		});

		it("devuelve el foco al h1 cuando cambia la combinación", async () => {
			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: [createMovie()],
					}),
				)
				.mockResolvedValueOnce(
					createMediaPage({
						items: [createSeries()],
					}),
				);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "humor"));

			await waitForCondition(
				provider,
				page,
				() => {
					const heading = page.querySelector<HTMLHeadingElement>(
						"#subcategory-heading",
					);

					return (
						heading?.textContent?.trim() === "Películas de humor" &&
						document.activeElement === heading
					);
				},
				"Expected the first route heading to receive focus.",
			);

			const previousHeading = getRequiredElement<HTMLHeadingElement>(
				page,
				"#subcategory-heading",
			);

			expect(document.activeElement).toBe(previousHeading);

			previousHeading.blur();

			expect(document.activeElement).not.toBe(previousHeading);

			page.onBeforeEnter(createRouterLocation("series", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() => {
					const heading = page.querySelector<HTMLHeadingElement>(
						"#subcategory-heading",
					);

					const grid = page.querySelector<MediaGrid>("media-grid");

					return (
						heading?.textContent?.trim() === "Series de ciencia ficción" &&
						grid?.items[0]?.mediaType === "tv" &&
						document.activeElement === heading
					);
				},
				"Expected the route heading to regain focus.",
			);

			const currentHeading = getRequiredElement<HTMLHeadingElement>(
				page,
				"#subcategory-heading",
			);

			expect(currentHeading.textContent?.trim()).toBe(
				"Series de ciencia ficción",
			);

			expect(currentHeading.getAttribute("tabindex")).toBe("-1");
			expect(document.activeElement).toBe(currentHeading);

			expect(page.querySelectorAll("h1")).toHaveLength(1);

			expect(document.title).toBe("Ciencia ficción en Series | Nexlit");
		});

		it("aborta la solicitud activa y restaura el título anterior al desconectarse", async () => {
			document.body.replaceChildren();
			document.title = "Título anterior a Subcategory Page";

			const request = createDeferred<MediaPage>();

			mocks.getByGenre.mockReturnValue(request.promise);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() => mocks.getByGenre.mock.calls.length === 1,
				"Expected an active subcategory request.",
			);

			const signal = mocks.getByGenre.mock.calls[0]?.[0]?.signal as AbortSignal;

			expect(signal).toBeInstanceOf(AbortSignal);
			expect(signal.aborted).toBe(false);

			expect(document.title).toBe("Ciencia ficción en Películas | Nexlit");

			provider.remove();

			expect(signal.aborted).toBe(true);

			expect(document.title).toBe("Título anterior a Subcategory Page");

			request.resolve(
				createMediaPage({
					items: [
						createMovie({
							id: 999,
							title: "Resultado posterior a desconexión",
						}),
					],
				}),
			);

			await Promise.resolve();
			await Promise.resolve();

			expect(document.title).toBe("Título anterior a Subcategory Page");

			expect(document.body.textContent).not.toContain(
				"Resultado posterior a desconexión",
			);
		});
	});

	describe("breadcrumb y accesibilidad", () => {
		it("renderiza un breadcrumb semántico con la ruta actual", async () => {
			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items: [createMovie()],
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected ready subcategory content.",
			);

			const breadcrumb = getRequiredElement<HTMLElement>(
				page,
				'nav[aria-label="Breadcrumb"]',
			);

			expect(
				breadcrumb.querySelector(`a[href="${ROUTES.welcome}"]`),
			).not.toBeNull();

			expect(
				breadcrumb.querySelector(`a[href="${buildCategoryRoute("movies")}"]`),
			).not.toBeNull();

			const currentItem = getRequiredElement<HTMLElement>(
				breadcrumb,
				'[aria-current="page"]',
			);

			expect(currentItem.textContent?.trim()).toBe("Terror");

			const breadcrumbText =
				breadcrumb.textContent?.replace(/\s+/g, " ").trim() ?? "";

			expect(breadcrumbText).toContain("Inicio");
			expect(breadcrumbText).toContain("Películas");
			expect(breadcrumbText).toContain("Terror");

			expect(page.querySelectorAll("h1")).toHaveLength(1);
		});

		it("mantiene un único h1 y anuncia la carga adicional", async () => {
			const nextPageRequest = createDeferred<MediaPage>();

			mocks.getByGenre
				.mockResolvedValueOnce(
					createMediaPage({
						items: [createMovie()],
						page: 1,
						totalPages: 3,
						totalResults: 2,
					}),
				)
				.mockReturnValueOnce(nextPageRequest.promise);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("series", "humor"));

			await waitForCondition(
				provider,
				page,
				() =>
					Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
						(button) => button.textContent?.trim() === "Cargar más",
					),
				"Expected load more button.",
			);

			getButtonByText(page, "Cargar más").click();

			await waitForCondition(
				provider,
				page,
				() => getAccessibleStatus(page) === "Cargando más resultados.",
				"Expected accessible loading-more announcement.",
			);

			const liveRegion = getRequiredElement<HTMLElement>(
				page,
				'[aria-live="polite"][aria-atomic="true"]',
			);

			expect(liveRegion.classList.contains("sr-only")).toBe(true);
			expect(liveRegion.textContent?.trim()).toBe("Cargando más resultados.");

			expect(page.querySelectorAll("main")).toHaveLength(1);
			expect(page.querySelectorAll("h1")).toHaveLength(1);

			const heading = getRequiredElement<HTMLHeadingElement>(
				page,
				"#subcategory-heading",
			);

			expect(heading.textContent?.trim()).toBe("Series de humor");
			expect(heading.getAttribute("tabindex")).toBe("-1");

			nextPageRequest.resolve(
				createMediaPage({
					items: [createSeries({ id: 303 })],
					page: 2,
					totalPages: 3,
					totalResults: 2,
				}),
			);

			await waitForCondition(
				provider,
				page,
				() =>
					getRequiredElement<MediaGrid>(page, "media-grid").items.length === 2,
				"Expected incremental results.",
			);
		});

		it("expone errores iniciales e incrementales mediante role alert", async () => {
			mocks.getByGenre.mockRejectedValueOnce(
				new Error("Initial private error"),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "terror"));

			await waitForCondition(
				provider,
				page,
				() =>
					page.querySelector(
						'[role="alert"][aria-labelledby="subcategory-error-title"]',
					) !== null,
				"Expected accessible initial error.",
			);

			expect(
				page.querySelector(
					'[role="alert"][aria-labelledby="subcategory-error-title"]',
				),
			).not.toBeNull();

			mocks.getByGenre
				.mockReset()
				.mockResolvedValueOnce(
					createMediaPage({
						items: [createMovie()],
						page: 1,
						totalPages: 3,
						totalResults: 2,
					}),
				)
				.mockRejectedValueOnce(new Error("Incremental private error"));

			page.onBeforeEnter(createRouterLocation("movies", "humor"));

			await waitForCondition(
				provider,
				page,
				() =>
					Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
						(button) => button.textContent?.trim() === "Cargar más",
					),
				"Expected ready state after route change.",
			);

			getButtonByText(page, "Cargar más").click();

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("#load-more-error") !== null,
				"Expected incremental alert.",
			);

			expect(
				getRequiredElement<HTMLElement>(page, "#load-more-error").getAttribute(
					"role",
				),
			).toBe("alert");

			expect(page.textContent).not.toContain("Incremental private error");
		});
	});

	describe("selección de medios", () => {
		it("muestra el aviso de detalle futuro sin navegar", async () => {
			const selectedMedia = createMovie({
				id: 707,
				title: "Contenido seleccionado",
			});

			mocks.getByGenre.mockResolvedValue(
				createMediaPage({
					items: [selectedMedia],
				}),
			);

			const { provider, page } = await renderWithProvider(createProfile());

			page.onBeforeEnter(createRouterLocation("movies", "sci-fi"));

			await waitForCondition(
				provider,
				page,
				() => page.querySelector("media-grid") !== null,
				"Expected media grid before selection.",
			);

			const grid = getRequiredElement<MediaGrid>(page, "media-grid");

			grid.dispatchEvent(
				new CustomEvent("media-select", {
					detail: {
						media: selectedMedia,
					},
					bubbles: true,
					composed: true,
				}),
			);

			await waitForCondition(
				provider,
				page,
				() => page.querySelector('[role="status"]') !== null,
				"Expected future-detail notice.",
			);

			const notice = getRequiredElement<HTMLElement>(page, '[role="status"]');

			expect(notice.textContent?.trim()).toBe(
				"El detalle de “Contenido seleccionado” estará disponible en un próximo sprint.",
			);

			expect(mocks.routerGo).not.toHaveBeenCalled();
			expect(mocks.getByGenre).toHaveBeenCalledTimes(1);

			expect(window.location.pathname).not.toContain("/media/");
		});
	});
});
