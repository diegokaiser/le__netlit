import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	routerConstructor: vi.fn(),
	setRoutes: vi.fn(),
}));

vi.mock("../router/auth.guard", () => ({
	requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@vaadin/router", () => ({
	Router: class RouterMock {
		constructor(outlet: HTMLElement) {
			mocks.routerConstructor(outlet);
		}

		setRoutes(routes: unknown): void {
			mocks.setRoutes(routes);
		}
	},
}));

import { ROUTES } from "../core/config/routes";
import { initRouter } from "./app-router";

type RouteAction = (
	context: unknown,
	commands: {
		redirect: ReturnType<typeof vi.fn>;
		component: ReturnType<typeof vi.fn>;
	},
) => Promise<unknown>;

type RouteConfig = {
	path: string;
	component?: string;
	action?: RouteAction;
};

function getRegisteredRoutes(): RouteConfig[] {
	expect(mocks.setRoutes).toHaveBeenCalledTimes(1);

	const routes = mocks.setRoutes.mock.calls[0]?.[0];

	expect(Array.isArray(routes)).toBe(true);

	return routes as RouteConfig[];
}

function getRequiredRoute(routes: RouteConfig[], path: string): RouteConfig {
	const route = routes.find((candidate) => candidate.path === path);

	expect(route, `Expected route "${path}" to be registered`).toBeDefined();

	return route as RouteConfig;
}

function getRequiredAction(route: RouteConfig): RouteAction {
	expect(route.action).toBeDefined();

	return route.action as RouteAction;
}

function createCommands() {
	return {
		redirect: vi.fn((path: string) => ({
			type: "redirect",
			path,
		})),
		component: vi.fn((tagName: string) => ({
			type: "component",
			tagName,
		})),
	};
}

function initializeRouter(): {
	outlet: HTMLElement;
	routes: RouteConfig[];
} {
	const outlet = document.createElement("div");

	document.body.appendChild(outlet);

	initRouter(outlet);

	return {
		outlet,
		routes: getRegisteredRoutes(),
	};
}

function resetMocks(): void {
	mocks.requireAuthenticatedUser.mockReset();
	mocks.routerConstructor.mockReset();
	mocks.setRoutes.mockReset();
}

describe("initRouter", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("crea el router con el outlet recibido", () => {
		const outlet = document.createElement("main");

		initRouter(outlet);

		expect(mocks.routerConstructor).toHaveBeenCalledTimes(1);
		expect(mocks.routerConstructor).toHaveBeenCalledWith(outlet);
		expect(mocks.setRoutes).toHaveBeenCalledTimes(1);
	});

	it("registra las rutas del proyecto", () => {
		const { routes } = initializeRouter();

		expect(routes.map((route) => route.path)).toEqual([
			ROUTES.welcomeScreen,
			ROUTES.login,
			ROUTES.register,
			ROUTES.verifyAccount,
			ROUTES.forgotPassword,
			ROUTES.createNewPassword,
			ROUTES.otp,
			ROUTES.welcome,
			ROUTES.category,
			ROUTES.createProfile,
			ROUTES.profiles,
			ROUTES.profile,
			"(.*)",
		]);
	});

	it("mantiene configuradas las rutas públicas existentes", () => {
		const { routes } = initializeRouter();

		expect(getRequiredRoute(routes, ROUTES.login).component).toBe("login-page");

		expect(getRequiredRoute(routes, ROUTES.register).component).toBe(
			"register-page",
		);

		expect(getRequiredRoute(routes, ROUTES.verifyAccount).component).toBe(
			"verify-account-page",
		);

		expect(getRequiredRoute(routes, ROUTES.forgotPassword).component).toBe(
			"forgot-password-page",
		);

		expect(getRequiredRoute(routes, ROUTES.createNewPassword).component).toBe(
			"create-new-password-page",
		);

		expect(getRequiredRoute(routes, ROUTES.otp).component).toBe("otp-page");
	});

	it("redirige desde la raíz pública a welcome cuando existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		const route = getRequiredRoute(routes, ROUTES.welcomeScreen);

		const result = await getRequiredAction(route)({}, commands);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.welcome);
		expect(commands.component).not.toHaveBeenCalled();
		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.welcome,
		});
	});

	it("redirige welcome a login cuando no existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const route = getRequiredRoute(routes, ROUTES.welcome);

		const result = await getRequiredAction(route)({}, commands);

		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.login);
		expect(commands.component).not.toHaveBeenCalled();
		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.login,
		});
	});

	it("permite renderizar welcome cuando existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		const route = getRequiredRoute(routes, ROUTES.welcome);

		const result = await getRequiredAction(route)({}, commands);

		expect(commands.redirect).not.toHaveBeenCalled();
		expect(commands.component).toHaveBeenCalledWith("welcome-page");
		expect(result).toEqual({
			type: "component",
			tagName: "welcome-page",
		});
	});

	it("redirige las categorías temporalmente a welcome cuando existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		const route = getRequiredRoute(routes, ROUTES.category);

		const result = await getRequiredAction(route)(
			{
				params: {
					category: "movies",
				},
			},
			commands,
		);

		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.welcome);
		expect(commands.component).not.toHaveBeenCalled();
		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.welcome,
		});
	});

	it("redirige las categorías a login cuando no existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const route = getRequiredRoute(routes, ROUTES.category);

		const result = await getRequiredAction(route)({}, commands);

		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.login);
		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.login,
		});
	});

	it("redirige la ruta singular profile hacia profiles", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		const route = getRequiredRoute(routes, ROUTES.profile);

		const result = await getRequiredAction(route)({}, commands);

		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.profiles);
		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.profiles,
		});
	});

	it.each([
		{
			path: ROUTES.profiles,
			expectedComponent: "profiles-page",
		},
		{
			path: ROUTES.createProfile,
			expectedComponent: "create-profile-page",
		},
	])("redirige $path a login cuando no existe sesión", async ({ path }) => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const route = getRequiredRoute(routes, path);

		const result = await getRequiredAction(route)({}, commands);

		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.login);
		expect(commands.component).not.toHaveBeenCalled();
		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.login,
		});
	});

	it("propaga errores inesperados del guard", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();
		const error = new Error("Authentication service unavailable");

		mocks.requireAuthenticatedUser.mockRejectedValue(error);

		const route = getRequiredRoute(routes, ROUTES.welcome);

		await expect(getRequiredAction(route)({}, commands)).rejects.toBe(error);

		expect(commands.redirect).not.toHaveBeenCalled();
		expect(commands.component).not.toHaveBeenCalled();
	});
});
