import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createNewPasswordMock } = vi.hoisted(() => {
	return {
		createNewPasswordMock:
			vi.fn<
				(userId: string, secret: string, password: string) => Promise<unknown>
			>(),
	};
});

vi.mock("../../services/auth/auth.service", () => {
	return {
		authService: {
			createNewPassword: createNewPasswordMock,
		},
	};
});

import "./create-new-password.page";

const TAG_NAME = "create-new-password-page";

type CreateNewPasswordPageElement = HTMLElement & {
	updateComplete: Promise<unknown>;
};

const VALID_USER_ID = "user_sprint6_test_123";
const VALID_SECRET = "secret_sprint6_test_456";
const VALID_PASSWORD = "Password1";

function setRoute(search = "") {
	window.history.pushState({}, "", `/create-new-password${search}`);
}

function getPageText(element: HTMLElement) {
	return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function getLinkByHref(element: HTMLElement, expectedHref: string) {
	return Array.from(
		element.querySelectorAll<HTMLAnchorElement>("a[href]"),
	).find((link) => {
		const href = link.getAttribute("href");

		return (
			href === expectedHref ||
			link.href.endsWith(expectedHref) ||
			href === `${window.location.origin}${expectedHref}`
		);
	});
}

function getForm(element: HTMLElement) {
	return element.querySelector<HTMLFormElement>("form");
}

function getPasswordInput(element: HTMLElement) {
	const directInput = element.querySelector<HTMLInputElement>(
		'input[name="password"], input#password',
	);

	if (directInput) {
		return directInput;
	}

	const passwordInputs = Array.from(
		element.querySelectorAll<HTMLInputElement>('input[type="password"]'),
	);

	return passwordInputs[0] ?? null;
}

function getConfirmPasswordInput(element: HTMLElement) {
	const directInput = element.querySelector<HTMLInputElement>(
		[
			'input[name="confirmPassword"]',
			'input[name="confirm-password"]',
			"input#confirmPassword",
			"input#confirm-password",
		].join(","),
	);

	if (directInput) {
		return directInput;
	}

	const passwordInputs = Array.from(
		element.querySelectorAll<HTMLInputElement>('input[type="password"]'),
	);

	return passwordInputs[1] ?? null;
}

function setInputValue(input: HTMLInputElement, value: string) {
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
}

function submitForm(element: HTMLElement) {
	const form = getForm(element);

	expect(form).not.toBeNull();

	form?.dispatchEvent(
		new SubmitEvent("submit", {
			bubbles: true,
			cancelable: true,
		}),
	);
}

async function waitForUpdates(element: CreateNewPasswordPageElement) {
	await element.updateComplete;
	await Promise.resolve();

	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});

	await element.updateComplete;
}

async function waitForAsyncSubmit(element: CreateNewPasswordPageElement) {
	await waitForUpdates(element);
	await waitForUpdates(element);
	await waitForUpdates(element);
}

async function renderPage(search = "") {
	setRoute(search);

	const element = document.createElement(
		TAG_NAME,
	) as CreateNewPasswordPageElement;

	document.body.appendChild(element);

	await waitForUpdates(element);

	return element;
}

function fillValidForm(element: HTMLElement, password = VALID_PASSWORD) {
	const passwordInput = getPasswordInput(element);
	const confirmPasswordInput = getConfirmPasswordInput(element);

	expect(passwordInput).not.toBeNull();
	expect(confirmPasswordInput).not.toBeNull();

	setInputValue(passwordInput!, password);
	setInputValue(confirmPasswordInput!, password);
}

function getAssociatedLabel(element: HTMLElement, input: HTMLInputElement) {
	const wrappingLabel = input.closest("label");

	if (wrappingLabel) {
		return wrappingLabel;
	}

	if (!input.id) {
		return null;
	}

	const escapedId = CSS.escape(input.id);

	return element.querySelector<HTMLLabelElement>(`label[for="${escapedId}"]`);
}

describe("CreateNewPasswordPage", () => {
	beforeEach(() => {
		createNewPasswordMock.mockReset();
	});

	afterEach(() => {
		document.body.innerHTML = "";
		window.history.pushState({}, "", "/");
		createNewPasswordMock.mockReset();
	});

	it("registra el custom element de la página", () => {
		expect(customElements.get(TAG_NAME)).toBeDefined();
	});

	it("usa Light DOM", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		expect(element.shadowRoot).toBeNull();
		expect(getForm(element)).not.toBeNull();
	});

	it("renderiza estado invalid-link cuando no existen query params", async () => {
		const element = await renderPage();

		const text = getPageText(element);

		expect(text).toMatch(/enlace/i);
		expect(text).toMatch(/recuperaci[oó]n/i);
		expect(text).toMatch(/no.*v[aá]lido|expirado/i);
		expect(getForm(element)).toBeNull();
	});

	it("muestra CTA hacia /forgot-password en estado invalid-link", async () => {
		const element = await renderPage();

		const forgotPasswordLink = getLinkByHref(element, "/forgot-password");

		expect(forgotPasswordLink).toBeDefined();
	});

	it("muestra CTA hacia /login en estado invalid-link", async () => {
		const element = await renderPage();

		const loginLink = getLinkByHref(element, "/login");

		expect(loginLink).toBeDefined();
	});

	it("renderiza formulario cuando existen userId y secret", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		expect(getForm(element)).not.toBeNull();
	});

	it("renderiza campo password", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(passwordInput?.tagName.toLowerCase()).toBe("input");
		expect(passwordInput?.getAttribute("type")).toBe("password");
	});

	it("renderiza campo confirmPassword", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(confirmPasswordInput).not.toBeNull();
		expect(confirmPasswordInput?.tagName.toLowerCase()).toBe("input");
		expect(confirmPasswordInput?.getAttribute("type")).toBe("password");
	});

	it("valida labels asociados", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);
		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(confirmPasswordInput).not.toBeNull();

		const passwordLabel = getAssociatedLabel(element, passwordInput!);
		const confirmPasswordLabel = getAssociatedLabel(
			element,
			confirmPasswordInput!,
		);

		expect(passwordLabel).not.toBeNull();
		expect(confirmPasswordLabel).not.toBeNull();

		expect(getPageText(passwordLabel!)).toMatch(/contrase/i);
		expect(getPageText(confirmPasswordLabel!)).toMatch(/confirm/i);
	});

	it("valida error al enviar formulario vacío", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		submitForm(element);

		await waitForUpdates(element);

		const text = getPageText(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/contrase/i);
		expect(text).toMatch(/obligatori|required|requerid/i);
	});

	it("valida contraseña demasiado corta", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);
		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(confirmPasswordInput).not.toBeNull();

		setInputValue(passwordInput!, "Abc1");
		setInputValue(confirmPasswordInput!, "Abc1");

		submitForm(element);

		await waitForUpdates(element);

		const text = getPageText(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/m[ií]nim|corta|caracter/i);
	});

	it("valida contraseña sin mayúscula", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);
		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(confirmPasswordInput).not.toBeNull();

		setInputValue(passwordInput!, "password1");
		setInputValue(confirmPasswordInput!, "password1");

		submitForm(element);

		await waitForUpdates(element);

		const text = getPageText(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/may[uú]scula/i);
	});

	it("valida contraseña sin número", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);
		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(confirmPasswordInput).not.toBeNull();

		setInputValue(passwordInput!, "Password");
		setInputValue(confirmPasswordInput!, "Password");

		submitForm(element);

		await waitForUpdates(element);

		const text = getPageText(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/n[uú]mero|num[eé]rico|d[ií]gito/i);
	});

	it("valida confirmPassword obligatorio", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);

		expect(passwordInput).not.toBeNull();

		setInputValue(passwordInput!, VALID_PASSWORD);

		submitForm(element);

		await waitForUpdates(element);

		const text = getPageText(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/confirm/i);
		expect(text).toMatch(/obligatori|required|requerid/i);
	});

	it("valida confirmación de contraseña incorrecta", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);
		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(confirmPasswordInput).not.toBeNull();

		setInputValue(passwordInput!, VALID_PASSWORD);
		setInputValue(confirmPasswordInput!, "Password2");

		submitForm(element);

		await waitForUpdates(element);

		const text = getPageText(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
		expect(text).toMatch(/coincid|igual|no.*coinc/i);
	});

	it("lee userId y secret desde query params", async () => {
		createNewPasswordMock.mockResolvedValueOnce(undefined);

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		expect(createNewPasswordMock).toHaveBeenCalledWith(
			VALID_USER_ID,
			VALID_SECRET,
			VALID_PASSWORD,
		);
	});

	it("mockea authService.createNewPassword para estado success", async () => {
		createNewPasswordMock.mockResolvedValueOnce(undefined);

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		expect(createNewPasswordMock).toHaveBeenCalledTimes(1);
	});

	it("valida que authService.createNewPassword recibe userId, secret y password", async () => {
		createNewPasswordMock.mockResolvedValueOnce(undefined);

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element, "SecurePass1");

		submitForm(element);

		await waitForAsyncSubmit(element);

		expect(createNewPasswordMock).toHaveBeenCalledWith(
			VALID_USER_ID,
			VALID_SECRET,
			"SecurePass1",
		);
	});

	it("renderiza estado success cuando createNewPassword resuelve correctamente", async () => {
		createNewPasswordMock.mockResolvedValueOnce(undefined);

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		const text = getPageText(element);

		expect(text).toMatch(/contrase/i);
		expect(text).toMatch(/actualizada|restablecida|creada|[eé]xito/i);
	});

	it("muestra CTA hacia /login en estado success", async () => {
		createNewPasswordMock.mockResolvedValueOnce(undefined);

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		const loginLink = getLinkByHref(element, "/login");

		expect(loginLink).toBeDefined();
	});

	it("mockea authService.createNewPassword para estado error", async () => {
		createNewPasswordMock.mockRejectedValueOnce(new Error("Appwrite error"));

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		expect(createNewPasswordMock).toHaveBeenCalledTimes(1);
	});

	it("renderiza estado error cuando createNewPassword falla", async () => {
		createNewPasswordMock.mockRejectedValueOnce(new Error("Appwrite error"));

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		const text = getPageText(element);

		expect(text).toMatch(/no.*pudo|error|fall[oó]/i);
		expect(text).toMatch(/actualizar|restablecer|crear/i);
		expect(text).toMatch(/contrase/i);
	});

	it("permite reintentar después de error", async () => {
		createNewPasswordMock
			.mockRejectedValueOnce(new Error("Appwrite error"))
			.mockResolvedValueOnce(undefined);

		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		fillValidForm(element);

		submitForm(element);

		await waitForAsyncSubmit(element);

		expect(createNewPasswordMock).toHaveBeenCalledTimes(1);

		submitForm(element);

		await waitForAsyncSubmit(element);

		expect(createNewPasswordMock).toHaveBeenCalledTimes(2);
		expect(createNewPasswordMock).toHaveBeenLastCalledWith(
			VALID_USER_ID,
			VALID_SECRET,
			VALID_PASSWORD,
		);
	});

	it("no llama a createNewPassword si el formulario es inválido", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const passwordInput = getPasswordInput(element);
		const confirmPasswordInput = getConfirmPasswordInput(element);

		expect(passwordInput).not.toBeNull();
		expect(confirmPasswordInput).not.toBeNull();

		setInputValue(passwordInput!, "password");
		setInputValue(confirmPasswordInput!, "different");

		submitForm(element);

		await waitForUpdates(element);

		expect(createNewPasswordMock).not.toHaveBeenCalled();
	});

	it("no muestra userId ni secret en pantalla", async () => {
		const element = await renderPage(
			`?userId=${encodeURIComponent(VALID_USER_ID)}&secret=${encodeURIComponent(
				VALID_SECRET,
			)}`,
		);

		const text = getPageText(element);

		expect(text).not.toContain(VALID_USER_ID);
		expect(text).not.toContain(VALID_SECRET);
	});
});
