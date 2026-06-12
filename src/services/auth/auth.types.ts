import type { Models } from "appwrite";
import type { account } from "../appwrite/appwrite.client";

export type RegisterPayload = {
	name: string;
	email: string;
	password: string;
};

export type RegisterResult = {
	id: string;
	name: string;
	email: string;
};

export type LoginPayload = {
	email: string;
	password: string;
};

export type AuthStatus = "idle" | "loading" | "success" | "error";

export type LoginFormErrors = {
	email?: string;
	password?: string;
};

export type CreateVerificationPayload = {
	url: string;
};

export type UpdateVerificationPayload = {
	userId: string;
	secret: string;
};

export type VerificationPayload = typeof account & {
	createVerification?: (params: CreateVerificationPayload) => Promise<unknown>;
	updateVerification?: (params: UpdateVerificationPayload) => Promise<unknown>;
	createEmailVerification?: (
		params: CreateVerificationPayload,
	) => Promise<unknown>;
	updateEmailVerification?: (
		params: UpdateVerificationPayload,
	) => Promise<unknown>;
};

export type EmailOTPTokenPayload = {
	userId: string;
	phrase: string;
};

export type EmailOTPSessionResult = Models.Session;
