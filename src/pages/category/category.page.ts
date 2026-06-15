import { consume } from "@lit/context";
import { Router, type RouterLocation } from "@vaadin/router";
import {
	LitElement,
	html,
	nothing,
	type PropertyValues,
	type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { MediaSelectEvent } from "../../components/media/media.events";
import { ROUTES } from "../../core/config/routes";
import {
	CATEGORY_CONFIG,
	isCategorySlug,
	type CategorySlug,
} from "../../core/constants/categories";
import {
	activeProfileContext,
	createActiveProfileChangedEvent,
} from "../../core/context/active-profile.context";
import { requireAuthenticatedUser } from "../../router/auth.guard";
import { profileService } from "../../services/profile/profile.service";
import type { Profile } from "../../services/profile/profile.types";
import { tmdbMediaService } from "../../services/tmdb/tmdb-media.service";
import type { MediaItem, MediaPage } from "../../services/tmdb/tmdb.types";

import "../../components/layout/app-navbar/app-navbar";
import "../../components/media/media-grid/media-grid";

import {
	toWelcomeProfile,
	type WelcomeProfile,
} from "../welcome/welcome-profile.adapter";

type ActiveProfileLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

type CategoryContentStatus =
	| "idle"
	| "loading"
	| "ready"
	| "empty"
	| "error"
	| "not-found";

const INITIAL_LOAD_ERROR_MESSAGE =
	"No se pudo cargar esta categoría. Comprueba tu conexión e inténtalo de nuevo.";

const LOAD_MORE_ERROR_MESSAGE =
	"No se pudieron cargar más resultados. El contenido anterior sigue disponible.";

function getMediaKey(media: MediaItem): string {
	return `${media.mediaType}-${media.id}`;
}

function mergeUniqueMediaItems(
	currentItems: readonly MediaItem[],
	newItems: readonly MediaItem[],
): MediaItem[] {
	const knownKeys = new Set(currentItems.map(getMediaKey));

	const uniqueNewItems = newItems.filter((item) => {
		const key = getMediaKey(item);

		if (knownKeys.has(key)) {
			return false;
		}

		knownKeys.add(key);
		return true;
	});

	return [...currentItems, ...uniqueNewItems];
}

function assertNever(value: never): never {
	throw new Error(`Unsupported category: ${String(value)}`);
}

@customElement("category-page")
export class CategoryPage extends LitElement {
	@consume({
		context: activeProfileContext,
		subscribe: true,
	})
	@property({ attribute: false })
	activeProfile: Profile | null | undefined;

	@state()
	private category?: CategorySlug;

	@state()
	private profileStatus: ActiveProfileLoadStatus = "idle";

	@state()
	private profileErrorMessage = "";

	@state()
	private contentStatus: CategoryContentStatus = "idle";

	@state()
	private items: MediaItem[] = [];

	@state()
	private currentPage = 0;

	@state()
	private totalPages = 0;

	@state()
	private loadingMore = false;

	@state()
	private initialError = "";

	@state()
	private loadMoreError = "";

	@state()
	private featureNotice = "";

	private loadedCategory: CategorySlug | null = null;

	private requestVersion = 0;

	private requestController: AbortController | null = null;

	private readonly previousDocumentTitle = document.title;

	protected createRenderRoot(): HTMLElement {
		return this;
	}

	onBeforeEnter(location: RouterLocation): void {
		const rawCategory = location.params.category;

		if (!isCategorySlug(rawCategory)) {
			this.activateUnsupportedCategory();
			return;
		}

		this.activateCategory(rawCategory);
	}

	protected firstUpdated(): void {
		this.synchronizeActiveProfile(this.activeProfile);
	}

	protected updated(changedProperties: PropertyValues<this>): void {
		if (!changedProperties.has("activeProfile")) {
			return;
		}

		this.synchronizeActiveProfile(this.activeProfile);
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
				class="min-h-screen bg-zinc-950 text-white"
				@media-select=${this.handleMediaSelection}
			>
				<div class="sr-only" aria-live="polite" aria-atomic="true">
					${this.getAccessibleStatus()}
				</div>

				${this.featureNotice
					? html`
							<div
								class="fixed bottom-4 left-1/2 z-50 w-[min(90vw,34rem)] -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm shadow-xl"
								role="status"
							>
								${this.featureNotice}
							</div>
						`
					: nothing}
				${this.renderPage(profile)}
			</main>
		`;
	}

	private activateCategory(category: CategorySlug): void {
		if (this.category === category && this.contentStatus !== "not-found") {
			document.title = CATEGORY_CONFIG[category].documentTitle;
			return;
		}

		this.cancelActiveRequest();
		this.requestVersion += 1;
		this.loadedCategory = null;
		this.category = category;
		this.resetContentState();

		document.title = CATEGORY_CONFIG[category].documentTitle;

		this.startInitialLoad();
	}

	private activateUnsupportedCategory(): void {
		this.cancelActiveRequest();
		this.requestVersion += 1;
		this.loadedCategory = null;
		this.category = undefined;
		this.resetContentState();
		this.contentStatus = "not-found";

		document.title = "Categoría no encontrada | Nexlit";
	}

	private resetContentState(): void {
		this.items = [];
		this.currentPage = 0;
		this.totalPages = 0;
		this.loadingMore = false;
		this.initialError = "";
		this.loadMoreError = "";
		this.featureNotice = "";
		this.contentStatus = "idle";
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
		if (!this.category || !this.activeProfile) {
			return;
		}

		if (this.loadedCategory === this.category) {
			return;
		}

		this.loadedCategory = this.category;

		void this.loadInitialCategory(this.category, this.requestVersion);
	}

	private async loadInitialCategory(
		category: CategorySlug,
		requestVersion: number,
	): Promise<void> {
		this.cancelActiveRequest();

		const controller = new AbortController();

		this.requestController = controller;
		this.contentStatus = "loading";
		this.initialError = "";
		this.loadMoreError = "";

		try {
			const page = await this.requestCategoryPage(
				category,
				1,
				controller.signal,
			);

			if (!this.isCurrentRequest(category, requestVersion, controller)) {
				return;
			}

			this.items = mergeUniqueMediaItems([], page.items);
			this.currentPage = page.page;
			this.totalPages = page.totalPages;
			this.contentStatus = this.items.length > 0 ? "ready" : "empty";
		} catch {
			if (
				controller.signal.aborted ||
				!this.isCurrentRequest(category, requestVersion, controller)
			) {
				return;
			}

			this.contentStatus = "error";
			this.initialError = INITIAL_LOAD_ERROR_MESSAGE;
		} finally {
			if (this.requestController === controller) {
				this.requestController = null;
			}
		}
	}

	private async loadMore(): Promise<void> {
		if (
			!this.category ||
			this.contentStatus !== "ready" ||
			this.loadingMore ||
			this.requestController !== null ||
			this.currentPage >= this.totalPages
		) {
			return;
		}

		const category = this.category;
		const nextPage = this.currentPage + 1;
		const requestVersion = this.requestVersion;
		const controller = new AbortController();

		this.requestController = controller;
		this.loadingMore = true;
		this.loadMoreError = "";

		try {
			const page = await this.requestCategoryPage(
				category,
				nextPage,
				controller.signal,
			);

			if (!this.isCurrentRequest(category, requestVersion, controller)) {
				return;
			}

			this.items = mergeUniqueMediaItems(this.items, page.items);

			this.currentPage = Math.max(this.currentPage, page.page);

			this.totalPages = page.totalPages;
		} catch {
			if (
				controller.signal.aborted ||
				!this.isCurrentRequest(category, requestVersion, controller)
			) {
				return;
			}

			this.loadMoreError = LOAD_MORE_ERROR_MESSAGE;
		} finally {
			if (this.isCurrentRequest(category, requestVersion, controller)) {
				this.loadingMore = false;
			}

			if (this.requestController === controller) {
				this.requestController = null;
			}
		}
	}

	private requestCategoryPage(
		category: CategorySlug,
		page: number,
		signal: AbortSignal,
	): Promise<MediaPage> {
		switch (category) {
			case "movies":
				return tmdbMediaService.getMoviesPage(page, signal);

			case "series":
				return tmdbMediaService.getSeriesPage(page, signal);

			case "documentaries":
				return tmdbMediaService.getDocumentariesPage(page, signal);

			default:
				return assertNever(category);
		}
	}

	private isCurrentRequest(
		category: CategorySlug,
		requestVersion: number,
		controller: AbortController,
	): boolean {
		return (
			!controller.signal.aborted &&
			this.category === category &&
			this.requestVersion === requestVersion &&
			this.requestController === controller
		);
	}

	private cancelActiveRequest(): void {
		this.requestController?.abort();
		this.requestController = null;
		this.loadingMore = false;
	}

	private retryInitialLoad(): void {
		if (!this.category || !this.activeProfile) {
			return;
		}

		this.cancelActiveRequest();
		this.requestVersion += 1;
		this.loadedCategory = null;
		this.items = [];
		this.currentPage = 0;
		this.totalPages = 0;
		this.initialError = "";
		this.loadMoreError = "";
		this.contentStatus = "idle";

		this.startInitialLoad();
	}

	private retryProfileLoad(): void {
		this.profileStatus = "idle";
		this.profileErrorMessage = "";

		void this.loadActiveProfile();
	}

	private handleMediaSelection(event: MediaSelectEvent): void {
		this.featureNotice = `El detalle de “${event.detail.media.title}” estará disponible en un próximo sprint.`;
	}

	private getNavbarProfile(): WelcomeProfile | null {
		if (!this.activeProfile) {
			return null;
		}

		return toWelcomeProfile(this.activeProfile);
	}

	private renderPage(profile: WelcomeProfile | null): TemplateResult {
		if (this.profileStatus === "error") {
			return this.renderProfileError();
		}

		if (!profile) {
			return this.renderProfileLoading();
		}

		if (this.contentStatus === "not-found") {
			return this.renderCategoryNotFound();
		}

		if (!this.category) {
			return this.renderCategoryNotFound();
		}

		return this.renderCategory(this.category);
	}

	private renderCategory(category: CategorySlug): TemplateResult {
		const config = CATEGORY_CONFIG[category];

		return html`
			<div
				class="mx-auto min-h-screen w-full max-w-[100rem] px-4 pb-16 pt-28 sm:px-6 md:px-10 lg:px-14"
			>
				<header class="mb-8 max-w-3xl md:mb-10">
					<p
						class="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-red-500"
					>
						Categoría
					</p>

					<h1
						id="category-heading"
						class="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl"
					>
						${config.title}
					</h1>

					<p
						class="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base"
					>
						${config.description}
					</p>
				</header>

				<section aria-labelledby="category-heading">
					${this.renderCategoryContent(category)}
				</section>
			</div>
		`;
	}

	private renderCategoryContent(category: CategorySlug): TemplateResult {
		switch (this.contentStatus) {
			case "idle":
			case "loading":
				return this.renderLoadingGrid();

			case "error":
				return this.renderInitialError();

			case "empty":
				return this.renderEmpty(category);

			case "ready":
				return this.renderReady(category);

			case "not-found":
				return this.renderCategoryNotFound();
		}
	}

	private renderLoadingGrid(): TemplateResult {
		return html`
			<div aria-busy="true" aria-label="Cargando contenido">
				<p class="mb-6 text-sm text-zinc-300">Cargando contenido…</p>

				<div
					class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					aria-hidden="true"
				>
					${Array.from(
						{ length: 12 },
						() => html`
							<div>
								<div
									class="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800"
								></div>

								<div
									class="mt-3 h-4 w-4/5 animate-pulse rounded bg-zinc-800"
								></div>

								<div
									class="mt-2 h-3 w-2/5 animate-pulse rounded bg-zinc-800"
								></div>
							</div>
						`,
					)}
				</div>
			</div>
		`;
	}

	private renderReady(category: CategorySlug): TemplateResult {
		const config = CATEGORY_CONFIG[category];

		return html`
			<media-grid
				.items=${this.items}
				.label=${`${config.title}. ${this.items.length} resultados cargados`}
			></media-grid>

			${this.renderPaginationControls()}
		`;
	}

	private renderPaginationControls(): TemplateResult | typeof nothing {
		const hasMore = this.currentPage < this.totalPages;

		if (!hasMore && !this.loadMoreError) {
			return nothing;
		}

		return html`
			<div class="mt-10 flex flex-col items-center gap-3" aria-live="polite">
				${this.loadMoreError
					? html`
							<p
								id="load-more-error"
								class="max-w-xl text-center text-sm text-red-300"
								role="alert"
							>
								${this.loadMoreError}
							</p>
						`
					: nothing}
				${hasMore
					? html`
							<button
								class="min-h-11 w-full rounded-md bg-white px-6 py-3 font-bold text-zinc-950 outline-none transition hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
								type="button"
								?disabled=${this.loadingMore}
								aria-busy=${this.loadingMore ? "true" : "false"}
								aria-describedby=${this.loadMoreError
									? "load-more-error"
									: nothing}
								@click=${this.loadMore}
							>
								${this.loadingMore
									? "Cargando…"
									: this.loadMoreError
										? "Reintentar carga"
										: "Cargar más"}
							</button>
						`
					: nothing}
			</div>
		`;
	}

	private renderEmpty(category: CategorySlug): TemplateResult {
		return html`
			<div
				class="rounded-xl border border-zinc-800 bg-zinc-900/70 px-5 py-10 text-center"
			>
				<h2 class="text-2xl font-bold">No hay contenido disponible</h2>

				<p class="mx-auto mt-3 max-w-xl text-zinc-300">
					${CATEGORY_CONFIG[category].emptyMessage}
				</p>

				<div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
					<button
						class="min-h-11 rounded-md bg-white px-5 py-2 font-bold text-zinc-950 outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						type="button"
						@click=${this.retryInitialLoad}
					>
						Reintentar
					</button>

					<a
						class="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-600 px-5 py-2 font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-4 focus-visible:ring-white"
						href=${ROUTES.welcome}
					>
						Volver a inicio
					</a>
				</div>
			</div>
		`;
	}

	private renderInitialError(): TemplateResult {
		return html`
			<div
				class="rounded-xl border border-red-900/70 bg-zinc-900 px-5 py-10 text-center"
				role="alert"
				aria-labelledby="category-error-title"
			>
				<h2 id="category-error-title" class="text-2xl font-bold">
					No pudimos cargar la categoría
				</h2>

				<p class="mx-auto mt-3 max-w-xl text-zinc-300">${this.initialError}</p>

				<div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
					<button
						class="min-h-11 rounded-md bg-white px-5 py-2 font-bold text-zinc-950 outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						type="button"
						@click=${this.retryInitialLoad}
					>
						Reintentar
					</button>

					<a
						class="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-600 px-5 py-2 font-semibold text-white outline-none hover:bg-zinc-800 focus-visible:ring-4 focus-visible:ring-white"
						href=${ROUTES.welcome}
					>
						Volver a inicio
					</a>
				</div>
			</div>
		`;
	}

	private renderCategoryNotFound(): TemplateResult {
		return html`
			<section
				class="grid min-h-screen place-items-center px-4 pb-12 pt-28"
				aria-labelledby="category-not-found-title"
			>
				<div
					class="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center sm:p-10"
				>
					<h1 id="category-not-found-title" class="text-3xl font-black">
						Categoría no encontrada
					</h1>

					<p class="mt-3 text-zinc-300">
						La categoría solicitada no está disponible en Nexlit.
					</p>

					<a
						class="!text-[#333] mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-2 font-bold outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						href=${ROUTES.welcome}
					>
						Volver a inicio
					</a>
				</div>
			</section>
		`;
	}

	private renderProfileLoading(): TemplateResult {
		return html`
			<section
				class="grid min-h-screen place-items-center px-4 pt-24"
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
				class="grid min-h-screen place-items-center px-4 pt-24"
				aria-labelledby="profile-error-title"
			>
				<div
					class="max-w-lg rounded-xl border border-red-900/70 bg-zinc-900 p-6 text-center"
				>
					<h1 id="profile-error-title" class="text-2xl font-bold">
						No pudimos cargar tu perfil
					</h1>

					<p class="mt-3 text-zinc-300">${this.profileErrorMessage}</p>

					<button
						class="mt-6 min-h-11 rounded-md bg-white px-5 py-2 font-bold text-zinc-950 outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
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

	private getAccessibleStatus(): string {
		if (this.profileStatus === "loading") {
			return "Cargando el perfil activo.";
		}

		if (this.profileStatus === "error") {
			return this.profileErrorMessage;
		}

		if (this.contentStatus === "loading") {
			return "Cargando contenido de la categoría.";
		}

		if (this.contentStatus === "error") {
			return this.initialError;
		}

		if (this.contentStatus === "empty") {
			return "La categoría no contiene resultados.";
		}

		if (this.contentStatus === "not-found") {
			return "La categoría solicitada no existe.";
		}

		if (this.loadingMore) {
			return "Cargando más resultados.";
		}

		if (this.loadMoreError) {
			return this.loadMoreError;
		}

		if (this.contentStatus === "ready") {
			return `${this.items.length} contenidos cargados.`;
		}

		return "";
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"category-page": CategoryPage;
	}
}
