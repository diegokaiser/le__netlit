/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PASSWORD_RECOVERY_REDIRECT_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
