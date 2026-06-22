import { html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import { buildTmdbImageUrl } from "../../../core/utils/build-tmdb-image-url";
import {
	formatReleaseDate,
	formatRuntime,
	formatVoteAverage,
} from "../../../core/utils/media-detail-formatters";
import type { EpisodeDetail } from "../../../services/tmdb/tmdb.types";

const IMAGE_PLACEHOLDER_PATH = "/images/media-placeholder.svg";

@customElement("app-episode-card")
export class EpisodeCard extends LitElement {
	@property({ attribute: false })
	episode?: EpisodeDetail;

	protected createRenderRoot(): HTMLElement {
		return this;
	}

	protected render(): TemplateResult | typeof nothing {
		if (!this.episode) {
			return nothing;
		}

		const episode = this.episode;
		const stillUrl =
			buildTmdbImageUrl(episode.stillPath, "w500") ?? IMAGE_PLACEHOLDER_PATH;

		const releaseDate = formatReleaseDate(episode.airDate);
		const runtime = formatRuntime(episode.runtime);
		const voteAverage =
			(episode.voteAverage ?? 0) > 0
				? formatVoteAverage(episode.voteAverage)
				: null;

		return html`
			<article
				class="grid overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-lg shadow-black/20 md:grid-cols-[minmax(12rem,20rem)_minmax(0,1fr)]"
				aria-labelledby=${`episode-${episode.id}-title`}
			>
				<img
					class="aspect-video h-full w-full bg-neutral-800 object-cover"
					src=${stillUrl}
					alt=${episode.stillPath
						? `Escena del episodio ${episode.episodeNumber}: ${episode.name}`
						: `Imagen no disponible para el episodio ${episode.episodeNumber}: ${episode.name}`}
					width="500"
					height="281"
					loading="lazy"
					decoding="async"
				/>

				<div class="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
					<header>
						<p
							class="text-sm font-semibold uppercase tracking-[0.16em] text-red-400"
						>
							Episodio ${episode.episodeNumber}
						</p>

						<h3
							id=${`episode-${episode.id}-title`}
							class="mt-2 text-xl font-bold text-white sm:text-2xl"
						>
							${episode.name}
						</h3>
					</header>

					${this.renderMetadata(runtime, releaseDate, voteAverage)}

					<p
						class="text-sm leading-6 text-neutral-300 sm:text-base sm:leading-7"
					>
						${episode.overview || "Sinopsis no disponible."}
					</p>
				</div>
			</article>
		`;
	}

	private renderMetadata(
		runtime: string | null,
		releaseDate: string | null,
		voteAverage: string | null,
	): TemplateResult | typeof nothing {
		if (!runtime && !releaseDate && !voteAverage) {
			return nothing;
		}

		return html`
			<dl
				class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-300"
				aria-label="Información del episodio"
			>
				${runtime
					? html`
							<div class="flex gap-1">
								<dt class="font-semibold text-neutral-100">Duración:</dt>
								<dd>${runtime}</dd>
							</div>
						`
					: nothing}
				${releaseDate
					? html`
							<div class="flex gap-1">
								<dt class="font-semibold text-neutral-100">Estreno:</dt>
								<dd>${releaseDate}</dd>
							</div>
						`
					: nothing}
				${voteAverage
					? html`
							<div class="flex gap-1">
								<dt class="font-semibold text-neutral-100">Valoración:</dt>
								<dd>${voteAverage}</dd>
							</div>
						`
					: nothing}
			</dl>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"app-episode-card": EpisodeCard;
	}
}
