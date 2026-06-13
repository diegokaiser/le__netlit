import { Router } from "@vaadin/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfileCard } from "../../components/profile/profile-card/profile-card";
import { ROUTES } from "../../core/config/routes";
import { MAX_PROFILES } from "../../core/constants/profile.constants";
import {
	ProfileServiceError,
	type Profile,
} from "../../services/profile/profile.types";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	getProfiles: vi.fn(),
	getActiveProfile: vi.fn(),
	setActiveProfile: vi.fn(),
}));

vi.mock("../../router/auth.guard", () => ({
	requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("../../services/profile/profile.service", () => ({
	profileService: {
		getProfiles: mocks.getProfiles,
		getActiveProfile: mocks.getActiveProfile,
		setActiveProfile: mocks.setActiveProfile,
	},
}));

import "./profiles.page";
import type { ProfilesPage } from "./profiles.page";

const PROFILES_PAGE_TAG = "profiles-page";
const USER_ID = "user-1";

const profileFixtures: Profile[] = [
	{
		id: "profile-1",
		userId: USER_ID,
		name: "Diego",
		avatarId: "avatar-blue",
		isKids: false,
	},
	{
		id: "profile-2",
		userId: USER_ID,
		name: "Sofía",
		avatarId: "avatar-red",
		isKids: true,
	},
];

function createDeferred<T>() {
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

function createProfile(index: number): Profile {
	return {
		id: `profile-${index}`,
		userId: USER_ID,
		name: `Perfil ${index}`,
		avatarId: "avatar-blue",
		isKids: false,
	};
}

async function renderProfilesPage(): Promise<ProfilesPage> {
	const element = document.createElement(PROFILES_PAGE_TAG) as ProfilesPage;

	document.body.appendChild(element);
	await element.updateComplete;

	return element;
}

async function waitForProfileCards(
	element: ProfilesPage,
	expectedCount: number,
): Promise<ProfileCard[]> {
	await vi.waitFor(() => {
		expect(element.querySelectorAll("profile-card")).toHaveLength(
			expectedCount,
		);
	});

	await element.updateComplete;

	const cards = Array.from(
		element.querySelectorAll<ProfileCard>("profile-card"),
	);

	await Promise.all(cards.map((card) => card.updateComplete));

	return cards;
}

function findProfileCard(cards: ProfileCard[], profileId: string): ProfileCard {
	const card = cards.find((candidate) => candidate.profile?.id === profileId);

	expect(card).toBeDefined();

	return card as ProfileCard;
}

function getCardButton(card: ProfileCard): HTMLButtonElement {
	const button = card.shadowRoot?.querySelector<HTMLButtonElement>("button");

	expect(button).not.toBeNull();

	return button as HTMLButtonElement;
}

describe("ProfilesPage", () => {
	beforeEach(() => {
		document.body.replaceChildren();
		vi.resetAllMocks();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: USER_ID,
		});
		mocks.getProfiles.mockResolvedValue([]);
		mocks.getActiveProfile.mockResolvedValue(null);
		mocks.setActiveProfile.mockResolvedValue(undefined);

		vi.spyOn(Router, "go").mockReturnValue(true);
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element de la página", () => {
		expect(customElements.get(PROFILES_PAGE_TAG)).toBeDefined();
	});

	it("usa Light DOM", async () => {
		const element = await renderProfilesPage();

		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector("main")).not.toBeNull();
	});

	it("renderiza el estado loading mientras comprueba la sesión", async () => {
		const authenticationDeferred = createDeferred<{ $id: string } | null>();

		mocks.requireAuthenticatedUser.mockReturnValue(
			authenticationDeferred.promise,
		);

		const element = await renderProfilesPage();
		const section = element.querySelector("section");
		const status = element.querySelector('[role="status"]');

		expect(section?.getAttribute("aria-busy")).toBe("true");
		expect(status?.textContent).toMatch(/cargando perfiles/i);

		authenticationDeferred.resolve({ $id: USER_ID });

		await vi.waitFor(() => {
			expect(element.textContent).toMatch(/todavía no tienes perfiles/i);
		});
	});

	it("redirige a login cuando no existe un usuario autenticado", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		await renderProfilesPage();

		await vi.waitFor(() => {
			expect(Router.go).toHaveBeenCalledWith(ROUTES.login);
		});

		expect(mocks.getProfiles).not.toHaveBeenCalled();
		expect(mocks.getActiveProfile).not.toHaveBeenCalled();
	});

	it("renderiza el estado empty y el CTA para crear el primer perfil", async () => {
		const element = await renderProfilesPage();

		await vi.waitFor(() => {
			expect(element.textContent).toMatch(/todavía no tienes perfiles/i);
		});

		const createLink = element.querySelector<HTMLAnchorElement>(
			`a[href="${ROUTES.createProfile}"]`,
		);
		const section = element.querySelector("section");

		expect(createLink?.textContent).toMatch(/crear primer perfil/i);
		expect(section?.getAttribute("aria-busy")).toBe("false");
		expect(mocks.getProfiles).toHaveBeenCalledWith(USER_ID);
		expect(mocks.getActiveProfile).toHaveBeenCalledWith(USER_ID);
	});

	it("renderiza los perfiles y marca el perfil activo", async () => {
		mocks.getProfiles.mockResolvedValue(profileFixtures);
		mocks.getActiveProfile.mockResolvedValue(profileFixtures[0]);

		const element = await renderProfilesPage();
		const cards = await waitForProfileCards(element, profileFixtures.length);
		const activeCard = findProfileCard(cards, profileFixtures[0].id);
		const inactiveCard = findProfileCard(cards, profileFixtures[1].id);

		expect(activeCard.active).toBe(true);
		expect(inactiveCard.active).toBe(false);
		expect(getCardButton(activeCard).getAttribute("aria-pressed")).toBe("true");
		expect(getCardButton(inactiveCard).getAttribute("aria-pressed")).toBe(
			"false",
		);
		expect(
			element.querySelector(`a[href="${ROUTES.createProfile}"]`)?.textContent,
		).toMatch(/crear otro perfil/i);
	});

	it("navega directamente a welcome al seleccionar el perfil ya activo", async () => {
		mocks.getProfiles.mockResolvedValue(profileFixtures);
		mocks.getActiveProfile.mockResolvedValue(profileFixtures[0]);

		const element = await renderProfilesPage();
		const cards = await waitForProfileCards(element, profileFixtures.length);
		const activeCard = findProfileCard(cards, profileFixtures[0].id);

		getCardButton(activeCard).click();

		await vi.waitFor(() => {
			expect(Router.go).toHaveBeenCalledWith(ROUTES.welcome);
		});

		expect(mocks.setActiveProfile).not.toHaveBeenCalled();
	});

	it("muestra selecting, persiste el nuevo perfil activo y navega a welcome", async () => {
		const selectionDeferred = createDeferred<void>();

		mocks.getProfiles.mockResolvedValue(profileFixtures);
		mocks.getActiveProfile.mockResolvedValue(profileFixtures[0]);
		mocks.setActiveProfile.mockReturnValue(selectionDeferred.promise);

		const element = await renderProfilesPage();
		const cards = await waitForProfileCards(element, profileFixtures.length);
		const selectedCard = findProfileCard(cards, profileFixtures[1].id);

		getCardButton(selectedCard).click();

		await vi.waitFor(() => {
			expect(mocks.setActiveProfile).toHaveBeenCalledWith(
				USER_ID,
				profileFixtures[1].id,
			);
		});

		await element.updateComplete;
		await Promise.all(cards.map((card) => card.updateComplete));

		expect(element.querySelector("section")?.getAttribute("aria-busy")).toBe(
			"true",
		);
		expect(cards.every((card) => card.disabled)).toBe(true);
		expect(selectedCard.busy).toBe(true);
		expect(getCardButton(selectedCard).textContent).toMatch(/seleccionando/i);
		expect(Router.go).not.toHaveBeenCalled();

		selectionDeferred.resolve(undefined);

		await vi.waitFor(() => {
			expect(Router.go).toHaveBeenCalledWith(ROUTES.welcome);
		});
	});

	it("mantiene los perfiles y muestra el error específico si falla el cambio", async () => {
		mocks.getProfiles.mockResolvedValue(profileFixtures);
		mocks.getActiveProfile.mockResolvedValue(profileFixtures[0]);
		mocks.setActiveProfile.mockRejectedValue(new Error("Network error"));

		const element = await renderProfilesPage();
		const cards = await waitForProfileCards(element, profileFixtures.length);
		const selectedCard = findProfileCard(cards, profileFixtures[1].id);

		getCardButton(selectedCard).click();

		await vi.waitFor(() => {
			expect(element.textContent).toContain(
				"No se pudo cambiar el perfil. Comprueba tu conexión e inténtalo de nuevo.",
			);
		});

		await element.updateComplete;
		await Promise.all(cards.map((card) => card.updateComplete));

		expect(element.querySelectorAll("profile-card")).toHaveLength(
			profileFixtures.length,
		);
		expect(element.querySelector("section")?.getAttribute("aria-busy")).toBe(
			"false",
		);
		expect(cards.every((card) => card.disabled === false)).toBe(true);
		expect(cards.every((card) => card.busy === false)).toBe(true);
		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.welcome);
	});

	it("oculta el CTA al alcanzar el máximo de perfiles", async () => {
		const profiles = Array.from({ length: MAX_PROFILES }, (_, index) =>
			createProfile(index + 1),
		);

		mocks.getProfiles.mockResolvedValue(profiles);
		mocks.getActiveProfile.mockResolvedValue(profiles[0]);

		const element = await renderProfilesPage();

		await waitForProfileCards(element, MAX_PROFILES);

		expect(
			element.querySelector(`a[href="${ROUTES.createProfile}"]`),
		).toBeNull();
		const normalizedText = element.textContent?.replace(/\s+/g, " ").trim();

		expect(normalizedText).toContain(
			`Has alcanzado el máximo de ${MAX_PROFILES} perfiles.`,
		);
	});

	it("muestra el error inicial y permite reintentar la carga", async () => {
		mocks.getProfiles
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce([]);

		const element = await renderProfilesPage();

		await vi.waitFor(() => {
			expect(element.textContent).toContain(
				"No se pudieron cargar los perfiles. Inténtalo de nuevo.",
			);
		});

		const retryButton = Array.from(element.querySelectorAll("button")).find(
			(button) => /reintentar/i.test(button.textContent ?? ""),
		);

		expect(retryButton).toBeDefined();

		retryButton?.click();

		await vi.waitFor(() => {
			expect(element.textContent).toMatch(/todavía no tienes perfiles/i);
		});

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(2);
		expect(mocks.getProfiles).toHaveBeenCalledTimes(2);
	});

	it("muestra el mensaje de ProfileServiceError sin reemplazarlo", async () => {
		const serviceMessage = "No se pudo acceder a la configuración de perfiles.";

		mocks.getProfiles.mockRejectedValue(
			new ProfileServiceError("configuration", serviceMessage),
		);

		const element = await renderProfilesPage();

		await vi.waitFor(() => {
			expect(element.textContent).toContain(serviceMessage);
		});
	});
});
