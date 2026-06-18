export function formatRuntime(
	minutes: number | null | undefined,
): string | null {
	if (!Number.isSafeInteger(minutes) || (minutes ?? 0) <= 0) {
		return null;
	}

	const hours = Math.floor(Number(minutes) / 60);
	const remainingMinutes = Number(minutes) % 60;

	if (hours === 0) {
		return `${remainingMinutes} min`;
	}

	if (remainingMinutes === 0) {
		return `${hours} h`;
	}

	return `${hours} h ${remainingMinutes} min`;
}

export function getReleaseYear(date: string | null | undefined): string | null {
	if (!date) {
		return null;
	}

	const match = /^(\d{4})-\d{2}-\d{2}$/.exec(date);

	if (!match) {
		return null;
	}

	const year = Number(match[1]);

	if (!Number.isSafeInteger(year) || year < 1800 || year > 9999) {
		return null;
	}

	return String(year);
}

export function formatVoteAverage(
	value: number | null | undefined,
): string | null {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 10
	) {
		return null;
	}

	return `${value.toFixed(1)}/10`;
}

export function formatVoteCount(
	value: number | null | undefined,
): string | null {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return null;
	}

	return new Intl.NumberFormat("es-ES", {
		maximumFractionDigits: 0,
	}).format(value);
}

export function formatSeasonCount(
	value: number | null | undefined,
): string | null {
	if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) {
		return null;
	}

	return value === 1 ? "1 temporada" : `${value} temporadas`;
}

export function formatEpisodeCount(
	value: number | null | undefined,
): string | null {
	if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) {
		return null;
	}

	return value === 1 ? "1 episodio" : `${value} episodios`;
}
