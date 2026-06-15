import { describe, expect, it } from "vitest";

import { ROUTES, buildCategoryRoute } from "./routes";

describe("routes", () => {
	it("define la ruta dinámica de categorías", () => {
		expect(ROUTES.category).toBe("/category/:category");
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
});
