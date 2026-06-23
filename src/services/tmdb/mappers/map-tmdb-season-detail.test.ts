import { describe, expect, it } from "vitest";

import { mapTmdbSeasonDetail } from "./map-tmdb-season-detail";

type RawEpisode = {
	id?: number;
	episode_number?: number;
	season_number?: number;
	name?: string | null;
	overview?: string | null;
	still_path?: string | null;
	air_date?: string | null;
	runtime?: number | null;
	vote_average?: number | null;
	vote_count?: number | null;
};

type RawSeason = {
	id?: number;
	name?: string | null;
	overview?: string | null;
	poster_path?: string | null;
	air_date?: string | null;
	season_number?: number;
	vote_average?: number | null;
	episodes?: RawEpisode[];
};

const createEpisode = (overrides: RawEpisode = {}): RawEpisode => ({
	id: 1001,
	episode_number: 1,
	season_number: 1,
	name: "Winter Is Coming",
	overview: "El inicio de la historia.",
	still_path: "/episode-1.jpg",
	air_date: "2011-04-17",
	runtime: 62,
	vote_average: 8.4,
	vote_count: 120,
	...overrides,
});

const createSeason = (overrides: RawSeason = {}): RawSeason => ({
	id: 901,
	name: "Temporada 1",
	overview: "La primera temporada.",
	poster_path: "/season-1.jpg",
	air_date: "2011-04-17",
	season_number: 1,
	vote_average: 8.5,
	episodes: [createEpisode()],
	...overrides,
});

const mapSeason = (
	season: RawSeason,
	seriesId = 1399,
	requestedSeasonNumber = 1,
) =>
	mapTmdbSeasonDetail(
		season as Parameters<typeof mapTmdbSeasonDetail>[0],
		seriesId,
		requestedSeasonNumber,
	);

describe("mapTmdbSeasonDetail", () => {
	it("normaliza una temporada completa", () => {
		const result = mapSeason(createSeason());

		expect(result).toEqual({
			id: 901,
			seriesId: 1399,
			seasonNumber: 1,
			name: "Temporada 1",
			overview: "La primera temporada.",
			posterPath: "/season-1.jpg",
			airDate: "2011-04-17",
			episodeCount: 1,
			voteAverage: 8.5,
			episodes: [
				{
					id: 1001,
					episodeNumber: 1,
					seasonNumber: 1,
					name: "Winter Is Coming",
					overview: "El inicio de la historia.",
					stillPath: "/episode-1.jpg",
					airDate: "2011-04-17",
					runtime: 62,
					voteAverage: 8.4,
					voteCount: 120,
				},
			],
		});
	});

	it("ordena episodios por episodeNumber", () => {
		const result = mapSeason(
			createSeason({
				episodes: [
					createEpisode({ id: 1003, episode_number: 3, name: "Episodio 3" }),
					createEpisode({ id: 1001, episode_number: 1, name: "Episodio 1" }),
					createEpisode({ id: 1002, episode_number: 2, name: "Episodio 2" }),
				],
			}),
		);

		expect(result.episodes.map((episode) => episode.episodeNumber)).toEqual([
			1, 2, 3,
		]);
	});

	it("elimina episodios inválidos", () => {
		const result = mapSeason(
			createSeason({
				episodes: [
					createEpisode({ id: 1001, episode_number: 1 }),
					createEpisode({ id: 0, episode_number: 2 }),
					createEpisode({ id: -1, episode_number: 3 }),
					createEpisode({ id: 1004, episode_number: 0 }),
					createEpisode({ id: 1005, episode_number: -1 }),
					createEpisode({ id: 1006, episode_number: 1.5 }),
				],
			}),
		);

		expect(result.episodes).toHaveLength(1);
		expect(result.episodes[0]?.id).toBe(1001);
	});

	it("elimina episodios duplicados por id", () => {
		const result = mapSeason(
			createSeason({
				episodes: [
					createEpisode({ id: 1001, episode_number: 1, name: "Original" }),
					createEpisode({ id: 1001, episode_number: 2, name: "Duplicado" }),
					createEpisode({ id: 1002, episode_number: 3, name: "Otro" }),
				],
			}),
		);

		expect(result.episodes.map((episode) => episode.id)).toEqual([1001, 1002]);
		expect(result.episodes[0]?.name).toBe("Original");
	});

	it("usa fallback Especiales para season 0 sin nombre", () => {
		const result = mapSeason(
			createSeason({
				name: "",
				season_number: 0,
				episodes: [createEpisode({ season_number: 0 })],
			}),
			1399,
			0,
		);

		expect(result.seasonNumber).toBe(0);
		expect(result.name).toBe("Especiales");
	});

	it("usa fallback Temporada N para temporada sin nombre", () => {
		const result = mapSeason(
			createSeason({
				name: "",
				season_number: 2,
			}),
			1399,
			2,
		);

		expect(result.name).toBe("Temporada 2");
	});

	it("usa fallback Episodio N para episodio sin nombre", () => {
		const result = mapSeason(
			createSeason({
				episodes: [createEpisode({ name: "" })],
			}),
		);

		expect(result.episodes[0]?.name).toBe("Episodio 1");
	});

	it("normaliza strings vacíos", () => {
		const result = mapSeason(
			createSeason({
				overview: "",
				poster_path: "",
				air_date: "",
				episodes: [
					createEpisode({
						overview: "",
						still_path: "",
						air_date: "",
					}),
				],
			}),
		);

		expect(result.overview).toBe("");
		expect(result.posterPath).toBeNull();
		expect(result.airDate).toBeUndefined();
		expect(result.episodes[0]?.overview).toBe("");
		expect(result.episodes[0]?.stillPath).toBeNull();
		expect(result.episodes[0]?.airDate).toBeUndefined();
	});

	it("mantiene episodeCount según episodios válidos normalizados", () => {
		const result = mapSeason(
			createSeason({
				episodes: [
					createEpisode({ id: 1001, episode_number: 1 }),
					createEpisode({ id: 1002, episode_number: 2 }),
					createEpisode({ id: 0, episode_number: 3 }),
					createEpisode({ id: 1004, episode_number: -1 }),
				],
			}),
		);

		expect(result.episodeCount).toBe(2);
		expect(result.episodes).toHaveLength(2);
	});

	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"rechaza seriesId inválido: %s",
		(seriesId) => {
			expect(() => mapSeason(createSeason(), seriesId, 1)).toThrow();
		},
	);

	it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"rechaza requestedSeasonNumber inválido: %s",
		(requestedSeasonNumber) => {
			expect(() =>
				mapSeason(createSeason(), 1399, requestedSeasonNumber),
			).toThrow();
		},
	);

	it("rechaza response sin id", () => {
		expect(() =>
			mapSeason(
				createSeason({
					id: undefined,
				}),
			),
		).toThrow();
	});
});
