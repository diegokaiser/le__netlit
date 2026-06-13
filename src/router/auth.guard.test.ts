import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCurrentUser: vi.fn(),
}));

vi.mock("../services/auth/auth.service", () => ({
	authService: {
		getCurrentUser: mocks.getCurrentUser,
	},
}));

import {
	clearAuthenticatedUserCache,
	requireAuthenticatedUser,
	type AuthenticatedUser,
} from "./auth.guard";

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});

	return {
		promise,
		resolve,
		reject,
	};
}

function createAuthenticatedUser(
	overrides: Record<string, unknown> = {},
): AuthenticatedUser {
	return {
		$id: "user-1",
		email: "diego@example.com",
		name: "Diego",
		...overrides,
	} as unknown as AuthenticatedUser;
}

describe("auth.guard", () => {
	beforeEach(() => {
		clearAuthenticatedUserCache();
		mocks.getCurrentUser.mockReset();
	});

	afterEach(() => {
		clearAuthenticatedUserCache();
	});

	it("devuelve el usuario autenticado", async () => {
		const user = createAuthenticatedUser();

		mocks.getCurrentUser.mockResolvedValue(user);

		await expect(requireAuthenticatedUser()).resolves.toBe(user);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);
	});

	it("mantiene en caché el usuario autenticado para llamadas posteriores", async () => {
		const user = createAuthenticatedUser();

		mocks.getCurrentUser.mockResolvedValue(user);

		const firstResult = await requireAuthenticatedUser();
		const secondResult = await requireAuthenticatedUser();

		expect(firstResult).toBe(user);
		expect(secondResult).toBe(user);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);
	});

	it("reutiliza la misma promesa para llamadas concurrentes", async () => {
		const user = createAuthenticatedUser();
		const request = createDeferred<AuthenticatedUser>();

		mocks.getCurrentUser.mockReturnValue(request.promise);

		const firstRequest = requireAuthenticatedUser();
		const secondRequest = requireAuthenticatedUser();

		expect(firstRequest).toBe(secondRequest);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);

		request.resolve(user);

		await expect(firstRequest).resolves.toBe(user);
		await expect(secondRequest).resolves.toBe(user);
	});

	it("devuelve null ante un error 401 y limpia la caché", async () => {
		const user = createAuthenticatedUser();

		mocks.getCurrentUser
			.mockRejectedValueOnce({ code: 401 })
			.mockResolvedValueOnce(user);

		await expect(requireAuthenticatedUser()).resolves.toBeNull();
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);

		await expect(requireAuthenticatedUser()).resolves.toBe(user);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(2);
	});

	it("relanza errores distintos de 401 y limpia la caché", async () => {
		const error = Object.assign(new Error("Network error"), {
			code: 500,
		});
		const user = createAuthenticatedUser();

		mocks.getCurrentUser
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce(user);

		await expect(requireAuthenticatedUser()).rejects.toBe(error);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);

		await expect(requireAuthenticatedUser()).resolves.toBe(user);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(2);
	});

	it("no interpreta como 401 un código con un tipo diferente", async () => {
		const error = {
			code: "401",
			message: "Unauthorized",
		};

		mocks.getCurrentUser.mockRejectedValue(error);

		await expect(requireAuthenticatedUser()).rejects.toBe(error);
	});

	it("clearAuthenticatedUserCache fuerza una nueva consulta", async () => {
		const firstUser = createAuthenticatedUser({
			$id: "user-1",
			name: "Diego",
		});
		const secondUser = createAuthenticatedUser({
			$id: "user-2",
			name: "Emily",
		});

		mocks.getCurrentUser
			.mockResolvedValueOnce(firstUser)
			.mockResolvedValueOnce(secondUser);

		await expect(requireAuthenticatedUser()).resolves.toBe(firstUser);

		clearAuthenticatedUserCache();

		await expect(requireAuthenticatedUser()).resolves.toBe(secondUser);
		expect(mocks.getCurrentUser).toHaveBeenCalledTimes(2);
	});
});
