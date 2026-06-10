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
