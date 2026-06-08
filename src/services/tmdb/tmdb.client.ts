import { env } from "../../core/config/env";

type TmdbParams = Record<string, string | number | boolean | undefined>;

export async function tmdbFetch<T>(
	path: string,
	params: TmdbParams = {},
): Promise<T> {
	const url = new URL(`${env.tmdb.apiBaseUrl}${path}`);

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined) {
			url.searchParams.set(key, String(value));
		}
	});

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${env.tmdb.readAccessToken}`,
			"Content-Type": "application/json;charset=utf-8",
		},
	});

	if (!response.ok) {
		throw new Error(`TMDB request failed: ${response.status}`);
	}

	return response.json() as Promise<T>;
}
