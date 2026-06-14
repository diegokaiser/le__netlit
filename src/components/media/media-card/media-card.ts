import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { buildTmdbImageUrl } from "../../../core/utils/build-tmdb-image-url";
import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import { createMediaSelectEvent } from "../media.events";

@customElement("media-card")
export class MediaCard extends LitElement {
	@property({ attribute: false })
	media?: MediaItem;

	@state()
	private imageFailed = false;

	static styles = css`
		:host {
			display: block;
			width: clamp(9rem, 20vw, 12rem);
			flex: 0 0 auto;
			color: #ffffff;
		}

		.card {
			display: block;
			width: 100%;
			padding: 0;
			overflow: hidden;
			color: inherit;
			text-align: left;
			background: transparent;
			border: 0;
			border-radius: 0.75rem;
			cursor: pointer;
		}

		.card:focus-visible {
			outline: 3px solid #ffffff;
			outline-offset: 4px;
		}

		.poster-wrapper {
			position: relative;
			overflow: hidden;
			aspect-ratio: 2 / 3;
			background: linear-gradient(145deg, #27272a, #111827);
			border-radius: 0.75rem;
		}

		.poster {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 180ms ease;
		}

		.card:hover .poster {
			transform: scale(1.035);
		}

		.fallback {
			display: grid;
			width: 100%;
			height: 100%;
			padding: 1rem;
			place-items: center;
			color: #d4d4d8;
			text-align: center;
			background: radial-gradient(circle at top, #3f3f46, #18181b 70%);
		}

		.details {
			display: grid;
			gap: 0.25rem;
			padding-top: 0.65rem;
		}

		.title {
			display: -webkit-box;
			min-height: 2.5em;
			margin: 0;
			overflow: hidden;
			font-size: 0.9rem;
			font-weight: 650;
			line-height: 1.25;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
		}

		.metadata {
			display: flex;
			gap: 0.75rem;
			align-items: center;
			min-height: 1.25rem;
			color: #a1a1aa;
			font-size: 0.78rem;
		}

		.rating {
			color: #facc15;
		}

		@media (prefers-reduced-motion: reduce) {
			.poster {
				transition: none;
			}

			.card:hover .poster {
				transform: none;
			}
		}
	`;

	protected willUpdate(changedProperties: PropertyValues<this>): void {
		if (changedProperties.has("media")) {
			this.imageFailed = false;
		}
	}

	protected render() {
		if (!this.media) {
			return nothing;
		}

		const posterUrl = buildTmdbImageUrl(this.media.posterPath, "w342");

		const year = this.getYear(this.media.releaseDate);
		const hasRating = this.media.voteAverage > 0;

		return html`
			<button
				class="card"
				type="button"
				aria-label=${`Seleccionar ${this.media.title}`}
				@click=${this.handleSelection}
			>
				<div class="poster-wrapper">
					${posterUrl && !this.imageFailed
						? html`
								<img
									class="poster"
									src=${posterUrl}
									alt=${`Póster de ${this.media.title}`}
									width="342"
									height="513"
									loading="lazy"
									decoding="async"
									@error=${this.handleImageError}
								/>
							`
						: html`
								<div
									class="fallback"
									role="img"
									aria-label=${`Póster no disponible para ${this.media.title}`}
								>
									<span>${this.media.title}</span>
								</div>
							`}
				</div>

				<div class="details">
					<p class="title">${this.media.title}</p>

					<div class="metadata">
						${year ? html`<span>${year}</span>` : nothing}
						${hasRating
							? html`
									<span
										class="rating"
										aria-label=${`Valoración ${this.media.voteAverage.toFixed(1)} de 10`}
									>
										★ ${this.media.voteAverage.toFixed(1)}
									</span>
								`
							: nothing}
					</div>
				</div>
			</button>
		`;
	}

	private handleSelection(): void {
		if (!this.media) {
			return;
		}

		this.dispatchEvent(createMediaSelectEvent(this.media));
	}

	private handleImageError(): void {
		this.imageFailed = true;
	}

	private getYear(releaseDate: string | undefined): string | null {
		if (!releaseDate) {
			return null;
		}

		const year = releaseDate.slice(0, 4);

		return /^\d{4}$/.test(year) ? year : null;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"media-card": MediaCard;
	}
}
