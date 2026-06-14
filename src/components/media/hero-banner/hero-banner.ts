import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { buildTmdbImageUrl } from "../../../core/utils/build-tmdb-image-url";
import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import { createMediaSelectEvent } from "../media.events";

@customElement("hero-banner")
export class HeroBanner extends LitElement {
	@property({ attribute: false })
	media?: MediaItem;

	@state()
	private imageFailed = false;

	static styles = css`
		:host {
			display: block;
			color: #ffffff;
		}

		.hero {
			position: relative;
			display: grid;
			min-height: clamp(25rem, 65vh, 47rem);
			overflow: hidden;
			align-items: end;
			isolation: isolate;
			background: radial-gradient(circle at 70% 30%, #27272a, #09090b 70%);
		}

		.backdrop {
			position: absolute;
			z-index: -3;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.overlay {
			position: absolute;
			z-index: -2;
			inset: 0;
			background:
				linear-gradient(
					90deg,
					rgba(9, 9, 11, 0.98) 0%,
					rgba(9, 9, 11, 0.8) 38%,
					rgba(9, 9, 11, 0.24) 70%,
					rgba(9, 9, 11, 0.15) 100%
				),
				linear-gradient(
					0deg,
					#09090b 0%,
					rgba(9, 9, 11, 0.25) 45%,
					rgba(9, 9, 11, 0.25) 100%
				);
		}

		.content {
			display: grid;
			gap: 1rem;
			width: min(42rem, 100%);
			padding: clamp(6rem, 15vh, 10rem) clamp(1rem, 4vw, 3.5rem)
				clamp(3rem, 8vh, 6rem);
		}

		h2 {
			margin: 0;
			overflow-wrap: anywhere;
			font-size: clamp(2.25rem, 7vw, 5.75rem);
			line-height: 0.95;
			text-wrap: balance;
		}

		.metadata {
			display: flex;
			flex-wrap: wrap;
			gap: 1rem;
			color: #e4e4e7;
			font-weight: 600;
		}

		.rating {
			color: #fde047;
		}

		.overview {
			display: -webkit-box;
			max-width: 62ch;
			margin: 0;
			overflow: hidden;
			color: #e4e4e7;
			font-size: clamp(1rem, 1.5vw, 1.15rem);
			line-height: 1.6;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 4;
		}

		.cta {
			justify-self: start;
			min-height: 2.75rem;
			padding: 0.75rem 1.25rem;
			color: #18181b;
			font: inherit;
			font-weight: 700;
			background: #ffffff;
			border: 0;
			border-radius: 0.45rem;
			cursor: pointer;
		}

		.cta:hover {
			background: #e4e4e7;
		}

		.cta:focus-visible {
			outline: 3px solid #ef4444;
			outline-offset: 3px;
		}

		@media (max-width: 640px) {
			.hero {
				min-height: 32rem;
			}

			.content {
				padding-top: 8rem;
			}

			.overview {
				-webkit-line-clamp: 3;
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

		const backdropUrl = buildTmdbImageUrl(this.media.backdropPath, "w1280");

		const year = this.getYear(this.media.releaseDate);

		return html`
			<section class="hero" aria-labelledby="hero-title">
				${backdropUrl && !this.imageFailed
					? html`
							<img
								class="backdrop"
								src=${backdropUrl}
								alt=${`Imagen destacada de ${this.media.title}`}
								width="1280"
								height="720"
								decoding="async"
								fetchpriority="high"
								@error=${this.handleImageError}
							/>
						`
					: nothing}

				<div class="overlay" aria-hidden="true"></div>

				<div class="content">
					<h2 id="hero-title">${this.media.title}</h2>

					<div class="metadata">
						${year ? html`<span>${year}</span>` : nothing}
						${this.media.voteAverage > 0
							? html`
									<span
										class="rating"
										aria-label=${`Valoración ${this.media.voteAverage.toFixed(1)} de 10`}
									>
										★ ${this.media.voteAverage.toFixed(1)}
									</span>
								`
							: nothing}

						<span>
							${this.media.mediaType === "movie" ? "Película" : "Serie"}
						</span>
					</div>

					<p class="overview">
						${this.media.overview ||
						"La sinopsis de este contenido todavía no está disponible."}
					</p>

					<button class="cta" type="button" @click=${this.handleSelection}>
						Más información
					</button>
				</div>
			</section>
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
		"hero-banner": HeroBanner;
	}
}
