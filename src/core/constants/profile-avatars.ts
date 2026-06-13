export type ProfileAvatar = {
	id: string;
	src: string;
	alt: string;
};

function getPublicAssetUrl(path: string): string {
	const normalizedPath = path.replace(/^\/+/, "");

	return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

export const PROFILE_AVATARS = [
	{
		id: "avatar-blue",
		src: getPublicAssetUrl("images/avatars/avatar-blue.svg"),
		alt: "Avatar azul",
	},
	{
		id: "avatar-red",
		src: getPublicAssetUrl("images/avatars/avatar-red.svg"),
		alt: "Avatar rojo",
	},
	{
		id: "avatar-green",
		src: getPublicAssetUrl("images/avatars/avatar-green.svg"),
		alt: "Avatar verde",
	},
	{
		id: "avatar-yellow",
		src: getPublicAssetUrl("images/avatars/avatar-yellow.svg"),
		alt: "Avatar amarillo",
	},
	{
		id: "avatar-purple",
		src: getPublicAssetUrl("images/avatars/avatar-purple.svg"),
		alt: "Avatar morado",
	},
] as const satisfies readonly ProfileAvatar[];

export type ProfileAvatarId = (typeof PROFILE_AVATARS)[number]["id"];

export const DEFAULT_PROFILE_AVATAR_ID: ProfileAvatarId = PROFILE_AVATARS[0].id;

export function isValidProfileAvatarId(
	avatarId: string,
): avatarId is ProfileAvatarId {
	return PROFILE_AVATARS.some((avatar) => avatar.id === avatarId);
}

export function getProfileAvatar(avatarId: string): ProfileAvatar | undefined {
	return PROFILE_AVATARS.find((avatar) => avatar.id === avatarId);
}
