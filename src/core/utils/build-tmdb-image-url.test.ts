import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	env: {
		tmdb: {
			imageBaseUrl: "https://image.tmdb.org/t/p",
		},
	},
}));

vi.mock("../config/env", () => ({
	env: mocks.env,
}));

import { buildTmdbImageUrl } from "./build-tmdb-image-url";

const DEFAULT_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

beforeEach(() => {
	mocks.env.tmdb.imageBaseUrl = DEFAULT_IMAGE_BASE_URL;
});

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("buildTmdbImageUrl", () => {
	it("construye la URL con tamaño w500 de forma predeterminada", () => {
		expect(buildTmdbImageUrl("/poster.jpg")).toBe(
			"https://image.tmdb.org/t/p/w500/poster.jpg",
		);
	});

	it("añade la barra inicial cuando el path no la contiene", () => {
		expect(buildTmdbImageUrl("poster.jpg")).toBe(
			"https://image.tmdb.org/t/p/w500/poster.jpg",
		);
	});

	it("permite seleccionar otro tamaño válido", () => {
		expect(buildTmdbImageUrl("/backdrop_01.jpg", "w1280")).toBe(
			"https://image.tmdb.org/t/p/w1280/backdrop_01.jpg",
		);
	});

	it("permite utilizar el tamaño original", () => {
		expect(buildTmdbImageUrl("/backdrop.jpg", "original")).toBe(
			"https://image.tmdb.org/t/p/original/backdrop.jpg",
		);
	});

	it("normaliza espacios y barras finales de la URL base", () => {
		mocks.env.tmdb.imageBaseUrl = "  https://image.tmdb.org/t/p////  ";

		expect(buildTmdbImageUrl("/poster.jpg", "w342")).toBe(
			"https://image.tmdb.org/t/p/w342/poster.jpg",
		);
	});

	it.each([
		{
			description: "null",
			filePath: null,
		},
		{
			description: "undefined",
			filePath: undefined,
		},
		{
			description: "una cadena vacía",
			filePath: "",
		},
	] satisfies Array<{
		description: string;
		filePath: string | null | undefined;
	}>)("devuelve null cuando el path es $description", ({ filePath }) => {
		expect(buildTmdbImageUrl(filePath)).toBeNull();
	});

	it.each([
		"   ",
		"/folder/poster.jpg",
		"../poster.jpg",
		"/poster image.jpg",
		"/poster.jpg?language=es",
		"/poster.jpg#fragment",
		"/poster<script>.jpg",
	] satisfies string[])("rechaza el path inválido %s", (filePath) => {
		expect(buildTmdbImageUrl(filePath)).toBeNull();
	});

	it("acepta letras, números, puntos, guiones y guiones bajos", () => {
		expect(buildTmdbImageUrl("/Poster_01-final.v2.jpg", "w780")).toBe(
			"https://image.tmdb.org/t/p/w780/Poster_01-final.v2.jpg",
		);
	});

	it("devuelve null cuando la URL base está vacía", () => {
		mocks.env.tmdb.imageBaseUrl = "   ";

		expect(buildTmdbImageUrl("/poster.jpg")).toBeNull();
	});

	it("devuelve null cuando la URL base solo contiene barras", () => {
		mocks.env.tmdb.imageBaseUrl = "////";

		expect(buildTmdbImageUrl("/poster.jpg")).toBeNull();
	});
});
