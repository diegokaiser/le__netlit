import { Router } from "@vaadin/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "../../core/config/routes";
import {
	DEFAULT_PROFILE_AVATAR_ID,
	PROFILE_AVATARS,
} from "../../core/constants/profile-avatars";
import {
	MAX_PROFILES,
	PROFILE_NAME_MAX_LENGTH,
	PROFILE_NAME_MIN_LENGTH,
} from "../../core/constants/profile.constants";
import {
	ProfileServiceError,
	type Profile,
} from "../../services/profile/profile.types";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	getProfiles: vi.fn(),
	createProfile: vi.fn(),
}));

vi.mock("../../router/auth.guard", () => ({
	requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("../../services/profile/profile.service", () => ({
	profileService: {
		getProfiles: mocks.getProfiles,
		createProfile: mocks.createProfile,
	},
}));

import "./create-profile.page";
import type { CreateProfilePage } from "./create-profile.page";

const CREATE_PROFILE_PAGE_TAG = "create-profile-page";
const USER_ID = "user-1";

const createdProfileFixture: Profile = {
	id: "profile-created",
	userId: USER_ID,
	name: "Diego",
	avatarId: DEFAULT_PROFILE_AVATAR_ID,
	isKids: false,
};

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

function createExistingProfile(index: number): Profile {
	return {
		id: `profile-${index}`,
		userId: USER_ID,
		name: `Perfil ${index}`,
		avatarId: DEFAULT_PROFILE_AVATAR_ID,
		isKids: false,
	};
}

function normalizeText(value: string | null): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

async function renderCreateProfilePage(): Promise<CreateProfilePage> {
	const element = document.createElement(
		CREATE_PROFILE_PAGE_TAG,
	) as CreateProfilePage;

	document.body.appendChild(element);
	await element.updateComplete;

	return element;
}

async function waitForForm(
	element: CreateProfilePage,
): Promise<HTMLFormElement> {
	await vi.waitFor(() => {
		expect(element.querySelector("form")).not.toBeNull();
	});

	await element.updateComplete;

	return element.querySelector("form") as HTMLFormElement;
}

function getNameInput(element: CreateProfilePage): HTMLInputElement {
	const input = element.querySelector<HTMLInputElement>("#profile-name");

	expect(input).not.toBeNull();

	return input as HTMLInputElement;
}

async function writeName(
	element: CreateProfilePage,
	value: string,
): Promise<void> {
	const input = getNameInput(element);

	input.value = value;
	input.dispatchEvent(
		new Event("input", {
			bubbles: true,
			composed: true,
		}),
	);

	await element.updateComplete;
}

async function selectAvatar(
	element: CreateProfilePage,
	avatarId: string,
): Promise<void> {
	const radio = element.querySelector<HTMLInputElement>(
		`input[name="avatarId"][value="${avatarId}"]`,
	);

	expect(radio).not.toBeNull();

	(radio as HTMLInputElement).checked = true;
	(radio as HTMLInputElement).dispatchEvent(
		new Event("change", {
			bubbles: true,
			composed: true,
		}),
	);

	await element.updateComplete;
}

async function setKidsProfile(
	element: CreateProfilePage,
	checked: boolean,
): Promise<void> {
	const checkbox = element.querySelector<HTMLInputElement>("#profile-is-kids");

	expect(checkbox).not.toBeNull();

	(checkbox as HTMLInputElement).checked = checked;
	(checkbox as HTMLInputElement).dispatchEvent(
		new Event("change", {
			bubbles: true,
			composed: true,
		}),
	);

	await element.updateComplete;
}

function submitForm(form: HTMLFormElement): void {
	form.dispatchEvent(
		new SubmitEvent("submit", {
			bubbles: true,
			cancelable: true,
			composed: true,
		}),
	);
}

describe("CreateProfilePage", () => {
	beforeEach(() => {
		document.body.replaceChildren();
		vi.resetAllMocks();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: USER_ID,
		});
		mocks.getProfiles.mockResolvedValue([]);
		mocks.createProfile.mockResolvedValue(createdProfileFixture);

		vi.spyOn(Router, "go").mockReturnValue(true);
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element de la página", () => {
		expect(customElements.get(CREATE_PROFILE_PAGE_TAG)).toBeDefined();
	});

	it("usa Light DOM", async () => {
		const element = await renderCreateProfilePage();

		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector("main")).not.toBeNull();
	});

	it("muestra loading mientras comprueba la sesión", async () => {
		const authenticationDeferred = createDeferred<{ $id: string } | null>();

		mocks.requireAuthenticatedUser.mockReturnValue(
			authenticationDeferred.promise,
		);

		const element = await renderCreateProfilePage();
		const loadingStatus = element.querySelector('[role="status"]');

		expect(loadingStatus?.textContent).toMatch(/preparando perfiles/i);
		expect(element.querySelector("form")).toBeNull();

		authenticationDeferred.resolve({ $id: USER_ID });

		await waitForForm(element);
	});

	it("redirige a login cuando no existe un usuario autenticado", async () => {
		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		await renderCreateProfilePage();

		await vi.waitFor(() => {
			expect(Router.go).toHaveBeenCalledWith(ROUTES.login);
		});

		expect(mocks.getProfiles).not.toHaveBeenCalled();
		expect(mocks.createProfile).not.toHaveBeenCalled();
	});

	it("muestra el error de inicialización y permite reintentar si falla la carga de perfiles", async () => {
		mocks.getProfiles
			.mockRejectedValueOnce(new Error("Profiles network error"))
			.mockResolvedValueOnce([]);

		const element = await renderCreateProfilePage();

		await vi.waitFor(() => {
			expect(normalizeText(element.textContent)).toContain(
				"No se pudo preparar la creación del perfil. Inténtalo de nuevo.",
			);
		});

		expect(element.querySelector("form")).toBeNull();

		const retryButton = Array.from(element.querySelectorAll("button")).find(
			(button) => /reintentar/i.test(button.textContent ?? ""),
		);

		expect(retryButton).toBeDefined();

		retryButton?.click();

		await waitForForm(element);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(2);
		expect(mocks.getProfiles).toHaveBeenCalledTimes(2);
	});

	it("muestra limit-reached cuando el usuario ya tiene cinco perfiles", async () => {
		const existingProfiles = Array.from(
			{ length: MAX_PROFILES },
			(_, index) => createExistingProfile(index + 1),
		);

		mocks.getProfiles.mockResolvedValue(existingProfiles);

		const element = await renderCreateProfilePage();

		await vi.waitFor(() => {
			expect(normalizeText(element.textContent)).toContain(
				`Puedes tener un máximo de ${MAX_PROFILES} perfiles en Nexlit.`,
			);
		});

		expect(element.querySelector("form")).toBeNull();
		expect(
			element.querySelector(`a[href="${ROUTES.profiles}"]`),
		).not.toBeNull();
		expect(mocks.createProfile).not.toHaveBeenCalled();
	});

	it("renderiza restricciones, avatares accesibles y valores iniciales", async () => {
		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);
		const nameInput = getNameInput(element);
		const avatarRadios = Array.from(
			element.querySelectorAll<HTMLInputElement>(
				'input[name="avatarId"][type="radio"]',
			),
		);
		const kidsCheckbox = element.querySelector<HTMLInputElement>(
			"#profile-is-kids",
		);

		expect(form.hasAttribute("novalidate")).toBe(true);
		expect(form.getAttribute("aria-busy")).toBe("false");
		expect(nameInput.required).toBe(true);
		expect(nameInput.minLength).toBe(PROFILE_NAME_MIN_LENGTH);
		expect(nameInput.maxLength).toBe(PROFILE_NAME_MAX_LENGTH);
		expect(avatarRadios).toHaveLength(PROFILE_AVATARS.length);
		expect(
			avatarRadios.find((radio) => radio.checked)?.value,
		).toBe(DEFAULT_PROFILE_AVATAR_ID);
		expect(kidsCheckbox?.checked).toBe(false);

		for (const radio of avatarRadios) {
			expect(radio.disabled).toBe(false);
			expect(
				element.querySelector(`label[for="${radio.id}"]`),
			).not.toBeNull();
		}
	});

	it.each([
		["", "El nombre es obligatorio."],
		["     ", "El nombre es obligatorio."],
		[
			"A",
			`El nombre debe tener al menos ${PROFILE_NAME_MIN_LENGTH} caracteres.`,
		],
		[
			"A".repeat(PROFILE_NAME_MAX_LENGTH + 1),
			`El nombre no puede superar los ${PROFILE_NAME_MAX_LENGTH} caracteres.`,
		],
	])("rechaza el nombre inválido %#", async (name, expectedMessage) => {
		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);

		await writeName(element, name);
		submitForm(form);

		await vi.waitFor(() => {
			expect(normalizeText(element.textContent)).toContain(expectedMessage);
		});

		expect(getNameInput(element).getAttribute("aria-invalid")).toBe("true");
		expect(mocks.createProfile).not.toHaveBeenCalled();
	});

	it("permite seleccionar otro avatar y marcar el perfil como infantil", async () => {
		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);
		const selectedAvatar = PROFILE_AVATARS[2];

		await writeName(element, "Sofía");
		await selectAvatar(element, selectedAvatar.id);
		await setKidsProfile(element, true);
		submitForm(form);

		await vi.waitFor(() => {
			expect(mocks.createProfile).toHaveBeenCalledWith(USER_ID, {
				name: "Sofía",
				avatarId: selectedAvatar.id,
				isKids: true,
			});
		});
	});

	it("crea el primer perfil, muestra loading y navega a welcome", async () => {
		const creationDeferred = createDeferred<Profile>();

		mocks.createProfile.mockReturnValue(creationDeferred.promise);

		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);

		await writeName(element, "Diego");
		submitForm(form);

		await vi.waitFor(() => {
			expect(mocks.createProfile).toHaveBeenCalledWith(USER_ID, {
				name: "Diego",
				avatarId: DEFAULT_PROFILE_AVATAR_ID,
				isKids: false,
			});
		});

		await element.updateComplete;

		const submitButton = form.querySelector<HTMLButtonElement>(
			'button[type="submit"]',
		);

		expect(form.getAttribute("aria-busy")).toBe("true");
		expect(submitButton?.disabled).toBe(true);
		expect(submitButton?.textContent).toMatch(/creando perfil/i);
		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.welcome);

		creationDeferred.resolve(createdProfileFixture);

		await vi.waitFor(() => {
			expect(Router.go).toHaveBeenCalledWith(ROUTES.welcome);
		});

		expect(normalizeText(element.textContent)).toContain(
			"Perfil creado correctamente.",
		);
	});

	it("navega a profiles al crear un perfil posterior", async () => {
		mocks.getProfiles.mockResolvedValue([createExistingProfile(1)]);

		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);

		await writeName(element, "Sofía");
		submitForm(form);

		await vi.waitFor(() => {
			expect(Router.go).toHaveBeenCalledWith(ROUTES.profiles);
		});

		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.welcome);
	});

	it("cambia a limit-reached si el servicio detecta el límite durante la creación", async () => {
		mocks.createProfile.mockRejectedValue(
			new ProfileServiceError(
				"limit-reached",
				"Has alcanzado el límite de perfiles.",
			),
		);

		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);

		await writeName(element, "Nuevo perfil");
		submitForm(form);

		await vi.waitFor(() => {
			expect(normalizeText(element.textContent)).toContain(
				`Puedes tener un máximo de ${MAX_PROFILES} perfiles en Nexlit.`,
			);
		});

		expect(element.querySelector("form")).toBeNull();
		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.welcome);
		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.profiles);
	});

	it("conserva nombre, avatar e isKids cuando la creación falla", async () => {
		const selectedAvatar = PROFILE_AVATARS[4];

		mocks.createProfile.mockRejectedValue(new Error("Network error"));

		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);

		await writeName(element, "  Diego   Kaiser  ");
		await selectAvatar(element, selectedAvatar.id);
		await setKidsProfile(element, true);
		submitForm(form);

		await vi.waitFor(() => {
			expect(normalizeText(element.textContent)).toContain(
				"No se pudo crear el perfil. Revisa tu conexión e inténtalo de nuevo.",
			);
		});

		const selectedRadio = element.querySelector<HTMLInputElement>(
			`input[name="avatarId"][value="${selectedAvatar.id}"]`,
		);
		const kidsCheckbox = element.querySelector<HTMLInputElement>(
			"#profile-is-kids",
		);

		expect(getNameInput(element).value).toBe("  Diego   Kaiser  ");
		expect(selectedRadio?.checked).toBe(true);
		expect(kidsCheckbox?.checked).toBe(true);
		expect(mocks.createProfile).toHaveBeenCalledWith(USER_ID, {
			name: "  Diego   Kaiser  ",
			avatarId: selectedAvatar.id,
			isKids: true,
		});
		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.welcome);
		expect(Router.go).not.toHaveBeenCalledWith(ROUTES.profiles);
	});

	it("muestra sin reemplazar el mensaje de ProfileServiceError", async () => {
		const serviceMessage = "El avatar seleccionado no está permitido.";

		mocks.createProfile.mockRejectedValue(
			new ProfileServiceError("invalid-avatar", serviceMessage),
		);

		const element = await renderCreateProfilePage();
		const form = await waitForForm(element);

		await writeName(element, "Diego");
		submitForm(form);

		await vi.waitFor(() => {
			expect(normalizeText(element.textContent)).toContain(serviceMessage);
		});

		expect(element.querySelector("form")).not.toBeNull();
	});
});
