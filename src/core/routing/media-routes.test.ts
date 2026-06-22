import { describe, expect, it } from "vitest";

import {
	buildMediaDetailPath,
	buildSeasonDetailPath,
	isMediaType,
	parsePositiveMediaId,
	validateMediaRoute,
} from "./media-routes";

describe("isMediaType", () => {
	it.each(["movie", "tv"] as const)(
		'reconoce "%s" como MediaType',
		(mediaType) => {
			expect(isMediaType(mediaType)).toBe(true);
		},
	);

	it.each(["documentary", "movies", "series", "MOVIE", "TV", "", " movie "])(
		'rechaza el mediaType string inválido "%s"',
		(value) => {
			expect(isMediaType(value)).toBe(false);
		},
	);

	it.each([
		undefined,
		null,
		0,
		1,
		true,
		false,
		{},
		[],
		["movie"],
		Symbol("movie"),
	])("rechaza valores no string: %s", (value) => {
		expect(isMediaType(value)).toBe(false);
	});
});

describe("parsePositiveMediaId", () => {
	it.each([
		{
			value: "1",
			expected: 1,
		},
		{
			value: "42",
			expected: 42,
		},
		{
			value: String(Number.MAX_SAFE_INTEGER),
			expected: Number.MAX_SAFE_INTEGER,
		},
	])(
		"convierte el identificador decimal válido $value",
		({ value, expected }) => {
			expect(parsePositiveMediaId(value)).toBe(expected);
		},
	);

	it.each([
		{
			description: "string vacío",
			value: "",
		},
		{
			description: "cero",
			value: "0",
		},
		{
			description: "valor negativo",
			value: "-1",
		},
		{
			description: "valor decimal",
			value: "1.5",
		},
		{
			description: "NaN",
			value: "NaN",
		},
		{
			description: "notación exponencial",
			value: "1e3",
		},
		{
			description: "notación exponencial con mayúscula",
			value: "1E3",
		},
		{
			description: "signo positivo",
			value: "+1",
		},
		{
			description: "cero inicial",
			value: "01",
		},
		{
			description: "espacios alrededor",
			value: " 42 ",
		},
		{
			description: "valor superior al máximo safe integer",
			value: String(Number.MAX_SAFE_INTEGER + 1),
		},
	])("rechaza $description", ({ value }) => {
		expect(parsePositiveMediaId(value)).toBeNull();
	});

	it.each([
		undefined,
		null,
		0,
		1,
		42,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		{},
		[],
	])("rechaza valores que no son strings: %s", (value) => {
		expect(parsePositiveMediaId(value)).toBeNull();
	});
});

describe("validateMediaRoute", () => {
	it.each([
		{
			mediaType: "movie",
			mediaId: "101",
			expectedMediaId: 101,
		},
		{
			mediaType: "tv",
			mediaId: "202",
			expectedMediaId: 202,
		},
		{
			mediaType: "movie",
			mediaId: String(Number.MAX_SAFE_INTEGER),
			expectedMediaId: Number.MAX_SAFE_INTEGER,
		},
	] as const)(
		"valida la ruta $mediaType/$mediaId",
		({ mediaType, mediaId, expectedMediaId }) => {
			expect(validateMediaRoute(mediaType, mediaId)).toEqual({
				valid: true,
				value: {
					mediaType,
					mediaId: expectedMediaId,
				},
			});
		},
	);

	it("rechaza documentary como tipo técnico", () => {
		expect(validateMediaRoute("documentary", "101")).toEqual({
			valid: false,
		});
	});

	it.each([
		"",
		"0",
		"-1",
		"1.5",
		"NaN",
		"1e3",
		String(Number.MAX_SAFE_INTEGER + 1),
	])("rechaza el mediaId inválido %s", (mediaId) => {
		expect(validateMediaRoute("movie", mediaId)).toEqual({
			valid: false,
		});
	});

	it("rechaza una ruta aunque el mediaId sea válido si el tipo no lo es", () => {
		expect(
			validateMediaRoute("documentary", String(Number.MAX_SAFE_INTEGER)),
		).toEqual({
			valid: false,
		});
	});
});

describe("buildMediaDetailPath", () => {
	it.each([
		{
			mediaType: "movie" as const,
			mediaId: 101,
			expectedPath: "/media/movie/101",
		},
		{
			mediaType: "tv" as const,
			mediaId: 202,
			expectedPath: "/media/tv/202",
		},
		{
			mediaType: "movie" as const,
			mediaId: Number.MAX_SAFE_INTEGER,
			expectedPath: `/media/movie/${Number.MAX_SAFE_INTEGER}`,
		},
	])(
		"construye la ruta $expectedPath",
		({ mediaType, mediaId, expectedPath }) => {
			expect(buildMediaDetailPath(mediaType, mediaId)).toBe(expectedPath);
		},
	);

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("rechaza el mediaId numérico inválido %s", (mediaId) => {
		expect(() => buildMediaDetailPath("movie", mediaId)).toThrowError(
			"mediaId must be a positive safe integer.",
		);
	});
});

describe("buildSeasonDetailPath", () => {
	it("construye la ruta de una temporada de serie", () => {
		expect(buildSeasonDetailPath(202, 3)).toBe("/media/tv/202/season/3");
	});

	it("acepta identificadores safe integer", () => {
		expect(
			buildSeasonDetailPath(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
		).toBe(
			`/media/tv/${Number.MAX_SAFE_INTEGER}/season/${Number.MAX_SAFE_INTEGER}`,
		);
	});

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("rechaza el seriesId inválido %s", (seriesId) => {
		expect(() => buildSeasonDetailPath(seriesId, 1)).toThrowError(
			"seriesId must be a positive safe integer.",
		);
	});

	it("construye la ruta de especiales con seasonNumber 0", () => {
		expect(buildSeasonDetailPath(202, 0)).toBe("/media/tv/202/season/0");
	});
});
