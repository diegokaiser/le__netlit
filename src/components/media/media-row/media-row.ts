import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { MediaItem } from "../../../services/tmdb/tmdb.types";
import "../media-card/media-card";

@customElement("media-row")
export class MediaRow extends LitElement {
	@property({ type: String })
	title = "";

	@property({ attribute: false })
	items: readonly MediaItem[] = [];

	static styles = css`
		:host {
			display: block;
			color: #ffffff;
		}

		.section {
			display: grid;
			gap: 0.9rem;
		}

		h2 {
			margin: 0;
			padding-inline: clamp(1rem, 4vw, 3.5rem);
			font-size: clamp(1.1rem, 2vw, 1.5rem);
			line-height: 1.2;
		}

		.scroll-region {
			overflow-x: auto;
			padding: 0.25rem clamp(1rem, 4vw, 3.5rem) 1rem;
			scroll-behavior: smooth;
			scrollbar-color: #52525b transparent;
			scrollbar-width: thin;
			overscroll-behavior-inline: contain;
		}

		.scroll-region:focus-visible {
			outline: 3px solid #ffffff;
			outline-offset: -3px;
		}

		ul {
			display: flex;
			gap: clamp(0.75rem, 1.5vw, 1.1rem);
			width: max-content;
			padding: 0;
			margin: 0;
			list-style: none;
		}

		.empty {
			padding-inline: clamp(1rem, 4vw, 3.5rem);
			margin: 0;
			color: #a1a1aa;
		}

		@media (prefers-reduced-motion: reduce) {
			.scroll-region {
				scroll-behavior: auto;
			}
		}
	`;

	protected render() {
		return html`
			<section class="section" aria-labelledby="row-title">
				<h2 id="row-title">${this.title}</h2>

				${this.items.length > 0
					? html`
							<div
								class="scroll-region"
								tabindex="0"
								role="region"
								aria-label=${`${this.title}. Lista desplazable horizontalmente`}
								@keydown=${this.handleKeydown}
							>
								<ul role="list">
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
							</div>
						`
					: html`
							<p class="empty">No hay contenido disponible en esta sección.</p>
						`}
			</section>
		`;
	}

	private handleKeydown(event: KeyboardEvent): void {
		const scrollRegion = event.currentTarget;

		if (!(scrollRegion instanceof HTMLElement)) {
			return;
		}

		const distance = Math.max(240, Math.round(scrollRegion.clientWidth * 0.8));

		if (event.key === "ArrowRight") {
			event.preventDefault();
			scrollRegion.scrollBy({
				left: distance,
				behavior: this.getScrollBehavior(),
			});
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			scrollRegion.scrollBy({
				left: -distance,
				behavior: this.getScrollBehavior(),
			});
		}

		if (event.key === "Home") {
			event.preventDefault();
			scrollRegion.scrollTo({
				left: 0,
				behavior: this.getScrollBehavior(),
			});
		}

		if (event.key === "End") {
			event.preventDefault();
			scrollRegion.scrollTo({
				left: scrollRegion.scrollWidth,
				behavior: this.getScrollBehavior(),
			});
		}
	}

	private getScrollBehavior(): ScrollBehavior {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? "auto"
			: "smooth";
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"media-row": MediaRow;
	}
}
