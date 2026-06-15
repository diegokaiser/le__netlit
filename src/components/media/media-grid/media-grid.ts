import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import type { MediaItem } from "../../../services/tmdb/tmdb.types";

import "../media-card/media-card";

@customElement("media-grid")
export class MediaGrid extends LitElement {
	@property({ attribute: false })
	items: readonly MediaItem[] = [];

	@property({ type: String })
	label = "Contenido";

	static styles = css`
		:host {
			display: block;
			color: #ffffff;
		}

		ul {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: clamp(1rem, 2vw, 1.5rem);
			padding: 0;
			margin: 0;
			list-style: none;
		}

		li {
			min-width: 0;
		}

		media-card {
			--media-card-width: 100%;
		}

		@media (max-width: 22rem) {
			ul {
				grid-template-columns: minmax(0, 1fr);
			}
		}

		@media (min-width: 40rem) {
			ul {
				grid-template-columns: repeat(3, minmax(0, 1fr));
			}
		}

		@media (min-width: 48rem) {
			ul {
				grid-template-columns: repeat(4, minmax(0, 1fr));
			}
		}

		@media (min-width: 64rem) {
			ul {
				grid-template-columns: repeat(5, minmax(0, 1fr));
			}
		}

		@media (min-width: 80rem) {
			ul {
				grid-template-columns: repeat(6, minmax(0, 1fr));
			}
		}
	`;

	protected render() {
		return html`
			<ul aria-label=${this.label}>
				${repeat(
					this.items,
					(media) => `${media.mediaType}-${media.id}`,
					(media) => html`
						<li>
							<media-card .media=${media}></media-card>
						</li>
					`,
				)}
			</ul>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"media-grid": MediaGrid;
	}
}
