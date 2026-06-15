import type { MediaType } from "../../services/tmdb/tmdb.types";
import { CATEGORY_CONFIG, type CategorySlug } from "./categories";

export type SubcategorySlug = "terror" | "sci-fi" | "humor" | "romance";

export type TmdbGenreName =
	| "Horror"
	| "Science Fiction"
	| "Sci-Fi & Fantasy"
	| "Comedy"
	| "Romance";

export type SubcategoryConfig = Readonly<{
	title: string;
	description: string;
	movieGenreName?: TmdbGenreName;
	tvGenreName?: TmdbGenreName;
}>;

export type ResolvedSubcategoryConfig = Readonly<{
	category: CategorySlug;
	subcategory: SubcategorySlug;
	mediaType: MediaType;
	genreNames: readonly TmdbGenreName[];
	title: string;
	description: string;
	documentTitle: string;
	emptyMessage: string;
}>;

export const SUBCATEGORY_CONFIG = {
	terror: {
		title: "Terror",
		description: "Historias inquietantes, suspense y miedo.",
		movieGenreName: "Horror",
	},
	"sci-fi": {
		title: "Ciencia ficción",
		description: "Tecnología, futuros posibles y mundos desconocidos.",
		movieGenreName: "Science Fiction",
		tvGenreName: "Sci-Fi & Fantasy",
	},
	humor: {
		title: "Humor",
		description: "Comedias y contenido para disfrutar.",
		movieGenreName: "Comedy",
		tvGenreName: "Comedy",
	},
	romance: {
		title: "Romance",
		description: "Historias de relaciones, encuentros y emociones.",
		movieGenreName: "Romance",
	},
} as const satisfies Record<SubcategorySlug, SubcategoryConfig>;

export const SUPPORTED_SUBCATEGORIES_BY_CATEGORY = {
	movies: ["terror", "sci-fi", "humor", "romance"],
	series: ["sci-fi", "humor"],
	documentaries: [],
} as const satisfies Record<CategorySlug, readonly SubcategorySlug[]>;

export function isSubcategorySlug(value: unknown): value is SubcategorySlug {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(SUBCATEGORY_CONFIG, value)
	);
}

export function isSupportedSubcategoryCombination(
	category: CategorySlug,
	subcategory: SubcategorySlug,
): boolean {
	const supportedSubcategories: readonly SubcategorySlug[] =
		SUPPORTED_SUBCATEGORIES_BY_CATEGORY[category];

	return supportedSubcategories.includes(subcategory);
}

export function resolveSubcategoryConfig(
	category: CategorySlug,
	subcategory: SubcategorySlug,
): ResolvedSubcategoryConfig | null {
	if (!isSupportedSubcategoryCombination(category, subcategory)) {
		return null;
	}

	const categoryConfig = CATEGORY_CONFIG[category];
	const subcategoryConfig = SUBCATEGORY_CONFIG[subcategory];

	const genreName = resolveGenreName(category, subcategoryConfig);

	if (!genreName) {
		return null;
	}

	const normalizedCategoryTitle =
		categoryConfig.title.toLocaleLowerCase("es-ES");

	const normalizedSubcategoryTitle =
		subcategoryConfig.title.toLocaleLowerCase("es-ES");

	return {
		category,
		subcategory,
		mediaType: categoryConfig.mediaType,
		genreNames: [genreName],
		title: `${categoryConfig.title} de ${normalizedSubcategoryTitle}`,
		description: subcategoryConfig.description,
		documentTitle: `${subcategoryConfig.title} en ${categoryConfig.title} | Nexlit`,
		emptyMessage: `No encontramos ${normalizedCategoryTitle} de ${normalizedSubcategoryTitle} disponibles en este momento.`,
	};
}

function resolveGenreName(
	category: CategorySlug,
	config: SubcategoryConfig,
): TmdbGenreName | undefined {
	switch (category) {
		case "movies":
			return config.movieGenreName;

		case "series":
			return config.tvGenreName;

		case "documentaries":
			return undefined;
	}
}
