import type { Models } from "appwrite";

export type Profile = {
	id: string;
	userId: string;
	name: string;
	avatarId: string;
	isKids: boolean;
};

export type CreateProfileInput = {
	name: string;
	avatarId: string;
	isKids: boolean;
};

export type UserPreferences = {
	id: string;
	userId: string;
	activeProfileId: string | null;
};

export type ProfileRow = Models.Row & {
	userId: string;
	name: string;
	avatarId: string;
	isKids: boolean;
};

export type UserPreferencesRow = Models.Row & {
	userId: string;
	activeProfileId: string | null;
};

export type ProfilesPageStatus =
	| "idle"
	| "loading"
	| "ready"
	| "empty"
	| "selecting"
	| "error";

export type CreateProfilePageStatus =
	| "idle"
	| "loading"
	| "success"
	| "error"
	| "limit-reached";

export type ProfileSelectedDetail = {
	profileId: string;
};

export type ProfileServiceErrorCode =
	| "configuration"
	| "invalid-user"
	| "invalid-name"
	| "invalid-avatar"
	| "invalid-kids-value"
	| "limit-reached"
	| "profile-not-found"
	| "profile-not-owned";

export class ProfileServiceError extends Error {
	readonly code: ProfileServiceErrorCode;

	constructor(code: ProfileServiceErrorCode, message: string) {
		super(message);

		this.name = "ProfileServiceError";
		this.code = code;
	}
}
