import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterPage } from "./register.page";

const authMocks = vi.hoisted(() => {
	return {
		register: vi.fn(),
	};
});

vi.mock("../../services/auth/auth.service", () => {
	return {
		authService: {
			register: authMocks.register,
		},
	};
});

import "./register.page";

const selectors = {
	heading: "h1",
	form: "form",
	submitButton: 'button[type="submit"]',
	nameInput: 'input[name="name"]',
	emailInput: 'input[name="email"]',
	passwordInput: 'input[name="password"]',
	confirmPasswordInput: 'input[name="confirmPassword"]',
	alerts: '[role="alert"]',
};

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

async function renderRegisterPage() {
	const element = document.createElement("register-page") as RegisterPage;

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

function setInputValue(input: HTMLInputElement, value: string) {
	input.value = value;

	input.dispatchEvent(
		new InputEvent("input", {
			bubbles: true,
			composed: true,
			inputType: "insertText",
			data: value,
		}),
	);
}

async function flushUpdates(element: RegisterPage) {
	await Promise.resolve();
	await Promise.resolve();
	await element.updateComplete;
}

async function submitForm(element: RegisterPage) {
	const form = getRequiredElement<HTMLFormElement>(element, selectors.form);

	form.dispatchEvent(
		new Event("submit", {
			bubbles: true,
			cancelable: true,
		}),
	);

	await flushUpdates(element);
}

function fillValidRegisterForm(element: RegisterPage) {
	const nameInput = getRequiredElement<HTMLInputElement>(
		element,
		selectors.nameInput,
	);
	const emailInput = getRequiredElement<HTMLInputElement>(
		element,
		selectors.emailInput,
	);
	const passwordInput = getRequiredElement<HTMLInputElement>(
		element,
		selectors.passwordInput,
	);
	const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
		element,
		selectors.confirmPasswordInput,
	);

	setInputValue(nameInput, "Diego Cáceres");
	setInputValue(emailInput, "diego@example.com");
	setInputValue(passwordInput, "Password1");
	setInputValue(confirmPasswordInput, "Password1");
}

function getPageText(element: RegisterPage) {
	return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function expectAssociatedLabel(element: RegisterPage, inputSelector: string) {
	const input = getRequiredElement<HTMLInputElement>(element, inputSelector);

	const labelByFor = input.id
		? element.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
		: null;

	const wrappingLabel = input.closest("label");

	expect(
		labelByFor ?? wrappingLabel,
		`Expected input "${inputSelector}" to have an associated label`,
	).not.toBeNull();
}

describe("RegisterPage", () => {
	beforeEach(() => {
		authMocks.register.mockReset();
		document.body.replaceChildren();
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.clearAllMocks();
	});

	it("renderiza correctamente la página de registro", async () => {
		const element = await renderRegisterPage();

		expect(element).toBeInstanceOf(HTMLElement);
		expect(element.tagName.toLowerCase()).toBe("register-page");

		const pageText = getPageText(element);

		expect(pageText).toMatch(/registro|registrarse|crear cuenta/i);
	});

	it("usa Light DOM", async () => {
		const element = await renderRegisterPage();

		expect(element.shadowRoot).toBeNull();

		const form = element.querySelector(selectors.form);

		expect(form).not.toBeNull();
	});

	it("renderiza una estructura semántica básica", async () => {
		const element = await renderRegisterPage();

		const heading = getRequiredElement<HTMLHeadingElement>(
			element,
			selectors.heading,
		);
		const form = getRequiredElement<HTMLFormElement>(element, selectors.form);
		const submitButton = getRequiredElement<HTMLButtonElement>(
			element,
			selectors.submitButton,
		);

		expect(heading.textContent).toMatch(/registro|registrarse|crear cuenta/i);
		expect(form).toBeInstanceOf(HTMLFormElement);
		expect(submitButton.textContent).toMatch(/registr|crear cuenta/i);
	});

	it("renderiza los campos name, email, password y confirmPassword", async () => {
		const element = await renderRegisterPage();

		const nameInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.nameInput,
		);
		const emailInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.emailInput,
		);
		const passwordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.passwordInput,
		);
		const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.confirmPasswordInput,
		);

		expect(nameInput.type).toBe("text");
		expect(emailInput.type).toBe("email");
		expect(passwordInput.type).toBe("password");
		expect(confirmPasswordInput.type).toBe("password");
	});

	it("renderiza labels asociados a cada campo", async () => {
		const element = await renderRegisterPage();

		expectAssociatedLabel(element, selectors.nameInput);
		expectAssociatedLabel(element, selectors.emailInput);
		expectAssociatedLabel(element, selectors.passwordInput);
		expectAssociatedLabel(element, selectors.confirmPasswordInput);
	});

	it("muestra errores cuando se envía el formulario vacío", async () => {
		const element = await renderRegisterPage();

		await submitForm(element);

		const pageText = getPageText(element);
		const alerts = element.querySelectorAll(selectors.alerts);

		expect(authMocks.register).not.toHaveBeenCalled();

		expect(alerts.length).toBeGreaterThanOrEqual(4);
		expect(pageText).toMatch(/nombre/i);
		expect(pageText).toMatch(/email|correo/i);
		expect(pageText).toMatch(/contraseña|password/i);
	});

	it("muestra error cuando el email no es válido", async () => {
		const element = await renderRegisterPage();

		const nameInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.nameInput,
		);
		const emailInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.emailInput,
		);
		const passwordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.passwordInput,
		);
		const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.confirmPasswordInput,
		);

		setInputValue(nameInput, "Diego Cáceres");
		setInputValue(emailInput, "invalid-email");
		setInputValue(passwordInput, "Password1");
		setInputValue(confirmPasswordInput, "Password1");

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).not.toHaveBeenCalled();
		expect(pageText).toMatch(/email|correo/i);
		expect(pageText).toMatch(/válido|valido/i);
	});

	it("muestra error cuando la contraseña no cumple la longitud mínima", async () => {
		const element = await renderRegisterPage();

		const nameInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.nameInput,
		);
		const emailInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.emailInput,
		);
		const passwordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.passwordInput,
		);
		const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.confirmPasswordInput,
		);

		setInputValue(nameInput, "Diego Cáceres");
		setInputValue(emailInput, "diego@example.com");
		setInputValue(passwordInput, "Abc1");
		setInputValue(confirmPasswordInput, "Abc1");

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).not.toHaveBeenCalled();
		expect(pageText).toMatch(/mínima|minima|caracteres/i);
	});

	it("muestra error cuando la contraseña no tiene mayúscula", async () => {
		const element = await renderRegisterPage();

		const nameInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.nameInput,
		);
		const emailInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.emailInput,
		);
		const passwordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.passwordInput,
		);
		const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.confirmPasswordInput,
		);

		setInputValue(nameInput, "Diego Cáceres");
		setInputValue(emailInput, "diego@example.com");
		setInputValue(passwordInput, "password1");
		setInputValue(confirmPasswordInput, "password1");

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).not.toHaveBeenCalled();
		expect(pageText).toMatch(/mayúscula|mayuscula/i);
	});

	it("muestra error cuando la contraseña no tiene número", async () => {
		const element = await renderRegisterPage();

		const nameInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.nameInput,
		);
		const emailInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.emailInput,
		);
		const passwordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.passwordInput,
		);
		const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.confirmPasswordInput,
		);

		setInputValue(nameInput, "Diego Cáceres");
		setInputValue(emailInput, "diego@example.com");
		setInputValue(passwordInput, "Password");
		setInputValue(confirmPasswordInput, "Password");

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).not.toHaveBeenCalled();
		expect(pageText).toMatch(/número|numero/i);
	});

	it("muestra error cuando las contraseñas no coinciden", async () => {
		const element = await renderRegisterPage();

		const nameInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.nameInput,
		);
		const emailInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.emailInput,
		);
		const passwordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.passwordInput,
		);
		const confirmPasswordInput = getRequiredElement<HTMLInputElement>(
			element,
			selectors.confirmPasswordInput,
		);

		setInputValue(nameInput, "Diego Cáceres");
		setInputValue(emailInput, "diego@example.com");
		setInputValue(passwordInput, "Password1");
		setInputValue(confirmPasswordInput, "Password2");

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).not.toHaveBeenCalled();
		expect(pageText).toMatch(/coinciden|coincidir|iguales/i);
	});

	it("llama a authService.register y muestra estado success cuando el registro es correcto", async () => {
		authMocks.register.mockResolvedValueOnce(undefined);

		const element = await renderRegisterPage();

		fillValidRegisterForm(element);

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).toHaveBeenCalledTimes(1);
		expect(authMocks.register).toHaveBeenCalledWith({
			name: "Diego Cáceres",
			email: "diego@example.com",
			password: "Password1",
		});

		expect(pageText).toMatch(
			/cuenta creada|registro completado|registrado|éxito|exito/i,
		);
	});

	it("muestra estado error cuando authService.register falla", async () => {
		authMocks.register.mockRejectedValueOnce(
			new Error("No se pudo crear la cuenta"),
		);

		const element = await renderRegisterPage();

		fillValidRegisterForm(element);

		await submitForm(element);

		const pageText = getPageText(element);

		expect(authMocks.register).toHaveBeenCalledTimes(1);
		expect(authMocks.register).toHaveBeenCalledWith({
			name: "Diego Cáceres",
			email: "diego@example.com",
			password: "Password1",
		});

		expect(pageText).toMatch(/error|no se pudo|inténtalo|intentarlo/i);
	});
});
