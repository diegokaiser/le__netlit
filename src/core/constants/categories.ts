import type { MediaType } from "../../services/tmdb/tmdb.types";

export type CategorySlug = "movies" | "series" | "documentaries";

export type CategoryConfig = Readonly<{
	title: string;
	description: string;
	documentTitle: string;
	emptyMessage: string;
	mediaType: MediaType;
}>;

export const CATEGORY_CONFIG = {
	movies: {
		title: "Películas",
		description: "Descubre películas populares y estrenos.",
		documentTitle: "Películas | Nexlit",
		emptyMessage: "No encontramos películas disponibles en este momento.",
		mediaType: "movie",
	},
	series: {
		title: "Series",
		description: "Explora series populares y contenido destacado.",
		documentTitle: "Series | Nexlit",
		emptyMessage: "No encontramos series disponibles en este momento.",
		mediaType: "tv",
	},
	documentaries: {
		title: "Documentales",
		description: "Historias reales, cultura, ciencia y naturaleza.",
		documentTitle: "Documentales | Nexlit",
		emptyMessage: "No encontramos documentales disponibles en este momento.",
		mediaType: "movie",
	},
} as const satisfies Record<CategorySlug, CategoryConfig>;

export function isCategorySlug(value: unknown): value is CategorySlug {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(CATEGORY_CONFIG, value)
	);
}
