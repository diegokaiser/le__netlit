import { createContext } from "@lit/context";

import type { Profile } from "../../services/profile/profile.types";

export type ActiveProfileContextValue = Profile | null | undefined;

export const activeProfileContext = createContext<ActiveProfileContextValue>(
	Symbol("active-profile-context"),
);

export const ACTIVE_PROFILE_CHANGED_EVENT = "active-profile-changed";

export type ActiveProfileChangedDetail = {
	profile: Profile | null;
};

export type ActiveProfileChangedEvent = CustomEvent<ActiveProfileChangedDetail>;

export function createActiveProfileChangedEvent(
	profile: Profile | null,
): ActiveProfileChangedEvent {
	return new CustomEvent<ActiveProfileChangedDetail>(
		ACTIVE_PROFILE_CHANGED_EVENT,
		{
			detail: {
				profile,
			},
			bubbles: true,
			composed: true,
		},
	);
}

declare global {
	interface GlobalEventHandlersEventMap {
		"active-profile-changed": ActiveProfileChangedEvent;
	}
}
