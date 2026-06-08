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
