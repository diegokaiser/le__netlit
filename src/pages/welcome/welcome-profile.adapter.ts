import {
	DEFAULT_PROFILE_AVATAR_ID,
	getProfileAvatar,
} from "../../core/constants/profile-avatars";
import type { Profile } from "../../services/profile/profile.types";

export type WelcomeProfile = {
	id: string;
	name: string;
	avatarUrl: string;
	isKids: boolean;
};

export function toWelcomeProfile(profile: Profile): WelcomeProfile {
	const avatar =
		getProfileAvatar(profile.avatarId) ??
		getProfileAvatar(DEFAULT_PROFILE_AVATAR_ID);

	return {
		id: profile.id,
		name: profile.name,
		avatarUrl: avatar?.src ?? "",
		isKids: profile.isKids,
	};
}
