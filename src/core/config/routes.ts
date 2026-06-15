import type { MediaType } from "../../services/tmdb/tmdb.types";
import type { CategorySlug } from "../constants/categories";

export const ROUTES = {
	welcomeScreen: "/",
	login: "/login",
	register: "/register",
	forgotPassword: "/forgot-password",
	createNewPassword: "/create-new-password",
	otp: "/otp",
	verifyAccount: "/verify-account",
	welcome: "/welcome",
	category: "/category/:category",
	subcategory: "/category/:category/:subcategory",
	mediaDetail: "/media/:mediaType/:mediaId",
	seasonDetail: "/media/tv/:seriesId/season/:seasonNumber",
	profile: "/profile",
	profiles: "/profiles",
	createProfile: "/profiles/create",
	logout: "/logout",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function buildCategoryRoute(category: CategorySlug): string {
	return `/category/${category}`;
}

export function buildMediaDetailRoute(
	mediaType: MediaType,
	mediaId: number,
): string {
	return `/media/${mediaType}/${mediaId}`;
}
