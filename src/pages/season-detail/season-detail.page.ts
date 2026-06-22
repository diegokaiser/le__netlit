import { consume } from "@lit/context";
import {
	Router,
	type BeforeEnterObserver,
	type RouterLocation,
} from "@vaadin/router";
import {
	html,
	LitElement,
	nothing,
	type PropertyValues,
	type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import "../../components/layout/app-navbar/app-navbar";
import "../../components/media/episode-card/episode-card";

import { ROUTES } from "../../core/config/routes";
import {
	activeProfileContext,
	createActiveProfileChangedEvent,
} from "../../core/context/active-profile.context";
import {
	buildMediaDetailPath,
	validateSeasonRoute,
	type ValidSeasonRoute,
} from "../../core/routing/media-routes";
import { buildTmdbImageUrl } from "../../core/utils/build-tmdb-image-url";
import {
	formatReleaseDate,
	formatVoteAverage,
} from "../../core/utils/media-detail-formatters";
import { requireAuthenticatedUser } from "../../router/auth.guard";
import { profileService } from "../../services/profile/profile.service";
import type { Profile } from "../../services/profile/profile.types";
import {
	isAbortError,
	isTmdbSeasonNotFoundError,
} from "../../services/tmdb/tmdb-media.errors";
import { tmdbMediaService } from "../../services/tmdb/tmdb-media.service";
import type { SeasonDetail } from "../../services/tmdb/tmdb.types";
import {
	toWelcomeProfile,
	type WelcomeProfile,
} from "../welcome/welcome-profile.adapter";

type ActiveProfileLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

type SeasonDetailStatus =
	| "idle"
	| "loading"
	| "ready"
	| "empty"
	| "invalid-route"
	| "not-found"
	| "error";

const IMAGE_PLACEHOLDER_PATH = "/images/media-placeholder.svg";

function getRouteKey(route: ValidSeasonRoute): string {
	return `${route.seriesId}:${route.seasonNumber}`;
}

function getSeasonLabel(seasonNumber: number): string {
	return seasonNumber === 0 ? "Especiales" : `Temporada ${seasonNumber}`;
}

function formatSeasonEpisodeCount(value: number): string {
	return value === 1 ? "1 episodio" : `${value} episodios`;
}

@customElement("app-season-detail-page")
export class SeasonDetailPage
	extends LitElement
	implements BeforeEnterObserver
{
	@consume({
		context: activeProfileContext,
		subscribe: true,
	})
	@property({ attribute: false })
	activeProfile: Profile | null | undefined;

	@state()
	private profileStatus: ActiveProfileLoadStatus = "idle";

	@state()
	private profileErrorMessage = "";

	@state()
	private status: SeasonDetailStatus = "idle";

	@state()
	private season: SeasonDetail | null = null;

	@state()
	private activeRoute: ValidSeasonRoute | null = null;

	private loadedRouteKey: string | null = null;

	private requestVersion = 0;

	private requestController: AbortController | null = null;

	private shouldFocusHeading = false;

	private readonly previousDocumentTitle = document.title;

	protected createRenderRoot(): HTMLElement {
		return this;
	}

	onBeforeEnter(location: RouterLocation): void {
		const routeValidation = validateSeasonRoute(
			location.params.seriesId,
			location.params.seasonNumber,
		);

		if (!routeValidation.valid) {
			this.activateInvalidRoute();
			return;
		}

		this.activateSeasonRoute(routeValidation.value);
	}

	protected firstUpdated(): void {
		this.synchronizeActiveProfile(this.activeProfile);
	}

	protected updated(changedProperties: PropertyValues<this>): void {
		if (changedProperties.has("activeProfile")) {
			this.synchronizeActiveProfile(this.activeProfile);
		}

		this.focusPageHeading();
	}

	disconnectedCallback(): void {
		this.cancelActiveRequest();
		this.requestVersion += 1;
		document.title = this.previousDocumentTitle;

		super.disconnectedCallback();
	}

	protected render(): TemplateResult {
		const profile = this.getNavbarProfile();

		return html`
			${profile
				? html`
						<app-navbar
							.profileName=${profile.name}
							.profileAvatar=${profile.avatarUrl}
						></app-navbar>
					`
				: nothing}

			<main
				class="min-h-screen bg-zinc-950 px-4 pb-16 pt-24 text-white sm:px-6 lg:px-8"
				aria-busy=${this.status === "loading" ? "true" : "false"}
			>
				<div class="sr-only" aria-live="polite" aria-atomic="true">
					${this.getAccessibleStatus()}
				</div>

				<div class="mx-auto max-w-7xl">${this.renderPage(profile)}</div>
			</main>
		`;
	}

	private activateSeasonRoute(route: ValidSeasonRoute): void {
		const routeKey = getRouteKey(route);
		const currentRouteKey = this.activeRoute
			? getRouteKey(this.activeRoute)
			: null;

		if (
			currentRouteKey === routeKey &&
			(this.status === "ready" || this.status === "empty") &&
			this.season
		) {
			document.title = `${getSeasonLabel(route.seasonNumber)} | Nexlit`;
			return;
		}

		this.cancelActiveRequest();
		this.requestVersion += 1;
		this.loadedRouteKey = null;
		this.activeRoute = route;
		this.season = null;
		this.status = "idle";
		this.shouldFocusHeading = true;

		document.title = "Cargando temporada | Nexlit";

		this.startInitialLoad();
	}

	private activateInvalidRoute(): void {
		this.cancelActiveRequest();
		this.requestVersion += 1;
		this.loadedRouteKey = null;
		this.activeRoute = null;
		this.season = null;
		this.status = "invalid-route";
		this.shouldFocusHeading = true;

		document.title = "Ruta no válida | Nexlit";
	}

	private synchronizeActiveProfile(profile: Profile | null | undefined): void {
		if (profile === undefined) {
			if (this.profileStatus === "idle") {
				void this.loadActiveProfile();
			}

			return;
		}

		if (profile === null) {
			this.profileStatus = "empty";
			this.cancelActiveRequest();
			Router.go(ROUTES.profiles);
			return;
		}

		this.profileStatus = "ready";
		this.startInitialLoad();
	}

	private async loadActiveProfile(): Promise<void> {
		if (this.profileStatus === "loading") {
			return;
		}

		this.profileStatus = "loading";
		this.profileErrorMessage = "";

		try {
			const user = await requireAuthenticatedUser();

			if (!user) {
				Router.go(ROUTES.login);
				return;
			}

			const activeProfile = await profileService.getActiveProfile(user.$id);

			this.dispatchEvent(createActiveProfileChangedEvent(activeProfile));

			if (!activeProfile) {
				this.profileStatus = "empty";
				Router.go(ROUTES.profiles);
				return;
			}

			this.profileStatus = "ready";
			this.startInitialLoad();
		} catch {
			this.profileStatus = "error";
			this.profileErrorMessage =
				"No se pudo cargar el perfil activo. Comprueba tu conexión e inténtalo de nuevo.";
		}
	}

	private startInitialLoad(): void {
		if (
			!this.activeRoute ||
			!this.activeProfile ||
			this.status === "invalid-route"
		) {
			return;
		}

		const routeKey = getRouteKey(this.activeRoute);

		if (this.loadedRouteKey === routeKey) {
			return;
		}

		this.loadedRouteKey = routeKey;

		void this.loadSeason(this.activeRoute, this.requestVersion);
	}

	private async loadSeason(
		route: ValidSeasonRoute,
		requestVersion: number,
	): Promise<void> {
		this.cancelActiveRequest();

		const controller = new AbortController();

		this.requestController = controller;
		this.season = null;
		this.status = "loading";

		document.title = "Cargando temporada | Nexlit";

		try {
			const season = await tmdbMediaService.getSeriesSeason(
				route.seriesId,
				route.seasonNumber,
				controller.signal,
			);

			if (!this.isCurrentRequest(route, requestVersion, controller)) {
				return;
			}

			this.season = season;
			this.status = season.episodes.length > 0 ? "ready" : "empty";

			document.title = `${getSeasonLabel(season.seasonNumber)} | Nexlit`;
		} catch (error: unknown) {
			if (
				isAbortError(error) ||
				!this.isCurrentRequest(route, requestVersion, controller)
			) {
				return;
			}

			this.season = null;

			if (isTmdbSeasonNotFoundError(error)) {
				this.status = "not-found";
				document.title = "Temporada no encontrada | Nexlit";
				return;
			}

			this.status = "error";
			document.title = "Error al cargar temporada | Nexlit";
		} finally {
			if (this.requestController === controller) {
				this.requestController = null;
			}
		}
	}

	private isCurrentRequest(
		route: ValidSeasonRoute,
		requestVersion: number,
		controller: AbortController,
	): boolean {
		return (
			!controller.signal.aborted &&
			this.requestVersion === requestVersion &&
			this.requestController === controller &&
			this.activeRoute?.seriesId === route.seriesId &&
			this.activeRoute.seasonNumber === route.seasonNumber
		);
	}

	private cancelActiveRequest(): void {
		this.requestController?.abort();
		this.requestController = null;
	}

	private retryInitialLoad(): void {
		if (!this.activeRoute || !this.activeProfile) {
			return;
		}

		this.cancelActiveRequest();
		this.requestVersion += 1;
		this.loadedRouteKey = null;
		this.season = null;
		this.status = "idle";
		this.shouldFocusHeading = true;

		this.startInitialLoad();
	}

	private retryProfileLoad(): void {
		this.profileStatus = "idle";
		this.profileErrorMessage = "";

		void this.loadActiveProfile();
	}

	private getNavbarProfile(): WelcomeProfile | null {
		if (!this.activeProfile) {
			return null;
		}

		return toWelcomeProfile(this.activeProfile);
	}

	private getSeriesPath(): string | null {
		if (!this.activeRoute) {
			return null;
		}

		return buildMediaDetailPath("tv", this.activeRoute.seriesId);
	}

	private renderPage(profile: WelcomeProfile | null): TemplateResult {
		if (this.profileStatus === "error") {
			return this.renderProfileError();
		}

		if (!profile) {
			return this.renderProfileLoading();
		}

		return this.renderSeasonContent();
	}

	private renderSeasonContent(): TemplateResult {
		switch (this.status) {
			case "idle":
			case "loading":
				return this.renderLoading();

			case "ready":
				return this.season
					? this.renderReadySeason(this.season)
					: this.renderError();

			case "empty":
				return this.season
					? this.renderEmptySeason(this.season)
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

	private renderBreadcrumb(): TemplateResult | typeof nothing {
		if (!this.activeRoute) {
			return nothing;
		}

		const seriesPath = this.getSeriesPath();

		if (!seriesPath) {
			return nothing;
		}

		return html`
			<nav
				class="mb-8 overflow-x-auto text-sm text-zinc-400"
				aria-label="Breadcrumb"
			>
				<ol class="flex min-w-max items-center gap-2">
					<li>
						<a
							class="rounded-sm underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
							href=${ROUTES.welcome}
						>
							Inicio
						</a>
					</li>

					<li aria-hidden="true">›</li>

					<li>
						<a
							class="rounded-sm underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
							href="/category/series"
						>
							Series
						</a>
					</li>

					<li aria-hidden="true">›</li>

					<li>
						<a
							class="rounded-sm underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
							href=${seriesPath}
						>
							Serie
						</a>
					</li>

					<li aria-hidden="true">›</li>

					<li>
						<span class="font-semibold text-white" aria-current="page">
							${getSeasonLabel(this.activeRoute.seasonNumber)}
						</span>
					</li>
				</ol>
			</nav>
		`;
	}

	private renderLoading(): TemplateResult {
		return html`
			${this.renderBreadcrumb()}

			<section aria-live="polite" aria-busy="true">
				<h1 class="sr-only">Cargando temporada</h1>

				<p class="mb-6 text-sm text-zinc-300">
					Cargando información de la temporada…
				</p>

				<div
					class="motion-safe:animate-pulse motion-reduce:animate-none"
					aria-hidden="true"
				>
					<div
						class="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]"
					>
						<div class="aspect-[2/3] rounded-2xl bg-zinc-800"></div>

						<div class="space-y-5">
							<div class="h-5 w-36 rounded bg-zinc-800"></div>
							<div class="h-12 w-4/5 rounded bg-zinc-800"></div>
							<div class="h-5 w-2/3 rounded bg-zinc-800"></div>

							<div class="space-y-3">
								<div class="h-4 w-full rounded bg-zinc-800"></div>
								<div class="h-4 w-11/12 rounded bg-zinc-800"></div>
								<div class="h-4 w-4/5 rounded bg-zinc-800"></div>
							</div>
						</div>
					</div>

					<div class="mt-12 space-y-6">
						${Array.from(
							{ length: 4 },
							() => html`
								<div
									class="grid overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 md:grid-cols-[minmax(12rem,20rem)_minmax(0,1fr)]"
								>
									<div class="aspect-video bg-zinc-800"></div>

									<div class="space-y-4 p-6">
										<div class="h-4 w-28 rounded bg-zinc-800"></div>
										<div class="h-7 w-2/3 rounded bg-zinc-800"></div>
										<div class="h-4 w-full rounded bg-zinc-800"></div>
										<div class="h-4 w-4/5 rounded bg-zinc-800"></div>
									</div>
								</div>
							`,
						)}
					</div>
				</div>
			</section>
		`;
	}

	private renderInvalidRoute(): TemplateResult {
		return html`
			<section
				class="grid min-h-[70vh] place-items-center"
				aria-labelledby="invalid-season-route-title"
			>
				<div
					class="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center sm:p-10"
				>
					<h1
						id="invalid-season-route-title"
						class="text-3xl font-black outline-none"
						tabindex="-1"
					>
						Ruta de temporada no válida
					</h1>

					<p class="mt-3 leading-7 text-zinc-300">
						El identificador de la serie o el número de temporada no tienen un
						formato válido.
					</p>

					<div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
						<a
							class="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-2 font-bold !text-[#333] outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
							href=${ROUTES.welcome}
						>
							Volver a inicio
						</a>

						<a
							class="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-600 px-5 py-2 font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-4 focus-visible:ring-white"
							href="/category/series"
						>
							Explorar series
						</a>
					</div>
				</div>
			</section>
		`;
	}

	private renderNotFound(): TemplateResult {
		const seriesPath = this.getSeriesPath();

		return html`
			${this.renderBreadcrumb()}

			<section
				class="grid min-h-[70vh] place-items-center"
				aria-labelledby="season-not-found-title"
			>
				<div
					class="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center sm:p-10"
				>
					<h1
						id="season-not-found-title"
						class="text-3xl font-black outline-none"
						tabindex="-1"
					>
						Temporada no encontrada
					</h1>

					<p class="mt-3 leading-7 text-zinc-300">
						La temporada solicitada no existe o no está disponible.
					</p>

					<div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
						${seriesPath
							? html`
									<a
										class="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-2 font-bold !text-[#333] outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
										href=${seriesPath}
									>
										Volver a la serie
									</a>
								`
							: nothing}

						<a
							class="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-600 px-5 py-2 font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-4 focus-visible:ring-white"
							href="/category/series"
						>
							Explorar series
						</a>
					</div>
				</div>
			</section>
		`;
	}

	private renderError(): TemplateResult {
		const seriesPath = this.getSeriesPath();

		return html`
			${this.renderBreadcrumb()}

			<section
				class="grid min-h-[70vh] place-items-center"
				role="alert"
				aria-labelledby="season-error-title"
			>
				<div
					class="max-w-xl rounded-xl border border-red-900/70 bg-zinc-900 p-6 text-center sm:p-10"
				>
					<h1
						id="season-error-title"
						class="text-3xl font-black outline-none"
						tabindex="-1"
					>
						No pudimos cargar la temporada
					</h1>

					<p class="mt-3 leading-7 text-zinc-300">
						Comprueba tu conexión e inténtalo de nuevo.
					</p>

					<div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
						<button
							class="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-2 font-bold !text-[#333] outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
							type="button"
							@click=${this.retryInitialLoad}
						>
							Reintentar
						</button>

						${seriesPath
							? html`
									<a
										class="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-600 px-5 py-2 font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-4 focus-visible:ring-white"
										href=${seriesPath}
									>
										Volver a la serie
									</a>
								`
							: nothing}
					</div>
				</div>
			</section>
		`;
	}

	private renderReadySeason(season: SeasonDetail): TemplateResult {
		return html`
			${this.renderBreadcrumb()}

			<article>
				${this.renderSeasonHeader(season)} ${this.renderEpisodeList(season)}
			</article>
		`;
	}

	private renderEmptySeason(season: SeasonDetail): TemplateResult {
		return html`
			${this.renderBreadcrumb()}

			<article>
				${this.renderSeasonHeader(season)}

				<section
					class="mt-14 rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8"
					aria-labelledby="empty-season-heading"
				>
					<h2 id="empty-season-heading" class="text-2xl font-bold">
						Episodios
					</h2>

					<p class="mt-3 leading-7 text-zinc-300">
						No hay episodios disponibles para esta temporada.
					</p>

					<a
						class="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-2 font-bold !text-[#333] outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						href=${buildMediaDetailPath("tv", season.seriesId)}
					>
						Volver a la serie
					</a>
				</section>
			</article>
		`;
	}

	private renderSeasonHeader(season: SeasonDetail): TemplateResult {
		const posterUrl =
			buildTmdbImageUrl(season.posterPath, "w500") ?? IMAGE_PLACEHOLDER_PATH;

		const releaseDate = formatReleaseDate(season.airDate);
		const voteAverage =
			(season.voteAverage ?? 0) > 0
				? formatVoteAverage(season.voteAverage)
				: null;

		return html`
			<header
				class="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]"
			>
				<img
					class="mx-auto aspect-[2/3] w-full max-w-60 rounded-2xl bg-neutral-800 object-cover shadow-2xl shadow-black/50 md:mx-0 md:max-w-none"
					src=${posterUrl}
					alt=${season.posterPath
						? `Póster de ${season.name}`
						: `Imagen no disponible para ${season.name}`}
					width="500"
					height="750"
					loading="eager"
					decoding="async"
				/>

				<div class="flex min-w-0 flex-col justify-center gap-6">
					<header>
						<p
							class="text-sm font-semibold uppercase tracking-[0.16em] text-red-400"
						>
							${getSeasonLabel(season.seasonNumber)}
						</p>

						<h1
							id="season-detail-title"
							class="mt-3 text-balance text-4xl font-black tracking-tight outline-none sm:text-5xl lg:text-6xl"
							tabindex="-1"
						>
							${season.name}
						</h1>
					</header>

					<dl
						class="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-300"
						aria-label="Información de la temporada"
					>
						<div class="flex gap-1">
							<dt class="font-semibold text-zinc-100">Episodios:</dt>
							<dd>${formatSeasonEpisodeCount(season.episodeCount)}</dd>
						</div>

						${releaseDate
							? html`
									<div class="flex gap-1">
										<dt class="font-semibold text-zinc-100">Estreno:</dt>
										<dd>${releaseDate}</dd>
									</div>
								`
							: nothing}
						${voteAverage
							? html`
									<div class="flex gap-1">
										<dt class="font-semibold text-zinc-100">Valoración:</dt>
										<dd>${voteAverage}</dd>
									</div>
								`
							: nothing}
					</dl>

					<section aria-labelledby="season-summary-heading">
						<h2 id="season-summary-heading" class="text-2xl font-bold">
							Sinopsis
						</h2>

						<p
							class="mt-3 max-w-4xl text-pretty leading-7 text-zinc-300 sm:text-lg sm:leading-8"
						>
							${season.overview || "Sinopsis no disponible."}
						</p>
					</section>

					<a
						class="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white outline-none hover:bg-red-500 focus-visible:ring-4 focus-visible:ring-red-400 sm:w-fit"
						href=${buildMediaDetailPath("tv", season.seriesId)}
					>
						Volver al detalle de la serie
					</a>
				</div>
			</header>
		`;
	}

	private renderEpisodeList(season: SeasonDetail): TemplateResult {
		return html`
			<section class="mt-14" aria-labelledby="episodes-heading">
				<div class="mb-6">
					<h2 id="episodes-heading" class="text-3xl font-bold">Episodios</h2>

					<p class="mt-2 text-sm text-zinc-400">
						${formatSeasonEpisodeCount(season.episodeCount)}
					</p>
				</div>

				<ol class="space-y-6">
					${repeat(
						season.episodes,
						(episode) => episode.id,
						(episode) => html`
							<li>
								<app-episode-card .episode=${episode}></app-episode-card>
							</li>
						`,
					)}
				</ol>
			</section>
		`;
	}

	private renderProfileLoading(): TemplateResult {
		return html`
			<section
				class="grid min-h-[70vh] place-items-center"
				aria-busy="true"
				aria-label="Cargando perfil activo"
			>
				<h1 class="sr-only">Cargando Nexlit</h1>

				<div class="text-center">
					<div
						class="mx-auto size-12 animate-pulse rounded-full bg-zinc-700"
						aria-hidden="true"
					></div>

					<p class="mt-4 text-zinc-300">Cargando el perfil activo…</p>
				</div>
			</section>
		`;
	}

	private renderProfileError(): TemplateResult {
		return html`
			<section
				class="grid min-h-[70vh] place-items-center"
				aria-labelledby="profile-error-title"
			>
				<div
					class="max-w-lg rounded-xl border border-red-900/70 bg-zinc-900 p-6 text-center"
				>
					<h1
						id="profile-error-title"
						class="text-2xl font-bold outline-none"
						tabindex="-1"
					>
						No pudimos cargar tu perfil
					</h1>

					<p class="mt-3 text-zinc-300">${this.profileErrorMessage}</p>

					<button
						class="mt-6 min-h-11 rounded-md bg-white px-5 py-2 font-bold !text-[#333] outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						type="button"
						@click=${this.retryProfileLoad}
					>
						Reintentar
					</button>

					<a
						class="mt-4 block text-sm font-semibold text-zinc-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
						href=${ROUTES.profiles}
					>
						Volver a perfiles
					</a>
				</div>
			</section>
		`;
	}

	private focusPageHeading(): void {
		if (
			!this.shouldFocusHeading ||
			this.profileStatus === "loading" ||
			this.status === "idle" ||
			this.status === "loading"
		) {
			return;
		}

		const heading = this.querySelector<HTMLElement>(
			[
				"#season-detail-title",
				"#invalid-season-route-title",
				"#season-not-found-title",
				"#season-error-title",
				"#profile-error-title",
			].join(","),
		);

		if (!heading) {
			return;
		}

		heading.focus({
			preventScroll: true,
		});

		this.shouldFocusHeading = false;
	}

	private getAccessibleStatus(): string {
		if (this.profileStatus === "loading") {
			return "Cargando el perfil activo.";
		}

		if (this.profileStatus === "error") {
			return this.profileErrorMessage;
		}

		switch (this.status) {
			case "loading":
				return "Cargando información de la temporada.";

			case "ready":
				return "Temporada cargada.";

			case "empty":
				return "La temporada no tiene episodios disponibles.";

			case "invalid-route":
				return "La ruta de temporada no es válida.";

			case "not-found":
				return "La temporada solicitada no existe.";

			case "error":
				return "No se pudo cargar la temporada.";

			case "idle":
			default:
				return "";
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"app-season-detail-page": SeasonDetailPage;
	}
}
