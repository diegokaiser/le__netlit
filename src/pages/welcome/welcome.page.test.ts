import { provide } from "@lit/context";
import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	getActiveProfile: vi.fn(),
	getWelcomeContent: vi.fn(),
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
		getWelcomeContent: mocks.getWelcomeContent,
	},
}));

vi.mock("@vaadin/router", () => ({
	Router: {
		go: mocks.routerGo,
	},
}));

import type { AppNavbar } from "../../components/layout/app-navbar/app-navbar";
import type { HeroBanner } from "../../components/media/hero-banner/hero-banner";
import type { MediaRow } from "../../components/media/media-row/media-row";
import { createMediaSelectEvent } from "../../components/media/media.events";
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
import type {
	MediaItem,
	MediaSection,
	WelcomeContent,
} from "../../services/tmdb/tmdb.types";
import "./welcome.page";
import type { WelcomePage } from "./welcome.page";

const WELCOME_PAGE_TAG = "welcome-page";
const TEST_PROVIDER_TAG = "welcome-active-profile-test-provider";

class WelcomeActiveProfileTestProvider extends LitElement {
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
				<welcome-page></welcome-page>
			</div>
		`;
	}
}

if (!customElements.get(TEST_PROVIDER_TAG)) {
	customElements.define(TEST_PROVIDER_TAG, WelcomeActiveProfileTestProvider);
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

function createSection(overrides: Partial<MediaSection> = {}): MediaSection {
	return {
		id: "trending",
		title: "Tendencias",
		items: [createMedia()],
		...overrides,
	};
}

function createReadyContent(
	overrides: Partial<WelcomeContent> = {},
): WelcomeContent {
	const hero = createMedia();

	return {
		hero,
		sections: [
			createSection({
				id: "trending",
				title: "Tendencias",
				items: [hero],
			}),
			createSection({
				id: "popular-movies",
				title: "Películas populares",
				items: [
					createMedia({
						id: 202,
						title: "Película popular",
					}),
				],
			}),
			createSection({
				id: "popular-series",
				title: "Series populares",
				items: [
					createMedia({
						id: 303,
						mediaType: "tv",
						title: "Serie popular",
					}),
				],
			}),
			createSection({
				id: "documentaries",
				title: "Documentales",
				items: [
					createMedia({
						id: 404,
						title: "Documental",
					}),
				],
			}),
		],
		failedSections: [],
		...overrides,
	};
}

function createEmptyContent(): WelcomeContent {
	return {
		hero: null,
		sections: [
			createSection({
				id: "trending",
				title: "Tendencias",
				items: [],
			}),
			createSection({
				id: "popular-movies",
				title: "Películas populares",
				items: [],
			}),
			createSection({
				id: "popular-series",
				title: "Series populares",
				items: [],
			}),
			createSection({
				id: "documentaries",
				title: "Documentales",
				items: [],
			}),
		],
		failedSections: [],
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

function getButtonByText(root: ParentNode, text: string): HTMLButtonElement {
	const button = Array.from(
		root.querySelectorAll<HTMLButtonElement>("button"),
	).find((candidate) => candidate.textContent?.trim() === text);

	expect(button, `Expected button with text "${text}" to exist`).toBeDefined();

	return button as HTMLButtonElement;
}

async function renderWithProvider(
	activeProfile: ActiveProfileContextValue,
): Promise<{
	provider: WelcomeActiveProfileTestProvider;
	page: WelcomePage;
}> {
	const provider = document.createElement(
		TEST_PROVIDER_TAG,
	) as WelcomeActiveProfileTestProvider;

	provider.activeProfile = activeProfile;

	document.body.appendChild(provider);

	await provider.updateComplete;

	const page = getRequiredElement<WelcomePage>(provider, WELCOME_PAGE_TAG);

	await page.updateComplete;
	await settle(provider, page);

	return {
		provider,
		page,
	};
}

async function settle(
	provider: WelcomeActiveProfileTestProvider,
	page: WelcomePage,
	cycles = 4,
): Promise<void> {
	for (let cycle = 0; cycle < cycles; cycle += 1) {
		await Promise.resolve();
		await provider.updateComplete;
		await page.updateComplete;
	}
}

async function waitForCondition(
	provider: WelcomeActiveProfileTestProvider,
	page: WelcomePage,
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

function getAccessibleStatus(page: WelcomePage): string {
	const liveRegion = getRequiredElement<HTMLElement>(
		page,
		'[aria-live="polite"]',
	);

	return liveRegion.textContent?.trim() ?? "";
}

function resetMocks(): void {
	mocks.requireAuthenticatedUser.mockReset();
	mocks.getActiveProfile.mockReset();
	mocks.getWelcomeContent.mockReset();
	mocks.routerGo.mockReset();
}

describe("WelcomePage", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(WELCOME_PAGE_TAG)).toBeDefined();
	});

	it("usa Light DOM y mantiene un único h1", async () => {
		const profile = createProfile();

		mocks.getWelcomeContent.mockResolvedValue(createReadyContent());

		const { page } = await renderWithProvider(profile);

		await waitForCondition(
			page.parentElement as WelcomeActiveProfileTestProvider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected Welcome content to render.",
		);

		expect(page.shadowRoot).toBeNull();
		expect(page.querySelectorAll("h1")).toHaveLength(1);
		expect(page.querySelector("h1")?.textContent?.trim()).toBe(
			"Nexlit, página de inicio",
		);
	});

	it("no carga TMDB antes de resolver el perfil activo", async () => {
		const authenticatedUserRequest = createDeferred<{
			$id: string;
		}>();

		mocks.requireAuthenticatedUser.mockReturnValue(
			authenticatedUserRequest.promise,
		);

		const { provider, page } = await renderWithProvider(undefined);

		await waitForCondition(
			provider,
			page,
			() => page.textContent?.includes("Cargando el perfil activo") === true,
			"Expected active profile loading state.",
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
		expect(mocks.getWelcomeContent).not.toHaveBeenCalled();
		expect(page.querySelector("app-navbar")).toBeNull();
		expect(getAccessibleStatus(page)).toBe("Cargando perfil activo.");
	});

	it("no muestra el identificador interno getAccessibleStatus durante la carga", async () => {
		const authenticatedUserRequest = createDeferred<{
			$id: string;
		}>();

		mocks.requireAuthenticatedUser.mockReturnValue(
			authenticatedUserRequest.promise,
		);

		const { provider, page } = await renderWithProvider(undefined);

		await settle(provider, page);

		expect(page.textContent).not.toContain("getAccessibleStatus");
	});

	it("recupera el perfil activo durante una recarga directa", async () => {
		const profile = createProfile();
		const content = createReadyContent();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});
		mocks.getActiveProfile.mockResolvedValue(profile);
		mocks.getWelcomeContent.mockResolvedValue(content);

		const { provider, page } = await renderWithProvider(undefined);

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected content after recovering the active profile.",
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).toHaveBeenCalledTimes(1);
		expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");
		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(1);

		const signal = mocks.getWelcomeContent.mock.calls[0]?.[0];

		expect(signal).toBeInstanceOf(AbortSignal);
		expect(provider.activeProfile).toEqual(profile);

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		await navbar.updateComplete;

		expect(navbar.profileName).toBe("Diego");
		expect(navbar.profileAvatar).toBe(getProfileAvatar("avatar-blue")?.src);
	});

	it("evita duplicar la carga TMDB al recuperar el perfil mediante el provider", async () => {
		const profile = createProfile();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});
		mocks.getActiveProfile.mockResolvedValue(profile);
		mocks.getWelcomeContent.mockResolvedValue(createReadyContent());

		const { provider, page } = await renderWithProvider(undefined);

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected recovered content.",
		);

		await settle(provider, page, 5);

		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(1);
	});

	it("redirige a login cuando no existe una sesión", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const { provider, page } = await renderWithProvider(undefined);

		await waitForCondition(
			provider,
			page,
			() => mocks.routerGo.mock.calls.length > 0,
			"Expected login redirection.",
		);

		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.login);
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
		expect(mocks.getWelcomeContent).not.toHaveBeenCalled();
	});

	it("redirige a perfiles cuando la recuperación devuelve null", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});
		mocks.getActiveProfile.mockResolvedValue(null);

		const { provider, page } = await renderWithProvider(undefined);

		await waitForCondition(
			provider,
			page,
			() =>
				mocks.routerGo.mock.calls.some(([route]) => route === ROUTES.profiles),
			"Expected profiles redirection.",
		);

		expect(mocks.getActiveProfile).toHaveBeenCalledWith("user-1");
		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.profiles);
		expect(provider.activeProfile).toBeNull();
		expect(mocks.getWelcomeContent).not.toHaveBeenCalled();
		expect(getAccessibleStatus(page)).toBe(
			"No existe un perfil activo. Redirigiendo a perfiles.",
		);
	});

	it("redirige a perfiles cuando el contexto ya contiene null", async () => {
		const { page } = await renderWithProvider(null);

		expect(mocks.routerGo).toHaveBeenCalledWith(ROUTES.profiles);
		expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
		expect(mocks.getWelcomeContent).not.toHaveBeenCalled();
		expect(page.querySelector("app-navbar")).toBeNull();
	});

	it("muestra el error de perfil cuando falla la recuperación", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});
		mocks.getActiveProfile.mockRejectedValue(new Error("Network error"));

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
		expect(page.textContent).toContain("No se pudo cargar el perfil activo.");
		expect(getButtonByText(page, "Reintentar").type).toBe("button");
		expect(page.querySelector(`a[href="${ROUTES.profiles}"]`)).not.toBeNull();
		expect(getAccessibleStatus(page)).toBe(
			"No se pudo cargar el perfil activo.",
		);
		expect(mocks.getWelcomeContent).not.toHaveBeenCalled();
	});

	it("permite reintentar la recuperación del perfil", async () => {
		const profile = createProfile();

		mocks.requireAuthenticatedUser
			.mockRejectedValueOnce(new Error("Authentication unavailable"))
			.mockResolvedValueOnce({
				$id: "user-1",
			});

		mocks.getActiveProfile.mockResolvedValue(profile);
		mocks.getWelcomeContent.mockResolvedValue(createReadyContent());

		const { provider, page } = await renderWithProvider(undefined);

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
			() => page.querySelector("hero-banner") !== null,
			"Expected content after retrying the profile.",
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(2);
		expect(mocks.getActiveProfile).toHaveBeenCalledTimes(1);
		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(1);
		expect(provider.activeProfile).toEqual(profile);
	});

	it("muestra navbar y loading mientras TMDB está pendiente", async () => {
		const profile = createProfile();
		const contentRequest = createDeferred<WelcomeContent>();

		mocks.getWelcomeContent.mockReturnValue(contentRequest.promise);

		const { provider, page } = await renderWithProvider(profile);

		await waitForCondition(
			provider,
			page,
			() => page.textContent?.includes("Cargando contenido de TMDB") === true,
			"Expected TMDB loading state.",
		);

		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(page.querySelector('[aria-busy="true"]')).not.toBeNull();
		expect(getAccessibleStatus(page)).toBe("Cargando contenido.");
		expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(1);
	});

	it("renderiza hero y filas en el estado ready", async () => {
		const profile = createProfile();
		const content = createReadyContent();

		mocks.getWelcomeContent.mockResolvedValue(content);

		const { provider, page } = await renderWithProvider(profile);

		await waitForCondition(
			provider,
			page,
			() => page.querySelectorAll("media-row").length === 4,
			"Expected all media rows.",
		);

		const hero = getRequiredElement<HeroBanner>(page, "hero-banner");
		const rows = Array.from(page.querySelectorAll<MediaRow>("media-row"));

		await hero.updateComplete;

		for (const row of rows) {
			await row.updateComplete;
		}

		expect(hero.media).toBe(content.hero);
		expect(rows).toHaveLength(4);

		expect(rows.map((row) => row.title)).toEqual([
			"Tendencias",
			"Películas populares",
			"Series populares",
			"Documentales",
		]);

		expect(rows[0]?.items).toBe(content.sections[0]?.items);
		expect(
			page.querySelector('[aria-label="Catálogo de Nexlit"]'),
		).not.toBeNull();
		expect(getAccessibleStatus(page)).toBe("Contenido cargado.");
	});

	it("omite las filas cuyas secciones están vacías", async () => {
		const content = createReadyContent({
			sections: [
				createSection({
					id: "trending",
					title: "Tendencias",
					items: [createMedia()],
				}),
				createSection({
					id: "popular-movies",
					title: "Películas populares",
					items: [],
				}),
				createSection({
					id: "popular-series",
					title: "Series populares",
					items: [],
				}),
				createSection({
					id: "documentaries",
					title: "Documentales",
					items: [
						createMedia({
							id: 404,
							title: "Documental",
						}),
					],
				}),
			],
		});

		mocks.getWelcomeContent.mockResolvedValue(content);

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelectorAll("media-row").length === 2,
			"Expected only non-empty rows.",
		);

		const rows = Array.from(page.querySelectorAll<MediaRow>("media-row"));

		expect(rows.map((row) => row.title)).toEqual([
			"Tendencias",
			"Documentales",
		]);
	});

	it("renderiza el estado empty cuando no existe contenido", async () => {
		mocks.getWelcomeContent.mockResolvedValue(createEmptyContent());

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#welcome-empty-title") !== null,
			"Expected empty state.",
		);

		expect(
			page.querySelector("#welcome-empty-title")?.textContent?.trim(),
		).toBe("No encontramos contenido");
		expect(page.textContent).toContain("TMDB no devolvió títulos disponibles");
		expect(getButtonByText(page, "Volver a intentar").type).toBe("button");
		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(page.querySelector("hero-banner")).toBeNull();
		expect(page.querySelector("media-row")).toBeNull();
	});

	it("muestra el error total conservando la navbar", async () => {
		mocks.getWelcomeContent.mockRejectedValue(new Error("TMDB unavailable"));

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#welcome-error-title") !== null,
			"Expected total TMDB error.",
		);

		expect(page.querySelector("app-navbar")).not.toBeNull();
		expect(
			page.querySelector("#welcome-error-title")?.textContent?.trim(),
		).toBe("No pudimos cargar Nexlit");
		expect(page.textContent).toContain("Comprueba tu conexión");
		expect(getAccessibleStatus(page)).toBe("No se pudo cargar el contenido.");
	});

	it("permite reintentar después de un error total", async () => {
		const readyContent = createReadyContent();

		mocks.getWelcomeContent
			.mockRejectedValueOnce(new Error("TMDB unavailable"))
			.mockResolvedValueOnce(readyContent);

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#welcome-error-title") !== null,
			"Expected total error before retry.",
		);

		getButtonByText(page, "Reintentar").click();

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected ready state after TMDB retry.",
		);

		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(2);
	});

	it("permite reintentar desde el estado empty", async () => {
		mocks.getWelcomeContent
			.mockResolvedValueOnce(createEmptyContent())
			.mockResolvedValueOnce(createReadyContent());

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#welcome-empty-title") !== null,
			"Expected empty state before retry.",
		);

		getButtonByText(page, "Volver a intentar").click();

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected ready state after empty retry.",
		);

		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(2);
	});

	it("muestra un error parcial y conserva las secciones disponibles", async () => {
		const content = createReadyContent({
			sections: [
				createSection({
					id: "trending",
					title: "Tendencias",
					items: [createMedia()],
				}),
				createSection({
					id: "popular-movies",
					title: "Películas populares",
					items: [
						createMedia({
							id: 202,
						}),
					],
				}),
				createSection({
					id: "documentaries",
					title: "Documentales",
					items: [
						createMedia({
							id: 404,
						}),
					],
				}),
			],
			failedSections: ["popular-series"],
		});

		mocks.getWelcomeContent.mockResolvedValue(content);

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#partial-error-title") !== null,
			"Expected partial error.",
		);

		expect(
			page.querySelector("#partial-error-title")?.textContent?.trim(),
		).toBe("Parte del contenido no está disponible");
		expect(page.textContent).toContain(
			"No se pudieron cargar: Series populares.",
		);
		expect(page.querySelector("hero-banner")).not.toBeNull();
		expect(page.querySelectorAll("media-row")).toHaveLength(3);
		expect(page.querySelector("app-navbar")).not.toBeNull();
	});

	it("muestra todas las etiquetas de las secciones fallidas", async () => {
		const content = createReadyContent({
			sections: [
				createSection({
					id: "popular-movies",
					title: "Películas populares",
					items: [createMedia()],
				}),
			],
			failedSections: ["trending", "popular-series", "documentaries"],
		});

		mocks.getWelcomeContent.mockResolvedValue(content);

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#partial-error-title") !== null,
			"Expected partial error.",
		);

		expect(page.textContent).toContain(
			"Tendencias, Series populares, Documentales",
		);
	});

	it("permite reintentar todas las secciones tras un error parcial", async () => {
		const partialContent = createReadyContent({
			sections: [
				createSection({
					id: "trending",
					title: "Tendencias",
					items: [createMedia()],
				}),
			],
			failedSections: ["popular-series"],
		});

		mocks.getWelcomeContent
			.mockResolvedValueOnce(partialContent)
			.mockResolvedValueOnce(createReadyContent());

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("#partial-error-title") !== null,
			"Expected partial error before retry.",
		);

		getButtonByText(page, "Reintentar todas las secciones").click();

		await waitForCondition(
			provider,
			page,
			() =>
				page.querySelector("#partial-error-title") === null &&
				page.querySelectorAll("media-row").length === 4,
			"Expected all sections after retry.",
		);

		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(2);
	});

	it("no vuelve a cargar TMDB cuando recibe el mismo profileId", async () => {
		const firstProfile = createProfile();
		const equivalentProfile = createProfile({
			name: "Diego actualizado",
			avatarId: "avatar-red",
		});

		mocks.getWelcomeContent.mockResolvedValue(createReadyContent());

		const { provider, page } = await renderWithProvider(firstProfile);

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected initial content.",
		);

		provider.activeProfile = equivalentProfile;

		await settle(provider, page, 6);

		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(1);

		const navbar = getRequiredElement<AppNavbar>(page, "app-navbar");

		await navbar.updateComplete;

		expect(navbar.profileName).toBe("Diego actualizado");
	});

	it("carga TMDB nuevamente cuando cambia el profileId", async () => {
		const firstProfile = createProfile({
			id: "profile-1",
		});
		const secondProfile = createProfile({
			id: "profile-2",
			name: "Segundo perfil",
			avatarId: "avatar-red",
		});

		mocks.getWelcomeContent
			.mockResolvedValueOnce(createReadyContent())
			.mockResolvedValueOnce(
				createReadyContent({
					hero: createMedia({
						id: 999,
						title: "Contenido del segundo perfil",
					}),
				}),
			);

		const { provider, page } = await renderWithProvider(firstProfile);

		await waitForCondition(
			provider,
			page,
			() =>
				mocks.getWelcomeContent.mock.calls.length === 1 &&
				page.querySelector("hero-banner") !== null,
			"Expected initial profile content.",
		);

		provider.activeProfile = secondProfile;

		await waitForCondition(
			provider,
			page,
			() => mocks.getWelcomeContent.mock.calls.length === 2,
			"Expected content request for second profile.",
		);

		expect(mocks.getWelcomeContent).toHaveBeenCalledTimes(2);
	});

	it("muestra un aviso al recibir media-select", async () => {
		const selectedMedia = createMedia({
			title: "Contenido seleccionado",
		});

		mocks.getWelcomeContent.mockResolvedValue(
			createReadyContent({
				hero: selectedMedia,
			}),
		);

		const { provider, page } = await renderWithProvider(createProfile());

		await waitForCondition(
			provider,
			page,
			() => page.querySelector("hero-banner") !== null,
			"Expected hero before media selection.",
		);

		const hero = getRequiredElement<HeroBanner>(page, "hero-banner");

		hero.dispatchEvent(createMediaSelectEvent(selectedMedia));

		await page.updateComplete;

		const notice = getRequiredElement<HTMLElement>(page, '[role="status"]');

		expect(notice.textContent).toContain("“Contenido seleccionado”");
		expect(notice.textContent).toContain(
			"la página de detalle se implementará en un sprint posterior",
		);
	});

	it("usa el avatar predeterminado cuando avatarId no existe", async () => {
		const profile = createProfile({
			avatarId: "avatar-inexistente",
		});

		mocks.getWelcomeContent.mockResolvedValue(createReadyContent());

		const { provider, page } = await renderWithProvider(profile);

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
});
