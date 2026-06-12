import { authService } from "../services/auth/auth.service";

export type AuthenticatedUser = Awaited<
	ReturnType<typeof authService.getCurrentUser>
>;

let authenticatedUserRequest: Promise<AuthenticatedUser | null> | null = null;

function isUnauthorizedError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	if (!("code" in error)) {
		return false;
	}

	return (error as { code?: unknown }).code === 401;
}

async function loadAuthenticatedUser(): Promise<AuthenticatedUser | null> {
	try {
		return await authService.getCurrentUser();
	} catch (error) {
		if (isUnauthorizedError(error)) {
			return null;
		}

		throw error;
	}
}

export function requireAuthenticatedUser(): Promise<AuthenticatedUser | null> {
	if (!authenticatedUserRequest) {
		authenticatedUserRequest = loadAuthenticatedUser()
			.then((user) => {
				if (!user) {
					authenticatedUserRequest = null;
				}

				return user;
			})
			.catch((error: unknown) => {
				authenticatedUserRequest = null;
				throw error;
			});
	}

	return authenticatedUserRequest;
}

export function clearAuthenticatedUserCache(): void {
	authenticatedUserRequest = null;
}
