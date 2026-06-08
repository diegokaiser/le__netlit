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
			component: "app-welcome-screen-page",
			action: async () => {
				await import("../pages/welcome-screen/welcome-screen.page");
			},
		},
		{
			path: "/register",
			component: "app-welcome-screen-page",
			action: async () => {
				await import("../pages/welcome-screen/welcome-screen.page");
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
