import { ID, type Models } from "appwrite";
import { account } from "../appwrite/appwrite.client";
import type {
	EmailOTPSessionResult,
	EmailOTPTokenPayload,
	LoginPayload,
	RegisterPayload,
	RegisterResult,
} from "./auth.types";

export const authService = {
	async register(payload: RegisterPayload): Promise<RegisterResult> {
		const user = await account.create({
			userId: ID.unique(),
			email: payload.email,
			password: payload.password,
			name: payload.name,
		});

		return {
			id: user.$id,
			name: user.name,
			email: user.email,
		};
	},

	async login(payload: LoginPayload): Promise<Models.Session> {
		return account.createEmailPasswordSession({
			email: payload.email,
			password: payload.password,
		});
	},

	async getCurrentUser() {
		return account.get();
	},

	async logout() {
		return account.deleteSession({ sessionId: "current" });
	},

	async sendVerification(url: string): Promise<unknown> {
		return account.createVerification({
			url,
		});
	},

	async confirmVerification(userId: string, secret: string): Promise<unknown> {
		return account.updateVerification({
			userId,
			secret,
		});
	},

	async forgotPassword(email: string, redirectUrl: string): Promise<unknown> {
		return account.createRecovery({
			email,
			url: redirectUrl,
		});
	},

	async createNewPassword(userId: string, secret: string, newPassword: string) {
		return account.updateRecovery({
			userId,
			secret,
			password: newPassword,
		});
	},

	async createEmailOtp(email: string): Promise<EmailOTPTokenPayload> {
		const token = await account.createEmailToken({
			userId: ID.unique(),
			email,
			phrase: false,
		});

		const tokenWithOptionalPhrase = token as typeof token & {
			phrase?: string;
		};

		return {
			userId: token.userId,
			phrase: tokenWithOptionalPhrase.phrase,
		};
	},

	async verifyEmailOtp(
		userId: string,
		secret: string,
	): Promise<EmailOTPSessionResult> {
		return account.createSession({
			userId,
			secret,
		});
	},
};
