import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authService } from "../../services/auth/auth.service";
import {
	CREATE_NEW_PASSWORD_MESSAGES,
	MIN_PASSWORD_LENGTH,
} from "./create-new-password.constants";

type CreateNewPasswordStatus =
	| "idle"
	| "loading"
	| "success"
	| "error"
	| "invalid-link";

type CreateNewPasswordForm = {
	password: string;
	confirmPassword: string;
};

type CreateNewPasswordErrors = Partial<
	Record<keyof CreateNewPasswordForm, string>
>;

@customElement("create-new-password-page")
export class CreateNewPasswordPage extends LitElement {
	@state()
	private status: CreateNewPasswordStatus = "idle";

	@state()
	private form: CreateNewPasswordForm = {
		password: "",
		confirmPassword: "",
	};

	@state()
	private errors: CreateNewPasswordErrors = {};

	private userId = "";
	private secret = "";

	protected createRenderRoot() {
		return this;
	}

	connectedCallback() {
		super.connectedCallback();
		this.readRecoveryParams();
	}

	private readRecoveryParams() {
		const params = new URLSearchParams(window.location.search);

		this.userId = params.get("userId")?.trim() ?? "";
		this.secret = params.get("secret")?.trim() ?? "";

		if (!this.userId || !this.secret) {
			this.status = "invalid-link";
		}
	}

	private handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const fieldName = input.name as keyof CreateNewPasswordForm;

		this.form = {
			...this.form,
			[fieldName]: input.value,
		};

		if (this.errors[fieldName]) {
			const nextErrors = { ...this.errors };
			delete nextErrors[fieldName];
			this.errors = nextErrors;
		}

		if (this.status === "error") {
			this.status = "idle";
		}
	}

	private validateForm() {
		const nextErrors: CreateNewPasswordErrors = {};
		const password = this.form.password.trim();
		const confirmPassword = this.form.confirmPassword.trim();

		if (!password) {
			nextErrors.password = CREATE_NEW_PASSWORD_MESSAGES.passwordRequired;
		} else if (password.length < MIN_PASSWORD_LENGTH) {
			nextErrors.password = CREATE_NEW_PASSWORD_MESSAGES.passwordMinLength;
		} else if (!/[A-Z]/.test(password)) {
			nextErrors.password = CREATE_NEW_PASSWORD_MESSAGES.passwordUppercase;
		} else if (!/\d/.test(password)) {
			nextErrors.password = CREATE_NEW_PASSWORD_MESSAGES.passwordNumber;
		}

		if (!confirmPassword) {
			nextErrors.confirmPassword =
				CREATE_NEW_PASSWORD_MESSAGES.confirmPasswordRequired;
		} else if (password && password !== confirmPassword) {
			nextErrors.confirmPassword = CREATE_NEW_PASSWORD_MESSAGES.passwordMatch;
		}

		this.errors = nextErrors;

		return Object.keys(nextErrors).length === 0;
	}

	private async handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (this.status === "loading" || this.status === "invalid-link") {
			return;
		}

		if (!this.validateForm()) {
			return;
		}

		this.status = "loading";

		try {
			await authService.createNewPassword(
				this.userId,
				this.secret,
				this.form.password,
			);

			this.form = {
				password: "",
				confirmPassword: "",
			};

			this.errors = {};
			this.status = "success";
		} catch {
			this.status = "error";
		}
	}

	private inputClass(field: keyof CreateNewPasswordForm) {
		const baseClass =
			"w-full rounded-md border bg-neutral-950/80 px-4 py-3 text-white placeholder:text-neutral-500 outline-none transition disabled:cursor-not-allowed disabled:opacity-70";

		const stateClass = this.errors[field]
			? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/40"
			: "border-white/10 focus:border-red-500 focus:ring-2 focus:ring-red-500/40";

		return `${baseClass} ${stateClass}`;
	}

	private renderPasswordError() {
		if (!this.errors.password) {
			return null;
		}

		return html`
			<p id="password-error" role="alert" class="mt-2 text-sm text-red-400">
				${this.errors.password}
			</p>
		`;
	}

	private renderConfirmPasswordError() {
		if (!this.errors.confirmPassword) {
			return null;
		}

		return html`
			<p
				id="confirm-password-error"
				role="alert"
				class="mt-2 text-sm text-red-400"
			>
				${this.errors.confirmPassword}
			</p>
		`;
	}

	private renderErrorMessage() {
		if (this.status !== "error") {
			return null;
		}

		return html`
			<div
				role="alert"
				class="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
			>
				${CREATE_NEW_PASSWORD_MESSAGES.genericError}
			</div>
		`;
	}

	private renderInvalidLink() {
		return html`
			<div class="text-center">
				<h1
					id="create-new-password-title"
					class="text-3xl font-bold tracking-tight text-white"
				>
					Enlace inválido
				</h1>

				<div
					role="alert"
					class="mt-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-left text-sm text-yellow-100"
				>
					<p>${CREATE_NEW_PASSWORD_MESSAGES.invalidLink}</p>
					<p class="mt-2 text-yellow-100/80">
						Solicita un nuevo enlace de recuperación para poder crear una
						contraseña nueva.
					</p>
				</div>

				<div class="mt-8 grid gap-3">
					<a
						href="/forgot-password"
						class="inline-flex items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
					>
						Solicitar nuevo enlace
					</a>

					<a
						href="/login"
						class="inline-flex items-center justify-center rounded-md border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-950"
					>
						Volver a iniciar sesión
					</a>
				</div>
			</div>
		`;
	}

	private renderSuccess() {
		return html`
			<div class="text-center">
				<h1
					id="create-new-password-title"
					class="text-3xl font-bold tracking-tight text-white"
				>
					Contraseña actualizada
				</h1>

				<p class="mt-4 text-base leading-7 text-neutral-300">
					Tu contraseña se ha actualizado correctamente. Ahora puedes iniciar
					sesión con tu nueva contraseña.
				</p>

				<a
					href="/login"
					class="mt-8 inline-flex w-full items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
				>
					Ir a iniciar sesión
				</a>
			</div>
		`;
	}

	private renderForm() {
		const isLoading = this.status === "loading";

		return html`
			<div>
				<h1
					id="create-new-password-title"
					class="text-3xl font-bold tracking-tight text-white"
				>
					Crea una nueva contraseña
				</h1>

				<p class="mt-4 text-base leading-7 text-neutral-300">
					Introduce una nueva contraseña para recuperar el acceso a tu cuenta.
				</p>

				<form
					class="mt-8 space-y-5"
					novalidate
					aria-busy=${isLoading ? "true" : "false"}
					@submit=${this.handleSubmit}
				>
					${this.renderErrorMessage()}

					<div>
						<label
							for="password"
							class="mb-2 block text-sm font-medium text-neutral-200"
						>
							Nueva contraseña
						</label>

						<input
							id="password"
							name="password"
							type="password"
							autocomplete="new-password"
							minlength=${MIN_PASSWORD_LENGTH}
							.value=${this.form.password}
							class=${this.inputClass("password")}
							placeholder="Tu nueva contraseña"
							?disabled=${isLoading}
							aria-invalid=${this.errors.password ? "true" : "false"}
							aria-describedby=${this.errors.password
								? "password-error"
								: nothing}
							@input=${this.handleInput}
						/>

						${this.renderPasswordError()}
					</div>

					<div>
						<label
							for="confirmPassword"
							class="mb-2 block text-sm font-medium text-neutral-200"
						>
							Confirmar contraseña
						</label>

						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							autocomplete="new-password"
							minlength=${MIN_PASSWORD_LENGTH}
							.value=${this.form.confirmPassword}
							class=${this.inputClass("confirmPassword")}
							placeholder="Repite tu nueva contraseña"
							?disabled=${isLoading}
							aria-invalid=${this.errors.confirmPassword ? "true" : "false"}
							aria-describedby=${this.errors.confirmPassword
								? "confirm-password-error"
								: nothing}
							@input=${this.handleInput}
						/>

						${this.renderConfirmPasswordError()}
					</div>

					<button
						type="submit"
						class="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-70"
						?disabled=${isLoading}
					>
						${isLoading
							? "Actualizando contraseña..."
							: "Actualizar contraseña"}
					</button>
				</form>

				<p class="mt-8 text-center text-sm text-neutral-400">
					¿Recordaste tu contraseña?
					<a
						href="/login"
						class="font-semibold text-white underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
					>
						Inicia sesión
					</a>
				</p>
			</div>
		`;
	}

	private renderContent() {
		if (this.status === "invalid-link") {
			return this.renderInvalidLink();
		}

		if (this.status === "success") {
			return this.renderSuccess();
		}

		return this.renderForm();
	}

	render() {
		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
					aria-labelledby="create-new-password-title"
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

					<div class="relative z-10 w-full max-w-md">
						<header class="mb-8 text-center">
							<a
								href="/"
								class="inline-block text-4xl font-black tracking-tight text-red-600"
								aria-label="Ir a la pantalla inicial de Nexlit"
							>
								Nexlit
							</a>
						</header>
						<div
							class="rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl shadow-black/40 backdrop-blur md:p-8"
						>
							${this.renderContent()}
						</div>
					</div>
				</section>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"create-new-password-page": CreateNewPasswordPage;
	}
}
