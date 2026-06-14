import { env } from "../../core/config/env";

export type TmdbParams = Record<string, string | number | boolean | undefined>;

export type TmdbRequestOptions = {
	signal?: AbortSignal;
};

export class TmdbHttpError extends Error {
	readonly status: number;

	constructor(status: number) {
		super(`TMDB request failed with status ${status}.`);

		this.name = "TmdbHttpError";
		this.status = status;
	}
}

export async function tmdbFetch<T>(
	path: string,
	params: TmdbParams = {},
	options: TmdbRequestOptions = {},
): Promise<T> {
	const url = new URL(`${env.tmdb.apiBaseUrl}${path}`);

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined) {
			url.searchParams.set(key, String(value));
		}
	});

	const response = await fetch(url, {
		signal: options.signal,
		headers: {
			Authorization: `Bearer ${env.tmdb.readAccessToken}`,
			"Content-Type": "application/json;charset=utf-8",
		},
	});

	if (!response.ok) {
		throw new TmdbHttpError(response.status);
	}

	return response.json() as Promise<T>;
}
