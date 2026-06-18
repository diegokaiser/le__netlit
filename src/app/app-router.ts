import { Router } from "@vaadin/router";

import { ROUTES } from "../core/config/routes";
import { requireAuthenticatedUser } from "../router/auth.guard";

export function initRouter(outlet: HTMLElement) {
	const router = new Router(outlet);

	router.setRoutes([
		{
			path: ROUTES.welcomeScreen,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (user) {
					return commands.redirect(ROUTES.welcome);
				}

				await import("../pages/welcome-screen/welcome-screen.page");

				return commands.component("app-welcome-screen-page");
			},
		},
		{
			path: ROUTES.login,
			component: "login-page",
			action: async () => {
				await import("../pages/login/login.page");
			},
		},
		{
			path: ROUTES.register,
			component: "register-page",
			action: async () => {
				await import("../pages/register/register.page");
			},
		},
		{
			path: ROUTES.verifyAccount,
			component: "verify-account-page",
			action: async () => {
				await import("../pages/verify-account/verify-account.page");
			},
		},
		{
			path: ROUTES.forgotPassword,
			component: "forgot-password-page",
			action: async () => {
				await import("../pages/forgot-password/forgot-password.page");
			},
		},
		{
			path: ROUTES.createNewPassword,
			component: "create-new-password-page",
			action: async () => {
				await import("../pages/create-new-password/create-new-password.page");
			},
		},
		{
			path: ROUTES.otp,
			component: "otp-page",
			action: async () => {
				await import("../pages/otp/otp.page");
			},
		},
		{
			path: ROUTES.welcome,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				await import("../pages/welcome/welcome.page");

				return commands.component("welcome-page");
			},
		},
		{
			path: ROUTES.subcategory,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				await import("../pages/subcategory/subcategory.page");

				return commands.component("subcategory-page");
			},
		},
		{
			path: ROUTES.category,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				await import("../pages/category/category.page");

				return commands.component("category-page");
			},
		},
		{
			path: ROUTES.mediaDetail,
			component: "app-media-detail-page",
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				await import("../pages/media-detail/media-detail.page");

				return commands.component("app-media-detail-page");
			},
		},
		{
			path: ROUTES.createProfile,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				await import("../pages/create-profile/create-profile.page");

				return commands.component("create-profile-page");
			},
		},
		{
			path: ROUTES.profiles,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				await import("../pages/profiles/profiles.page");

				return commands.component("profiles-page");
			},
		},
		{
			path: ROUTES.profile,
			action: async (_context, commands) => {
				const user = await requireAuthenticatedUser();

				if (!user) {
					return commands.redirect(ROUTES.login);
				}

				return commands.redirect(ROUTES.profiles);
			},
		},
		{
			path: "(.*)",
			action: async (_context, commands) => {
				await import("../pages/welcome-screen/welcome-screen.page");

				return commands.component("app-welcome-screen-page");
			},
		},
	]);

	return router;
}
