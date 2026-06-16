import { describe, expect, it } from "vitest";

import type { MediaItem } from "../../services/tmdb/tmdb.types";
import { getMediaKey, mergeUniqueMediaItems } from "./media-items";

function createMediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
	return {
		id: 101,
		mediaType: "movie",
		title: "Contenido de prueba",
		overview: "Descripción del contenido.",
		posterPath: "/poster.jpg",
		backdropPath: "/backdrop.jpg",
		voteAverage: 8,
		releaseDate: "2026-01-01",
		genreIds: [18],
		...overrides,
	};
}

describe("getMediaKey", () => {
	it("combina mediaType e id en una clave estable", () => {
		const media = createMediaItem({
			id: 321,
			mediaType: "movie",
		});

		expect(getMediaKey(media)).toBe("movie-321");
	});

	it("diferencia películas y series aunque compartan id", () => {
		const movie = createMediaItem({
			id: 777,
			mediaType: "movie",
		});

		const series = createMediaItem({
			id: 777,
			mediaType: "tv",
		});

		expect(getMediaKey(movie)).toBe("movie-777");
		expect(getMediaKey(series)).toBe("tv-777");
		expect(getMediaKey(movie)).not.toBe(getMediaKey(series));
	});
});

describe("mergeUniqueMediaItems", () => {
	it("conserva los elementos existentes y añade los nuevos", () => {
		const existingMovie = createMediaItem({
			id: 1,
			title: "Película existente",
		});

		const newSeries = createMediaItem({
			id: 2,
			mediaType: "tv",
			title: "Serie nueva",
		});

		const result = mergeUniqueMediaItems([existingMovie], [newSeries]);

		expect(result).toEqual([existingMovie, newSeries]);
		expect(result[0]).toBe(existingMovie);
		expect(result[1]).toBe(newSeries);
	});

	it("elimina duplicados dentro de la página nueva", () => {
		const firstOccurrence = createMediaItem({
			id: 10,
			title: "Primera aparición",
		});

		const duplicatedOccurrence = createMediaItem({
			id: 10,
			title: "Aparición duplicada",
		});

		const uniqueItem = createMediaItem({
			id: 11,
			title: "Contenido único",
		});

		const result = mergeUniqueMediaItems(
			[],
			[firstOccurrence, duplicatedOccurrence, uniqueItem],
		);

		expect(result).toEqual([firstOccurrence, uniqueItem]);
	});

	it("elimina duplicados respecto a páginas anteriores", () => {
		const existingMovie = createMediaItem({
			id: 20,
			title: "Contenido existente",
		});

		const duplicatedMovie = createMediaItem({
			id: 20,
			title: "Contenido repetido",
		});

		const newMovie = createMediaItem({
			id: 21,
			title: "Contenido nuevo",
		});

		const result = mergeUniqueMediaItems(
			[existingMovie],
			[duplicatedMovie, newMovie],
		);

		expect(result).toEqual([existingMovie, newMovie]);
	});

	it("considera distintos movie y tv aunque compartan id", () => {
		const movie = createMediaItem({
			id: 30,
			mediaType: "movie",
			title: "Película",
		});

		const series = createMediaItem({
			id: 30,
			mediaType: "tv",
			title: "Serie",
		});

		const result = mergeUniqueMediaItems([movie], [series]);

		expect(result).toEqual([movie, series]);
	});

	it("no muta ninguno de los arrays recibidos", () => {
		const existingMovie = createMediaItem({
			id: 40,
			title: "Contenido existente",
		});

		const duplicatedMovie = createMediaItem({
			id: 40,
			title: "Contenido duplicado",
		});

		const newSeries = createMediaItem({
			id: 41,
			mediaType: "tv",
			title: "Contenido nuevo",
		});

		const currentItems: MediaItem[] = [existingMovie];
		const newItems: MediaItem[] = [duplicatedMovie, newSeries];

		const originalCurrentItems = [...currentItems];
		const originalNewItems = [...newItems];

		mergeUniqueMediaItems(currentItems, newItems);

		expect(currentItems).toEqual(originalCurrentItems);
		expect(newItems).toEqual(originalNewItems);

		expect(currentItems).toHaveLength(1);
		expect(newItems).toHaveLength(2);
	});

	it("devuelve una referencia nueva aunque no haya elementos nuevos", () => {
		const existingMovie = createMediaItem({
			id: 50,
		});

		const currentItems = [existingMovie];

		const result = mergeUniqueMediaItems(currentItems, []);

		expect(result).toEqual(currentItems);
		expect(result).not.toBe(currentItems);
	});
});
