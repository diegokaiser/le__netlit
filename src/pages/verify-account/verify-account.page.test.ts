import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * IMPORTANTE:
 * Este mock debe usar la misma ruta que usa verify-account.page.ts
 * para importar authService.
 *
 * Si tu página importa con alias, por ejemplo:
 * import { authService } from '@/services/auth.service';
 *
 * entonces cambia también este vi.mock a:
 * vi.mock('@/services/auth.service', ...)
 */
const authServiceMock = vi.hoisted(() => ({
	confirmVerification: vi.fn(),
	sendVerification: vi.fn(),
}));

vi.mock("../../services/auth/auth.service", () => ({
	authService: {
		confirmVerification: authServiceMock.confirmVerification,
		sendVerification: authServiceMock.sendVerification,
	},
}));

import "./verify-account.page";

type LitNativeElement = HTMLElement & {
	updateComplete: Promise<unknown>;
};

const TAG_NAME = "verify-account-page";

function setRoute(path: string): void {
	window.history.pushState({}, "", path);
}

async function nextFrame(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
}

async function flushElement(element: LitNativeElement): Promise<void> {
	await element.updateComplete;
	await Promise.resolve();
	await nextFrame();
	await element.updateComplete;
}

async function mountVerifyAccountPage(
	path = "/verify-account",
): Promise<LitNativeElement> {
	setRoute(path);

	const element = document.createElement(TAG_NAME) as LitNativeElement;
	document.body.appendChild(element);

	await flushElement(element);

	return element;
}

function getText(element: HTMLElement): string {
	return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function getLoginCta(element: HTMLElement): HTMLAnchorElement | null {
	return element.querySelector<HTMLAnchorElement>(
		'a[href="/login"], a[href$="/login"]',
	);
}

function getButtonByText(
	element: HTMLElement,
	pattern: RegExp,
): HTMLButtonElement | null {
	return (
		Array.from(element.querySelectorAll("button")).find((button) =>
			pattern.test(button.textContent ?? ""),
		) ?? null
	);
}

describe("VerifyAccountPage", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		setRoute("/verify-account");

		authServiceMock.confirmVerification.mockReset();
		authServiceMock.sendVerification.mockReset();
	});

	afterEach(() => {
		document.body.innerHTML = "";
		setRoute("/verify-account");

		vi.clearAllMocks();
	});

	it("registra el custom element de la página", () => {
		expect(customElements.get(TAG_NAME)).toBeDefined();
	});

	it("usa Light DOM", async () => {
		const element = await mountVerifyAccountPage();

		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector("*")).not.toBeNull();
	});

	it("renderiza estado idle cuando no existen query params", async () => {
		const element = await mountVerifyAccountPage("/verify-account");

		expect(authServiceMock.confirmVerification).not.toHaveBeenCalled();

		const text = getText(element);

		expect(text).toMatch(/email|correo/i);
		expect(text).toMatch(/verifica|verification|cuenta|account/i);
	});

	it("muestra CTA hacia /login en estado idle", async () => {
		const element = await mountVerifyAccountPage("/verify-account");

		const loginCta = getLoginCta(element);

		expect(loginCta).not.toBeNull();
		expect(loginCta?.getAttribute("href")).toBe("/login");
	});

	it("lee userId y secret desde query params y llama confirmVerification", async () => {
		authServiceMock.confirmVerification.mockResolvedValueOnce(undefined);

		const element = await mountVerifyAccountPage(
			"/verify-account?userId=user_123&secret=secret_456",
		);

		expect(window.location.search).toBe("?userId=user_123&secret=secret_456");

		await vi.waitFor(() => {
			expect(authServiceMock.confirmVerification).toHaveBeenCalledTimes(1);
		});

		expect(authServiceMock.confirmVerification).toHaveBeenCalledWith(
			"user_123",
			"secret_456",
		);

		expect(element.shadowRoot).toBeNull();
	});

	it("renderiza estado success cuando confirmVerification resuelve correctamente", async () => {
		authServiceMock.confirmVerification.mockResolvedValueOnce(undefined);

		const element = await mountVerifyAccountPage(
			"/verify-account?userId=user_123&secret=secret_456",
		);

		await flushElement(element);

		const text = getText(element);

		expect(text).toMatch(/verificada|verificado|success|éxito|confirmada/i);

		const loginCta = getLoginCta(element);

		expect(loginCta).not.toBeNull();
		expect(loginCta?.getAttribute("href")).toBe("/login");
	});

	it("renderiza estado error cuando confirmVerification falla", async () => {
		authServiceMock.confirmVerification.mockRejectedValueOnce(
			new Error("Invalid verification token"),
		);

		const element = await mountVerifyAccountPage(
			"/verify-account?userId=user_123&secret=secret_456",
		);

		await flushElement(element);

		const text = getText(element);

		expect(authServiceMock.confirmVerification).toHaveBeenCalledTimes(1);
		expect(text).toMatch(/error|falló|fallo|inválid|invalid|no pudimos/i);
	});

	it("permite reenviar verificación si el botón de resend existe", async () => {
		authServiceMock.sendVerification.mockResolvedValueOnce(undefined);

		const element = await mountVerifyAccountPage("/verify-account");

		const resendButton = getButtonByText(
			element,
			/reenviar|resend|enviar verificación|send verification/i,
		);

		/**
		 * Este Sprint permite que el CTA de resend aparezca solo si hay sesión activa.
		 * Si tu implementación no renderiza el botón sin sesión activa, este test valida
		 * que NO se llame accidentalmente al servicio.
		 *
		 * Si decides mantener siempre visible el botón de resend, elimina este guard
		 * y deja el click como obligatorio.
		 */
		if (!resendButton) {
			expect(authServiceMock.sendVerification).not.toHaveBeenCalled();
			return;
		}

		resendButton.click();

		await flushElement(element);

		expect(authServiceMock.sendVerification).toHaveBeenCalledTimes(1);

		const [verificationUrl] = authServiceMock.sendVerification.mock.calls[0];

		expect(typeof verificationUrl).toBe("string");
		expect(verificationUrl).toContain("/verify-account");
	});
});
