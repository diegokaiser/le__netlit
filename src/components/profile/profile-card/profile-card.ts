import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
	DEFAULT_PROFILE_AVATAR_ID,
	getProfileAvatar,
} from "../../../core/constants/profile-avatars";
import type {
	Profile,
	ProfileSelectedDetail,
} from "../../../services/profile/profile.types";

@customElement("profile-card")
export class ProfileCard extends LitElement {
	@property({ attribute: false })
	profile?: Profile;

	@property({ type: Boolean })
	active = false;

	@property({ type: Boolean })
	disabled = false;

	@property({ type: Boolean })
	busy = false;

	static styles = css`
		:host {
			display: block;
			min-width: 0;
		}

		.profile-button {
			display: flex;
			width: 100%;
			flex-direction: column;
			align-items: center;
			gap: 0.75rem;
			border: 0;
			border-radius: 0.75rem;
			background: transparent;
			color: #d1d5db;
			cursor: pointer;
			font: inherit;
			padding: 0.5rem;
			transition:
				color 160ms ease,
				transform 160ms ease;
		}

		.profile-button:hover:not(:disabled) {
			color: #ffffff;
			transform: translateY(-2px);
		}

		.profile-button:focus-visible {
			outline: 3px solid #ffffff;
			outline-offset: 4px;
		}

		.profile-button:disabled {
			cursor: wait;
			opacity: 0.7;
		}

		.avatar-wrapper {
			position: relative;
			width: min(100%, 9rem);
			aspect-ratio: 1;
			border: 3px solid transparent;
			border-radius: 1rem;
			overflow: hidden;
			background: #262626;
			transition:
				border-color 160ms ease,
				box-shadow 160ms ease;
		}

		.profile-button:hover:not(:disabled) .avatar-wrapper {
			border-color: #d1d5db;
		}

		.profile-button[aria-pressed="true"] .avatar-wrapper {
			border-color: #e50914;
			box-shadow: 0 0 0 3px rgb(229 9 20 / 25%);
		}

		.avatar {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.active-indicator {
			position: absolute;
			right: 0.45rem;
			bottom: 0.45rem;
			display: grid;
			width: 1.75rem;
			height: 1.75rem;
			place-items: center;
			border: 2px solid #ffffff;
			border-radius: 999px;
			background: #e50914;
			color: #ffffff;
			font-size: 0.9rem;
			font-weight: 800;
		}

		.profile-name {
			max-width: 100%;
			overflow: hidden;
			font-size: 1rem;
			font-weight: 600;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.kids-label {
			border-radius: 999px;
			background: #404040;
			color: #f5f5f5;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			padding: 0.2rem 0.55rem;
			text-transform: uppercase;
		}

		.busy-label {
			color: #fca5a5;
			font-size: 0.78rem;
			font-weight: 600;
		}

		@media (min-width: 640px) {
			.profile-name {
				font-size: 1.1rem;
			}
		}
	`;

	private handleSelect(): void {
		if (!this.profile || this.disabled) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent<ProfileSelectedDetail>("profile-selected", {
				detail: {
					profileId: this.profile.id,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		if (!this.profile) {
			return nothing;
		}

		const avatar =
			getProfileAvatar(this.profile.avatarId) ??
			getProfileAvatar(DEFAULT_PROFILE_AVATAR_ID);

		if (!avatar) {
			return nothing;
		}

		return html`
			<button
				class="profile-button"
				type="button"
				aria-label=${`Seleccionar perfil ${this.profile.name}`}
				aria-pressed=${String(this.active)}
				aria-busy=${String(this.busy)}
				?disabled=${this.disabled}
				@click=${this.handleSelect}
			>
				<span class="avatar-wrapper">
					<img
						class="avatar"
						src=${avatar.src}
						alt=${avatar.alt}
						width="160"
						height="160"
					/>
				</span>

				<span class="profile-name"> ${this.profile.name} </span>

				${this.profile.isKids
					? html` <span class="kids-label"> Infantil </span> `
					: nothing}
				${this.busy
					? html` <span class="busy-label"> Seleccionando… </span> `
					: nothing}
			</button>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"profile-card": ProfileCard;
	}
}
