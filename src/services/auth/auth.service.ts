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
};
