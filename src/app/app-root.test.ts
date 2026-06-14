import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	initRouter: vi.fn(),
}));

vi.mock("./app-router", () => ({
	initRouter: mocks.initRouter,
}));

import {
	activeProfileContext,
	createActiveProfileChangedEvent,
	type ActiveProfileContextValue,
} from "../core/context/active-profile.context";
import type { Profile } from "../services/profile/profile.types";
import "./app-root";
import type { AppRoot } from "./app-root";

const APP_ROOT_TAG = "app-root";
const TEST_CONSUMER_TAG = "active-profile-test-consumer";

class ActiveProfileTestConsumer extends LitElement {
	@consume({
		context: activeProfileContext,
		subscribe: true,
	})
	@property({
		attribute: false,
	})
	value: ActiveProfileContextValue = undefined;

	protected render() {
		const state =
			this.value === undefined
				? "undefined"
				: this.value === null
					? "null"
					: this.value.id;

		return html` <output data-context-state=${state}> ${state} </output> `;
	}
}

if (!customElements.get(TEST_CONSUMER_TAG)) {
	customElements.define(TEST_CONSUMER_TAG, ActiveProfileTestConsumer);
}

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

function getRequiredElement<T extends Element>(
	root: ParentNode,
	selector: string,
): T {
	const element = root.querySelector<T>(selector);

	expect(
		element,
		`Expected element with selector "${selector}" to exist`,
	).not.toBeNull();

	return element as T;
}

async function renderAppRoot(): Promise<AppRoot> {
	const element = document.createElement(APP_ROOT_TAG) as AppRoot;

	document.body.appendChild(element);

	await element.updateComplete;

	return element;
}

async function appendContextConsumer(
	outlet: HTMLElement,
): Promise<ActiveProfileTestConsumer> {
	const consumer = document.createElement(
		TEST_CONSUMER_TAG,
	) as ActiveProfileTestConsumer;

	outlet.appendChild(consumer);

	await consumer.updateComplete;

	return consumer;
}

function getConsumerState(consumer: ActiveProfileTestConsumer): string {
	expect(consumer.shadowRoot).not.toBeNull();

	const output = getRequiredElement<HTMLOutputElement>(
		consumer.shadowRoot as ShadowRoot,
		"output",
	);

	return output.textContent?.trim() ?? "";
}

async function waitForContextPropagation(
	appRoot: AppRoot,
	consumer: ActiveProfileTestConsumer,
): Promise<void> {
	await appRoot.updateComplete;
	await Promise.resolve();
	await consumer.updateComplete;
}

function resetMocks(): void {
	mocks.initRouter.mockReset();
}

describe("AppRoot active profile provider", () => {
	beforeEach(() => {
		resetMocks();
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("registra el custom element", () => {
		expect(customElements.get(APP_ROOT_TAG)).toBeDefined();
	});

	it("usa Light DOM", async () => {
		const element = await renderAppRoot();

		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector("#router-outlet")).not.toBeNull();
	});

	it("inicializa el router con el outlet renderizado", async () => {
		const element = await renderAppRoot();

		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");

		expect(mocks.initRouter).toHaveBeenCalledTimes(1);
		expect(mocks.initRouter).toHaveBeenCalledWith(outlet);
	});

	it("proporciona undefined mientras el perfil todavía no está resuelto", async () => {
		const element = await renderAppRoot();
		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");
		const consumer = await appendContextConsumer(outlet);

		expect(consumer.value).toBeUndefined();
		expect(getConsumerState(consumer)).toBe("undefined");
	});

	it("proporciona el perfil cuando cambia la propiedad pública", async () => {
		const element = await renderAppRoot();
		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");
		const consumer = await appendContextConsumer(outlet);
		const profile = createProfile();

		element.activeProfile = profile;

		await waitForContextPropagation(element, consumer);

		expect(consumer.value).toEqual(profile);
		expect(getConsumerState(consumer)).toBe("profile-1");
	});

	it("actualiza el provider al recibir active-profile-changed desde el outlet", async () => {
		const element = await renderAppRoot();
		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");
		const consumer = await appendContextConsumer(outlet);
		const profile = createProfile({
			id: "profile-selected",
			name: "Perfil seleccionado",
		});

		consumer.dispatchEvent(createActiveProfileChangedEvent(profile));

		await waitForContextPropagation(element, consumer);

		expect(consumer.value).toEqual(profile);
		expect(getConsumerState(consumer)).toBe("profile-selected");
	});

	it("diferencia null de undefined cuando se elimina el perfil activo", async () => {
		const element = await renderAppRoot();
		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");
		const consumer = await appendContextConsumer(outlet);

		consumer.dispatchEvent(createActiveProfileChangedEvent(createProfile()));

		await waitForContextPropagation(element, consumer);

		expect(consumer.value).toMatchObject({
			id: "profile-1",
		});

		consumer.dispatchEvent(createActiveProfileChangedEvent(null));

		await waitForContextPropagation(element, consumer);

		expect(consumer.value).toBeNull();
		expect(getConsumerState(consumer)).toBe("null");
	});

	it("notifica al consumidor cuando se selecciona otro perfil", async () => {
		const element = await renderAppRoot();
		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");
		const consumer = await appendContextConsumer(outlet);

		const firstProfile = createProfile({
			id: "profile-1",
			name: "Primer perfil",
		});
		const secondProfile = createProfile({
			id: "profile-2",
			name: "Segundo perfil",
			avatarId: "avatar-red",
		});

		consumer.dispatchEvent(createActiveProfileChangedEvent(firstProfile));

		await waitForContextPropagation(element, consumer);

		expect(consumer.value).toEqual(firstProfile);
		expect(getConsumerState(consumer)).toBe("profile-1");

		consumer.dispatchEvent(createActiveProfileChangedEvent(secondProfile));

		await waitForContextPropagation(element, consumer);

		expect(consumer.value).toEqual(secondProfile);
		expect(getConsumerState(consumer)).toBe("profile-2");
	});

	it("mantiene una única inicialización del router al actualizar el contexto", async () => {
		const element = await renderAppRoot();
		const outlet = getRequiredElement<HTMLElement>(element, "#router-outlet");
		const consumer = await appendContextConsumer(outlet);

		consumer.dispatchEvent(createActiveProfileChangedEvent(createProfile()));

		await waitForContextPropagation(element, consumer);

		consumer.dispatchEvent(
			createActiveProfileChangedEvent(
				createProfile({
					id: "profile-2",
				}),
			),
		);

		await waitForContextPropagation(element, consumer);

		expect(mocks.initRouter).toHaveBeenCalledTimes(1);
	});
});
