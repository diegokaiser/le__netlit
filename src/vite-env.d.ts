/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PASSWORD_RECOVERY_REDIRECT_URL?: string;

	readonly VITE_APPWRITE_ENDPOINT?: string;
	readonly VITE_APPWRITE_PROJECT_ID?: string;
	readonly VITE_APPWRITE_DATABASE_ID?: string;
	readonly VITE_APPWRITE_PROFILES_TABLE_ID?: string;
	readonly VITE_APPWRITE_USER_PREFERENCES_TABLE_ID?: string;

	readonly VITE_APPWRITE_RECENTLY_VIEWED_TABLE_ID?: string;
	readonly VITE_TMDB_API_BASE_URL?: string;
	readonly VITE_TMDB_IMAGE_BASE_URL?: string;
	readonly VITE_TMDB_API_KEY?: string;
	readonly VITE_TMDB_READ_ACCESS_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
