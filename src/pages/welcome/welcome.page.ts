import { consume } from "@lit/context";
import { Task, TaskStatus } from "@lit/task";
import { Router } from "@vaadin/router";
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
	activeProfileContext,
	createActiveProfileChangedEvent,
} from "../../core/context/active-profile.context";
import type { Profile } from "../../services/profile/profile.types";
import { tmdbMediaService } from "../../services/tmdb/tmdb-media.service";
import type {
	MediaSectionId,
	WelcomeContent,
} from "../../services/tmdb/tmdb.types";

import "../../components/layout/app-navbar/app-navbar";
import "../../components/media/hero-banner/hero-banner";
import "../../components/media/media-row/media-row";

import {
	toWelcomeProfile,
	type WelcomeProfile,
} from "./welcome-profile.adapter";

import { requireAuthenticatedUser } from "../../router/auth.guard";
import { profileService } from "../../services/profile/profile.service";

type ActiveProfileLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

const FAILED_SECTION_LABELS: Readonly<Record<MediaSectionId, string>> = {
	trending: "Tendencias",
	"popular-movies": "Películas populares",
	"popular-series": "Series populares",
	documentaries: "Documentales",
};

@customElement("welcome-page")
export class WelcomePage extends LitElement {
	@consume({
		context: activeProfileContext,
		subscribe: true,
	})
	@property({ attribute: false })
	activeProfile: Profile | null | undefined;

	@state()
	private featureNotice = "";

	@state()
	private profileStatus: ActiveProfileLoadStatus = "idle";

	@state()
	private profileErrorMessage = "";

	private loadedProfileId: string | null = null;

	private readonly contentTask = new Task<[profileId: string], WelcomeContent>(
		this,
		{
			task: async ([profileId], { signal }) => {
				if (!profileId) {
					throw new Error("Missing active profile");
				}

				return tmdbMediaService.getWelcomeContent(signal);
			},
		},
	);

	protected createRenderRoot(): HTMLElement {
		return this;
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

	private synchronizeActiveProfile(profile: Profile | null | undefined): void {
		if (profile === undefined) {
			if (this.profileStatus === "idle") {
				void this.loadActiveProfile();
			}

			return;
		}

		if (profile === null) {
			this.profileStatus = "empty";
			Router.go(ROUTES.profiles);
			return;
		}

		this.profileStatus = "ready";
		this.startContentLoad(profile);
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
			this.startContentLoad(activeProfile);
		} catch {
			this.profileStatus = "error";
			this.profileErrorMessage =
				"No se pudo cargar el perfil activo. Comprueba tu conexión e inténtalo de nuevo.";
		}
	}

	private startContentLoad(profile: Profile): void {
		const welcomeProfile = toWelcomeProfile(profile);

		if (welcomeProfile.id === this.loadedProfileId) {
			return;
		}

		this.loadedProfileId = welcomeProfile.id;
		void this.contentTask.run([welcomeProfile.id]);
	}

	protected render(): TemplateResult {
		const profile = this.getWelcomeProfile();

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
				<h1 class="sr-only">Nexlit, página de inicio</h1>

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
				${this.renderContent(profile)}
			</main>
		`;
	}

	private renderContent(profile: WelcomeProfile | null): TemplateResult {
		if (this.profileStatus === "error") {
			return this.renderProfileError();
		}

		if (!profile) {
			return this.renderLoading("Cargando el perfil activo…");
		}

		return html`
			${this.contentTask.render({
				initial: () => this.renderLoading("Preparando Nexlit…"),

				pending: () => this.renderLoading("Cargando contenido de TMDB…"),

				complete: (content) => this.renderCompletedContent(content),

				error: () => this.renderError(),
			})}
		`;
	}

	private renderCompletedContent(content: WelcomeContent): TemplateResult {
		const visibleSections = content.sections.filter(
			(section) => section.items.length > 0,
		);

		const isEmpty = content.hero === null && visibleSections.length === 0;

		if (isEmpty) {
			return this.renderEmpty();
		}

		return html`
			${content.hero
				? html` <hero-banner .media=${content.hero}></hero-banner> `
				: html` <div class="h-24" aria-hidden="true"></div> `}
			${content.failedSections.length > 0
				? this.renderPartialError(content.failedSections)
				: nothing}

			<div class="grid gap-8 pb-12 md:gap-10" aria-label="Catálogo de Nexlit">
				${visibleSections.map(
					(section) => html`
						<media-row
							.title=${section.title}
							.items=${section.items}
						></media-row>
					`,
				)}
			</div>
		`;
	}

	private renderLoading(message: string): TemplateResult {
		return html`
			<section
				class="min-h-screen px-4 pb-12 pt-28 md:px-14"
				aria-busy="true"
				aria-label=${message}
			>
				<p class="mb-6 text-zinc-300">${message}</p>

				<div
					class="mb-10 h-[22rem] animate-pulse rounded-xl bg-zinc-800 md:h-[32rem]"
					aria-hidden="true"
				></div>

				${[1, 2, 3].map(
					() => html`
						<div class="mb-8" aria-hidden="true">
							<div
								class="mb-4 h-6 w-48 animate-pulse rounded bg-zinc-800"
							></div>

							<div class="flex gap-4 overflow-hidden">
								${[1, 2, 3, 4, 5, 6].map(
									() => html`
										<div
											class="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-xl bg-zinc-800 md:w-44"
										></div>
									`,
								)}
							</div>
						</div>
					`,
				)}
			</section>
			getAccessibleStatus
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
					<h2 id="profile-error-title" class="text-2xl font-bold">
						No pudimos cargar tu perfil
					</h2>

					<p class="mt-3 text-zinc-300">${this.profileErrorMessage}</p>

					<button
						class="mt-6 min-h-11 rounded-md bg-white px-5 py-2 font-bold text-zinc-950 outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						type="button"
						@click=${this.retry}
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

	private renderError(): TemplateResult {
		return html`
			<section
				class="grid min-h-screen place-items-center px-4 pt-24"
				aria-labelledby="welcome-error-title"
			>
				<div
					class="max-w-lg rounded-xl border border-red-900/70 bg-zinc-900 p-6 text-center"
				>
					<h2 id="welcome-error-title" class="text-2xl font-bold">
						No pudimos cargar Nexlit
					</h2>

					<p class="mt-3 text-zinc-300">
						Comprueba tu conexión e inténtalo de nuevo.
					</p>

					<button
						class="mt-6 min-h-11 rounded-md bg-white px-5 py-2 font-bold text-zinc-950 outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						type="button"
						@click=${this.retry}
					>
						Reintentar
					</button>
				</div>
			</section>
		`;
	}

	private renderEmpty(): TemplateResult {
		return html`
			<section
				class="grid min-h-screen place-items-center px-4 pt-24"
				aria-labelledby="welcome-empty-title"
			>
				<div class="max-w-lg text-center">
					<h2 id="welcome-empty-title" class="text-2xl font-bold">
						No encontramos contenido
					</h2>

					<p class="mt-3 text-zinc-300">
						TMDB no devolvió títulos disponibles en este momento.
					</p>

					<button
						class="mt-6 min-h-11 rounded-md bg-white px-5 py-2 font-bold text-zinc-950 outline-none hover:bg-zinc-200 focus-visible:ring-4 focus-visible:ring-red-600"
						type="button"
						@click=${this.retry}
					>
						Volver a intentar
					</button>
				</div>
			</section>
		`;
	}

	private renderPartialError(
		failedSections: readonly MediaSectionId[],
	): TemplateResult {
		const labels = failedSections.map(
			(sectionId) => FAILED_SECTION_LABELS[sectionId],
		);

		return html`
			<aside
				class="mx-4 mb-8 rounded-lg border border-amber-700/60 bg-amber-950/30 px-4 py-3 text-amber-100 md:mx-14"
				aria-labelledby="partial-error-title"
			>
				<h2 id="partial-error-title" class="font-bold">
					Parte del contenido no está disponible
				</h2>

				<p class="mt-1 text-sm">No se pudieron cargar: ${labels.join(", ")}.</p>

				<button
					class="mt-3 min-h-11 rounded-md border border-amber-200 px-4 py-2 font-semibold outline-none hover:bg-amber-100 hover:text-zinc-950 focus-visible:ring-4 focus-visible:ring-white"
					type="button"
					@click=${this.retry}
				>
					Reintentar todas las secciones
				</button>
			</aside>
		`;
	}

	private getWelcomeProfile(): WelcomeProfile | null {
		return this.activeProfile ? toWelcomeProfile(this.activeProfile) : null;
	}

	private getAccessibleStatus(): string {
		if (this.profileStatus === "loading") {
			return "Cargando perfil activo.";
		}

		if (this.profileStatus === "error") {
			return "No se pudo cargar el perfil activo.";
		}

		if (this.profileStatus === "empty" || this.activeProfile === null) {
			return "No existe un perfil activo. Redirigiendo a perfiles.";
		}

		if (this.activeProfile === undefined) {
			return "Preparando el perfil activo.";
		}

		switch (this.contentTask.status) {
			case TaskStatus.PENDING:
				return "Cargando contenido.";

			case TaskStatus.COMPLETE:
				return "Contenido cargado.";

			case TaskStatus.ERROR:
				return "No se pudo cargar el contenido.";

			case TaskStatus.INITIAL:
			default:
				return "Preparando contenido.";
		}
	}

	private retry(): void {
		this.featureNotice = "";

		if (this.profileStatus === "error" || this.activeProfile === undefined) {
			this.loadedProfileId = null;
			void this.loadActiveProfile();
			return;
		}

		if (this.activeProfile === null) {
			Router.go(ROUTES.profiles);
			return;
		}

		const profile = toWelcomeProfile(this.activeProfile);

		void this.contentTask.run([profile.id]);
	}

	private handleMediaSelection(event: MediaSelectEvent): void {
		const selectedMedia = event.detail.media;

		this.featureNotice =
			`“${selectedMedia.title}”: la página de detalle ` +
			"se implementará en un sprint posterior.";
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"welcome-page": WelcomePage;
	}
}
