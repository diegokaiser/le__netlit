import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DEFAULT_PROFILE_AVATAR_ID,
	getProfileAvatar,
} from "../../../core/constants/profile-avatars";
import type {
	Profile,
	ProfileSelectedDetail,
} from "../../../services/profile/profile.types";
import "./profile-card";
import type { ProfileCard } from "./profile-card";

const PROFILE_CARD_TAG = "profile-card";

const profileFixture: Profile = {
	id: "profile-1",
	userId: "user-1",
	name: "Diego",
	avatarId: "avatar-blue",
	isKids: false,
};

function createProfile(overrides: Partial<Profile> = {}): Profile {
	return {
		...profileFixture,
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

async function renderProfileCard(
	options: {
		profile?: Profile;
		active?: boolean;
		disabled?: boolean;
		busy?: boolean;
	} = {},
): Promise<ProfileCard> {
	const element = document.createElement(PROFILE_CARD_TAG) as ProfileCard;

	if (options.profile !== undefined) {
		element.profile = options.profile;
	}

	if (options.active !== undefined) {
		element.active = options.active;
	}

	if (options.disabled !== undefined) {
		element.disabled = options.disabled;
	}

	if (options.busy !== undefined) {
		element.busy = options.busy;
	}

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

function getShadowRoot(element: ProfileCard): ShadowRoot {
	expect(element.shadowRoot).not.toBeNull();

	return element.shadowRoot as ShadowRoot;
}

describe("ProfileCard", () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(PROFILE_CARD_TAG)).toBeDefined();
	});

	it("usa Shadow DOM", async () => {
		const element = await renderProfileCard({
			profile: createProfile(),
		});

		expect(element.shadowRoot).not.toBeNull();
		expect(element.querySelector("button")).toBeNull();
		expect(element.shadowRoot?.querySelector("button")).not.toBeNull();
	});

	it("no renderiza contenido cuando no recibe un perfil", async () => {
		const element = await renderProfileCard();
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector("button")).toBeNull();
	});

	it("renderiza avatar, nombre y un botón accesible", async () => {
		const profile = createProfile();
		const element = await renderProfileCard({ profile });
		const shadowRoot = getShadowRoot(element);

		const button = getRequiredElement<HTMLButtonElement>(
			shadowRoot,
			"button.profile-button",
		);
		const avatar = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.avatar",
		);
		const name = getRequiredElement<HTMLElement>(shadowRoot, ".profile-name");

		expect(button.type).toBe("button");
		expect(button.getAttribute("aria-label")).toBe(
			`Seleccionar perfil ${profile.name}`,
		);

		expect(avatar.getAttribute("src")).toContain("avatar-blue.svg");
		expect(avatar.getAttribute("alt")).toBe("Avatar azul");
		expect(name.textContent?.trim()).toBe(profile.name);
	});

	it("renderiza el indicador infantil únicamente para perfiles infantiles", async () => {
		const kidsElement = await renderProfileCard({
			profile: createProfile({
				id: "profile-kids",
				isKids: true,
			}),
		});

		expect(
			getShadowRoot(kidsElement).querySelector(".kids-label")?.textContent,
		).toMatch(/infantil/i);

		document.body.replaceChildren();

		const adultElement = await renderProfileCard({
			profile: createProfile({
				id: "profile-adult",
				isKids: false,
			}),
		});

		expect(getShadowRoot(adultElement).querySelector(".kids-label")).toBeNull();
	});

	it("refleja el estado activo mediante aria-pressed", async () => {
		const activeElement = await renderProfileCard({
			profile: createProfile(),
			active: true,
		});
		const activeButton = getRequiredElement<HTMLButtonElement>(
			getShadowRoot(activeElement),
			"button",
		);

		expect(activeButton.getAttribute("aria-pressed")).toBe("true");

		document.body.replaceChildren();

		const inactiveElement = await renderProfileCard({
			profile: createProfile(),
			active: false,
		});
		const inactiveButton = getRequiredElement<HTMLButtonElement>(
			getShadowRoot(inactiveElement),
			"button",
		);

		expect(inactiveButton.getAttribute("aria-pressed")).toBe("false");
	});

	it("refleja el estado busy y muestra el texto de selección", async () => {
		const element = await renderProfileCard({
			profile: createProfile(),
			busy: true,
		});
		const shadowRoot = getShadowRoot(element);
		const button = getRequiredElement<HTMLButtonElement>(shadowRoot, "button");
		const busyLabel = getRequiredElement<HTMLElement>(
			shadowRoot,
			".busy-label",
		);

		expect(button.getAttribute("aria-busy")).toBe("true");
		expect(busyLabel.textContent).toMatch(/seleccionando/i);
	});

	it("deshabilita el botón cuando disabled es true", async () => {
		const element = await renderProfileCard({
			profile: createProfile(),
			disabled: true,
		});
		const button = getRequiredElement<HTMLButtonElement>(
			getShadowRoot(element),
			"button",
		);

		expect(button.disabled).toBe(true);
		expect(button.hasAttribute("disabled")).toBe(true);
	});

	it("usa el avatar predeterminado cuando avatarId no existe", async () => {
		const element = await renderProfileCard({
			profile: createProfile({
				avatarId: "avatar-inexistente",
			}),
		});
		const avatar = getRequiredElement<HTMLImageElement>(
			getShadowRoot(element),
			"img.avatar",
		);
		const defaultAvatar = getProfileAvatar(DEFAULT_PROFILE_AVATAR_ID);

		expect(defaultAvatar).toBeDefined();
		expect(avatar.getAttribute("src")).toBe(defaultAvatar?.src);
		expect(avatar.getAttribute("alt")).toBe(defaultAvatar?.alt);
	});

	it("emite profile-selected con el profileId, bubbles y composed", async () => {
		const profile = createProfile();
		const element = await renderProfileCard({ profile });
		const button = getRequiredElement<HTMLButtonElement>(
			getShadowRoot(element),
			"button",
		);

		let receivedEvent: CustomEvent<ProfileSelectedDetail> | undefined;

		document.body.addEventListener(
			"profile-selected",
			(event) => {
				receivedEvent = event as CustomEvent<ProfileSelectedDetail>;
			},
			{ once: true },
		);

		button.click();

		expect(receivedEvent).toBeDefined();
		expect(receivedEvent?.detail).toEqual({
			profileId: profile.id,
		});
		expect(receivedEvent?.bubbles).toBe(true);
		expect(receivedEvent?.composed).toBe(true);
	});

	it("no emite profile-selected cuando está deshabilitado", async () => {
		const element = await renderProfileCard({
			profile: createProfile(),
			disabled: true,
		});
		const button = getRequiredElement<HTMLButtonElement>(
			getShadowRoot(element),
			"button",
		);
		const listener = vi.fn();

		element.addEventListener("profile-selected", listener);

		button.click();

		expect(listener).not.toHaveBeenCalled();
	});
});
