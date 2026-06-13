import { Router } from "@vaadin/router";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { ROUTES } from "../../core/config/routes";
import {
	DEFAULT_PROFILE_AVATAR_ID,
	isValidProfileAvatarId,
	PROFILE_AVATARS,
	type ProfileAvatarId,
} from "../../core/constants/profile-avatars";
import {
	MAX_PROFILES,
	PROFILE_NAME_MAX_LENGTH,
	PROFILE_NAME_MIN_LENGTH,
} from "../../core/constants/profile.constants";
import { requireAuthenticatedUser } from "../../router/auth.guard";
import { profileService } from "../../services/profile/profile.service";
import {
	ProfileServiceError,
	type CreateProfilePageStatus,
} from "../../services/profile/profile.types";

type CreateProfileFormErrors = {
	name?: string;
	avatarId?: string;
};

@customElement("create-profile-page")
export class CreateProfilePage extends LitElement {
	@state()
	private status: CreateProfilePageStatus = "idle";

	@state()
	private name = "";

	@state()
	private avatarId: ProfileAvatarId = DEFAULT_PROFILE_AVATAR_ID;

	@state()
	private isKids = false;

	@state()
	private formErrors: CreateProfileFormErrors = {};

	@state()
	private errorMessage = "";

	private currentUserId = "";

	private existingProfileCount = 0;

	protected createRenderRoot() {
		return this;
	}

	connectedCallback(): void {
		super.connectedCallback();
		void this.initializePage();
	}

	private get isLoading(): boolean {
		return this.status === "loading";
	}

	private async initializePage(): Promise<void> {
		this.status = "loading";
		this.errorMessage = "";

		try {
			const user = await requireAuthenticatedUser();

			if (!user) {
				Router.go(ROUTES.login);
				return;
			}

			this.currentUserId = user.$id;

			const profiles = await profileService.getProfiles(this.currentUserId);

			this.existingProfileCount = profiles.length;

			this.status = profiles.length >= MAX_PROFILES ? "limit-reached" : "idle";
		} catch {
			this.currentUserId = "";
			this.existingProfileCount = 0;

			this.status = "error";
			this.errorMessage =
				"No se pudo preparar la creación del perfil. Inténtalo de nuevo.";
		}
	}

	private handleNameInput(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;

		this.name = input.value;

		if (this.formErrors.name) {
			this.formErrors = {
				...this.formErrors,
				name: undefined,
			};
		}
	}

	private handleAvatarChange(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const selectedAvatarId = input.value;

		if (!isValidProfileAvatarId(selectedAvatarId)) {
			this.formErrors = {
				...this.formErrors,
				avatarId: "Selecciona un avatar válido.",
			};

			return;
		}

		this.avatarId = selectedAvatarId;

		if (this.formErrors.avatarId) {
			this.formErrors = {
				...this.formErrors,
				avatarId: undefined,
			};
		}
	}

	private handleKidsChange(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;

		this.isKids = input.checked;
	}

	private validateForm(): boolean {
		const errors: CreateProfileFormErrors = {};
		const normalizedName = this.name.trim().replace(/\s+/g, " ");

		if (!normalizedName) {
			errors.name = "El nombre es obligatorio.";
		} else if (normalizedName.length < PROFILE_NAME_MIN_LENGTH) {
			errors.name = `El nombre debe tener al menos ${PROFILE_NAME_MIN_LENGTH} caracteres.`;
		} else if (normalizedName.length > PROFILE_NAME_MAX_LENGTH) {
			errors.name = `El nombre no puede superar los ${PROFILE_NAME_MAX_LENGTH} caracteres.`;
		}

		if (!this.avatarId) {
			errors.avatarId = "Selecciona un avatar.";
		}

		this.formErrors = errors;

		return Object.keys(errors).length === 0;
	}

	private getSubmissionErrorMessage(error: unknown): string {
		if (error instanceof ProfileServiceError) {
			return error.message;
		}

		return "No se pudo crear el perfil. Revisa tu conexión e inténtalo de nuevo.";
	}

	private async handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();

		if (
			this.isLoading ||
			this.status === "limit-reached" ||
			!this.currentUserId
		) {
			return;
		}

		this.errorMessage = "";

		if (!this.validateForm()) {
			return;
		}

		const wasFirstProfile = this.existingProfileCount === 0;

		this.status = "loading";

		try {
			await profileService.createProfile(this.currentUserId, {
				name: this.name,
				avatarId: this.avatarId,
				isKids: this.isKids,
			});

			this.status = "success";

			Router.go(wasFirstProfile ? ROUTES.welcome : ROUTES.profiles);
		} catch (error) {
			if (
				error instanceof ProfileServiceError &&
				error.code === "limit-reached"
			) {
				this.status = "limit-reached";
			} else {
				this.status = "error";
			}

			this.errorMessage = this.getSubmissionErrorMessage(error);
		}
	}

	private renderLoadingState() {
		return html`
			<div
				class="flex min-h-52 items-center justify-center"
				role="status"
				aria-live="polite"
			>
				<p class="text-lg text-neutral-300">Preparando perfiles…</p>
			</div>
		`;
	}

	private renderLimitReachedState() {
		return html`
			<div
				class="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-center sm:p-8"
			>
				<p class="text-lg font-semibold text-white">
					Has alcanzado el límite de perfiles.
				</p>

				<p class="text-sm leading-6 text-neutral-400">
					Puedes tener un máximo de ${MAX_PROFILES} perfiles en Nexlit.
				</p>

				<a
					class="rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
					href=${ROUTES.profiles}
				>
					Volver a perfiles
				</a>
			</div>
		`;
	}

	private renderInitializationError() {
		return html`
			<div
				class="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-xl border border-red-900 bg-red-950/40 p-6 text-center sm:p-8"
			>
				<p class="text-red-200">${this.errorMessage}</p>

				<button
					class="cursor-pointer rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
					type="button"
					@click=${this.initializePage}
				>
					Reintentar
				</button>
			</div>
		`;
	}

	private renderAvatarSelector() {
		return html`
			<fieldset
				class="space-y-4"
				aria-describedby=${this.formErrors.avatarId ? "avatar-error" : nothing}
			>
				<legend class="text-base font-semibold text-white">
					Selecciona un avatar
				</legend>

				<div class="grid grid-cols-3 gap-4 sm:grid-cols-5">
					${PROFILE_AVATARS.map(
						(avatar) => html`
							<div>
								<input
									class="peer sr-only"
									id=${`profile-avatar-${avatar.id}`}
									name="avatarId"
									type="radio"
									value=${avatar.id}
									.checked=${this.avatarId === avatar.id}
									?disabled=${this.isLoading}
									aria-invalid=${String(Boolean(this.formErrors.avatarId))}
									@change=${this.handleAvatarChange}
								/>

								<label
									class="block cursor-pointer rounded-xl border-2 border-transparent p-1 transition hover:border-neutral-400 peer-checked:border-red-600 peer-checked:ring-4 peer-checked:ring-red-600/25 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-white"
									for=${`profile-avatar-${avatar.id}`}
								>
									<img
										class="aspect-square w-full rounded-lg object-cover"
										src=${avatar.src}
										alt=${avatar.alt}
										width="160"
										height="160"
									/>
								</label>
							</div>
						`,
					)}
				</div>

				${this.formErrors.avatarId
					? html`
							<p
								id="avatar-error"
								class="text-sm font-medium text-red-300"
								role="alert"
							>
								${this.formErrors.avatarId}
							</p>
						`
					: nothing}
			</fieldset>
		`;
	}

	private renderForm() {
		return html`
			<form
				class="mx-auto max-w-2xl space-y-8 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl sm:p-8"
				novalidate
				aria-busy=${String(this.isLoading)}
				@submit=${this.handleSubmit}
			>
				<div class="space-y-2">
					<label
						class="block text-sm font-semibold text-white"
						for="profile-name"
					>
						Nombre del perfil
					</label>

					<input
						id="profile-name"
						class="w-full rounded-md border border-neutral-600 bg-neutral-950 px-4 py-3 text-white outline-none transition placeholder:text-neutral-500 focus:border-white focus:ring-2 focus:ring-white/25 disabled:cursor-wait disabled:opacity-70"
						name="name"
						type="text"
						.value=${this.name}
						minlength=${PROFILE_NAME_MIN_LENGTH}
						maxlength=${PROFILE_NAME_MAX_LENGTH}
						placeholder="Por ejemplo, Diego"
						autocomplete="off"
						required
						?disabled=${this.isLoading}
						aria-invalid=${String(Boolean(this.formErrors.name))}
						aria-describedby=${this.formErrors.name
							? "profile-name-error"
							: "profile-name-help"}
						@input=${this.handleNameInput}
					/>

					<p id="profile-name-help" class="text-sm text-neutral-400">
						Entre ${PROFILE_NAME_MIN_LENGTH} y ${PROFILE_NAME_MAX_LENGTH}
						caracteres.
					</p>

					${this.formErrors.name
						? html`
								<p
									id="profile-name-error"
									class="text-sm font-medium text-red-300"
									role="alert"
								>
									${this.formErrors.name}
								</p>
							`
						: nothing}
				</div>

				${this.renderAvatarSelector()}

				<div class="rounded-xl border border-neutral-700 bg-neutral-950 p-4">
					<label
						class="flex cursor-pointer items-start gap-3"
						for="profile-is-kids"
					>
						<input
							id="profile-is-kids"
							class="mt-1 h-5 w-5 accent-red-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
							name="isKids"
							type="checkbox"
							.checked=${this.isKids}
							?disabled=${this.isLoading}
							@change=${this.handleKidsChange}
						/>

						<span>
							<span class="block font-semibold text-white">
								Perfil infantil
							</span>

							<span class="mt-1 block text-sm leading-6 text-neutral-400">
								Esta opción prepara el perfil para futuras experiencias
								infantiles. No aplica control parental real en este sprint.
							</span>
						</span>
					</label>
				</div>

				<div class="min-h-6" aria-live="polite" aria-atomic="true">
					${this.errorMessage
						? html`
								<p class="text-sm font-medium text-red-300" role="alert">
									${this.errorMessage}
								</p>
							`
						: nothing}
					${this.status === "success"
						? html`
								<p class="text-sm font-medium text-green-300" role="status">
									Perfil creado correctamente.
								</p>
							`
						: nothing}
				</div>

				<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<a
						class="rounded-md border border-neutral-500 px-5 py-3 text-center font-semibold text-white transition hover:border-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
						href=${ROUTES.profiles}
					>
						Cancelar
					</a>

					<button
						class="cursor-pointer rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
						type="submit"
						?disabled=${this.isLoading}
					>
						${this.isLoading ? "Creando perfil…" : "Crear perfil"}
					</button>
				</div>
			</form>
		`;
	}

	render() {
		const initializationFailed = this.status === "error" && !this.currentUserId;

		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
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

					<div class="relative z-10 w-full">
						<header class="mb-10 flex flex-col items-center gap-4 text-center">
							<a
								class="text-3xl font-black tracking-tight text-red-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
								href=${ROUTES.welcomeScreen}
								aria-label="Ir al inicio de Nexlit"
							>
								NEXLIT
							</a>

							<div>
								<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
									Crear perfil
								</h1>

								<p class="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
									Personaliza el nombre, avatar y tipo de perfil.
								</p>
							</div>
						</header>

						${this.status === "loading" && !this.currentUserId
							? this.renderLoadingState()
							: nothing}
						${initializationFailed ? this.renderInitializationError() : nothing}
						${this.status === "limit-reached"
							? this.renderLimitReachedState()
							: nothing}
						${this.currentUserId && this.status !== "limit-reached"
							? this.renderForm()
							: nothing}
					</div>
				</section>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"create-profile-page": CreateProfilePage;
	}
}
