import { describe, expect, it } from "vitest";

import { CATEGORY_CONFIG, isCategorySlug } from "./categories";

describe("categories", () => {
	it("define exactamente las categorías soportadas", () => {
		expect(Object.keys(CATEGORY_CONFIG)).toEqual([
			"movies",
			"series",
			"documentaries",
		]);
	});

	it("define la configuración esperada para películas", () => {
		expect(CATEGORY_CONFIG.movies).toEqual({
			title: "Películas",
			description: "Descubre películas populares y estrenos.",
			documentTitle: "Películas | Nexlit",
			emptyMessage: "No encontramos películas disponibles en este momento.",
			mediaType: "movie",
		});
	});

	it("define la configuración esperada para series", () => {
		expect(CATEGORY_CONFIG.series).toEqual({
			title: "Series",
			description: "Explora series populares y contenido destacado.",
			documentTitle: "Series | Nexlit",
			emptyMessage: "No encontramos series disponibles en este momento.",
			mediaType: "tv",
		});
	});

	it("define la configuración esperada para documentales", () => {
		expect(CATEGORY_CONFIG.documentaries).toEqual({
			title: "Documentales",
			description: "Historias reales, cultura, ciencia y naturaleza.",
			documentTitle: "Documentales | Nexlit",
			emptyMessage: "No encontramos documentales disponibles en este momento.",
			mediaType: "movie",
		});
	});

	it("mantiene documentales como una categoría de mediaType movie", () => {
		expect(CATEGORY_CONFIG.documentaries.mediaType).toBe("movie");
	});

	it.each(["movies", "series", "documentaries"])(
		'reconoce "%s" como CategorySlug',
		(category) => {
			expect(isCategorySlug(category)).toBe(true);
		},
	);

	it.each([
		"anime",
		"movie",
		"tv",
		"",
		"MOVIES",
		"documentary",
		"/category/movies",
	])('rechaza el slug string inválido "%s"', (value) => {
		expect(isCategorySlug(value)).toBe(false);
	});

	it.each([
		undefined,
		null,
		0,
		1,
		true,
		false,
		{},
		[],
		["movies"],
		Symbol("movies"),
	])("rechaza valores que no son strings: %s", (value) => {
		expect(isCategorySlug(value)).toBe(false);
	});
});
