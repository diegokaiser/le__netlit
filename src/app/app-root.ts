import { provide } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import {
	activeProfileContext,
	type ActiveProfileChangedEvent,
	type ActiveProfileContextValue,
} from "../core/context/active-profile.context";
import { initRouter } from "./app-router";

@customElement("app-root")
export class AppRoot extends LitElement {
	@provide({
		context: activeProfileContext,
	})
	@property({
		attribute: false,
	})
	activeProfile: ActiveProfileContextValue = undefined;

	@query("#router-outlet")
	private routerOutlet!: HTMLElement;

	protected createRenderRoot() {
		return this;
	}

	firstUpdated(): void {
		initRouter(this.routerOutlet);
	}

	private handleActiveProfileChanged(event: ActiveProfileChangedEvent): void {
		this.activeProfile = event.detail.profile;
	}

	render() {
		return html`
			<div
				id="router-outlet"
				@active-profile-changed=${this.handleActiveProfileChanged}
			></div>
		`;
	}
}
