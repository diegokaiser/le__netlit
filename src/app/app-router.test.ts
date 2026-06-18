import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireAuthenticatedUser: vi.fn(),
	routerConstructor: vi.fn(),
	setRoutes: vi.fn(),
	loadSubcategoryPage: vi.fn(),
	loadMediaDetailPage: vi.fn(),
}));

vi.mock("../router/auth.guard", () => ({
	requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("../pages/subcategory/subcategory.page", () => {
	mocks.loadSubcategoryPage();

	return {};
});

vi.mock("../pages/media-detail/media-detail.page", () => {
	mocks.loadMediaDetailPage();

	return {};
});

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
	mocks.loadSubcategoryPage.mockReset();
	mocks.loadMediaDetailPage.mockReset();
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
			ROUTES.subcategory,
			ROUTES.category,
			ROUTES.mediaDetail,
			ROUTES.createProfile,
			ROUTES.profiles,
			ROUTES.profile,
			"(.*)",
		]);
	});

	it("registra la ruta de subcategoría antes de la ruta de categoría", () => {
		const { routes } = initializeRouter();

		const subcategoryRouteIndex = routes.findIndex(
			(route) => route.path === ROUTES.subcategory,
		);

		const categoryRouteIndex = routes.findIndex(
			(route) => route.path === ROUTES.category,
		);

		expect(subcategoryRouteIndex).toBeGreaterThanOrEqual(0);
		expect(categoryRouteIndex).toBeGreaterThanOrEqual(0);
		expect(subcategoryRouteIndex).toBeLessThan(categoryRouteIndex);
	});

	it("registra Media Detail con el patrón y componente esperados", () => {
		const { routes } = initializeRouter();

		const mediaDetailRoute = getRequiredRoute(routes, ROUTES.mediaDetail);

		expect(mediaDetailRoute).toMatchObject({
			path: "/media/:mediaType/:mediaId",
			component: "app-media-detail-page",
		});

		expect(mediaDetailRoute.action).toBeDefined();
	});

	it("registra Media Detail antes del fallback", () => {
		const { routes } = initializeRouter();

		const mediaDetailRouteIndex = routes.findIndex(
			(route) => route.path === ROUTES.mediaDetail,
		);

		const fallbackRouteIndex = routes.findIndex(
			(route) => route.path === "(.*)",
		);

		expect(mediaDetailRouteIndex).toBeGreaterThanOrEqual(0);
		expect(fallbackRouteIndex).toBeGreaterThanOrEqual(0);
		expect(mediaDetailRouteIndex).toBeLessThan(fallbackRouteIndex);
	});

	it("no registra todavía la ruta funcional de temporadas", () => {
		const { routes } = initializeRouter();

		expect(routes.some((route) => route.path === ROUTES.seasonDetail)).toBe(
			false,
		);
	});

	it("redirige Media Detail a login cuando no existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const route = getRequiredRoute(routes, ROUTES.mediaDetail);

		const result = await getRequiredAction(route)(
			{
				params: {
					mediaType: "movie",
					mediaId: "101",
				},
			},
			commands,
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);

		expect(commands.redirect).toHaveBeenCalledTimes(1);
		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.login);

		expect(commands.component).not.toHaveBeenCalled();
		expect(mocks.loadMediaDetailPage).not.toHaveBeenCalled();

		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.login,
		});
	});

	it("carga Media Detail de forma lazy cuando existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		const route = getRequiredRoute(routes, ROUTES.mediaDetail);

		expect(mocks.loadMediaDetailPage).not.toHaveBeenCalled();

		const result = await getRequiredAction(route)(
			{
				params: {
					mediaType: "tv",
					mediaId: "202",
				},
			},
			commands,
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);

		expect(mocks.loadMediaDetailPage).toHaveBeenCalledTimes(1);

		expect(commands.redirect).not.toHaveBeenCalled();

		expect(commands.component).toHaveBeenCalledTimes(1);
		expect(commands.component).toHaveBeenCalledWith("app-media-detail-page");

		expect(result).toEqual({
			type: "component",
			tagName: "app-media-detail-page",
		});
	});

	it("no carga Media Detail cuando el guard falla inesperadamente", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		const error = new Error("Authentication service unavailable");

		mocks.requireAuthenticatedUser.mockRejectedValue(error);

		const route = getRequiredRoute(routes, ROUTES.mediaDetail);

		await expect(
			getRequiredAction(route)(
				{
					params: {
						mediaType: "movie",
						mediaId: "101",
					},
				},
				commands,
			),
		).rejects.toBe(error);

		expect(mocks.loadMediaDetailPage).not.toHaveBeenCalled();
		expect(commands.redirect).not.toHaveBeenCalled();
		expect(commands.component).not.toHaveBeenCalled();
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

	it("carga la página de subcategoría cuando existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue({
			$id: "user-1",
		});

		const route = getRequiredRoute(routes, ROUTES.subcategory);

		const result = await getRequiredAction(route)(
			{
				params: {
					category: "movies",
					subcategory: "terror",
				},
			},
			commands,
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(mocks.loadSubcategoryPage).toHaveBeenCalledTimes(1);
		expect(commands.redirect).not.toHaveBeenCalled();
		expect(commands.component).toHaveBeenCalledTimes(1);
		expect(commands.component).toHaveBeenCalledWith("subcategory-page");

		expect(result).toEqual({
			type: "component",
			tagName: "subcategory-page",
		});
	});

	it("redirige las subcategorías a login cuando no existe sesión", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();

		mocks.requireAuthenticatedUser.mockResolvedValue(null);

		const route = getRequiredRoute(routes, ROUTES.subcategory);

		const result = await getRequiredAction(route)(
			{
				params: {
					category: "movies",
					subcategory: "terror",
				},
			},
			commands,
		);

		expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
		expect(commands.redirect).toHaveBeenCalledTimes(1);
		expect(commands.redirect).toHaveBeenCalledWith(ROUTES.login);
		expect(commands.component).not.toHaveBeenCalled();
		expect(mocks.loadSubcategoryPage).not.toHaveBeenCalled();

		expect(result).toEqual({
			type: "redirect",
			path: ROUTES.login,
		});
	});

	it("propaga errores inesperados del guard en la ruta de subcategoría", async () => {
		const { routes } = initializeRouter();
		const commands = createCommands();
		const error = new Error("Authentication service unavailable");

		mocks.requireAuthenticatedUser.mockRejectedValue(error);

		const route = getRequiredRoute(routes, ROUTES.subcategory);

		await expect(
			getRequiredAction(route)(
				{
					params: {
						category: "series",
						subcategory: "sci-fi",
					},
				},
				commands,
			),
		).rejects.toBe(error);

		expect(commands.redirect).not.toHaveBeenCalled();
		expect(commands.component).not.toHaveBeenCalled();
		expect(mocks.loadSubcategoryPage).not.toHaveBeenCalled();
	});

	it("carga la página de categoría cuando existe sesión", async () => {
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

		expect(commands.redirect).not.toHaveBeenCalled();
		expect(commands.component).toHaveBeenCalledWith("category-page");
		expect(result).toEqual({
			type: "component",
			tagName: "category-page",
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
