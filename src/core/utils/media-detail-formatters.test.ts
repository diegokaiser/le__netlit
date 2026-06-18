import { describe, expect, it } from "vitest";

import {
	formatEpisodeCount,
	formatRuntime,
	formatSeasonCount,
	formatVoteAverage,
	formatVoteCount,
	getReleaseYear,
} from "./media-detail-formatters";

describe("formatRuntime", () => {
	it.each([
		{
			minutes: 1,
			expected: "1 min",
		},
		{
			minutes: 45,
			expected: "45 min",
		},
		{
			minutes: 60,
			expected: "1 h",
		},
		{
			minutes: 120,
			expected: "2 h",
		},
		{
			minutes: 125,
			expected: "2 h 5 min",
		},
	])("formatea $minutes minutos como $expected", ({ minutes, expected }) => {
		expect(formatRuntime(minutes)).toBe(expected);
	});

	it.each([
		{
			description: "null",
			value: null,
		},
		{
			description: "undefined",
			value: undefined,
		},
		{
			description: "cero",
			value: 0,
		},
		{
			description: "un valor negativo",
			value: -1,
		},
		{
			description: "un decimal",
			value: 90.5,
		},
		{
			description: "NaN",
			value: Number.NaN,
		},
		{
			description: "Infinity",
			value: Number.POSITIVE_INFINITY,
		},
		{
			description: "un valor superior al máximo safe integer",
			value: Number.MAX_SAFE_INTEGER + 1,
		},
	] satisfies Array<{
		description: string;
		value: number | null | undefined;
	}>)("devuelve null para $description", ({ value }) => {
		expect(formatRuntime(value)).toBeNull();
	});
});

describe("getReleaseYear", () => {
	it.each([
		{
			date: "1800-01-01",
			expected: "1800",
		},
		{
			date: "2024-06-15",
			expected: "2024",
		},
		{
			date: "9999-12-31",
			expected: "9999",
		},
	])("extrae $expected desde $date", ({ date, expected }) => {
		expect(getReleaseYear(date)).toBe(expected);
	});

	it.each([
		{
			description: "null",
			value: null,
		},
		{
			description: "undefined",
			value: undefined,
		},
		{
			description: "string vacío",
			value: "",
		},
		{
			description: "solo espacios",
			value: "   ",
		},
		{
			description: "año sin fecha completa",
			value: "2024",
		},
		{
			description: "fecha con barras",
			value: "2024/06/15",
		},
		{
			description: "fecha sin ceros",
			value: "2024-6-5",
		},
		{
			description: "fecha con hora",
			value: "2024-06-15T10:00:00Z",
		},
		{
			description: "año inferior al mínimo",
			value: "1799-12-31",
		},
		{
			description: "año cero",
			value: "0000-01-01",
		},
	])("devuelve null para $description", ({ value }) => {
		expect(getReleaseYear(value)).toBeNull();
	});
});

describe("formatVoteAverage", () => {
	it.each([
		{
			value: 0,
			expected: "0.0/10",
		},
		{
			value: 7,
			expected: "7.0/10",
		},
		{
			value: 8.24,
			expected: "8.2/10",
		},
		{
			value: 8.25,
			expected: "8.3/10",
		},
		{
			value: 10,
			expected: "10.0/10",
		},
	])("formatea $value como $expected", ({ value, expected }) => {
		expect(formatVoteAverage(value)).toBe(expected);
	});

	it.each([
		{
			description: "null",
			value: null,
		},
		{
			description: "undefined",
			value: undefined,
		},
		{
			description: "un valor negativo",
			value: -0.1,
		},
		{
			description: "un valor superior a diez",
			value: 10.1,
		},
		{
			description: "NaN",
			value: Number.NaN,
		},
		{
			description: "Infinity",
			value: Number.POSITIVE_INFINITY,
		},
		{
			description: "-Infinity",
			value: Number.NEGATIVE_INFINITY,
		},
	] satisfies Array<{
		description: string;
		value: number | null | undefined;
	}>)("devuelve null para $description", ({ value }) => {
		expect(formatVoteAverage(value)).toBeNull();
	});
});

describe("formatVoteCount", () => {
	it.each([
		{
			value: 0,
			expected: "0",
		},
		{
			value: 25,
			expected: "25",
		},
		{
			value: 12_345,
			expected: "12.345",
		},
		{
			value: 12_500.6,
			expected: "12.501",
		},
	])("formatea $value como $expected", ({ value, expected }) => {
		expect(formatVoteCount(value)).toBe(expected);
	});

	it.each([
		{
			description: "null",
			value: null,
		},
		{
			description: "undefined",
			value: undefined,
		},
		{
			description: "un valor negativo",
			value: -1,
		},
		{
			description: "NaN",
			value: Number.NaN,
		},
		{
			description: "Infinity",
			value: Number.POSITIVE_INFINITY,
		},
		{
			description: "-Infinity",
			value: Number.NEGATIVE_INFINITY,
		},
	] satisfies Array<{
		description: string;
		value: number | null | undefined;
	}>)("devuelve null para $description", ({ value }) => {
		expect(formatVoteCount(value)).toBeNull();
	});
});

describe("formatSeasonCount", () => {
	it("usa singular para una temporada", () => {
		expect(formatSeasonCount(1)).toBe("1 temporada");
	});

	it.each([
		{
			value: 2,
			expected: "2 temporadas",
		},
		{
			value: 10,
			expected: "10 temporadas",
		},
		{
			value: Number.MAX_SAFE_INTEGER,
			expected: `${Number.MAX_SAFE_INTEGER} temporadas`,
		},
	])("usa plural para $value temporadas", ({ value, expected }) => {
		expect(formatSeasonCount(value)).toBe(expected);
	});

	it.each([
		null,
		undefined,
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("devuelve null para el valor inválido %s", (value) => {
		expect(formatSeasonCount(value)).toBeNull();
	});
});

describe("formatEpisodeCount", () => {
	it("usa singular para un episodio", () => {
		expect(formatEpisodeCount(1)).toBe("1 episodio");
	});

	it.each([
		{
			value: 2,
			expected: "2 episodios",
		},
		{
			value: 24,
			expected: "24 episodios",
		},
		{
			value: Number.MAX_SAFE_INTEGER,
			expected: `${Number.MAX_SAFE_INTEGER} episodios`,
		},
	])("usa plural para $value episodios", ({ value, expected }) => {
		expect(formatEpisodeCount(value)).toBe(expected);
	});

	it.each([
		null,
		undefined,
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("devuelve null para el valor inválido %s", (value) => {
		expect(formatEpisodeCount(value)).toBeNull();
	});
});
