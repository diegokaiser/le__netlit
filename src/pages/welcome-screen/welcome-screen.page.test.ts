import { afterEach, describe, expect, it } from "vitest";

import "./welcome-screen.page";
import type { WelcomeScreenPage } from "./welcome-screen.page";

const WELCOME_SCREEN_TAG = "app-welcome-screen-page";

function createWelcomeScreenPage(): WelcomeScreenPage {
	const element = document.createElement(
		WELCOME_SCREEN_TAG,
	) as WelcomeScreenPage;

	document.body.appendChild(element);

	return element;
}

async function renderWelcomeScreenPage(): Promise<WelcomeScreenPage> {
	const element = createWelcomeScreenPage();

	await element.updateComplete;

	return element;
}

describe("app-welcome-screen-page", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("renders the welcome screen component", async () => {
		const element = await renderWelcomeScreenPage();

		expect(element).toBeInstanceOf(HTMLElement);
		expect(element.tagName.toLowerCase()).toBe(WELCOME_SCREEN_TAG);
		expect(element.textContent?.trim().length).toBeGreaterThan(0);
	});

	it("uses light DOM instead of shadow DOM", async () => {
		const element = await renderWelcomeScreenPage();

		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector("main")).not.toBeNull();
	});

	it("renders semantic page structure", async () => {
		const element = await renderWelcomeScreenPage();

		const header = element.querySelector("header");
		const main = element.querySelector("main");

		expect(header).not.toBeNull();
		expect(main).not.toBeNull();
	});

	it("renders the Nexlit brand", async () => {
		const element = await renderWelcomeScreenPage();

		expect(element.textContent).toContain("Nexlit");
	});

	it("renders one main h1 heading", async () => {
		const element = await renderWelcomeScreenPage();

		const headings = element.querySelectorAll("h1");

		expect(headings.length).toBe(1);
		expect(headings[0].textContent?.trim().length).toBeGreaterThan(0);
	});

	it("renders the login link", async () => {
		const element = await renderWelcomeScreenPage();

		const loginLink =
			element.querySelector<HTMLAnchorElement>('a[href="/login"]');

		expect(loginLink).not.toBeNull();
		expect(loginLink?.textContent?.trim().length).toBeGreaterThan(0);
		expect(loginLink?.getAttribute("href")).toBe("/login");
	});

	it("renders the register CTA link", async () => {
		const element = await renderWelcomeScreenPage();

		const registerLink = element.querySelector<HTMLAnchorElement>(
			'a[href="/register"]',
		);

		expect(registerLink).not.toBeNull();
		expect(registerLink?.textContent?.trim().length).toBeGreaterThan(0);
		expect(registerLink?.getAttribute("href")).toBe("/register");
	});

	it("renders at least two navigation actions", async () => {
		const element = await renderWelcomeScreenPage();

		const links = Array.from(element.querySelectorAll("a"));
		const hrefs = links.map((link) => link.getAttribute("href"));

		expect(hrefs).toContain("/login");
		expect(hrefs).toContain("/register");
	});

	it("has accessible text for all links", async () => {
		const element = await renderWelcomeScreenPage();

		const links = Array.from(element.querySelectorAll("a"));

		expect(links.length).toBeGreaterThanOrEqual(2);

		links.forEach((link) => {
			const text = link.textContent?.trim();
			const ariaLabel = link.getAttribute("aria-label")?.trim();

			expect(Boolean(text || ariaLabel)).toBe(true);
		});
	});

	it("does not render empty href links", async () => {
		const element = await renderWelcomeScreenPage();

		const links = Array.from(element.querySelectorAll("a"));

		links.forEach((link) => {
			const href = link.getAttribute("href");

			expect(href).not.toBeNull();
			expect(href?.trim()).not.toBe("");
			expect(href).not.toBe("#");
		});
	});
});
