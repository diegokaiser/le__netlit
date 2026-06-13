import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/auth/auth.service", () => ({
	authService: {
		forgotPassword: vi.fn(),
	},
}));

import { authService } from "../../services/auth/auth.service";
import "./forgot-password.page";

const TAG_NAME = "forgot-password-page";
const REDIRECT_URL = "http://localhost:5173/create-new-password";

type ForgotPasswordPageElement = HTMLElement & {
	updateComplete: Promise<unknown>;
};

const createPage = async () => {
	const element = document.createElement(TAG_NAME) as ForgotPasswordPageElement;

	document.body.appendChild(element);
	await element.updateComplete;

	return element;
};

const getText = (element: HTMLElement) => {
	return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
};

const getForm = (element: HTMLElement) => {
	const form = element.querySelector("form");

	expect(form).toBeInstanceOf(HTMLFormElement);

	return form as HTMLFormElement;
};

const getEmailInput = (element: HTMLElement) => {
	const input = element.querySelector(
		'input[name="email"], input[type="email"], #email',
	);

	expect(input).toBeInstanceOf(HTMLInputElement);

	return input as HTMLInputElement;
};

const setEmailValue = async (
	element: ForgotPasswordPageElement,
	value: string,
) => {
	const input = getEmailInput(element);

	input.value = value;

	input.dispatchEvent(
		new InputEvent("input", {
			bubbles: true,
			composed: true,
			data: value,
			inputType: "insertText",
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

const submitForm = async (element: ForgotPasswordPageElement) => {
	const form = getForm(element);

	form.dispatchEvent(
		new SubmitEvent("submit", {
			bubbles: true,
			cancelable: true,
		}),
	);

	await element.updateComplete;
};

const forgotPasswordMock = vi.mocked(authService.forgotPassword);

describe("ForgotPasswordPage", () => {
	let element: ForgotPasswordPageElement;

	beforeEach(async () => {
		document.body.innerHTML = "";
		vi.clearAllMocks();

		element = await createPage();
	});

	afterEach(() => {
		element.remove();
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("renderiza correctamente la página", () => {
		expect(element).toBeInstanceOf(HTMLElement);
		expect(element.tagName.toLowerCase()).toBe(TAG_NAME);

		expect(getText(element)).not.toBe("");
	});

	it("usa Light DOM", () => {
		expect(element.shadowRoot).toBeNull();

		expect(element.querySelector("form")).not.toBeNull();
		expect(element.querySelector("h1")).not.toBeNull();
	});

	it("renderiza una estructura semántica básica", () => {
		expect(element.querySelector("main")).not.toBeNull();
		expect(element.querySelector("form")).toBeInstanceOf(HTMLFormElement);
		expect(element.querySelector("label")).toBeInstanceOf(HTMLLabelElement);
		expect(element.querySelector('button[type="submit"]')).toBeInstanceOf(
			HTMLButtonElement,
		);
	});

	it("renderiza el h1 principal", () => {
		const heading = element.querySelector("h1");

		expect(heading).toBeInstanceOf(HTMLHeadingElement);
		expect(heading?.textContent?.trim()).not.toBe("");
	});

	it("renderiza el campo email", () => {
		const input = getEmailInput(element);

		expect(input.name).toBe("email");
		expect(input.type).toBe("email");
	});

	it("asocia correctamente el label con el input email", () => {
		const input = getEmailInput(element);

		expect(input.id).not.toBe("");

		const label = element.querySelector(`label[for="${input.id}"]`);

		expect(label).toBeInstanceOf(HTMLLabelElement);
		expect(label?.textContent?.toLowerCase()).toContain("email");
	});

	it("muestra error al enviar el email vacío", async () => {
		await submitForm(element);

		const text = getText(element);

		expect(forgotPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/email|correo/i);
		expect(text).toMatch(/obligatorio|required|requerido/i);
	});

	it("muestra error al enviar un email inválido", async () => {
		await setEmailValue(element, "correo-invalido");

		await submitForm(element);

		const text = getText(element);

		expect(forgotPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/email|correo/i);
		expect(text).toMatch(/válido|valido/i);
	});

	it("llama authService.forgotPassword con el email y redirectUrl correctos en success", async () => {
		forgotPasswordMock.mockResolvedValueOnce(undefined);

		await setEmailValue(element, "diego@nexlit.dev");

		await submitForm(element);

		expect(forgotPasswordMock).toHaveBeenCalledTimes(1);
		expect(forgotPasswordMock).toHaveBeenCalledWith(
			"diego@nexlit.dev",
			REDIRECT_URL,
		);
	});

	it("muestra el mensaje genérico de success", async () => {
		forgotPasswordMock.mockResolvedValueOnce(undefined);

		await setEmailValue(element, "diego@nexlit.dev");

		await submitForm(element);

		expect(getText(element)).toContain(
			"Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
		);
	});

	it("renderiza un CTA hacia login", () => {
		const loginLink = element.querySelector('a[href="/login"]');

		expect(loginLink).toBeInstanceOf(HTMLAnchorElement);
		expect(loginLink?.getAttribute("href")).toBe("/login");
	});

	it("muestra un mensaje general de error cuando authService.forgotPassword falla", async () => {
		forgotPasswordMock.mockRejectedValueOnce(new Error("Appwrite error"));

		await setEmailValue(element, "diego@nexlit.dev");

		await submitForm(element);

		const text = getText(element);

		expect(forgotPasswordMock).toHaveBeenCalledTimes(1);
		expect(text).toMatch(/error|inténtalo|intentalo|no pudimos|problema/i);
	});

	it("no navega automáticamente después de enviar correctamente el formulario", async () => {
		forgotPasswordMock.mockResolvedValueOnce(undefined);

		const initialPathname = window.location.pathname;
		const pushStateSpy = vi.spyOn(window.history, "pushState");
		const replaceStateSpy = vi.spyOn(window.history, "replaceState");

		await setEmailValue(element, "diego@nexlit.dev");

		await submitForm(element);

		expect(window.location.pathname).toBe(initialPathname);
		expect(pushStateSpy).not.toHaveBeenCalled();
		expect(replaceStateSpy).not.toHaveBeenCalled();
	});
});
