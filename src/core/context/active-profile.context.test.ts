import { afterEach, describe, expect, it, vi } from "vitest";

import type { Profile } from "../../services/profile/profile.types";
import {
	ACTIVE_PROFILE_CHANGED_EVENT,
	createActiveProfileChangedEvent,
	type ActiveProfileContextValue,
} from "./active-profile.context";

function createProfile(overrides: Partial<Profile> = {}): Profile {
	return {
		id: "profile-1",
		userId: "user-1",
		name: "Diego",
		avatarId: "avatar-blue",
		isKids: false,
		...overrides,
	};
}

describe("active-profile.context", () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("representa un perfil todavía no resuelto mediante undefined", () => {
		const value: ActiveProfileContextValue = undefined;

		expect(value).toBeUndefined();
	});

	it("representa la ausencia de perfil activo mediante null", () => {
		const value: ActiveProfileContextValue = null;

		expect(value).toBeNull();
	});

	it("representa un perfil activo mediante Profile", () => {
		const profile = createProfile();
		const value: ActiveProfileContextValue = profile;

		expect(value).toEqual(profile);
	});

	it("crea el evento con el perfil seleccionado", () => {
		const profile = createProfile();

		const event = createActiveProfileChangedEvent(profile);

		expect(event).toBeInstanceOf(CustomEvent);
		expect(event.type).toBe(ACTIVE_PROFILE_CHANGED_EVENT);
		expect(event.detail).toEqual({
			profile,
		});
		expect(event.detail.profile).toBe(profile);
	});

	it("permite comunicar que no existe un perfil activo", () => {
		const event = createActiveProfileChangedEvent(null);

		expect(event.type).toBe(ACTIVE_PROFILE_CHANGED_EVENT);
		expect(event.detail).toEqual({
			profile: null,
		});
	});

	it("crea un evento que atraviesa los límites de los componentes", () => {
		const event = createActiveProfileChangedEvent(createProfile());

		expect(event.bubbles).toBe(true);
		expect(event.composed).toBe(true);
		expect(event.cancelable).toBe(false);
	});

	it("crea una nueva instancia en cada llamada", () => {
		const profile = createProfile();

		const firstEvent = createActiveProfileChangedEvent(profile);
		const secondEvent = createActiveProfileChangedEvent(profile);

		expect(firstEvent).not.toBe(secondEvent);
		expect(firstEvent.detail).not.toBe(secondEvent.detail);
		expect(firstEvent.detail.profile).toBe(profile);
		expect(secondEvent.detail.profile).toBe(profile);
	});
});
