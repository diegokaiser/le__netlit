import { Router } from "@vaadin/router";

export function initRouter(outlet: HTMLElement) {
	const router = new Router(outlet);

	router.setRoutes([
		{
			path: "/",
			component: "app-welcome-screen-page",
			action: async () => {
				await import("../pages/welcome-screen/welcome-screen.page");
			},
		},
		{
			path: "/login",
			component: "login-page",
			action: async () => {
				await import("../pages/login/login.page");
			},
		},
		{
			path: "/register",
			component: "register-page",
			action: async () => {
				await import("../pages/register/register.page");
			},
		},
		{
			path: "/verify-account",
			component: "verify-account-page",
			action: async () => {
				await import("../pages/verify-account/verify-account.page");
			},
		},
		{
			path: "/forgot-password",
			component: "forgot-password-page",
			action: async () => {
				await import("../pages/forgot-password/forgot-password.page");
			},
		},
		{
			path: "/create-new-password",
			component: "create-new-password-page",
			action: async () => {
				await import("../pages/create-new-password/create-new-password.page");
			},
		},
		{
			path: "(.*)",
			component: "app-welcome-screen-page",
			action: async () => {
				await import("../pages/welcome-screen/welcome-screen.page");
			},
		},
	]);

	return router;
}
