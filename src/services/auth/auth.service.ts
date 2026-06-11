import { ID, type Models } from "appwrite";
import { account } from "../appwrite/appwrite.client";
import type {
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

	async sendVerification(url: string): Promise<unknown> {
		const createVerification =
			this.verificationAccount.createVerification ??
			this.verificationAccount.createEmailVerification;

		if (!createVerification) {
			throw new Error("no hay metodo de creacion de verificacion");
		}

		return createVerification.call(this.verificationAccount, { url });
	},

	async confirmVerification(userId: string, secret: string): Promise<unknown> {
		const updateVerification =
			this.verificationAccount.updateVerification ??
			this.verificationAccount.updateEmailVerification;

		if (!updateVerification) {
			throw new Error("no hay metodo de confiormacion de verificacion");
		}

		return updateVerification.call(this.verificationAccount, {
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
};
