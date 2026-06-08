type EnvConfig = {
	appwrite: {
		endpoint: string;
		projectId: string;
		databaseId: string;
		profilesTableId: string;
		recentlyViewedTableId: string;
		userPreferencesTableId: string;
	};
	tmdb: {
		apiBaseUrl: string;
		imageBaseUrl: string;
		apiKey?: string;
		readAccessToken: string;
	};
};

function getRequiredEnvValue(key: string): string {
	const value = import.meta.env[key];

	if (!value) {
		console.warn(`[ENV WARNING] Missing environment variable: ${key}`);
		return "";
	}

	return value;
}

export const env: EnvConfig = {
	appwrite: {
		endpoint: getRequiredEnvValue("VITE_APPWRITE_ENDPOINT"),
		projectId: getRequiredEnvValue("VITE_APPWRITE_PROJECT_ID"),
		databaseId: getRequiredEnvValue("VITE_APPWRITE_DATABASE_ID"),
		profilesTableId: getRequiredEnvValue("VITE_APPWRITE_PROFILES_TABLE_ID"),
		recentlyViewedTableId: getRequiredEnvValue(
			"VITE_APPWRITE_RECENTLY_VIEWED_TABLE_ID",
		),
		userPreferencesTableId: getRequiredEnvValue(
			"VITE_APPWRITE_USER_PREFERENCES_TABLE_ID",
		),
	},
	tmdb: {
		apiBaseUrl: getRequiredEnvValue("VITE_TMDB_API_BASE_URL"),
		imageBaseUrl: getRequiredEnvValue("VITE_TMDB_IMAGE_BASE_URL"),
		readAccessToken: getRequiredEnvValue("VITE_TMDB_READ_ACCESS_TOKEN"),
		apiKey: getRequiredEnvValue("VITE_TMDB_API_KEY"),
	},
};
