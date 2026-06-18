import type { BeforeEnterObserver, RouterLocation } from "@vaadin/router";
import type { TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import "../../components/layout/app-navbar/app-navbar";

import {
	buildSeasonDetailPath,
	validateMediaRoute,
} from "../../core/routing/media-routes";
import { buildTmdbImageUrl } from "../../core/utils/build-tmdb-image-url";
import {
	formatEpisodeCount,
	formatRuntime,
	formatSeasonCount,
	formatVoteAverage,
	formatVoteCount,
	getReleaseYear,
} from "../../core/utils/media-detail-formatters";
import {
	isAbortError,
	isTmdbMediaNotFoundError,
} from "../../services/tmdb/tmdb-media.errors";
import { tmdbMediaService } from "../../services/tmdb/tmdb-media.service";
import type {
	MediaCastMember,
	MediaDetail,
	MediaSeasonSummary,
	MediaType,
} from "../../services/tmdb/tmdb.types";

type MediaDetailStatus =
	| "idle"
	| "loading"
	| "ready"
	| "not-found"
	| "invalid-route"
	| "error";

type ActiveMediaRoute = Readonly<{
	mediaType: MediaType;
	mediaId: number;
}>;

const IMAGE_PLACEHOLDER_PATH = "/images/media-placeholder.svg";

@customElement("app-media-detail-page")
export class MediaDetailPage extends LitElement implements BeforeEnterObserver {
	@state()
	private status: MediaDetailStatus = "idle";

	@state()
	private detail: MediaDetail | null = null;

	@state()
	private activeRoute: ActiveMediaRoute | null = null;

	private activeRequestId = 0;

	private activeAbortController: AbortController | null = null;

	protected createRenderRoot(): HTMLElement {
		return this;
	}

	onBeforeEnter(location: RouterLocation): void {
		const routeValidation = validateMediaRoute(
			location.params.mediaType,
			location.params.mediaId,
		);

		if (!routeValidation.valid) {
			this.invalidateActiveRequest();
			this.activeRoute = null;
			this.detail = null;
			this.status = "invalid-route";
			document.title = "Ruta no válida | Nexlit";
			return;
		}

		const nextRoute = routeValidation.value;

		this.activeRoute = nextRoute;
		void this.loadMediaDetail(nextRoute, false);
	}

	disconnectedCallback(): void {
		this.invalidateActiveRequest();
		super.disconnectedCallback();
	}

	protected render(): TemplateResult {
		return html`
			<header class="relative z-50">
				<app-navbar></app-navbar>
			</header>

			<main class="min-h-screen bg-neutral-950 pt-20 text-white">
				${this.renderCurrentState()}
			</main>
		`;
	}

	private renderCurrentState(): TemplateResult {
		switch (this.status) {
			case "idle":
			case "loading":
				return this.renderLoading();

			case "ready":
				return this.detail
					? this.renderDetail(this.detail)
					: this.renderError();

			case "invalid-route":
				return this.renderInvalidRoute();

			case "not-found":
				return this.renderNotFound();

			case "error":
			default:
				return this.renderError();
		}
	}

	private renderLoading(): TemplateResult {
		return html`
			<section
				class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
				aria-live="polite"
				aria-busy="true"
			>
				<p class="sr-only">Cargando información del contenido.</p>

				<div
					class="motion-safe:animate-pulse motion-reduce:animate-none"
					aria-hidden="true"
				>
					<div
						class="h-[38vh] min-h-72 rounded-2xl bg-neutral-800
                   sm:h-[46vh] lg:h-[56vh]"
					></div>

					<div
						class="-mt-24 grid gap-6 px-3 sm:px-8
                   lg:grid-cols-[15rem_minmax(0,1fr)]"
					>
						<div
							class="aspect-[2/3] w-36 rounded-xl bg-neutral-700
                     sm:w-48 lg:w-60"
						></div>

						<div class="space-y-4 pt-10 lg:pt-28">
							<div class="h-10 w-4/5 rounded bg-neutral-700"></div>
							<div class="h-5 w-2/5 rounded bg-neutral-800"></div>
							<div class="h-4 w-full rounded bg-neutral-800"></div>
							<div class="h-4 w-11/12 rounded bg-neutral-800"></div>
							<div class="h-4 w-4/5 rounded bg-neutral-800"></div>
						</div>
					</div>

					<div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
						${Array.from(
							{ length: 4 },
							() => html` <div class="h-40 rounded-xl bg-neutral-800"></div> `,
						)}
					</div>
				</div>
			</section>
		`;
	}

	private renderDetail(detail: MediaDetail): TemplateResult {
		const releaseYear = getReleaseYear(detail.releaseDate);
		const posterUrl = this.getImageUrl(detail.posterPath);
		const backdropUrl = detail.backdropPath
			? buildTmdbImageUrl(detail.backdropPath)
			: null;

		const heroStyle = backdropUrl
			? `background-image: url("${backdropUrl}");`
			: "";

		return html`
			${this.renderBreadcrumb(detail)}

			<article aria-labelledby="media-detail-title">
				<section
					class="relative isolate min-h-[72vh] overflow-hidden
                 border-b border-white/10 bg-neutral-900"
				>
					<div
						class="absolute inset-0 -z-20 bg-cover bg-center"
						style=${heroStyle}
						aria-hidden="true"
					></div>

					<div
						class="absolute inset-0 -z-10
                   bg-gradient-to-b from-black/35 via-black/70 to-neutral-950"
						aria-hidden="true"
					></div>

					<div
						class="mx-auto flex min-h-[72vh] max-w-7xl items-end
                   px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8"
					>
						<div
							class="grid w-full gap-7
                     md:grid-cols-[12rem_minmax(0,1fr)]
                     lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10"
						>
							<img
								class="aspect-[2/3] w-36 rounded-xl object-cover
                       shadow-2xl shadow-black/50
                       sm:w-44 md:w-full"
								src=${posterUrl}
								alt=${detail.posterPath
									? `Póster de ${detail.title}`
									: `Imagen no disponible para ${detail.title}`}
								width="500"
								height="750"
								loading="eager"
								decoding="async"
							/>

							<header class="self-end">
								${detail.tagline
									? html`
											<p
												class="mb-3 max-w-3xl text-sm font-medium
                               uppercase tracking-[0.16em] text-red-300"
											>
												${detail.tagline}
											</p>
										`
									: nothing}

								<h1
									id="media-detail-title"
									class="max-w-5xl text-balance text-4xl font-black
                         tracking-tight outline-none
                         focus-visible:ring-2 focus-visible:ring-red-500
                         sm:text-5xl lg:text-7xl"
									tabindex="-1"
								>
									${detail.title}
								</h1>

								${this.renderHeroMetadata(detail, releaseYear)}

								<p
									class="mt-5 max-w-3xl text-pretty text-base
                         leading-7 text-neutral-200 sm:text-lg"
								>
									${detail.overview || "Sin descripción disponible."}
								</p>

								${this.renderGenres(detail)}
							</header>
						</div>
					</div>
				</section>

				<div
					class="mx-auto max-w-7xl space-y-14 px-4 py-12
                 sm:px-6 lg:px-8 lg:py-16"
				>
					${this.renderDetailsSection(detail)}
					${this.renderCastSection(detail.cast)}
					${detail.mediaType === "tv"
						? this.renderSeasonsSection(detail)
						: nothing}
				</div>
			</article>
		`;
	}

	private renderBreadcrumb(detail: MediaDetail): TemplateResult {
		const categoryName = detail.mediaType === "movie" ? "Películas" : "Series";

		const categoryPath =
			detail.mediaType === "movie" ? "/category/movies" : "/category/series";

		return html`
			<nav
				class="mx-auto max-w-7xl px-4 py-4 text-sm
			       text-neutral-300 sm:px-6 lg:px-8"
				aria-label="Breadcrumb"
			>
				<ol class="flex flex-wrap items-center gap-2">
					<li>
						<a
							class="rounded underline-offset-4
						       hover:text-white hover:underline
						       focus-visible:outline-none
						       focus-visible:ring-2
						       focus-visible:ring-red-500"
							href="/welcome"
						>
							Inicio
						</a>
					</li>

					<li aria-hidden="true">›</li>

					<li>
						<a
							class="rounded underline-offset-4
						       hover:text-white hover:underline
						       focus-visible:outline-none
						       focus-visible:ring-2
						       focus-visible:ring-red-500"
							href=${categoryPath}
						>
							${categoryName}
						</a>
					</li>

					<li aria-hidden="true">›</li>

					<li
						class="max-w-72 truncate text-white"
						aria-current="page"
						title=${detail.title}
					>
						${detail.title}
					</li>
				</ol>
			</nav>
		`;
	}

	private renderHeroMetadata(
		detail: MediaDetail,
		releaseYear: string | null,
	): TemplateResult {
		const runtime = formatRuntime(detail.runtime);
		const seasonCount = formatSeasonCount(detail.numberOfSeasons);
		const episodeCount = formatEpisodeCount(detail.numberOfEpisodes);
		const voteAverage = formatVoteAverage(detail.voteAverage);
		const voteCount = formatVoteCount(detail.voteCount);

		return html`
			<ul
				class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2
               text-sm font-medium text-neutral-200 sm:text-base"
				aria-label="Información principal"
			>
				${releaseYear ? html`<li>${releaseYear}</li>` : nothing}
				${runtime ? html`<li>${runtime}</li>` : nothing}
				${seasonCount ? html`<li>${seasonCount}</li>` : nothing}
				${episodeCount ? html`<li>${episodeCount}</li>` : nothing}
				${voteAverage
					? html`
							<li
								aria-label=${voteCount
									? `Valoración ${voteAverage}, basada en ${voteCount} votos`
									: `Valoración ${voteAverage}`}
							>
								<span aria-hidden="true">
									★ ${voteAverage} ${voteCount ? ` · ${voteCount} votos` : ""}
								</span>
							</li>
						`
					: html`<li>Sin valoración</li>`}
			</ul>
		`;
	}

	private renderGenres(detail: MediaDetail): TemplateResult {
		if (detail.genres.length === 0) {
			return html``;
		}

		return html`
			<ul class="mt-6 flex flex-wrap gap-2" aria-label="Géneros">
				${repeat(
					detail.genres,
					(genre) => genre.id,
					(genre) => html`
						<li
							class="rounded-full border border-white/25 bg-black/35
                     px-3 py-1 text-sm text-neutral-100 backdrop-blur"
						>
							${genre.name}
						</li>
					`,
				)}
			</ul>
		`;
	}

	private renderDetailsSection(
		detail: MediaDetail,
	): TemplateResult | typeof nothing {
		const releaseYear = getReleaseYear(detail.releaseDate);
		const runtime = formatRuntime(detail.runtime);
		const seasonCount = formatSeasonCount(detail.numberOfSeasons);
		const episodeCount = formatEpisodeCount(detail.numberOfEpisodes);

		const hasOriginalTitle =
			detail.originalTitle !== null && detail.originalTitle !== detail.title;

		const hasDetails =
			hasOriginalTitle ||
			detail.status !== null ||
			detail.originalLanguage !== null ||
			releaseYear !== null ||
			runtime !== null ||
			seasonCount !== null ||
			episodeCount !== null;

		if (!hasDetails) {
			return nothing;
		}

		return html`
			<section aria-labelledby="details-heading">
				<h2
					id="details-heading"
					class="text-2xl font-bold tracking-tight sm:text-3xl"
				>
					Detalles
				</h2>

				<dl
					class="mt-6 grid gap-x-8 gap-y-6
                 rounded-2xl border border-white/10 bg-white/[0.03]
                 p-6 sm:grid-cols-2 lg:grid-cols-3"
				>
					${hasOriginalTitle
						? this.renderDefinition("Título original", detail.originalTitle)
						: nothing}
					${releaseYear
						? this.renderDefinition("Año de estreno", releaseYear)
						: nothing}
					${runtime ? this.renderDefinition("Duración", runtime) : nothing}
					${seasonCount
						? this.renderDefinition("Temporadas", seasonCount)
						: nothing}
					${episodeCount
						? this.renderDefinition("Episodios", episodeCount)
						: nothing}
					${detail.status
						? this.renderDefinition("Estado", detail.status)
						: nothing}
					${detail.originalLanguage
						? this.renderDefinition(
								"Idioma original",
								detail.originalLanguage.toUpperCase(),
							)
						: nothing}
				</dl>
			</section>
		`;
	}

	private renderDefinition(term: string, description: string): TemplateResult {
		return html`
			<div>
				<dt class="text-sm font-semibold text-neutral-400">${term}</dt>
				<dd class="mt-1 text-base text-white">${description}</dd>
			</div>
		`;
	}

	private renderCastSection(
		cast: readonly MediaCastMember[],
	): TemplateResult | typeof nothing {
		if (cast.length === 0) {
			return nothing;
		}

		return html`
			<section aria-labelledby="cast-heading">
				<h2
					id="cast-heading"
					class="text-2xl font-bold tracking-tight sm:text-3xl"
				>
					Reparto principal
				</h2>

				<ul
					class="mt-6 grid grid-cols-2 gap-4
                 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
				>
					${repeat(
						cast,
						(member) => member.id,
						(member) => this.renderCastMember(member),
					)}
				</ul>
			</section>
		`;
	}

	private renderCastMember(member: MediaCastMember): TemplateResult {
		return html`
			<li
				class="overflow-hidden rounded-xl border border-white/10
               bg-neutral-900"
			>
				<img
					class="aspect-[2/3] w-full object-cover"
					src=${this.getImageUrl(member.profilePath)}
					alt=${member.profilePath
						? `Fotografía de ${member.name}`
						: `Imagen no disponible para ${member.name}`}
					width="300"
					height="450"
					loading="lazy"
					decoding="async"
				/>

				<div class="p-3">
					<p class="font-semibold text-white">${member.name}</p>

					${member.character
						? html`
								<p class="mt-1 text-sm text-neutral-400">${member.character}</p>
							`
						: nothing}
				</div>
			</li>
		`;
	}

	private renderSeasonsSection(
		detail: MediaDetail,
	): TemplateResult | typeof nothing {
		if (detail.seasons.length === 0) {
			return nothing;
		}

		return html`
			<section aria-labelledby="seasons-heading">
				<div
					class="flex flex-col gap-2 sm:flex-row
                 sm:items-end sm:justify-between"
				>
					<div>
						<h2
							id="seasons-heading"
							class="text-2xl font-bold tracking-tight sm:text-3xl"
						>
							Temporadas
						</h2>

						<p class="mt-2 text-sm text-neutral-400">
							Los episodios se incorporarán en el Sprint 13.
						</p>
					</div>
				</div>

				<ul class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					${repeat(
						detail.seasons,
						(season) => season.id,
						(season) => this.renderSeason(detail.id, season),
					)}
				</ul>
			</section>
		`;
	}

	private renderSeason(
		seriesId: number,
		season: MediaSeasonSummary,
	): TemplateResult {
		const releaseYear = getReleaseYear(season.airDate);
		const episodeCount = formatEpisodeCount(season.episodeCount);
		const seasonPath = buildSeasonDetailPath(seriesId, season.seasonNumber);

		return html`
			<li
				class="overflow-hidden rounded-2xl border border-white/10
               bg-neutral-900"
			>
				<a
					class="group grid h-full grid-cols-[7rem_minmax(0,1fr)]
                 rounded-2xl focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-red-500"
					href=${seasonPath}
					aria-label=${`Abrir ${season.name}`}
				>
					<img
						class="aspect-[2/3] h-full min-h-44 w-28 object-cover"
						src=${this.getImageUrl(season.posterPath)}
						alt=${season.posterPath
							? `Póster de ${season.name}`
							: `Imagen no disponible para ${season.name}`}
						width="300"
						height="450"
						loading="lazy"
						decoding="async"
					/>

					<div class="min-w-0 p-4">
						<h3
							class="font-bold text-white transition-colors
                     group-hover:text-red-400"
						>
							${season.name}
						</h3>

						<p class="mt-1 text-sm text-neutral-400">
							${[episodeCount, releaseYear].filter(Boolean).join(" · ") ||
							"Información no disponible"}
						</p>

						${season.overview
							? html`
									<p
										class="mt-3 line-clamp-4 text-sm
                           leading-6 text-neutral-300"
									>
										${season.overview}
									</p>
								`
							: nothing}
					</div>
				</a>
			</li>
		`;
	}

	private renderInvalidRoute(): TemplateResult {
		return html`
			<section
				class="mx-auto flex min-h-[70vh] max-w-3xl
               flex-col items-center justify-center px-4 py-16
               text-center sm:px-6"
				aria-live="polite"
			>
				<p
					class="text-sm font-semibold uppercase tracking-[0.16em]
                 text-red-400"
				>
					Ruta no válida
				</p>

				<h1 class="mt-3 text-3xl font-black sm:text-5xl">
					No podemos abrir esta dirección
				</h1>

				<p class="mt-5 max-w-xl leading-7 text-neutral-300">
					El tipo de contenido o su identificador no son válidos. No se realizó
					ninguna petición al servicio de contenidos.
				</p>

				<a
					class="mt-8 rounded-lg bg-red-600 px-6 py-3
                 font-semibold text-white hover:bg-red-500
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-red-400 focus-visible:ring-offset-2
                 focus-visible:ring-offset-neutral-950"
					href="/welcome"
				>
					Volver al inicio
				</a>
			</section>
		`;
	}

	private renderNotFound(): TemplateResult {
		const route = this.activeRoute;

		const categoryPath =
			route?.mediaType === "tv" ? "/category/series" : "/category/movies";

		const categoryLabel =
			route?.mediaType === "tv" ? "Volver a series" : "Volver a películas";

		return html`
			<section
				class="mx-auto flex min-h-[70vh] max-w-3xl
               flex-col items-center justify-center px-4 py-16
               text-center sm:px-6"
				aria-live="polite"
			>
				<p
					class="text-sm font-semibold uppercase tracking-[0.16em]
                 text-red-400"
				>
					Contenido no encontrado
				</p>

				<h1 class="mt-3 text-3xl font-black sm:text-5xl">
					Este contenido no está disponible
				</h1>

				<p class="mt-5 max-w-xl leading-7 text-neutral-300">
					El recurso solicitado no existe o ya no está disponible.
				</p>

				<div class="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
					<a
						class="flex-1 rounded-lg bg-red-600 px-5 py-3
                   font-semibold text-white hover:bg-red-500
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-red-400"
						href=${categoryPath}
					>
						${categoryLabel}
					</a>

					<a
						class="flex-1 rounded-lg border border-white/20
                   px-5 py-3 font-semibold text-white
                   hover:bg-white/10 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-white"
						href="/welcome"
					>
						Ir al inicio
					</a>
				</div>
			</section>
		`;
	}

	private renderError(): TemplateResult {
		return html`
			<section
				class="mx-auto flex min-h-[70vh] max-w-3xl
               flex-col items-center justify-center px-4 py-16
               text-center sm:px-6"
				aria-live="assertive"
			>
				<p
					class="text-sm font-semibold uppercase tracking-[0.16em]
                 text-red-400"
				>
					Error de carga
				</p>

				<h1 class="mt-3 text-3xl font-black sm:text-5xl">
					No pudimos cargar el contenido
				</h1>

				<p class="mt-5 max-w-xl leading-7 text-neutral-300">
					Comprueba tu conexión y vuelve a intentarlo.
				</p>

				<div class="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
					<button
						class="flex-1 rounded-lg bg-red-600 px-5 py-3
                   font-semibold text-white hover:bg-red-500
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-red-400 disabled:cursor-not-allowed
                   disabled:opacity-60"
						type="button"
						@click=${this.handleRetry}
					>
						Reintentar
					</button>

					<a
						class="flex-1 rounded-lg border border-white/20
                   px-5 py-3 font-semibold text-white
                   hover:bg-white/10 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-white"
						href="/welcome"
					>
						Ir al inicio
					</a>
				</div>
			</section>
		`;
	}

	private readonly handleRetry = (): void => {
		if (this.status !== "error" || this.activeRoute === null) {
			return;
		}

		void this.loadMediaDetail(this.activeRoute, false);
	};

	private async loadMediaDetail(
		route: ActiveMediaRoute,
		focusHeadingAfterLoad: boolean,
	): Promise<void> {
		this.invalidateActiveRequest();

		const requestId = this.activeRequestId;
		const abortController = new AbortController();

		this.activeAbortController = abortController;
		this.detail = null;
		this.status = "loading";
		document.title = "Cargando contenido | Nexlit";

		try {
			const detail = await tmdbMediaService.getMediaDetails(
				route.mediaType,
				route.mediaId,
				abortController.signal,
			);

			if (!this.isCurrentRequest(requestId, route)) {
				return;
			}

			this.detail = detail;
			this.status = "ready";
			document.title = `${detail.title} | Nexlit`;

			if (focusHeadingAfterLoad) {
				await this.focusLoadedHeading(requestId);
			}
		} catch (error: unknown) {
			if (isAbortError(error) || !this.isCurrentRequest(requestId, route)) {
				return;
			}

			this.detail = null;

			if (isTmdbMediaNotFoundError(error)) {
				this.status = "not-found";
				document.title = "Contenido no encontrado | Nexlit";
				return;
			}

			this.status = "error";
			document.title = "Error al cargar contenido | Nexlit";
		} finally {
			if (requestId === this.activeRequestId) {
				this.activeAbortController = null;
			}
		}
	}

	private invalidateActiveRequest(): void {
		this.activeAbortController?.abort();
		this.activeAbortController = null;
		this.activeRequestId += 1;
	}

	private isCurrentRequest(
		requestId: number,
		route: ActiveMediaRoute,
	): boolean {
		return (
			requestId === this.activeRequestId &&
			this.activeRoute?.mediaType === route.mediaType &&
			this.activeRoute.mediaId === route.mediaId
		);
	}

	private async focusLoadedHeading(requestId: number): Promise<void> {
		await this.updateComplete;

		if (requestId !== this.activeRequestId || this.status !== "ready") {
			return;
		}

		const activeElement = document.activeElement;

		const canMoveFocus =
			activeElement === null ||
			activeElement === document.body ||
			activeElement === this;

		if (!canMoveFocus) {
			return;
		}

		this.querySelector<HTMLHeadingElement>("#media-detail-title")?.focus({
			preventScroll: true,
		});
	}

	private getImageUrl(path: string | null): string {
		if (!path) {
			return IMAGE_PLACEHOLDER_PATH;
		}

		return buildTmdbImageUrl(path) ?? IMAGE_PLACEHOLDER_PATH;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"app-media-detail-page": MediaDetailPage;
	}
}
