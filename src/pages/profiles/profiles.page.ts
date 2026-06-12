import { Router } from "@vaadin/router";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import "../../components/profile/profile-card/profile-card";

import { ROUTES } from "../../core/config/routes";
import { MAX_PROFILES } from "../../core/constants/profile.constants";
import { requireAuthenticatedUser } from "../../router/auth.guard";
import { profileService } from "../../services/profile/profile.service";
import {
	ProfileServiceError,
	type Profile,
	type ProfileSelectedDetail,
	type ProfilesPageStatus,
} from "../../services/profile/profile.types";

@customElement("profiles-page")
export class ProfilesPage extends LitElement {
	@state()
	private status: ProfilesPageStatus = "idle";

	@state()
	private profiles: Profile[] = [];

	@state()
	private activeProfileId: string | null = null;

	@state()
	private selectingProfileId: string | null = null;

	@state()
	private errorMessage = "";

	private currentUserId = "";

	protected createRenderRoot() {
		return this;
	}

	connectedCallback(): void {
		super.connectedCallback();
		void this.loadProfiles();
	}

	private get hasReachedProfileLimit(): boolean {
		return this.profiles.length >= MAX_PROFILES;
	}

	private get isSelecting(): boolean {
		return this.status === "selecting";
	}

	private getErrorMessage(error: unknown): string {
		if (error instanceof ProfileServiceError) {
			return error.message;
		}

		return "No se pudieron cargar los perfiles. Inténtalo de nuevo.";
	}

	private async loadProfiles(): Promise<void> {
		this.status = "loading";
		this.errorMessage = "";
		this.selectingProfileId = null;

		try {
			const user = await requireAuthenticatedUser();

			if (!user) {
				Router.go(ROUTES.login);
				return;
			}

			this.currentUserId = user.$id;

			const [profiles, activeProfile] = await Promise.all([
				profileService.getProfiles(this.currentUserId),
				profileService.getActiveProfile(this.currentUserId),
			]);

			this.profiles = profiles;
			this.activeProfileId = activeProfile?.id ?? null;
			this.status = profiles.length === 0 ? "empty" : "ready";
		} catch (error) {
			this.profiles = [];
			this.activeProfileId = null;
			this.errorMessage = this.getErrorMessage(error);
			this.status = "error";
		}
	}

	private async handleProfileSelected(
		event: CustomEvent<ProfileSelectedDetail>,
	): Promise<void> {
		const { profileId } = event.detail;

		if (this.isSelecting || !this.currentUserId) {
			return;
		}

		if (profileId === this.activeProfileId) {
			Router.go(ROUTES.welcome);
			return;
		}

		this.status = "selecting";
		this.selectingProfileId = profileId;
		this.errorMessage = "";

		try {
			await profileService.setActiveProfile(this.currentUserId, profileId);

			this.activeProfileId = profileId;
			Router.go(ROUTES.welcome);
		} catch (error) {
			this.errorMessage = this.getErrorMessage(error);
			this.status = "error";
			this.selectingProfileId = null;
		}
	}

	private renderLoadingState() {
		return html`
			<div
				class="flex min-h-48 items-center justify-center"
				role="status"
				aria-live="polite"
			>
				<p class="text-lg text-neutral-300">Cargando perfiles…</p>
			</div>
		`;
	}

	private renderInitialErrorState() {
		return html`
			<div
				class="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-xl border border-red-900 bg-red-950/40 p-6 text-center"
			>
				<p class="text-red-200">${this.errorMessage}</p>

				<button
					class="cursor-pointer rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
					type="button"
					@click=${this.loadProfiles}
				>
					Reintentar
				</button>
			</div>
		`;
	}

	private renderEmptyState() {
		return html`
			<div
				class="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-center sm:p-8"
			>
				<p class="text-lg text-neutral-200">Todavía no tienes perfiles.</p>

				<p class="text-sm leading-6 text-neutral-400">
					Crea tu primer perfil para mantener separadas tus preferencias y tu
					contenido.
				</p>

				<a
					class="rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
					href=${ROUTES.createProfile}
				>
					Crear primer perfil
				</a>
			</div>
		`;
	}

	private renderProfilesGrid() {
		return html`
			<div
				class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5"
				role="list"
				aria-label="Perfiles disponibles"
				@profile-selected=${this.handleProfileSelected}
			>
				${this.profiles.map(
					(profile) => html`
						<profile-card
							role="listitem"
							.profile=${profile}
							.active=${profile.id === this.activeProfileId}
							.disabled=${this.isSelecting}
							.busy=${profile.id === this.selectingProfileId}
						></profile-card>
					`,
				)}
			</div>
		`;
	}

	render() {
		const isInitialError =
			this.status === "error" && this.profiles.length === 0;

		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
					aria-busy=${String(this.status === "loading" || this.status === "selecting")}
				>
					<div
						class="absolute inset-0 bg-[radial-gradient(circle_at_top,#dc2626_0,transparent_34%),linear-gradient(180deg,#171717_0%,#050505_100%)] opacity-70"
					></div>
					<div
						class="absolute -left-24 top-20 h-72 w-72 rounded-full bg-red-700/20 blur-3xl"
					></div>
					<div
						class="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-red-900/20 blur-3xl"
					></div>
					
					<div class="relative z-10 w-full max-w-xl">
						<header class="mb-10 flex flex-col gap-4 text-center">
							<a
								class="self-center text-3xl font-black tracking-tight text-red-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
								href=${ROUTES.welcomeScreen}
								aria-label="Ir al inicio de Nexlit"
							>
								NEXLIT
							</a>

							<div>
								<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
									¿Quién está viendo?
								</h1>

								<p class="mt-3 text-sm text-neutral-400 sm:text-base">
									Selecciona un perfil para continuar.
								</p>
							</div>
						</header>

						${
							this.status !== "empty"
								? html`
										<div
											class="mb-6 min-h-6 text-center"
											aria-live="polite"
											aria-atomic="true"
										>
											${this.errorMessage
												? html`
														<p class="text-sm font-medium text-red-300">
															${this.errorMessage}
														</p>
													`
												: nothing}
										</div>
									`
								: nothing
						}


						${this.status === "loading" ? this.renderLoadingState() : nothing}
						${isInitialError ? this.renderInitialErrorState() : nothing}
						${this.status === "empty" ? this.renderEmptyState() : nothing}
						${
							this.profiles.length > 0
								? html`
										<div class="flex flex-col gap-10">
											${this.renderProfilesGrid()}

											<div class="flex flex-col items-center gap-4 text-center">
												${this.hasReachedProfileLimit
													? html`
															<p class="text-sm text-neutral-400" role="status">
																Has alcanzado el máximo de ${MAX_PROFILES}
																perfiles.
															</p>
														`
													: html`
															<a
																class="rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
																href=${ROUTES.createProfile}
															>
																Crear otro perfil
															</a>
														`}
											</div>
										</div>
									`
								: nothing
						}
					</div>
				</section>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"profiles-page": ProfilesPage;
	}
}
