import { describe, expect, it } from "vitest";

import {
	ROUTES,
	buildCategoryRoute,
	buildMediaDetailRoute,
	buildSubcategoryRoute,
} from "./routes";

describe("routes", () => {
	it("define la ruta dinámica de categorías", () => {
		expect(ROUTES.category).toBe("/category/:category");
	});

	it("define la ruta dinámica de subcategorías", () => {
		expect(ROUTES.subcategory).toBe("/category/:category/:subcategory");
	});

	it.each([
		{
			category: "movies" as const,
			expectedRoute: "/category/movies",
		},
		{
			category: "series" as const,
			expectedRoute: "/category/series",
		},
		{
			category: "documentaries" as const,
			expectedRoute: "/category/documentaries",
		},
	])("construye la ruta $expectedRoute", ({ category, expectedRoute }) => {
		expect(buildCategoryRoute(category)).toBe(expectedRoute);
	});

	it.each([
		{
			category: "movies" as const,
			subcategory: "terror" as const,
			expectedRoute: "/category/movies/terror",
		},
		{
			category: "series" as const,
			subcategory: "sci-fi" as const,
			expectedRoute: "/category/series/sci-fi",
		},
	])(
		"construye la ruta de subcategoría $expectedRoute",
		({ category, subcategory, expectedRoute }) => {
			expect(buildSubcategoryRoute(category, subcategory)).toBe(expectedRoute);
		},
	);

	it("mantiene el contrato de buildCategoryRoute", () => {
		expect(buildCategoryRoute("movies")).toBe("/category/movies");
		expect(buildCategoryRoute("series")).toBe("/category/series");
		expect(buildCategoryRoute("documentaries")).toBe("/category/documentaries");
	});

	it("mantiene el contrato de buildMediaDetailRoute", () => {
		expect(buildMediaDetailRoute("movie", 101)).toBe("/media/movie/101");

		expect(buildMediaDetailRoute("tv", 202)).toBe("/media/tv/202");
	});
});
