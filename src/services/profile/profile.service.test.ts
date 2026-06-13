import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_ID = "database-1";
const PROFILES_TABLE_ID = "profiles-table";
const USER_PREFERENCES_TABLE_ID = "user-preferences-table";
const GENERATED_PROFILE_ID = "generated-profile-id";
const USER_ROLE = "role:user-1";
const READ_PERMISSION = `read:${USER_ROLE}`;
const UPDATE_PERMISSION = `update:${USER_ROLE}`;
const DELETE_PERMISSION = `delete:${USER_ROLE}`;
const USER_QUERY = "query:userId:user-1";

const mocks = vi.hoisted(() => ({
	getCurrentUser: vi.fn(),
	listRows: vi.fn(),
	getRow: vi.fn(),
	createRow: vi.fn(),
	updateRow: vi.fn(),
	idUnique: vi.fn(),
	queryEqual: vi.fn(),
	roleUser: vi.fn(),
	permissionRead: vi.fn(),
	permissionUpdate: vi.fn(),
	permissionDelete: vi.fn(),
}));

vi.mock("../../core/config/env", () => ({
	env: {
		appwrite: {
			databaseId: "database-1",
			profilesTableId: "profiles-table",
			userPreferencesTableId: "user-preferences-table",
		},
	},
}));

vi.mock("../appwrite/appwrite.client", () => ({
	tablesDB: {
		listRows: mocks.listRows,
		getRow: mocks.getRow,
		createRow: mocks.createRow,
		updateRow: mocks.updateRow,
	},
}));

vi.mock("../auth/auth.service", () => ({
	authService: {
		getCurrentUser: mocks.getCurrentUser,
	},
}));

vi.mock("appwrite", () => ({
	ID: {
		unique: mocks.idUnique,
	},
	Query: {
		equal: mocks.queryEqual,
	},
	Role: {
		user: mocks.roleUser,
	},
	Permission: {
		read: mocks.permissionRead,
		update: mocks.permissionUpdate,
		delete: mocks.permissionDelete,
	},
}));

import { MAX_PROFILES } from "../../core/constants/profile.constants";
import { profileService } from "./profile.service";
import {
	ProfileServiceError,
	type CreateProfileInput,
	type Profile,
	type ProfileRow,
	type UserPreferencesRow,
} from "./profile.types";

const validInput: CreateProfileInput = {
	name: "Diego",
	avatarId: "avatar-blue",
	isKids: false,
};

function createProfile(index = 1, overrides: Partial<Profile> = {}): Profile {
	return {
		id: `profile-${index}`,
		userId: "user-1",
		name: `Perfil ${index}`,
		avatarId: "avatar-blue",
		isKids: false,
		...overrides,
	};
}

function createProfileRow(
	overrides: Partial<ProfileRow> = {},
): ProfileRow {
	return {
		$id: "profile-1",
		$createdAt: "2026-06-01T10:00:00.000Z",
		$updatedAt: "2026-06-01T10:00:00.000Z",
		$permissions: [],
		$databaseId: DATABASE_ID,
		$tableId: PROFILES_TABLE_ID,
		$sequence: 1,
		userId: "user-1",
		name: "Diego",
		avatarId: "avatar-blue",
		isKids: false,
		...overrides,
	} as unknown as ProfileRow;
}

function createPreferencesRow(
	overrides: Partial<UserPreferencesRow> = {},
): UserPreferencesRow {
	return {
		$id: "user-1",
		$createdAt: "2026-06-01T10:00:00.000Z",
		$updatedAt: "2026-06-01T10:00:00.000Z",
		$permissions: [],
		$databaseId: DATABASE_ID,
		$tableId: USER_PREFERENCES_TABLE_ID,
		$sequence: 1,
		userId: "user-1",
		activeProfileId: "profile-1",
		...overrides,
	} as unknown as UserPreferencesRow;
}

function resetMocks(): void {
	mocks.getCurrentUser.mockReset();
	mocks.listRows.mockReset();
	mocks.getRow.mockReset();
	mocks.createRow.mockReset();
	mocks.updateRow.mockReset();

	mocks.idUnique.mockReset().mockReturnValue(GENERATED_PROFILE_ID);
	mocks.queryEqual.mockReset().mockReturnValue(USER_QUERY);
	mocks.roleUser.mockReset().mockReturnValue(USER_ROLE);
	mocks.permissionRead.mockReset().mockReturnValue(READ_PERMISSION);
	mocks.permissionUpdate
		.mockReset()
		.mockReturnValue(UPDATE_PERMISSION);
	mocks.permissionDelete
		.mockReset()
		.mockReturnValue(DELETE_PERMISSION);
}

describe("profileService", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		resetMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getCurrentUserId", () => {
		it("devuelve el id del usuario autenticado", async () => {
			mocks.getCurrentUser.mockResolvedValue({
				$id: "user-1",
			});

			await expect(profileService.getCurrentUserId()).resolves.toBe(
				"user-1",
			);
			expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);
		});
	});

	describe("getProfiles", () => {
		it("rechaza un userId vacío sin consultar TablesDB", async () => {
			await expect(profileService.getProfiles("   ")).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "invalid-user",
			});

			expect(mocks.listRows).not.toHaveBeenCalled();
		});

		it("consulta por userId, ordena por fecha de creación y mapea las filas", async () => {
			const firstRow = createProfileRow({
				$id: "profile-first",
				$createdAt: "2026-06-01T10:00:00.000Z",
				name: "Primero",
			});
			const secondRow = createProfileRow({
				$id: "profile-second",
				$createdAt: "2026-06-02T10:00:00.000Z",
				name: "Segundo",
				avatarId: "avatar-red",
				isKids: true,
			});

			mocks.listRows.mockResolvedValue({
				rows: [secondRow, firstRow],
				total: 2,
			});

			await expect(profileService.getProfiles("user-1")).resolves.toEqual([
				{
					id: "profile-first",
					userId: "user-1",
					name: "Primero",
					avatarId: "avatar-blue",
					isKids: false,
				},
				{
					id: "profile-second",
					userId: "user-1",
					name: "Segundo",
					avatarId: "avatar-red",
					isKids: true,
				},
			]);

			expect(mocks.queryEqual).toHaveBeenCalledWith("userId", ["user-1"]);
			expect(mocks.listRows).toHaveBeenCalledWith({
				databaseId: DATABASE_ID,
				tableId: PROFILES_TABLE_ID,
				queries: [USER_QUERY],
			});
		});
	});

	describe("createProfile", () => {
		it("rechaza nombres demasiado cortos después de normalizarlos", async () => {
			await expect(
				profileService.createProfile("user-1", {
					...validInput,
					name: " a ",
				}),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "invalid-name",
			});

			expect(mocks.listRows).not.toHaveBeenCalled();
			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("rechaza nombres que superan el máximo permitido", async () => {
			await expect(
				profileService.createProfile("user-1", {
					...validInput,
					name: "a".repeat(31),
				}),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "invalid-name",
			});

			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("rechaza un avatar no permitido", async () => {
			await expect(
				profileService.createProfile("user-1", {
					...validInput,
					avatarId: "avatar-inexistente",
				}),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "invalid-avatar",
			});

			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("rechaza un valor isKids que no sea booleano", async () => {
			await expect(
				profileService.createProfile("user-1", {
					...validInput,
					isKids: "true" as unknown as boolean,
				}),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "invalid-kids-value",
			});

			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("impide crear más perfiles cuando se alcanza el límite", async () => {
			vi.spyOn(profileService, "getProfiles").mockResolvedValue(
				Array.from({ length: MAX_PROFILES }, (_, index) =>
					createProfile(index + 1),
				),
			);

			await expect(
				profileService.createProfile("user-1", validInput),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "limit-reached",
			});

			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("normaliza el nombre, crea permisos privados y mapea el perfil", async () => {
			vi.spyOn(profileService, "getProfiles").mockResolvedValue([
				createProfile(),
			]);
			const setActiveProfileSpy = vi
				.spyOn(profileService, "setActiveProfile")
				.mockResolvedValue();
			const createdRow = createProfileRow({
				$id: GENERATED_PROFILE_ID,
				name: "Diego Kaiser",
				avatarId: "avatar-red",
				isKids: true,
			});

			mocks.createRow.mockResolvedValue(createdRow);

			await expect(
				profileService.createProfile("user-1", {
					name: "  Diego    Kaiser  ",
					avatarId: "avatar-red",
					isKids: true,
				}),
			).resolves.toEqual({
				id: GENERATED_PROFILE_ID,
				userId: "user-1",
				name: "Diego Kaiser",
				avatarId: "avatar-red",
				isKids: true,
			});

			expect(mocks.idUnique).toHaveBeenCalledTimes(1);
			expect(mocks.roleUser).toHaveBeenCalledTimes(3);
			expect(mocks.roleUser).toHaveBeenNthCalledWith(1, "user-1");
			expect(mocks.roleUser).toHaveBeenNthCalledWith(2, "user-1");
			expect(mocks.roleUser).toHaveBeenNthCalledWith(3, "user-1");
			expect(mocks.permissionRead).toHaveBeenCalledWith(USER_ROLE);
			expect(mocks.permissionUpdate).toHaveBeenCalledWith(USER_ROLE);
			expect(mocks.permissionDelete).toHaveBeenCalledWith(USER_ROLE);
			expect(mocks.createRow).toHaveBeenCalledWith({
				databaseId: DATABASE_ID,
				tableId: PROFILES_TABLE_ID,
				rowId: GENERATED_PROFILE_ID,
				data: {
					userId: "user-1",
					name: "Diego Kaiser",
					avatarId: "avatar-red",
					isKids: true,
				},
				permissions: [
					READ_PERMISSION,
					UPDATE_PERMISSION,
					DELETE_PERMISSION,
				],
			});
			expect(setActiveProfileSpy).not.toHaveBeenCalled();
		});

		it("activa automáticamente el primer perfil creado", async () => {
			vi.spyOn(profileService, "getProfiles").mockResolvedValue([]);
			const setActiveProfileSpy = vi
				.spyOn(profileService, "setActiveProfile")
				.mockResolvedValue();

			mocks.createRow.mockResolvedValue(
				createProfileRow({
					$id: GENERATED_PROFILE_ID,
				}),
			);

			await profileService.createProfile("user-1", validInput);

			expect(setActiveProfileSpy).toHaveBeenCalledTimes(1);
			expect(setActiveProfileSpy).toHaveBeenCalledWith(
				"user-1",
				GENERATED_PROFILE_ID,
			);
		});

		it("no activa automáticamente perfiles posteriores", async () => {
			vi.spyOn(profileService, "getProfiles").mockResolvedValue([
				createProfile(),
			]);
			const setActiveProfileSpy = vi
				.spyOn(profileService, "setActiveProfile")
				.mockResolvedValue();

			mocks.createRow.mockResolvedValue(
				createProfileRow({
					$id: GENERATED_PROFILE_ID,
				}),
			);

			await profileService.createProfile("user-1", validInput);

			expect(setActiveProfileSpy).not.toHaveBeenCalled();
		});
	});

	describe("getActiveProfile", () => {
		it("devuelve null cuando no existe la fila de preferencias", async () => {
			mocks.getRow.mockRejectedValue({ code: 404 });

			await expect(
				profileService.getActiveProfile("user-1"),
			).resolves.toBeNull();

			expect(mocks.getRow).toHaveBeenCalledTimes(1);
			expect(mocks.getRow).toHaveBeenCalledWith({
				databaseId: DATABASE_ID,
				tableId: USER_PREFERENCES_TABLE_ID,
				rowId: "user-1",
			});
		});

		it("devuelve null cuando no hay un perfil activo configurado", async () => {
			mocks.getRow.mockResolvedValue(
				createPreferencesRow({ activeProfileId: null }),
			);

			await expect(
				profileService.getActiveProfile("user-1"),
			).resolves.toBeNull();

			expect(mocks.getRow).toHaveBeenCalledTimes(1);
		});

		it("devuelve null cuando la referencia apunta a un perfil inexistente", async () => {
			mocks.getRow
				.mockResolvedValueOnce(createPreferencesRow())
				.mockRejectedValueOnce({ code: 404 });

			await expect(
				profileService.getActiveProfile("user-1"),
			).resolves.toBeNull();

			expect(mocks.getRow).toHaveBeenNthCalledWith(2, {
				databaseId: DATABASE_ID,
				tableId: PROFILES_TABLE_ID,
				rowId: "profile-1",
			});
		});

		it("mapea y devuelve el perfil activo del usuario", async () => {
			mocks.getRow
				.mockResolvedValueOnce(createPreferencesRow())
				.mockResolvedValueOnce(
					createProfileRow({
						$id: "profile-1",
						name: "Infantil",
						avatarId: "avatar-green",
						isKids: true,
					}),
				);

			await expect(
				profileService.getActiveProfile("user-1"),
			).resolves.toEqual({
				id: "profile-1",
				userId: "user-1",
				name: "Infantil",
				avatarId: "avatar-green",
				isKids: true,
			});
		});

		it("rechaza un perfil activo que pertenece a otro usuario", async () => {
			mocks.getRow
				.mockResolvedValueOnce(createPreferencesRow())
				.mockResolvedValueOnce(
					createProfileRow({
						userId: "other-user",
					}),
				);

			await expect(
				profileService.getActiveProfile("user-1"),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "profile-not-owned",
			});
		});

		it("propaga errores de preferencias distintos de 404", async () => {
			const error = Object.assign(new Error("TablesDB unavailable"), {
				code: 500,
			});

			mocks.getRow.mockRejectedValue(error);

			await expect(
				profileService.getActiveProfile("user-1"),
			).rejects.toBe(error);
		});
	});

	describe("setActiveProfile", () => {
		it("rechaza un perfil inexistente", async () => {
			mocks.getRow.mockRejectedValue({ code: 404 });

			await expect(
				profileService.setActiveProfile("user-1", "missing-profile"),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "profile-not-found",
			});

			expect(mocks.updateRow).not.toHaveBeenCalled();
			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("rechaza un perfil que pertenece a otro usuario", async () => {
			mocks.getRow.mockResolvedValue(
				createProfileRow({ userId: "other-user" }),
			);

			await expect(
				profileService.setActiveProfile("user-1", "profile-1"),
			).rejects.toMatchObject({
				name: "ProfileServiceError",
				code: "profile-not-owned",
			});

			expect(mocks.getRow).toHaveBeenCalledTimes(1);
			expect(mocks.updateRow).not.toHaveBeenCalled();
			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("actualiza las preferencias existentes", async () => {
			mocks.getRow
				.mockResolvedValueOnce(createProfileRow())
				.mockResolvedValueOnce(
					createPreferencesRow({
						$id: "preferences-row-1",
					}),
				);
			mocks.updateRow.mockResolvedValue(
				createPreferencesRow({
					$id: "preferences-row-1",
				}),
			);

			await expect(
				profileService.setActiveProfile("user-1", "profile-1"),
			).resolves.toBeUndefined();

			expect(mocks.updateRow).toHaveBeenCalledWith({
				databaseId: DATABASE_ID,
				tableId: USER_PREFERENCES_TABLE_ID,
				rowId: "preferences-row-1",
				data: {
					activeProfileId: "profile-1",
				},
			});
			expect(mocks.createRow).not.toHaveBeenCalled();
		});

		it("crea preferencias privadas cuando todavía no existen", async () => {
			mocks.getRow
				.mockResolvedValueOnce(createProfileRow())
				.mockRejectedValueOnce({ code: 404 });
			mocks.createRow.mockResolvedValue(createPreferencesRow());

			await expect(
				profileService.setActiveProfile("user-1", "profile-1"),
			).resolves.toBeUndefined();

			expect(mocks.createRow).toHaveBeenCalledWith({
				databaseId: DATABASE_ID,
				tableId: USER_PREFERENCES_TABLE_ID,
				rowId: "user-1",
				data: {
					userId: "user-1",
					activeProfileId: "profile-1",
				},
				permissions: [
					READ_PERMISSION,
					UPDATE_PERMISSION,
					DELETE_PERMISSION,
				],
			});
			expect(mocks.updateRow).not.toHaveBeenCalled();
		});

		it("propaga errores inesperados al consultar las preferencias", async () => {
			const error = Object.assign(new Error("Network error"), {
				code: 500,
			});

			mocks.getRow
				.mockResolvedValueOnce(createProfileRow())
				.mockRejectedValueOnce(error);

			await expect(
				profileService.setActiveProfile("user-1", "profile-1"),
			).rejects.toBe(error);

			expect(mocks.updateRow).not.toHaveBeenCalled();
			expect(mocks.createRow).not.toHaveBeenCalled();
		});
	});

	it("usa instancias de ProfileServiceError para los errores de dominio", async () => {
		let capturedError: unknown;

		try {
			await profileService.getProfiles("");
		} catch (error) {
			capturedError = error;
		}

		expect(capturedError).toBeInstanceOf(ProfileServiceError);
	});
});
