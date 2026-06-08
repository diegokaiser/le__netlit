import { afterEach, describe, expect, it } from "vitest";

import "./welcome-screen.page";
import type { WelcomeScreenPage } from "./welcome-screen.page";

describe("app-welcome-screen-page", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("renders the welcome screen title", async () => {
		const element = document.createElement(
			"app-welcome-screen-page",
		) as WelcomeScreenPage;

		document.body.appendChild(element);

		await element.updateComplete;

		expect(element.textContent).toContain("Netflix Clone con LitElement");
	});

	it("renders login and register links", async () => {
		const element = document.createElement(
			"app-welcome-screen-page",
		) as WelcomeScreenPage;

		document.body.appendChild(element);

		await element.updateComplete;

		const loginLink = element.querySelector('a[href="/login"]');
		const registerLink = element.querySelector('a[href="/register"]');

		expect(loginLink).not.toBeNull();
		expect(registerLink).not.toBeNull();
	});
});
