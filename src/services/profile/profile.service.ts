import { ID, Permission, Query, Role } from "appwrite";

import { env } from "../../core/config/env";
import { isValidProfileAvatarId } from "../../core/constants/profile-avatars";
import {
	MAX_PROFILES,
	PROFILE_NAME_MAX_LENGTH,
	PROFILE_NAME_MIN_LENGTH,
} from "../../core/constants/profile.constants";
import { tablesDB } from "../appwrite/appwrite.client";
import { authService } from "../auth/auth.service";

import {
	ProfileServiceError,
	type CreateProfileInput,
	type Profile,
	type ProfileRow,
	type UserPreferencesRow,
} from "./profile.types";

const { databaseId, profilesTableId, userPreferencesTableId } = env.appwrite;

function assertProfileConfiguration(): void {
	if (!databaseId || !profilesTableId || !userPreferencesTableId) {
		throw new ProfileServiceError(
			"configuration",
			"La configuración de perfiles de Appwrite está incompleta.",
		);
	}
}

function assertCurrentUserId(userId: string): void {
	if (!userId.trim()) {
		throw new ProfileServiceError(
			"invalid-user",
			"No se pudo identificar al usuario autenticado.",
		);
	}
}

function normalizeProfileName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

function validateCreateProfileInput(
	input: CreateProfileInput,
): CreateProfileInput {
	const normalizedName = normalizeProfileName(input.name);

	if (normalizedName.length < PROFILE_NAME_MIN_LENGTH) {
		throw new ProfileServiceError(
			"invalid-name",
			`El nombre debe tener al menos ${PROFILE_NAME_MIN_LENGTH} caracteres.`,
		);
	}

	if (normalizedName.length > PROFILE_NAME_MAX_LENGTH) {
		throw new ProfileServiceError(
			"invalid-name",
			`El nombre no puede superar los ${PROFILE_NAME_MAX_LENGTH} caracteres.`,
		);
	}

	if (!isValidProfileAvatarId(input.avatarId)) {
		throw new ProfileServiceError(
			"invalid-avatar",
			"Selecciona un avatar válido.",
		);
	}

	if (typeof input.isKids !== "boolean") {
		throw new ProfileServiceError(
			"invalid-kids-value",
			"El tipo de perfil no es válido.",
		);
	}

	return {
		name: normalizedName,
		avatarId: input.avatarId,
		isKids: input.isKids,
	};
}

function getPrivateRowPermissions(userId: string): string[] {
	return [
		Permission.read(Role.user(userId)),
		Permission.update(Role.user(userId)),
		Permission.delete(Role.user(userId)),
	];
}

function mapProfileRow(row: ProfileRow): Profile {
	return {
		id: row.$id,
		userId: row.userId,
		name: row.name,
		avatarId: row.avatarId,
		isKids: row.isKids,
	};
}

function hasErrorCode(error: unknown, code: number): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	if (!("code" in error)) {
		return false;
	}

	return (error as { code?: unknown }).code === code;
}

async function getPreferencesRow(
	userId: string,
): Promise<UserPreferencesRow | null> {
	try {
		return await tablesDB.getRow<UserPreferencesRow>({
			databaseId,
			tableId: userPreferencesTableId,
			rowId: userId,
		});
	} catch (error) {
		if (hasErrorCode(error, 404)) {
			return null;
		}

		throw error;
	}
}

async function getProfileRow(profileId: string): Promise<ProfileRow | null> {
	try {
		return await tablesDB.getRow<ProfileRow>({
			databaseId,
			tableId: profilesTableId,
			rowId: profileId,
		});
	} catch (error) {
		if (hasErrorCode(error, 404)) {
			return null;
		}

		throw error;
	}
}

export const profileService = {
	async getCurrentUserId(): Promise<string> {
		const user = await authService.getCurrentUser();

		return user.$id;
	},

	async getProfiles(userId: string): Promise<Profile[]> {
		assertProfileConfiguration();
		assertCurrentUserId(userId);

		const result = await tablesDB.listRows<ProfileRow>({
			databaseId,
			tableId: profilesTableId,
			queries: [Query.equal("userId", [userId])],
		});

		return [...result.rows]
			.sort((firstRow, secondRow) =>
				firstRow.$createdAt.localeCompare(secondRow.$createdAt),
			)
			.map(mapProfileRow);
	},

	async createProfile(
		userId: string,
		input: CreateProfileInput,
	): Promise<Profile> {
		assertProfileConfiguration();
		assertCurrentUserId(userId);

		const validatedInput = validateCreateProfileInput(input);
		const existingProfiles = await this.getProfiles(userId);

		if (existingProfiles.length >= MAX_PROFILES) {
			throw new ProfileServiceError(
				"limit-reached",
				`Solo puedes crear un máximo de ${MAX_PROFILES} perfiles.`,
			);
		}

		const createdRow = await tablesDB.createRow<ProfileRow>({
			databaseId,
			tableId: profilesTableId,
			rowId: ID.unique(),
			data: {
				userId,
				name: validatedInput.name,
				avatarId: validatedInput.avatarId,
				isKids: validatedInput.isKids,
			},
			permissions: getPrivateRowPermissions(userId),
		});

		const createdProfile = mapProfileRow(createdRow);

		if (existingProfiles.length === 0) {
			await this.setActiveProfile(userId, createdProfile.id);
		}

		return createdProfile;
	},

	async getActiveProfile(userId: string): Promise<Profile | null> {
		assertProfileConfiguration();
		assertCurrentUserId(userId);

		const preferences = await getPreferencesRow(userId);

		if (!preferences?.activeProfileId) {
			return null;
		}

		const profileRow = await getProfileRow(preferences.activeProfileId);

		if (!profileRow) {
			return null;
		}

		if (profileRow.userId !== userId) {
			throw new ProfileServiceError(
				"profile-not-owned",
				"El perfil activo no pertenece al usuario autenticado.",
			);
		}

		return mapProfileRow(profileRow);
	},

	async setActiveProfile(userId: string, profileId: string): Promise<void> {
		assertProfileConfiguration();
		assertCurrentUserId(userId);

		const profileRow = await getProfileRow(profileId);

		if (!profileRow) {
			throw new ProfileServiceError(
				"profile-not-found",
				"El perfil seleccionado no existe.",
			);
		}

		if (profileRow.userId !== userId) {
			throw new ProfileServiceError(
				"profile-not-owned",
				"El perfil seleccionado no pertenece al usuario autenticado.",
			);
		}

		const existingPreferences = await getPreferencesRow(userId);

		if (existingPreferences) {
			await tablesDB.updateRow<UserPreferencesRow>({
				databaseId,
				tableId: userPreferencesTableId,
				rowId: existingPreferences.$id,
				data: {
					activeProfileId: profileId,
				},
			});

			return;
		}

		await tablesDB.createRow<UserPreferencesRow>({
			databaseId,
			tableId: userPreferencesTableId,
			rowId: userId,
			data: {
				userId,
				activeProfileId: profileId,
			},
			permissions: getPrivateRowPermissions(userId),
		});
	},
};
