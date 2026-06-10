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
			path: "(.*)",
			component: "app-welcome-screen-page",
			action: async () => {
				await import("../pages/welcome-screen/welcome-screen.page");
			},
		},
	]);

	return router;
}
