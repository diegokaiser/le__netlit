import { Router } from "@vaadin/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../services/auth/auth.service";
import "./login.page";

type LoginPageElement = HTMLElement & {
	updateComplete: Promise<unknown>;
};

const createLoginPage = async () => {
	const element = document.createElement("login-page") as LoginPageElement;

	document.body.appendChild(element);
	await element.updateComplete;

	return element;
};

const flushAsync = async (element: LoginPageElement) => {
	await element.updateComplete;
	await Promise.resolve();

	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});

	await element.updateComplete;
};

const getForm = (element: LoginPageElement) => {
	const form = element.querySelector("form");

	expect(form).toBeTruthy();

	return form as HTMLFormElement;
};

const getEmailInput = (element: LoginPageElement) => {
	const input = element.querySelector<HTMLInputElement>(
		'input[name="email"], input[type="email"], #email',
	);

	expect(input).toBeTruthy();

	return input as HTMLInputElement;
};

const getPasswordInput = (element: LoginPageElement) => {
	const input = element.querySelector<HTMLInputElement>(
		'input[name="password"], input[type="password"], #password',
	);

	expect(input).toBeTruthy();

	return input as HTMLInputElement;
};

const setInputValue = async (
	element: LoginPageElement,
	input: HTMLInputElement,
	value: string,
) => {
	input.value = value;

	input.dispatchEvent(
		new Event("input", {
			bubbles: true,
			composed: true,
		}),
	);

	input.dispatchEvent(
		new Event("change", {
			bubbles: true,
			composed: true,
		}),
	);

	await element.updateComplete;
};

const submitForm = async (element: LoginPageElement) => {
	const form = getForm(element);

	form.dispatchEvent(
		new SubmitEvent("submit", {
			bubbles: true,
			cancelable: true,
		}),
	);

	await flushAsync(element);
};

const findLinkByHref = (element: LoginPageElement, href: string) => {
	return Array.from(element.querySelectorAll<HTMLAnchorElement>("a")).find(
		(link) => link.getAttribute("href") === href,
	);
};

const hasAssociatedLabel = (
	element: LoginPageElement,
	input: HTMLInputElement,
	labelPattern: RegExp,
) => {
	const labels = Array.from(element.querySelectorAll("label"));

	return labels.some((label) => {
		const labelText = label.textContent ?? "";
		const labelFor = label.getAttribute("for");
		const inputId = input.getAttribute("id");

		const isExplicitlyAssociated = Boolean(inputId && labelFor === inputId);
		const isImplicitlyAssociated = label.contains(input);

		return (
			labelPattern.test(labelText) &&
			(isExplicitlyAssociated || isImplicitlyAssociated)
		);
	});
};

describe("login-page", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("renders the login page", async () => {
		const element = await createLoginPage();

		expect(element).toBeInstanceOf(HTMLElement);
		expect(element.tagName.toLowerCase()).toBe("login-page");

		const text = element.textContent ?? "";

		expect(text).toMatch(/login|iniciar sesión|entrar/i);
	});

	it("uses Light DOM", async () => {
		const element = await createLoginPage();

		expect(element.shadowRoot).toBeNull();

		const form = element.querySelector("form");

		expect(form).toBeTruthy();
	});

	it("renders a basic semantic structure", async () => {
		const element = await createLoginPage();

		const heading = element.querySelector("h1, h2");
		const form = element.querySelector("form");
		const submitButton = element.querySelector<HTMLButtonElement>(
			'button[type="submit"], button',
		);

		expect(heading).toBeTruthy();
		expect(form).toBeTruthy();
		expect(submitButton).toBeTruthy();

		expect(submitButton?.textContent ?? "").toMatch(
			/login|iniciar sesión|entrar/i,
		);
	});

	it("renders email and password fields", async () => {
		const element = await createLoginPage();

		const emailInput = getEmailInput(element);
		const passwordInput = getPasswordInput(element);

		expect(emailInput.getAttribute("type")).toBe("email");
		expect(passwordInput.getAttribute("type")).toBe("password");
	});

	it("associates labels with email and password fields", async () => {
		const element = await createLoginPage();

		const emailInput = getEmailInput(element);
		const passwordInput = getPasswordInput(element);

		expect(hasAssociatedLabel(element, emailInput, /email|correo/i)).toBe(true);
		expect(
			hasAssociatedLabel(element, passwordInput, /password|contraseña/i),
		).toBe(true);
	});

	it("renders forgot password link", async () => {
		const element = await createLoginPage();

		const link = findLinkByHref(element, "/forgot-password");

		expect(link).toBeTruthy();
		expect(link?.textContent ?? "").toMatch(
			/forgot|olvidaste|olvidé|recuperar|contraseña/i,
		);
	});

	it("renders register link", async () => {
		const element = await createLoginPage();

		const link = findLinkByHref(element, "/register");

		expect(link).toBeTruthy();
		expect(link?.textContent ?? "").toMatch(
			/register|registro|crear cuenta|regístrate/i,
		);
	});

	it("shows validation errors when submitting an empty form", async () => {
		const loginSpy = vi.spyOn(authService, "login");

		const element = await createLoginPage();

		await submitForm(element);

		const text = element.textContent ?? "";

		expect(text).toMatch(/email|correo/i);
		expect(text).toMatch(/obligatori[oa]|required|requerid[oa]/i);
		expect(text).toMatch(/password|contraseña/i);

		expect(loginSpy).not.toHaveBeenCalled();
	});

	it("shows validation error when email is invalid", async () => {
		const loginSpy = vi.spyOn(authService, "login");

		const element = await createLoginPage();

		const emailInput = getEmailInput(element);
		const passwordInput = getPasswordInput(element);

		await setInputValue(element, emailInput, "invalid-email");
		await setInputValue(element, passwordInput, "validPassword123");

		await submitForm(element);

		const text = element.textContent ?? "";

		expect(text).toMatch(/email|correo/i);
		expect(text).toMatch(/válido|valido|valid/i);

		expect(loginSpy).not.toHaveBeenCalled();
	});

	it("shows validation error when password is empty", async () => {
		const loginSpy = vi.spyOn(authService, "login");

		const element = await createLoginPage();

		const emailInput = getEmailInput(element);

		await setInputValue(element, emailInput, "user@nexlit.test");

		await submitForm(element);

		const text = element.textContent ?? "";

		expect(text).toMatch(/password|contraseña/i);
		expect(text).toMatch(/obligatori[oa]|required|requerid[oa]/i);

		expect(loginSpy).not.toHaveBeenCalled();
	});

	it("calls authService.login and navigates to /welcome on success", async () => {
		const loginSpy = vi.spyOn(authService, "login").mockResolvedValue({
			$id: "session-id",
			userId: "user-id",
			provider: "email",
			providerUid: "user@nexlit.test",
			providerAccessToken: "",
			providerAccessTokenExpiry: "",
			providerRefreshToken: "",
			ip: "127.0.0.1",
			osCode: "",
			osName: "",
			osVersion: "",
			clientType: "",
			clientCode: "",
			clientName: "",
			clientVersion: "",
			clientEngine: "",
			clientEngineVersion: "",
			deviceName: "",
			deviceBrand: "",
			deviceModel: "",
			countryCode: "",
			countryName: "",
			current: true,
			factors: [],
			secret: "",
			expire: "",
			mfaUpdatedAt: "",
			$createdAt: "",
			$updatedAt: "",
		});

		const routerGoSpy = vi
			.spyOn(Router, "go")
			.mockImplementation(() => undefined);

		const element = await createLoginPage();

		const emailInput = getEmailInput(element);
		const passwordInput = getPasswordInput(element);

		await setInputValue(element, emailInput, "user@nexlit.test");
		await setInputValue(element, passwordInput, "validPassword123");

		await submitForm(element);

		expect(loginSpy).toHaveBeenCalledTimes(1);
		expect(loginSpy).toHaveBeenCalledWith({
			email: "user@nexlit.test",
			password: "validPassword123",
		});

		expect(routerGoSpy).toHaveBeenCalledTimes(1);
		expect(routerGoSpy).toHaveBeenCalledWith("/welcome");
	});

	it("shows a general error when authService.login fails", async () => {
		const loginSpy = vi
			.spyOn(authService, "login")
			.mockRejectedValue(new Error("Invalid credentials"));

		const routerGoSpy = vi
			.spyOn(Router, "go")
			.mockImplementation(() => undefined);

		const element = await createLoginPage();

		const emailInput = getEmailInput(element);
		const passwordInput = getPasswordInput(element);

		await setInputValue(element, emailInput, "user@nexlit.test");
		await setInputValue(element, passwordInput, "wrongPassword123");

		await submitForm(element);

		const text = element.textContent ?? "";

		expect(loginSpy).toHaveBeenCalledTimes(1);
		expect(loginSpy).toHaveBeenCalledWith({
			email: "user@nexlit.test",
			password: "wrongPassword123",
		});

		expect(routerGoSpy).not.toHaveBeenCalled();

		expect(text).toMatch(
			/invalid credentials|credenciales|error|incorrect|no se pudo/i,
		);
	});
});
