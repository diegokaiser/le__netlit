import { describe, expect, it } from "vitest";

import {
	SUBCATEGORY_CONFIG,
	isSubcategorySlug,
	isSupportedSubcategoryCombination,
	resolveSubcategoryConfig,
	type SubcategorySlug,
} from "./subcategories";

describe("isSubcategorySlug", () => {
	it.each([
		"terror",
		"sci-fi",
		"humor",
		"romance",
	] satisfies readonly SubcategorySlug[])(
		"acepta la subcategoría %s",
		(subcategory) => {
			expect(isSubcategorySlug(subcategory)).toBe(true);
		},
	);

	it.each([
		{
			label: "una subcategoría desconocida",
			value: "action",
		},
		{
			label: "una cadena vacía",
			value: "",
		},
		{
			label: "undefined",
			value: undefined,
		},
		{
			label: "null",
			value: null,
		},
		{
			label: "un número",
			value: 123,
		},
		{
			label: "la propiedad heredada toString",
			value: "toString",
		},
		{
			label: "la propiedad heredada constructor",
			value: "constructor",
		},
		{
			label: "la propiedad especial __proto__",
			value: "__proto__",
		},
	])("rechaza $label", ({ value }) => {
		expect(isSubcategorySlug(value)).toBe(false);
	});
});

describe("SUBCATEGORY_CONFIG", () => {
	it("contiene los textos localizados de cada subcategoría", () => {
		expect(SUBCATEGORY_CONFIG).toMatchObject({
			terror: {
				title: "Terror",
				description: "Historias inquietantes, suspense y miedo.",
			},
			"sci-fi": {
				title: "Ciencia ficción",
				description: "Tecnología, futuros posibles y mundos desconocidos.",
			},
			humor: {
				title: "Humor",
				description: "Comedias y contenido para disfrutar.",
			},
			romance: {
				title: "Romance",
				description: "Historias de relaciones, encuentros y emociones.",
			},
		});
	});

	it("diferencia los géneros de películas y series", () => {
		expect(SUBCATEGORY_CONFIG.terror.movieGenreName).toBe("Horror");
		expect(SUBCATEGORY_CONFIG.terror).not.toHaveProperty("tvGenreName");

		expect(SUBCATEGORY_CONFIG["sci-fi"].movieGenreName).toBe("Science Fiction");
		expect(SUBCATEGORY_CONFIG["sci-fi"].tvGenreName).toBe("Sci-Fi & Fantasy");

		expect(SUBCATEGORY_CONFIG.humor.movieGenreName).toBe("Comedy");
		expect(SUBCATEGORY_CONFIG.humor.tvGenreName).toBe("Comedy");

		expect(SUBCATEGORY_CONFIG.romance.movieGenreName).toBe("Romance");
		expect(SUBCATEGORY_CONFIG.romance).not.toHaveProperty("tvGenreName");
	});
});

describe("isSupportedSubcategoryCombination", () => {
	it.each([
		["movies", "terror"],
		["movies", "sci-fi"],
		["movies", "humor"],
		["movies", "romance"],
		["series", "sci-fi"],
		["series", "humor"],
	] as const)("acepta la combinación %s/%s", (category, subcategory) => {
		expect(isSupportedSubcategoryCombination(category, subcategory)).toBe(true);
	});

	it.each([
		["series", "terror"],
		["series", "romance"],
		["documentaries", "terror"],
		["documentaries", "sci-fi"],
		["documentaries", "humor"],
		["documentaries", "romance"],
	] as const)("rechaza la combinación %s/%s", (category, subcategory) => {
		expect(isSupportedSubcategoryCombination(category, subcategory)).toBe(
			false,
		);
	});
});

describe("resolveSubcategoryConfig", () => {
	it.each([
		{
			category: "movies",
			subcategory: "terror",
			expected: {
				category: "movies",
				subcategory: "terror",
				mediaType: "movie",
				genreNames: ["Horror"],
				title: "Películas de terror",
				description: "Historias inquietantes, suspense y miedo.",
				documentTitle: "Terror en Películas | Nexlit",
				emptyMessage:
					"No encontramos películas de terror disponibles en este momento.",
			},
		},
		{
			category: "movies",
			subcategory: "sci-fi",
			expected: {
				category: "movies",
				subcategory: "sci-fi",
				mediaType: "movie",
				genreNames: ["Science Fiction"],
				title: "Películas de ciencia ficción",
				description: "Tecnología, futuros posibles y mundos desconocidos.",
				documentTitle: "Ciencia ficción en Películas | Nexlit",
				emptyMessage:
					"No encontramos películas de ciencia ficción disponibles en este momento.",
			},
		},
		{
			category: "movies",
			subcategory: "humor",
			expected: {
				category: "movies",
				subcategory: "humor",
				mediaType: "movie",
				genreNames: ["Comedy"],
				title: "Películas de humor",
				description: "Comedias y contenido para disfrutar.",
				documentTitle: "Humor en Películas | Nexlit",
				emptyMessage:
					"No encontramos películas de humor disponibles en este momento.",
			},
		},
		{
			category: "movies",
			subcategory: "romance",
			expected: {
				category: "movies",
				subcategory: "romance",
				mediaType: "movie",
				genreNames: ["Romance"],
				title: "Películas de romance",
				description: "Historias de relaciones, encuentros y emociones.",
				documentTitle: "Romance en Películas | Nexlit",
				emptyMessage:
					"No encontramos películas de romance disponibles en este momento.",
			},
		},
		{
			category: "series",
			subcategory: "sci-fi",
			expected: {
				category: "series",
				subcategory: "sci-fi",
				mediaType: "tv",
				genreNames: ["Sci-Fi & Fantasy"],
				title: "Series de ciencia ficción",
				description: "Tecnología, futuros posibles y mundos desconocidos.",
				documentTitle: "Ciencia ficción en Series | Nexlit",
				emptyMessage:
					"No encontramos series de ciencia ficción disponibles en este momento.",
			},
		},
		{
			category: "series",
			subcategory: "humor",
			expected: {
				category: "series",
				subcategory: "humor",
				mediaType: "tv",
				genreNames: ["Comedy"],
				title: "Series de humor",
				description: "Comedias y contenido para disfrutar.",
				documentTitle: "Humor en Series | Nexlit",
				emptyMessage:
					"No encontramos series de humor disponibles en este momento.",
			},
		},
	] as const)(
		"resuelve $category/$subcategory",
		({ category, subcategory, expected }) => {
			expect(resolveSubcategoryConfig(category, subcategory)).toEqual(expected);
		},
	);

	it.each([
		["series", "terror"],
		["series", "romance"],
		["documentaries", "terror"],
		["documentaries", "sci-fi"],
		["documentaries", "humor"],
		["documentaries", "romance"],
	] as const)("devuelve null para %s/%s", (category, subcategory) => {
		expect(resolveSubcategoryConfig(category, subcategory)).toBeNull();
	});
});
