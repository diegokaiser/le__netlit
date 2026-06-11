import { ID } from "appwrite";
import type { LoginPayload, RegisterPayload } from "../auth/auth.types";
import { account } from "./appwrite.client";

<<<<<<< Updated upstream
=======
/*************/
/** NO USAR **/
/*************/

type RegisterParams = {
	email: string;
	password: string;
	name: string;
};

type LoginParams = {
	email: string;
	password: string;
};

>>>>>>> Stashed changes
export class AuthService {
	async register({ email, password, name }: RegisterPayload) {
		return account.create({
			userId: ID.unique(),
			email,
			password,
			name,
		});
	}

	async login({ email, password }: LoginPayload) {
		return account.createEmailPasswordSession({
			email,
			password,
		});
	}

	async getCurrentUser() {
		return account.get();
	}

	async logout() {
		return account.deleteSession({
			sessionId: "current",
		});
	}

	async sendVerification(url: string) {
		return account.createVerification({
			url,
		});
	}

	async confirmVerification(userId: string, secret: string) {
		return account.updateVerification({
			userId,
			secret,
		});
	}

	async forgotPassword(email: string, redirectUrl: string) {
		return account.createRecovery({
			email,
			url: redirectUrl,
		});
	}

	async createNewPassword(userId: string, secret: string, password: string) {
		return account.updateRecovery({
			userId,
			secret,
			password,
		});
	}
}

export const authService = new AuthService();
