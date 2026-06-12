import { Router } from "@vaadin/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authServiceMocks = vi.hoisted(() => ({
	createEmailOtp: vi.fn(),
	verifyEmailOtp: vi.fn(),
}));

vi.mock("../../services/auth/auth.service", () => ({
	authService: authServiceMocks,
}));

import "./otp.page";

type OtpPageElement = HTMLElement & {
	updateComplete: Promise<boolean>;
};

const TAG_NAME = "otp-page";

const VALID_EMAIL = "diego@example.com";
const INVALID_EMAIL = "diego-invalid-email";
const USER_ID = "otp-user-id";
const VALID_CODE = "123456";

function getText(element: HTMLElement): string {
	return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function getEmailInput(element: HTMLElement): HTMLInputElement | null {
	return element.querySelector<HTMLInputElement>(
		'input[type="email"], input[name="email"], #email',
	);
}

function getCodeInput(element: HTMLElement): HTMLInputElement | null {
	return element.querySelector<HTMLInputElement>(
		[
			'input[name="code"]',
			'input[name="otp"]',
			'input[name="secret"]',
			'input[autocomplete="one-time-code"]',
			'input[inputmode="numeric"]',
			"#code",
			"#otp",
		].join(", "),
	);
}

function getCurrentForm(element: HTMLElement): HTMLFormElement {
	const form = element.querySelector<HTMLFormElement>("form");

	if (!form) {
		throw new Error("No se encontró un formulario en otp-page.");
	}

	return form;
}

function findButton(
	element: HTMLElement,
	textPattern: RegExp,
): HTMLButtonElement | null {
	return (
		[...element.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
			textPattern.test(button.textContent ?? ""),
		) ?? null
	);
}

function setInputValue(input: HTMLInputElement, value: string): void {
	input.value = value;

	input.dispatchEvent(
		new Event("input", {
			bubbles: true,
			composed: true,
		}),
	);
}

async function submitForm(element: OtpPageElement): Promise<void> {
	const form = getCurrentForm(element);

	form.dispatchEvent(
		new SubmitEvent("submit", {
			bubbles: true,
			cancelable: true,
		}),
	);

	await element.updateComplete;
}

async function renderOtpPage(): Promise<OtpPageElement> {
	const element = document.createElement(TAG_NAME) as OtpPageElement;

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

async function goToCodeStep(): Promise<OtpPageElement> {
	const element = await renderOtpPage();
	const emailInput = getEmailInput(element);

	if (!emailInput) {
		throw new Error("No se encontró el campo email.");
	}

	setInputValue(emailInput, VALID_EMAIL);

	await submitForm(element);

	await vi.waitFor(() => {
		expect(authServiceMocks.createEmailOtp).toHaveBeenCalledWith(VALID_EMAIL);

		expect(getCodeInput(element)).not.toBeNull();
	});

	await element.updateComplete;

	return element;
}

describe("OtpPage", () => {
	beforeEach(() => {
		document.body.innerHTML = "";

		authServiceMocks.createEmailOtp.mockReset();
		authServiceMocks.verifyEmailOtp.mockReset();

		authServiceMocks.createEmailOtp.mockResolvedValue({
			userId: USER_ID,
		} as never);

		authServiceMocks.verifyEmailOtp.mockResolvedValue({
			$id: "session-id",
		} as never);

		vi.spyOn(Router, "go").mockReturnValue(true);
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("registra el custom element de la página", () => {
		expect(customElements.get(TAG_NAME)).toBeDefined();
	});

	it("renderiza la página OTP", async () => {
		const element = await renderOtpPage();

		expect(element).toBeInstanceOf(HTMLElement);
		expect(document.body.contains(element)).toBe(true);
	});

	it("usa Light DOM", async () => {
		const element = await renderOtpPage();

		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector("main")).not.toBeNull();
	});

	it("renderiza una estructura semántica básica", async () => {
		const element = await renderOtpPage();

		const main = element.querySelector("main");
		const heading = element.querySelector("h1");
		const form = element.querySelector("form");

		expect(main).not.toBeNull();
		expect(heading).not.toBeNull();
		expect(form).not.toBeNull();
	});

	it("renderiza el título principal de la página OTP", async () => {
		const element = await renderOtpPage();
		const heading = element.querySelector("h1");

		expect(heading).not.toBeNull();
		expect(heading?.textContent).toMatch(/otp|código|codigo/i);
	});

	it("describe el flujo de acceso mediante código enviado por email", async () => {
		const element = await renderOtpPage();
		const pageText = getText(element);

		expect(pageText).toMatch(/código|codigo|otp/i);
		expect(pageText).toMatch(/email|correo/i);
	});

	it("renderiza el campo email", async () => {
		const element = await renderOtpPage();
		const emailInput = getEmailInput(element);

		expect(emailInput).not.toBeNull();
		expect(emailInput?.getAttribute("type")).toBe("email");
	});

	it("asocia correctamente el label con el campo email", async () => {
		const element = await renderOtpPage();
		const emailInput = getEmailInput(element);

		expect(emailInput).not.toBeNull();
		expect(emailInput?.id).toBeTruthy();

		const label = element.querySelector<HTMLLabelElement>(
			`label[for="${emailInput?.id}"]`,
		);

		expect(label).not.toBeNull();
		expect(label?.textContent).toMatch(/email|correo/i);
	});

	it("renderiza un enlace hacia login", async () => {
		const element = await renderOtpPage();
		const loginLink =
			element.querySelector<HTMLAnchorElement>('a[href="/login"]');

		expect(loginLink).not.toBeNull();
		expect(loginLink?.getAttribute("href")).toBe("/login");
	});

	it("renderiza un enlace hacia register", async () => {
		const element = await renderOtpPage();
		const registerLink = element.querySelector<HTMLAnchorElement>(
			'a[href="/register"]',
		);

		expect(registerLink).not.toBeNull();
		expect(registerLink?.getAttribute("href")).toBe("/register");
	});

	it("muestra error al enviar el email vacío", async () => {
		const element = await renderOtpPage();

		await submitForm(element);

		const pageText = getText(element);

		expect(pageText).toMatch(/obligatorio|required|requerido/i);
		expect(authServiceMocks.createEmailOtp).not.toHaveBeenCalled();
	});

	it("muestra error cuando el formato del email es inválido", async () => {
		const element = await renderOtpPage();
		const emailInput = getEmailInput(element);

		expect(emailInput).not.toBeNull();

		setInputValue(emailInput as HTMLInputElement, INVALID_EMAIL);

		await submitForm(element);

		const pageText = getText(element);

		expect(pageText).toMatch(/válido|valido|formato/i);
		expect(authServiceMocks.createEmailOtp).not.toHaveBeenCalled();
	});

	it("llama authService.createEmailOtp con el email válido", async () => {
		const element = await renderOtpPage();
		const emailInput = getEmailInput(element);

		expect(emailInput).not.toBeNull();

		setInputValue(emailInput as HTMLInputElement, VALID_EMAIL);

		await submitForm(element);

		await vi.waitFor(() => {
			expect(authServiceMocks.createEmailOtp).toHaveBeenCalledTimes(1);
			expect(authServiceMocks.createEmailOtp).toHaveBeenCalledWith(VALID_EMAIL);
		});
	});

	it("muestra el paso de código tras solicitar correctamente el OTP", async () => {
		const element = await goToCodeStep();

		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();
		expect(getText(element)).toMatch(/código|codigo|otp/i);
	});

	it("renderiza el campo para introducir el código OTP", async () => {
		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();
	});

	it("asocia correctamente el label con el campo de código OTP", async () => {
		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();
		expect(codeInput?.id).toBeTruthy();

		const label = element.querySelector<HTMLLabelElement>(
			`label[for="${codeInput?.id}"]`,
		);

		expect(label).not.toBeNull();
		expect(label?.textContent).toMatch(/código|codigo|otp/i);
	});

	it("muestra una opción para editar el email", async () => {
		const element = await goToCodeStep();
		const editButton = findButton(element, /editar|cambiar/i);

		expect(editButton).not.toBeNull();
	});

	it("permite volver al paso de email mediante la opción editar", async () => {
		const element = await goToCodeStep();
		const editButton = findButton(element, /editar|cambiar/i);

		expect(editButton).not.toBeNull();

		editButton?.click();

		await element.updateComplete;

		expect(getEmailInput(element)).not.toBeNull();
		expect(getCodeInput(element)).toBeNull();
	});

	it("muestra una opción para reenviar el código", async () => {
		const element = await goToCodeStep();
		const resendButton = findButton(element, /reenviar/i);

		expect(resendButton).not.toBeNull();
	});

	it("vuelve a solicitar el OTP al pulsar reenviar código", async () => {
		const element = await goToCodeStep();
		const resendButton = findButton(element, /reenviar/i);

		expect(resendButton).not.toBeNull();
		expect(authServiceMocks.createEmailOtp).toHaveBeenCalledTimes(1);

		resendButton?.click();

		await vi.waitFor(() => {
			expect(authServiceMocks.createEmailOtp).toHaveBeenCalledTimes(2);
		});

		expect(authServiceMocks.createEmailOtp).toHaveBeenLastCalledWith(
			VALID_EMAIL,
		);
	});

	it("muestra error al enviar el código vacío", async () => {
		const element = await goToCodeStep();

		await submitForm(element);

		const pageText = getText(element);

		expect(pageText).toMatch(/obligatorio|required|requerido/i);
		expect(authServiceMocks.verifyEmailOtp).not.toHaveBeenCalled();
	});

	it("muestra error cuando el código contiene caracteres no numéricos", async () => {
		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();

		setInputValue(codeInput as HTMLInputElement, "12ab56");

		await submitForm(element);

		const pageText = getText(element);

		expect(pageText).toMatch(
			/números|numeros|numérico|numerico|dígitos|digitos/i,
		);

		expect(authServiceMocks.verifyEmailOtp).not.toHaveBeenCalled();
	});

	it("muestra error cuando el código tiene menos de 6 dígitos", async () => {
		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();

		setInputValue(codeInput as HTMLInputElement, "12345");

		await submitForm(element);

		const pageText = getText(element);

		expect(pageText).toMatch(/6|seis|dígitos|digitos/i);
		expect(authServiceMocks.verifyEmailOtp).not.toHaveBeenCalled();
	});

	it("llama authService.verifyEmailOtp con el userId y el código", async () => {
		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();

		setInputValue(codeInput as HTMLInputElement, VALID_CODE);

		await submitForm(element);

		await vi.waitFor(() => {
			expect(authServiceMocks.verifyEmailOtp).toHaveBeenCalledTimes(1);

			expect(authServiceMocks.verifyEmailOtp).toHaveBeenCalledWith(
				USER_ID,
				VALID_CODE,
			);
		});
	});

	it("navega a /welcome cuando la verificación OTP es correcta", async () => {
		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();

		setInputValue(codeInput as HTMLInputElement, VALID_CODE);

		await submitForm(element);

		await vi.waitFor(() => {
			expect(authServiceMocks.verifyEmailOtp).toHaveBeenCalledWith(
				USER_ID,
				VALID_CODE,
			);

			expect(Router.go).toHaveBeenCalledTimes(1);
			expect(Router.go).toHaveBeenCalledWith("/welcome");
		});
	});

	it("muestra error cuando authService.createEmailOtp falla", async () => {
		authServiceMocks.createEmailOtp.mockRejectedValueOnce(
			new Error("No se pudo solicitar el código OTP."),
		);

		const element = await renderOtpPage();
		const emailInput = getEmailInput(element);

		expect(emailInput).not.toBeNull();

		setInputValue(emailInput as HTMLInputElement, VALID_EMAIL);

		await submitForm(element);

		await vi.waitFor(() => {
			expect(getText(element)).toMatch(
				/error|no se pudo|inténtalo|intentalo|falló|fallo/i,
			);
		});

		expect(getCodeInput(element)).toBeNull();
		expect(Router.go).not.toHaveBeenCalled();
	});

	it("muestra error cuando authService.verifyEmailOtp falla", async () => {
		authServiceMocks.verifyEmailOtp.mockRejectedValueOnce(
			new Error("El código OTP no es válido."),
		);

		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();

		setInputValue(codeInput as HTMLInputElement, VALID_CODE);

		await submitForm(element);

		await vi.waitFor(() => {
			expect(getText(element)).toMatch(
				/error|no se pudo|inválido|invalido|incorrecto|expirado/i,
			);
		});

		expect(Router.go).not.toHaveBeenCalled();
	});

	it("no guarda el userId ni el OTP en localStorage o sessionStorage", async () => {
		window.localStorage.clear();
		window.sessionStorage.clear();

		const localStorageSetItemSpy = vi.spyOn(window.localStorage, "setItem");

		const sessionStorageSetItemSpy = vi.spyOn(window.sessionStorage, "setItem");

		const element = await goToCodeStep();
		const codeInput = getCodeInput(element);

		expect(codeInput).not.toBeNull();

		setInputValue(codeInput as HTMLInputElement, VALID_CODE);

		await submitForm(element);

		await vi.waitFor(() => {
			expect(authServiceMocks.verifyEmailOtp).toHaveBeenCalledWith(
				USER_ID,
				VALID_CODE,
			);
		});

		expect(localStorageSetItemSpy).not.toHaveBeenCalled();
		expect(sessionStorageSetItemSpy).not.toHaveBeenCalled();

		expect(window.localStorage.length).toBe(0);
		expect(window.sessionStorage.length).toBe(0);
	});
});
