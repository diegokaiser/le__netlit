import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCategoryRoute, ROUTES } from "../../../core/config/routes";
import "./app-navbar";
import type { AppNavbar } from "./app-navbar";

const APP_NAVBAR_TAG = "app-navbar";

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

function getShadowRoot(element: AppNavbar): ShadowRoot {
	expect(element.shadowRoot).not.toBeNull();

	return element.shadowRoot as ShadowRoot;
}

async function renderAppNavbar(
	options: {
		profileName?: string;
		profileAvatar?: string;
	} = {},
): Promise<AppNavbar> {
	const element = document.createElement(APP_NAVBAR_TAG) as AppNavbar;

	if (options.profileName !== undefined) {
		element.profileName = options.profileName;
	}

	if (options.profileAvatar !== undefined) {
		element.profileAvatar = options.profileAvatar;
	}

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

describe("AppNavbar", () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(APP_NAVBAR_TAG)).toBeDefined();
	});

	it("usa Shadow DOM", async () => {
		const element = await renderAppNavbar();

		expect(element.shadowRoot).not.toBeNull();
		expect(element.querySelector("header")).toBeNull();
		expect(element.shadowRoot?.querySelector("header")).not.toBeNull();
	});

	it("renderiza la marca Nexlit con enlace al inicio", async () => {
		const element = await renderAppNavbar();
		const shadowRoot = getShadowRoot(element);

		const brand = getRequiredElement<HTMLAnchorElement>(shadowRoot, "a.brand");

		expect(brand.textContent?.trim()).toBe("NEXLIT");
		expect(brand.getAttribute("href")).toBe(ROUTES.welcome);
		expect(brand.getAttribute("aria-label")).toBe("Nexlit, ir al inicio");
	});

	it("renderiza una navegación principal accesible", async () => {
		const element = await renderAppNavbar();
		const shadowRoot = getShadowRoot(element);

		const navigation = getRequiredElement<HTMLElement>(shadowRoot, "nav");

		expect(navigation.getAttribute("aria-label")).toBe("Navegación principal");
	});

	it("renderiza los enlaces preparados para inicio y categorías", async () => {
		const element = await renderAppNavbar();
		const shadowRoot = getShadowRoot(element);

		const links = Array.from(
			shadowRoot.querySelectorAll<HTMLAnchorElement>("nav a"),
		);

		expect(links).toHaveLength(4);

		expect(
			links.map((link) => ({
				text: link.textContent?.trim(),
				href: link.getAttribute("href"),
			})),
		).toEqual([
			{
				text: "Inicio",
				href: ROUTES.welcome,
			},
			{
				text: "Películas",
				href: buildCategoryRoute("movies"),
			},
			{
				text: "Series",
				href: buildCategoryRoute("series"),
			},
			{
				text: "Documentales",
				href: buildCategoryRoute("documentaries"),
			},
		]);
	});

	it("muestra el nombre y avatar del perfil activo", async () => {
		const profileAvatar = "/images/avatars/avatar-blue.svg";

		const element = await renderAppNavbar({
			profileName: "Diego",
			profileAvatar,
		});
		const shadowRoot = getShadowRoot(element);

		const profileName = getRequiredElement<HTMLElement>(
			shadowRoot,
			".profile-name",
		);
		const avatar = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.avatar",
		);

		expect(profileName.textContent?.trim()).toBe("Diego");

		expect(avatar.getAttribute("src")).toBe(profileAvatar);
		expect(avatar.getAttribute("alt")).toBe("Avatar de Diego");
		expect(avatar.getAttribute("width")).toBe("36");
		expect(avatar.getAttribute("height")).toBe("36");
	});

	it("muestra el texto fallback cuando no recibe un nombre de perfil", async () => {
		const element = await renderAppNavbar();
		const shadowRoot = getShadowRoot(element);

		const profileName = getRequiredElement<HTMLElement>(
			shadowRoot,
			".profile-name",
		);

		expect(profileName.textContent?.trim()).toBe("Perfil activo");
	});

	it("no renderiza una imagen cuando no recibe avatar", async () => {
		const element = await renderAppNavbar({
			profileName: "Diego",
			profileAvatar: "",
		});
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector("img.avatar")).toBeNull();
		expect(shadowRoot.querySelector(".profile-name")?.textContent?.trim()).toBe(
			"Diego",
		);
	});

	it("usa un texto alternativo fallback cuando existe avatar pero no nombre", async () => {
		const element = await renderAppNavbar({
			profileAvatar: "/images/avatars/avatar-blue.svg",
		});
		const shadowRoot = getShadowRoot(element);

		const avatar = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.avatar",
		);

		expect(avatar.getAttribute("alt")).toBe("Avatar de perfil activo");
	});

	it("ofrece un enlace para cambiar de perfil", async () => {
		const element = await renderAppNavbar({
			profileName: "Diego",
		});
		const shadowRoot = getShadowRoot(element);

		const profileLink = getRequiredElement<HTMLAnchorElement>(
			shadowRoot,
			"a.profile-link",
		);

		expect(profileLink.textContent?.trim()).toBe("Cambiar perfil");
		expect(profileLink.getAttribute("href")).toBe(ROUTES.profiles);
	});

	it("actualiza el nombre y el avatar cuando cambian las propiedades", async () => {
		const element = await renderAppNavbar({
			profileName: "Diego",
			profileAvatar: "/images/avatars/avatar-blue.svg",
		});
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector(".profile-name")?.textContent?.trim()).toBe(
			"Diego",
		);
		expect(shadowRoot.querySelector("img.avatar")?.getAttribute("src")).toBe(
			"/images/avatars/avatar-blue.svg",
		);

		element.profileName = "Sofía";
		element.profileAvatar = "/images/avatars/avatar-red.svg";

		await element.updateComplete;

		const updatedName = getRequiredElement<HTMLElement>(
			shadowRoot,
			".profile-name",
		);
		const updatedAvatar = getRequiredElement<HTMLImageElement>(
			shadowRoot,
			"img.avatar",
		);

		expect(updatedName.textContent?.trim()).toBe("Sofía");
		expect(updatedAvatar.getAttribute("src")).toBe(
			"/images/avatars/avatar-red.svg",
		);
		expect(updatedAvatar.getAttribute("alt")).toBe("Avatar de Sofía");
	});

	it("elimina el avatar cuando profileAvatar cambia a una cadena vacía", async () => {
		const element = await renderAppNavbar({
			profileName: "Diego",
			profileAvatar: "/images/avatars/avatar-blue.svg",
		});
		const shadowRoot = getShadowRoot(element);

		expect(shadowRoot.querySelector("img.avatar")).not.toBeNull();

		element.profileAvatar = "";

		await element.updateComplete;

		expect(shadowRoot.querySelector("img.avatar")).toBeNull();
		expect(shadowRoot.querySelector(".profile-name")?.textContent?.trim()).toBe(
			"Diego",
		);
	});
});
