import { provide } from "@lit/context";
import type { RouterLocation } from "@vaadin/router";
import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	getActiveProfile: vi.fn(),
	getMoviesPage: vi.fn(),
	getSeriesPage: vi.fn(),
	getDocumentariesPage: vi.fn(),
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
		getMoviesPage: mocks.getMoviesPage,
		getSeriesPage: mocks.getSeriesPage,
		getDocumentariesPage: mocks.getDocumentariesPage,
	},
}));

vi.mock("@vaadin/router", () => ({
	Router: {
		go: mocks.routerGo,
	},
}));

import type { AppNavbar } from "../../components/layout/app-navbar/app-navbar";
import type { MediaGrid } from "../../components/media/media-grid/media-grid";
import { ROUTES } from "../../core/config/routes";
import {
	DEFAULT_PROFILE_AVATAR_ID,
	getProfileAvatar,
} from "../../core/constants/profile-avatars";
import {
	activeProfileContext,
	type ActiveProfileChangedEvent,
	type ActiveProfileContextValue,
} from "../../core/context/active-profile.context";
import type { Profile } from "../../services/profile/profile.types";
import type { MediaItem, MediaPage } from "../../services/tmdb/tmdb.types";
import "./category.page";
import type { CategoryPage } from "./category.page";

const CATEGORY_PAGE_TAG = "category-page";
const TEST_PROVIDER_TAG = "category-active-profile-test-provider";

class CategoryActiveProfileTestProvider extends LitElement {
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
				<category-page></category-page>
			</div>
		`;
	}
}

if (!customElements.get(TEST_PROVIDER_TAG)) {
	customElements.define(TEST_PROVIDER_TAG, CategoryActiveProfileTestProvider);
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

function createRouterLocation(category: unknown): RouterLocation {
	return {
		params: {
			category,
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

function getHeadingText(page: CategoryPage): string {
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

function getAccessibleStatus(page: CategoryPage): string {
	const liveRegion = getRequiredElement<HTMLElement>(
		page,
		'[aria-live="polite"]',
	);

	return liveRegion.textContent?.trim() ?? "";
}

async function renderWithProvider(
	activeProfile: ActiveProfileContextValue,
): Promise<{
	provider: CategoryActiveProfileTestProvider;
	page: CategoryPage;
}> {
	const provider = document.createElement(
		TEST_PROVIDER_TAG,
	) as CategoryActiveProfileTestProvider;

	provider.activeProfile = activeProfile;

	document.body.appendChild(provider);

	await provider.updateComplete;

	const page = getRequiredElement<CategoryPage>(provider, CATEGORY_PAGE_TAG);

	await page.updateComplete;
	await settle(provider, page);

	return {
		provider,
		page,
	};
}

async function settle(
	provider: CategoryActiveProfileTestProvider,
	page: CategoryPage,
	cycles = 4,
): Promise<void> {
	for (let cycle = 0; cycle < cycles; cycle += 1) {
		await Promise.resolve();
		await provider.updateComplete;
		await page.updateComplete;
	}
}

async function waitForCondition(
	provider: CategoryActiveProfileTestProvider,
	page: CategoryPage,
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
	mocks.getMoviesPage.mockReset();
	mocks.getSeriesPage.mockReset();
	mocks.getDocumentariesPage.mockReset();
	mocks.routerGo.mockReset();
}

describe("CategoryPage", () => {
	let originalDocumentTitle: string;

	beforeEach(() => {
		originalDocumentTitle = document.title;

		vi.restoreAllMocks();
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		document.title = originalDocumentTitle;

		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(CATEGORY_PAGE_TAG)).toBeDefined();
	});

	it("usa Light DOM y reutiliza app-navbar y media-grid", async () => {
		const profile = createProfile();
		const pageResponse = createMediaPage();

		mocks.getMoviesPage.mockResolvedValue(pageResponse);

		const { provider, page } = await renderWithProvider(profile);

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected movies grid to render.",
		);

		expect(page.shadowRoot).toBeNull();
		expect(page.querySelector("main")).not.toBeNull();
		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getHeadingText(page)).toBe("Películas");

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		const grid = getRequiredElement<MediaGrid>(page, "media-grid");

		await navbar.updateComplete;
		await grid.updateComplete;

		expect(navbar.profileName).toBe("Diego");
		expect(navbar.profileAvatar).toBe(getProfileAvatar("avatar-blue")?.src);

		expect(grid.items).toEqual(pageResponse.items);
		expect(grid.items).not.toBe(pageResponse.items);
		expect(grid.items[0]).toBe(pageResponse.items[0]);
		expect(grid.label).toBe("Películas. 1 resultados cargados");
	});

	it("lee movies desde RouterLocation y carga películas", async () => {
		const pageResponse = createMediaPage({
			items: [
				createMovie({
					title: "Película de prueba",
				}),
			],
		});

		mocks.getMoviesPage.mockResolvedValue(pageResponse);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected movies category to become ready.",
		);

		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);
		expect(mocks.getMoviesPage).toHaveBeenCalledWith(
			1,
			expect.any(AbortSignal),
		);

		expect(mocks.getSeriesPage).not.toHaveBeenCalled();
		expect(mocks.getDocumentariesPage).not.toHaveBeenCalled();

		expect(getHeadingText(page)).toBe("Películas");
		expect(page.textContent).toContain(
			"Descubre películas populares y estrenos.",
		);
		expect(document.title).toBe("Películas | Nexlit");
	});

	it("lee series desde RouterLocation y carga series", async () => {
		const pageResponse = createMediaPage({
			items: [
				createSeries({
					title: "Serie de prueba",
				}),
			],
		});

		mocks.getSeriesPage.mockResolvedValue(pageResponse);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("series"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected series category to become ready.",
		);

		expect(mocks.getSeriesPage).toHaveBeenCalledTimes(1);
		expect(mocks.getSeriesPage).toHaveBeenCalledWith(
			1,
			expect.any(AbortSignal),
		);

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(mocks.getDocumentariesPage).not.toHaveBeenCalled();

		expect(getHeadingText(page)).toBe("Series");
		expect(page.textContent).toContain(
			"Explora series populares y contenido destacado.",
		);
		expect(document.title).toBe("Series | Nexlit");
	});

	it("lee documentaries desde RouterLocation y carga documentales", async () => {
		const documentary = createMovie({
			id: 303,
			title: "Documental de prueba",
			genreIds: [99],
		});

		const pageResponse = createMediaPage({
			items: [documentary],
		});

		mocks.getDocumentariesPage.mockResolvedValue(pageResponse);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("documentaries"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected documentaries category to become ready.",
		);

		expect(mocks.getDocumentariesPage).toHaveBeenCalledTimes(1);
		expect(mocks.getDocumentariesPage).toHaveBeenCalledWith(
			1,
			expect.any(AbortSignal),
		);

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(mocks.getSeriesPage).not.toHaveBeenCalled();

		const grid = getRequiredElement<MediaGrid>(page, "media-grid");

		expect(grid.items[0]?.mediaType).toBe("movie");
		expect(getHeadingText(page)).toBe("Documentales");
		expect(page.textContent).toContain(
			"Historias reales, cultura, ciencia y naturaleza.",
		);
		expect(document.title).toBe("Documentales | Nexlit");
	});

	it("muestra categoría no encontrada para un slug inválido", async () => {
		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("anime"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#category-not-found-title") !== null,
			"Expected category not found state.",
		);

		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getHeadingText(page)).toBe("Categoría no encontrada");
		expect(page.textContent).toContain(
			"La categoría solicitada no está disponible en Nexlit.",
		);

		expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

		expect(document.title).toBe("Categoría no encontrada | Nexlit");

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(mocks.getSeriesPage).not.toHaveBeenCalled();
		expect(mocks.getDocumentariesPage).not.toHaveBeenCalled();
		expect(mocks.routerGo).not.toHaveBeenCalled();
	});

	it("restaura el título anterior al desconectarse", async () => {
		document.body.replaceChildren();
		document.title = "Título anterior a Category Page";

		mocks.getMoviesPage.mockResolvedValue(createMediaPage());

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => document.title === "Películas | Nexlit",
			"Expected movies document title.",
		);

		expect(document.title).toBe("Películas | Nexlit");

		provider.remove();

		expect(document.title).toBe("Título anterior a Category Page");
	});

	it("usa el avatar predeterminado cuando avatarId no existe", async () => {
		mocks.getMoviesPage.mockResolvedValue(createMediaPage());

		const profile = createProfile({
			avatarId: "avatar-inexistente",
		});

		const { provider, page } = await renderWithProvider(profile);

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("app-navbar") !== null,
			"Expected navbar.",
		);

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		await navbar.updateComplete;

		const defaultAvatar = getProfileAvatar(DEFAULT_PROFILE_AVATAR_ID);

		expect(defaultAvatar).toBeDefined();
		expect(navbar.profileAvatar).toBe(defaultAvatar?.src);
	});

	it("usa el perfil activo del contexto sin recuperarlo innecesariamente", async () => {
		const profile = createProfile({
			name: "Perfil existente",
			avatarId: "avatar-red",
		});

		mocks.getMoviesPage.mockResolvedValue(createMediaPage());

		const { provider, page } = await renderWithProvider(profile);

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected category content with the existing profile.",
		);

		expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		await navbar.updateComplete;

		expect(navbar.profileName).toBe("Perfil existente");
		expect(navbar.profileAvatar).toBe(getProfileAvatar("avatar-red")?.src);
	});

	it("recupera el perfil activo cuando el contexto está undefined", async () => {
		const profile = createProfile({
			id: "profile-recovered",
			name: "Perfil recuperado",
		});

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		mocks.getActiveProfile.mockResolvedValue(profile);
		mocks.getMoviesPage.mockResolvedValue(createMediaPage());

		const { provider, page } = await renderWithProvider(undefined);

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected category content after recovering the profile.",
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");

		expect(provider.activeProfile).toBe(profile);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		await navbar.updateComplete;

		expect(navbar.profileName).toBe("Perfil recuperado");
	});

	it("redirige a login cuando la recuperación no encuentra una sesión", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const { provider, page } = await renderWithProvider(undefined);

		await waitForCondition(
			provider,
			page,
			() => mocks.routerGo.mock.calls.some(([route]) => route === ROUTES.login),
			"Expected login redirection.",
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.login);

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(mocks.getSeriesPage).not.toHaveBeenCalled();
		expect(mocks.getDocumentariesPage).not.toHaveBeenCalled();

		expect(page.querySelector("app-navbar")).toBeNull();
	});

	it("redirige a perfiles cuando la recuperación devuelve null", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		mocks.getActiveProfile.mockResolvedValue(null);

		const { provider, page } = await renderWithProvider(undefined);

		page.onBeforeEnter(createRouterLocation("series"));

		await waitForCondition(
			provider,
			page,
			() =>
				mocks.routerGo.mock.calls.some(([route]) => route === ROUTES.profiles),
			"Expected profiles redirection.",
		);

		expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");
		expect(provider.activeProfile).toBeNull();
		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.profiles);

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(mocks.getSeriesPage).not.toHaveBeenCalled();
		expect(mocks.getDocumentariesPage).not.toHaveBeenCalled();

		expect(page.querySelector("app-navbar")).toBeNull();
	});

	it("redirige a perfiles cuando el contexto ya contiene null", async () => {
		const { page } = await renderWithProvider(null);

		page.onBeforeEnter(createRouterLocation("movies"));

		await page.updateComplete;

		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.profiles);

		expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(page.querySelector("app-navbar")).toBeNull();
	});

	it("muestra un estado controlado cuando falla la recuperación del perfil", async () => {
		mocks.requireAuthenticatedUser.mockRejectedValue(
			new Error("Authentication service unavailable"),
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

		const retryButton = getButtonByText(page, "Reintentar");

		expect(retryButton.type).toBe("button");

		expect(page.querySelector(`a[href="${ROUTES.profiles}"]`)).not.toBeNull();

		expect(getAccessibleStatus(page)).toBe(
			"No se pudo cargar el perfil activo. Comprueba tu conexión e inténtalo de nuevo.",
		);

		expect(page.textContent).not.toContain(
			"Authentication service unavailable",
		);

		expect(mocks.getMoviesPage).not.toHaveBeenCalled();
		expect(mocks.getSeriesPage).not.toHaveBeenCalled();
		expect(mocks.getDocumentariesPage).not.toHaveBeenCalled();
	});

	it("permite reintentar la recuperación del perfil", async () => {
		const profile = createProfile({
			name: "Perfil tras reintento",
		});

		mocks.requireAuthenticatedUser
			.mockRejectedValueOnce(new Error("Authentication service unavailable"))
			.mockResolvedValueOnce({
				$id: "user-1",
			});

		mocks.getActiveProfile.mockResolvedValue(profile);
		mocks.getMoviesPage.mockResolvedValue(createMediaPage());

		const { provider, page } = await renderWithProvider(undefined);

		page.onBeforeEnter(createRouterLocation("movies"));

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
			"Expected category content after retrying the profile.",
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(2);
		expect(mocks.getActiveProfile).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");

		expect(provider.activeProfile).toBe(profile);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);

		expect(page.querySelector("#profile-error-title")).toBeNull();
		expect(page.querySelector("app-navbar")).not.toBeNull();
	});

	it("muestra el estado loading inicial con aria-busy", async () => {
		const request = createDeferred<MediaPage>();

		mocks.getMoviesPage.mockReturnValue(request.promise);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector('[aria-label="Cargando contenido"]') !== null,
			"Expected initial category loading state.",
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
		expect(getHeadingText(page)).toBe("Películas");
		expect(getAccessibleStatus(page)).toBe(
			"Cargando contenido de la categoría.",
		);

		request.resolve(createMediaPage());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected category content after loading.",
		);
	});

	it("renderiza ready y muestra Cargar más cuando existen páginas adicionales", async () => {
		const items = [
			createMovie({
				id: 101,
				title: "Primera película",
			}),
			createMovie({
				id: 202,
				title: "Segunda película",
			}),
		];

		mocks.getMoviesPage.mockResolvedValue(
			createMediaPage({
				items,
				page: 1,
				totalPages: 3,
				totalResults: 42,
			}),
		);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected ready category state.",
		);

		const grid = getRequiredElement<MediaGrid>(page, "media-grid");

		const loadMoreButton = getButtonByText(page, "Cargar más");

		expect(grid.items).toEqual(items);
		expect(grid.items).not.toBe(items);
		expect(grid.label).toBe("Películas. 2 resultados cargados");

		expect(loadMoreButton.type).toBe("button");
		expect(loadMoreButton.disabled).toBe(false);
		expect(loadMoreButton.getAttribute("aria-busy")).toBe("false");
		expect(loadMoreButton.hasAttribute("aria-describedby")).toBe(false);

		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getAccessibleStatus(page)).toBe("2 contenidos cargados.");
	});

	it("oculta Cargar más cuando se alcanza la última página", async () => {
		mocks.getSeriesPage.mockResolvedValue(
			createMediaPage({
				items: [createSeries()],
				page: 3,
				totalPages: 3,
				totalResults: 50,
			}),
		);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("series"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected final series page.",
		);

		const buttons = Array.from(
			page.querySelectorAll<HTMLButtonElement>("button"),
		);

		expect(
			buttons.find((button) => button.textContent?.trim() === "Cargar más"),
		).toBeUndefined();

		expect(page.querySelector("#load-more-error")).toBeNull();
		expect(getAccessibleStatus(page)).toBe("1 contenidos cargados.");
	});

	it("renderiza empty con el mensaje específico de la categoría", async () => {
		mocks.getDocumentariesPage.mockResolvedValue(
			createMediaPage({
				items: [],
				page: 1,
				totalPages: 1,
				totalResults: 0,
			}),
		);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("documentaries"));

		await waitForCondition(
			provider,
			page,
			() => page.textContent?.includes("No hay contenido disponible") === true,
			"Expected empty documentaries state.",
		);

		expect(page.querySelector("media-grid")).toBeNull();
		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(getHeadingText(page)).toBe("Documentales");

		expect(page.textContent).toContain(
			"No encontramos documentales disponibles en este momento.",
		);

		expect(getButtonByText(page, "Reintentar").type).toBe("button");

		expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

		expect(getAccessibleStatus(page)).toBe(
			"La categoría no contiene resultados.",
		);
	});

	it("muestra un error inicial controlado sin conservar el grid", async () => {
		mocks.getMoviesPage.mockRejectedValue(
			new Error("Private TMDB technical error"),
		);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#category-error-title") !== null,
			"Expected initial category error.",
		);

		const errorRegion = getRequiredElement<HTMLElement>(
			page,
			'[role="alert"][aria-labelledby="category-error-title"]',
		);

		expect(errorRegion).not.toBeNull();

		expect(
			page.querySelector("#category-error-title")?.textContent?.trim(),
		).toBe("No pudimos cargar la categoría");

		expect(page.textContent).toContain(
			"No se pudo cargar esta categoría. Comprueba tu conexión e inténtalo de nuevo.",
		);

		expect(page.textContent).not.toContain("Private TMDB technical error");

		expect(page.querySelector("media-grid")).toBeNull();
		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(page.querySelectorAll("h1")).toHaveLength(1);

		expect(getButtonByText(page, "Reintentar").type).toBe("button");

		expect(page.querySelector(`a[href="${ROUTES.welcome}"]`)).not.toBeNull();

		expect(getAccessibleStatus(page)).toBe(
			"No se pudo cargar esta categoría. Comprueba tu conexión e inténtalo de nuevo.",
		);
	});

	it("permite reintentar la página 1 después de un error inicial", async () => {
		const successfulPage = createMediaPage({
			items: [
				createMovie({
					id: 909,
					title: "Película tras reintento",
				}),
			],
			page: 1,
			totalPages: 2,
			totalResults: 21,
		});

		mocks.getMoviesPage
			.mockRejectedValueOnce(new Error("TMDB unavailable"))
			.mockResolvedValueOnce(successfulPage);

		const { provider, page } = await renderWithProvider(createProfile());

		page.onBeforeEnter(createRouterLocation("movies"));

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#category-error-title") !== null,
			"Expected category error before retry.",
		);

		getButtonByText(page, "Reintentar").click();

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected category content after retry.",
		);

		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(2);

		expect(mocks.getMoviesPage.mock.calls[0]?.[0]).toBe(1);
		expect(mocks.getMoviesPage.mock.calls[1]?.[0]).toBe(1);

		expect(mocks.getMoviesPage.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
		expect(mocks.getMoviesPage.mock.calls[1]?.[1]).toBeInstanceOf(AbortSignal);

		const grid = getRequiredElement<MediaGrid>(page, "media-grid");

		expect(grid.items).toEqual(successfulPage.items);
		expect(page.querySelector("#category-error-title")).toBeNull();
		expect(page.textContent).not.toContain("TMDB unavailable");
	});

	it("mantiene el grid y anuncia la carga mientras solicita la página siguiente", async () => {
		const initialItems = [
			createMovie({ id: 101, title: "Primera película" }),
			createMovie({ id: 202, title: "Segunda película" }),
		];
		const nextPageRequest = createDeferred<MediaPage>();
		mocks.getMoviesPage
			.mockResolvedValueOnce(
				createMediaPage({
					items: initialItems,
					page: 1,
					totalPages: 3,
					totalResults: 3,
				}),
			)
			.mockReturnValueOnce(nextPageRequest.promise);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected initial movie page.",
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
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(2);
		expect(mocks.getMoviesPage.mock.calls[1]?.[0]).toBe(2);
		expect(mocks.getMoviesPage.mock.calls[1]?.[1]).toBeInstanceOf(AbortSignal);
		expect(loadingButton.type).toBe("button");
		expect(loadingButton.disabled).toBe(true);
		expect(loadingButton.getAttribute("aria-busy")).toBe("true");
		expect(page.querySelector("media-grid")).toBe(grid);
		expect(grid.items).toBe(initialItemsReference);
		expect(grid.items).toEqual(initialItems);
		expect(page.querySelector('[aria-label="Cargando contenido"]')).toBeNull();
		expect(getAccessibleStatus(page)).toBe("Cargando más resultados.");
		const additionalMedia = createMovie({ id: 303, title: "Tercera película" });
		nextPageRequest.resolve(
			createMediaPage({
				items: [additionalMedia],
				page: 2,
				totalPages: 3,
				totalResults: 3,
			}),
		);
		await waitForCondition(
			provider,
			page,
			() =>
				grid.items.length === 3 &&
				Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
					(button) => button.textContent?.trim() === "Cargar más",
				),
			"Expected additional movie results.",
		);
		expect(grid.items).not.toBe(initialItemsReference);
		expect(grid.items).toEqual([
			initialItems[0],
			initialItems[1],
			additionalMedia,
		]);
		expect(grid.items[0]).toBe(initialItems[0]);
		expect(grid.items[1]).toBe(initialItems[1]);
		expect(grid.items[2]).toBe(additionalMedia);
		expect(grid.label).toBe("Películas. 3 resultados cargados");
		expect(getAccessibleStatus(page)).toBe("3 contenidos cargados.");
	});
	it("evita solicitudes simultáneas ante pulsaciones rápidas", async () => {
		const nextPageRequest = createDeferred<MediaPage>();
		mocks.getMoviesPage
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
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() =>
				Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
					(button) => button.textContent?.trim() === "Cargar más",
				),
			"Expected load more button.",
		);
		const loadMoreButton = getButtonByText(page, "Cargar más");
		loadMoreButton.click();
		loadMoreButton.click();
		await settle(provider, page, 3);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(2);
		expect(mocks.getMoviesPage.mock.calls[1]?.[0]).toBe(2);
		nextPageRequest.resolve(
			createMediaPage({
				items: [createMovie({ id: 202, title: "Página adicional" })],
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
			"Expected the pending page to resolve.",
		);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(2);
	});
	it("usa la página actualizada en solicitudes posteriores y respeta totalPages", async () => {
		const thirdPageRequest = createDeferred<MediaPage>();
		mocks.getMoviesPage
			.mockResolvedValueOnce(
				createMediaPage({
					items: [createMovie({ id: 101, title: "Página uno" })],
					page: 1,
					totalPages: 4,
					totalResults: 3,
				}),
			)
			.mockResolvedValueOnce(
				createMediaPage({
					items: [createMovie({ id: 202, title: "Página dos" })],
					page: 2,
					totalPages: 3,
					totalResults: 3,
				}),
			)
			.mockReturnValueOnce(thirdPageRequest.promise);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected first page.",
		);
		getButtonByText(page, "Cargar más").click();
		await waitForCondition(
			provider,
			page,
			() =>
				getRequiredElement<MediaGrid>(page, "media-grid").items.length === 2,
			"Expected second page.",
		);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(2);
		expect(mocks.getMoviesPage.mock.calls[1]?.[0]).toBe(2);
		getButtonByText(page, "Cargar más").click();
		await waitForCondition(
			provider,
			page,
			() => mocks.getMoviesPage.mock.calls.length === 3,
			"Expected third page request.",
		);
		expect(mocks.getMoviesPage.mock.calls[2]?.[0]).toBe(3);
		expect(mocks.getMoviesPage.mock.calls[2]?.[1]).toBeInstanceOf(AbortSignal);
		thirdPageRequest.resolve(
			createMediaPage({
				items: [createMovie({ id: 303, title: "Página tres" })],
				page: 3,
				totalPages: 3,
				totalResults: 3,
			}),
		);
		await waitForCondition(
			provider,
			page,
			() => {
				const grid = page.querySelector<MediaGrid>("media-grid");
				if (!grid || grid.items.length !== 3) {
					return false;
				}
				return !Array.from(
					page.querySelectorAll<HTMLButtonElement>("button"),
				).some((button) => button.textContent?.trim() === "Cargar más");
			},
			"Expected final page without load more button.",
		);
		expect(
			Array.from(page.querySelectorAll<HTMLButtonElement>("button")).find(
				(button) => button.textContent?.trim() === "Cargar más",
			),
		).toBeUndefined();
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(3);
	});
	it("conserva los resultados y reintenta la misma página tras un error incremental", async () => {
		const initialMedia = createMovie({
			id: 101,
			title: "Contenido conservado",
		});
		const additionalMedia = createMovie({
			id: 202,
			title: "Contenido recuperado",
		});
		mocks.getMoviesPage
			.mockResolvedValueOnce(
				createMediaPage({
					items: [initialMedia],
					page: 1,
					totalPages: 3,
					totalResults: 2,
				}),
			)
			.mockRejectedValueOnce(new Error("Private incremental technical error"))
			.mockResolvedValueOnce(
				createMediaPage({
					items: [additionalMedia],
					page: 2,
					totalPages: 3,
					totalResults: 2,
				}),
			);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected initial category content.",
		);
		const grid = getRequiredElement<MediaGrid>(page, "media-grid");
		const initialItemsReference = grid.items;
		getButtonByText(page, "Cargar más").click();
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#load-more-error") !== null,
			"Expected incremental error.",
		);
		const errorMessage = getRequiredElement<HTMLElement>(
			page,
			"#load-more-error",
		);
		expect(errorMessage.getAttribute("role")).toBe("alert");
		expect(errorMessage.textContent?.trim()).toBe(
			"No se pudieron cargar más resultados. El contenido anterior sigue disponible.",
		);
		expect(page.textContent).not.toContain(
			"Private incremental technical error",
		);
		expect(page.querySelector("media-grid")).toBe(grid);
		expect(grid.items).toBe(initialItemsReference);
		expect(grid.items).toEqual([initialMedia]);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(2);
		expect(mocks.getMoviesPage.mock.calls[1]?.[0]).toBe(2);
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
			"Expected incremental retry to succeed.",
		);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(3);
		expect(mocks.getMoviesPage.mock.calls[2]?.[0]).toBe(2);
		expect(grid.items).not.toBe(initialItemsReference);
		expect(grid.items).toEqual([initialMedia, additionalMedia]);
		expect(
			Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
				(button) => button.textContent?.trim() === "Cargar más",
			),
		).toBe(true);
	});

	it("deduplica resultados paginados por mediaType e id", async () => {
		const movieWithSharedId = createMovie({
			id: 101,
			title: "Película con id compartido",
		});
		const seriesWithSharedId = createSeries({
			id: 101,
			title: "Serie con id compartido",
		});
		const additionalMovie = createMovie({
			id: 202,
			title: "Película adicional",
		});
		mocks.getMoviesPage
			.mockResolvedValueOnce(
				createMediaPage({
					items: [movieWithSharedId, seriesWithSharedId],
					page: 1,
					totalPages: 2,
					totalResults: 5,
				}),
			)
			.mockResolvedValueOnce(
				createMediaPage({
					items: [
						createMovie({ id: 101, title: "Duplicado de película" }),
						createSeries({ id: 101, title: "Duplicado de serie" }),
						additionalMovie,
					],
					page: 2,
					totalPages: 2,
					totalResults: 5,
				}),
			);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected initial media grid.",
		);
		getButtonByText(page, "Cargar más").click();
		await waitForCondition(
			provider,
			page,
			() =>
				getRequiredElement<MediaGrid>(page, "media-grid").items.length === 3,
			"Expected deduplicated paginated results.",
		);
		const grid = getRequiredElement<MediaGrid>(page, "media-grid");
		expect(grid.items).toEqual([
			movieWithSharedId,
			seriesWithSharedId,
			additionalMovie,
		]);
		expect(grid.items.map((item) => `${item.mediaType}-${item.id}`)).toEqual([
			"movie-101",
			"tv-101",
			"movie-202",
		]);
		expect(grid.label).toBe("Películas. 3 resultados cargados");
		expect(
			Array.from(page.querySelectorAll<HTMLButtonElement>("button")).some(
				(button) => button.textContent?.trim() === "Cargar más",
			),
		).toBe(false);
	});
	it("no vuelve a solicitar una categoría que ya está cargada", async () => {
		mocks.getMoviesPage.mockResolvedValue(
			createMediaPage({
				items: [createMovie()],
				page: 1,
				totalPages: 1,
				totalResults: 1,
			}),
		);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected movies category.",
		);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);
		page.onBeforeEnter(createRouterLocation("movies"));
		await settle(provider, page, 4);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);
		expect(getHeadingText(page)).toBe("Películas");
		expect(document.title).toBe("Películas | Nexlit");
	});
	it("cancela la solicitud anterior e ignora su resultado al cambiar de categoría", async () => {
		const moviesRequest = createDeferred<MediaPage>();
		const seriesItems = [createSeries({ id: 501, title: "Serie vigente" })];
		mocks.getMoviesPage.mockReturnValue(moviesRequest.promise);
		mocks.getSeriesPage.mockResolvedValue(
			createMediaPage({
				items: seriesItems,
				page: 1,
				totalPages: 1,
				totalResults: 1,
			}),
		);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => mocks.getMoviesPage.mock.calls.length === 1,
			"Expected pending movies request.",
		);
		const moviesSignal = mocks.getMoviesPage.mock.calls[0]?.[1] as AbortSignal;
		expect(moviesSignal.aborted).toBe(false);
		page.onBeforeEnter(createRouterLocation("series"));
		await waitForCondition(
			provider,
			page,
			() => {
				const grid = page.querySelector<MediaGrid>("media-grid");
				return (
					getHeadingText(page) === "Series" &&
					grid?.items[0]?.title === "Serie vigente"
				);
			},
			"Expected series category after navigation.",
		);
		expect(moviesSignal.aborted).toBe(true);
		expect(mocks.getSeriesPage).toHaveBeenCalledTimes(1);
		expect(mocks.getSeriesPage).toHaveBeenCalledWith(
			1,
			expect.any(AbortSignal),
		);
		moviesRequest.resolve(
			createMediaPage({
				items: [createMovie({ id: 999, title: "Película obsoleta" })],
				page: 1,
				totalPages: 1,
				totalResults: 1,
			}),
		);
		await settle(provider, page, 6);
		const grid = getRequiredElement<MediaGrid>(page, "media-grid");
		expect(grid.items).toEqual(seriesItems);
		expect(grid.items[0]?.title).toBe("Serie vigente");
		expect(page.textContent).not.toContain("Película obsoleta");
		expect(getHeadingText(page)).toBe("Series");
		expect(document.title).toBe("Series | Nexlit");
	});
	it("cancela una solicitud pendiente al activar una categoría inválida", async () => {
		const moviesRequest = createDeferred<MediaPage>();
		mocks.getMoviesPage.mockReturnValue(moviesRequest.promise);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => mocks.getMoviesPage.mock.calls.length === 1,
			"Expected pending movies request.",
		);
		const moviesSignal = mocks.getMoviesPage.mock.calls[0]?.[1] as AbortSignal;
		expect(moviesSignal.aborted).toBe(false);
		page.onBeforeEnter(createRouterLocation("anime"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#category-not-found-title") !== null,
			"Expected unsupported category state.",
		);
		expect(moviesSignal.aborted).toBe(true);
		expect(getHeadingText(page)).toBe("Categoría no encontrada");
		expect(page.querySelector("media-grid")).toBeNull();
		expect(document.title).toBe("Categoría no encontrada | Nexlit");
		moviesRequest.resolve(
			createMediaPage({
				items: [createMovie({ id: 999, title: "Resultado obsoleto" })],
			}),
		);
		await settle(provider, page, 6);
		expect(page.querySelector("#category-not-found-title")).not.toBeNull();
		expect(page.querySelector("media-grid")).toBeNull();
		expect(page.textContent).not.toContain("Resultado obsoleto");
		expect(document.title).toBe("Categoría no encontrada | Nexlit");
	});
	it("aborta la solicitud activa y restaura el título al desconectarse", async () => {
		document.body.replaceChildren();
		document.title = "Título previo a la navegación";
		const moviesRequest = createDeferred<MediaPage>();
		mocks.getMoviesPage.mockReturnValue(moviesRequest.promise);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => mocks.getMoviesPage.mock.calls.length === 1,
			"Expected active movies request.",
		);
		const moviesSignal = mocks.getMoviesPage.mock.calls[0]?.[1] as AbortSignal;
		expect(moviesSignal.aborted).toBe(false);
		expect(document.title).toBe("Películas | Nexlit");
		provider.remove();
		expect(moviesSignal.aborted).toBe(true);
		expect(document.title).toBe("Título previo a la navegación");
		moviesRequest.resolve(
			createMediaPage({
				items: [
					createMovie({ id: 404, title: "Resultado posterior a desconexión" }),
				],
			}),
		);
		await Promise.resolve();
		await Promise.resolve();
		expect(document.title).toBe("Título previo a la navegación");
	});

	it("muestra un estado accesible mientras recupera el perfil activo", async () => {
		const authenticatedUserRequest = createDeferred<{ $id: string } | null>();
		mocks.requireAuthenticatedUser.mockReturnValue(
			authenticatedUserRequest.promise,
		);
		const { provider, page } = await renderWithProvider(undefined);
		const loadingSection = getRequiredElement<HTMLElement>(
			page,
			'[aria-label="Cargando perfil activo"]',
		);
		expect(loadingSection.getAttribute("aria-busy")).toBe("true");
		expect(page.textContent).toContain("Cargando el perfil activo…");
		expect(page.querySelector("app-navbar")).toBeNull();
		expect(page.querySelector("media-grid")).toBeNull();
		expect(getAccessibleStatus(page)).toBe("Cargando el perfil activo.");
		authenticatedUserRequest.resolve(null);
		await waitForCondition(
			provider,
			page,
			() => mocks.routerGo.mock.calls.some(([route]) => route === ROUTES.login),
			"Expected login redirect after resolving without a user.",
		);
	});
	it("relaciona semánticamente el encabezado, la sección y la región de estado", async () => {
		mocks.getMoviesPage.mockResolvedValue(
			createMediaPage({
				items: [createMovie()],
				page: 1,
				totalPages: 1,
				totalResults: 1,
			}),
		);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected ready movies category.",
		);
		const main = getRequiredElement<HTMLElement>(page, "main");
		const heading = getRequiredElement<HTMLHeadingElement>(
			main,
			"#category-heading",
		);
		const categorySection = getRequiredElement<HTMLElement>(
			main,
			'section[aria-labelledby="category-heading"]',
		);
		const liveRegion = getRequiredElement<HTMLElement>(
			main,
			'[aria-live="polite"][aria-atomic="true"]',
		);
		expect(heading.tagName).toBe("H1");
		expect(heading.textContent?.trim()).toBe("Películas");
		expect(categorySection.getAttribute("aria-labelledby")).toBe(heading.id);
		expect(liveRegion.classList.contains("sr-only")).toBe(true);
		expect(liveRegion.textContent?.trim()).toBe("1 contenidos cargados.");
		expect(page.querySelectorAll("main")).toHaveLength(1);
		expect(page.querySelectorAll("h1")).toHaveLength(1);
	});
	it("muestra un aviso al recibir media-select desde el grid", async () => {
		const selectedMedia = createMovie({
			id: 707,
			title: "Contenido seleccionado",
		});
		mocks.getMoviesPage.mockResolvedValue(
			createMediaPage({ items: [selectedMedia] }),
		);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected media grid before selection.",
		);
		const grid = getRequiredElement<MediaGrid>(page, "media-grid");
		grid.dispatchEvent(
			new CustomEvent("media-select", {
				detail: { media: selectedMedia },
				bubbles: true,
				composed: true,
			}),
		);
		await waitForCondition(
			provider,
			page,
			() => page.querySelector('[role="status"]') !== null,
			"Expected feature notice.",
		);
		const notice = getRequiredElement<HTMLElement>(page, '[role="status"]');
		expect(notice.textContent?.trim()).toBe(
			"El detalle de “Contenido seleccionado” estará disponible en un próximo sprint.",
		);
		expect(mocks.routerGo).not.toHaveBeenCalled();
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);
	});
	it("reemplaza el aviso cuando se selecciona otro contenido", async () => {
		const firstMedia = createMovie({ id: 101, title: "Primer contenido" });
		const secondMedia = createMovie({ id: 202, title: "Segundo contenido" });
		mocks.getMoviesPage.mockResolvedValue(
			createMediaPage({ items: [firstMedia, secondMedia], totalResults: 2 }),
		);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected media grid.",
		);
		const grid = getRequiredElement<MediaGrid>(page, "media-grid");
		grid.dispatchEvent(
			new CustomEvent("media-select", {
				detail: { media: firstMedia },
				bubbles: true,
				composed: true,
			}),
		);
		await waitForCondition(
			provider,
			page,
			() =>
				page.textContent?.includes("El detalle de “Primer contenido”") === true,
			"Expected first feature notice.",
		);
		grid.dispatchEvent(
			new CustomEvent("media-select", {
				detail: { media: secondMedia },
				bubbles: true,
				composed: true,
			}),
		);
		await waitForCondition(
			provider,
			page,
			() =>
				page.textContent?.includes("El detalle de “Segundo contenido”") ===
				true,
			"Expected second feature notice.",
		);
		expect(page.textContent).not.toContain("El detalle de “Primer contenido”");
		expect(page.querySelector('[role="status"]')?.textContent?.trim()).toBe(
			"El detalle de “Segundo contenido” estará disponible en un próximo sprint.",
		);
	});
	it("limpia el aviso de selección al cambiar de categoría", async () => {
		const movie = createMovie({ id: 101, title: "Película seleccionada" });
		const series = createSeries({ id: 202, title: "Serie vigente" });
		mocks.getMoviesPage.mockResolvedValue(createMediaPage({ items: [movie] }));
		mocks.getSeriesPage.mockResolvedValue(createMediaPage({ items: [series] }));
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected movies grid.",
		);
		getRequiredElement<MediaGrid>(page, "media-grid").dispatchEvent(
			new CustomEvent("media-select", {
				detail: { media: movie },
				bubbles: true,
				composed: true,
			}),
		);
		await waitForCondition(
			provider,
			page,
			() => page.querySelector('[role="status"]') !== null,
			"Expected movie feature notice.",
		);
		page.onBeforeEnter(createRouterLocation("series"));
		await waitForCondition(
			provider,
			page,
			() => {
				const grid = page.querySelector<MediaGrid>("media-grid");
				return (
					getHeadingText(page) === "Series" &&
					grid?.items[0]?.title === "Serie vigente"
				);
			},
			"Expected series category.",
		);
		expect(page.querySelector('[role="status"]')).toBeNull();
		expect(page.textContent).not.toContain(
			"Película seleccionada” estará disponible",
		);
		expect(document.title).toBe("Series | Nexlit");
	});
	it("actualiza el navbar cuando cambia el perfil sin volver a cargar la categoría", async () => {
		mocks.getMoviesPage.mockResolvedValue(createMediaPage());
		const { provider, page } = await renderWithProvider(
			createProfile({
				id: "profile-1",
				name: "Perfil inicial",
				avatarId: "avatar-blue",
			}),
		);
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => page.querySelector("media-grid") !== null,
			"Expected initial category.",
		);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);
		provider.activeProfile = createProfile({
			id: "profile-2",
			name: "Perfil actualizado",
			avatarId: "avatar-red",
		});
		await provider.updateComplete;
		await waitForCondition(
			provider,
			page,
			() => {
				const navbar = page.querySelector<AppNavbar>("app-navbar");
				return navbar?.profileName === "Perfil actualizado";
			},
			"Expected updated navbar profile.",
		);
		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");
		expect(navbar.profileName).toBe("Perfil actualizado");
		expect(navbar.profileAvatar).toBe(getProfileAvatar("avatar-red")?.src);
		expect(mocks.getMoviesPage).toHaveBeenCalledTimes(1);
		expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
	});
	it("aborta la carga y redirige cuando el perfil activo cambia a null", async () => {
		const moviesRequest = createDeferred<MediaPage>();
		mocks.getMoviesPage.mockReturnValue(moviesRequest.promise);
		const { provider, page } = await renderWithProvider(createProfile());
		page.onBeforeEnter(createRouterLocation("movies"));
		await waitForCondition(
			provider,
			page,
			() => mocks.getMoviesPage.mock.calls.length === 1,
			"Expected active movies request.",
		);
		const signal = mocks.getMoviesPage.mock.calls[0]?.[1] as AbortSignal;
		expect(signal.aborted).toBe(false);
		provider.activeProfile = null;
		await provider.updateComplete;
		await waitForCondition(
			provider,
			page,
			() =>
				mocks.routerGo.mock.calls.some(([route]) => route === ROUTES.profiles),
			"Expected profiles redirect.",
		);
		expect(signal.aborted).toBe(true);
		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.profiles);
		expect(page.querySelector("app-navbar")).toBeNull();
		expect(page.querySelector("media-grid")).toBeNull();
		moviesRequest.resolve(
			createMediaPage({
				items: [
					createMovie({ id: 999, title: "Resultado obsoleto sin perfil" }),
				],
			}),
		);
		await settle(provider, page, 6);
		expect(page.querySelector("media-grid")).toBeNull();
		expect(page.textContent).not.toContain("Resultado obsoleto sin perfil");
	});
});
