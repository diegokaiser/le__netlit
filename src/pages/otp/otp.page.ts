import { Router } from "@vaadin/router";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authService } from "../../services/auth/auth.service";

type OtpPageStatus =
	| "idle"
	| "requesting"
	| "code-sent"
	| "verifying"
	| "success"
	| "error";

@customElement("otp-page")
export class OtpPage extends LitElement {
	@state()
	private status: OtpPageStatus = "idle";

	@state()
	private email = "";

	@state()
	private code = "";

	@state()
	private userId = "";

	@state()
	private emailError = "";

	@state()
	private codeError = "";

	@state()
	private feedbackMessage = "";

	protected createRenderRoot() {
		return this;
	}

	private get isRequesting() {
		return this.status === "requesting";
	}

	private get isVerifying() {
		return this.status === "verifying";
	}

	private get isBusy() {
		return this.isRequesting || this.isVerifying;
	}

	private get isCodeStep() {
		return Boolean(this.userId) && this.status !== "success";
	}

	private get isEmailStep() {
		return !this.userId && this.status !== "success";
	}

	private handleEmailInput(event: Event) {
		const input = event.target as HTMLInputElement;
		this.email = input.value;
		this.emailError = "";
		this.clearErrorFeedback();
	}

	private handleCodeInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const sanitizedCode = input.value.replace(/\D/g, "").slice(0, 6);

		this.code = sanitizedCode;
		input.value = sanitizedCode;
		this.codeError = "";
		this.clearErrorFeedback();
	}

	private validateEmail() {
		const normalizedEmail = this.email.trim();

		if (!normalizedEmail) {
			this.emailError = "El email es obligatorio.";
			return false;
		}

		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!emailPattern.test(normalizedEmail)) {
			this.emailError = "Introduce un email válido.";
			return false;
		}

		this.emailError = "";
		return true;
	}

	private validateCode() {
		const normalizedCode = this.code.trim();

		if (!normalizedCode) {
			this.codeError = "El código es obligatorio.";
			return false;
		}

		if (!/^\d+$/.test(normalizedCode)) {
			this.codeError = "El código solo puede contener números.";
			return false;
		}

		if (!/^\d{6}$/.test(normalizedCode)) {
			this.codeError = "El código debe tener 6 dígitos.";
			return false;
		}

		this.codeError = "";
		return true;
	}

	private async handleRequestOtpSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (this.isBusy || !this.validateEmail()) {
			return;
		}

		this.status = "requesting";
		this.feedbackMessage = "";

		try {
			const result = await authService.createEmailOtp(this.email.trim());

			this.userId = result.userId;
			this.code = "";
			this.codeError = "";
			this.status = "code-sent";
			this.feedbackMessage =
				"Te hemos enviado un código de 6 dígitos a tu email.";
		} catch {
			this.status = "error";
			this.feedbackMessage =
				"No pudimos enviar el código. Revisa el email o inténtalo de nuevo.";
		}
	}

	private async handleVerifyOtpSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (this.isBusy || !this.validateCode()) {
			return;
		}

		if (!this.userId) {
			this.status = "error";
			this.feedbackMessage =
				"Primero solicita un código para poder iniciar sesión.";
			return;
		}

		this.status = "verifying";
		this.feedbackMessage = "";

		try {
			await authService.verifyEmailOtp(this.userId, this.code.trim());

			this.status = "success";
			this.feedbackMessage = "Sesión creada correctamente. Redirigiendo...";

			this.code = "";
			this.userId = "";

			await this.updateComplete;

			Router.go("/welcome");
		} catch {
			this.status = "error";
			this.feedbackMessage =
				"No pudimos verificar el código. Comprueba que sea correcto y que no haya expirado.";
		}
	}

	private async handleResendCode() {
		if (this.isBusy || !this.validateEmail()) {
			return;
		}

		this.status = "requesting";
		this.feedbackMessage = "";

		try {
			const result = await authService.createEmailOtp(this.email.trim());

			this.userId = result.userId;
			this.code = "";
			this.codeError = "";
			this.status = "code-sent";
			this.feedbackMessage = "Código reenviado correctamente.";
		} catch {
			this.status = "error";
			this.feedbackMessage =
				"No pudimos reenviar el código. Inténtalo de nuevo más tarde.";
		}
	}

	private handleEditEmail() {
		if (this.isBusy) {
			return;
		}

		this.userId = "";
		this.code = "";
		this.codeError = "";
		this.status = "idle";
		this.feedbackMessage = "";
	}

	private clearErrorFeedback() {
		if (this.status === "error") {
			this.status = this.userId ? "code-sent" : "idle";
			this.feedbackMessage = "";
		}
	}

	private renderFeedback() {
		if (!this.feedbackMessage) {
			return nothing;
		}

		const isError = this.status === "error";
		const isSuccess = this.status === "success";

		const classes = isError
			? "border-red-500/40 bg-red-500/10 text-red-200"
			: isSuccess
				? "border-green-500/40 bg-green-500/10 text-green-200"
				: "border-zinc-700 bg-zinc-900 text-zinc-200";

		return html`
			<p
				class=${`mt-5 rounded-lg border px-4 py-3 text-sm ${classes}`}
				role=${isError ? "alert" : "status"}
				aria-live="polite"
			>
				${this.feedbackMessage}
			</p>
		`;
	}

	private renderEmailStep() {
		return html`
			<form
				class="mt-8 space-y-5"
				novalidate
				@submit=${this.handleRequestOtpSubmit}
			>
				<div>
					<label
						class="mb-2 block text-sm font-medium text-zinc-200"
						for="otp-email"
					>
						Email
					</label>

					<input
						id="otp-email"
						class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-red-600 focus:ring-2 focus:ring-red-600/30"
						type="email"
						name="email"
						autocomplete="email"
						placeholder="tu@email.com"
						.value=${this.email}
						?disabled=${this.isBusy}
						aria-invalid=${this.emailError ? "true" : "false"}
						aria-describedby="otp-email-error"
						@input=${this.handleEmailInput}
					/>

					${this.emailError
						? html`
								<p id="otp-email-error" class="mt-2 text-sm text-red-300">
									${this.emailError}
								</p>
							`
						: nothing}
				</div>

				<button
					class="cursor-pointer w-full rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
					type="submit"
					?disabled=${this.isBusy}
				>
					${this.isRequesting ? "Enviando código..." : "Enviar código"}
				</button>
			</form>
		`;
	}

	private renderCodeStep() {
		return html`
			<form
				class="mt-8 space-y-5"
				novalidate
				@submit=${this.handleVerifyOtpSubmit}
			>
				<div class="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
					<p class="text-sm text-zinc-400">Código enviado a</p>
					<p class="mt-1 break-all text-sm font-medium text-zinc-100">
						${this.email}
					</p>

					<button
						class="mt-3 text-sm font-medium text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
						type="button"
						?disabled=${this.isBusy}
						@click=${this.handleEditEmail}
					>
						Editar email
					</button>
				</div>

				<div>
					<label
						class="mb-2 block text-sm font-medium text-zinc-200"
						for="otp-code"
					>
						Código OTP
					</label>

					<input
						id="otp-code"
						class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-2xl tracking-[0.35em] text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/30"
						type="text"
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="6"
						placeholder="000000"
						.value=${this.code}
						?disabled=${this.isBusy}
						aria-invalid=${this.codeError ? "true" : "false"}
						aria-describedby="otp-code-error"
						@input=${this.handleCodeInput}
					/>

					${this.codeError
						? html`
								<p id="otp-code-error" class="mt-2 text-sm text-red-300">
									${this.codeError}
								</p>
							`
						: nothing}
				</div>

				<button
					class="cursor-pointer w-full rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
					type="submit"
					?disabled=${this.isBusy}
				>
					${this.isVerifying ? "Verificando..." : "Verificar e iniciar sesión"}
				</button>

				<button
					class="cursor-pointer w-full rounded-lg border border-zinc-700 px-5 py-3 font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
					type="button"
					?disabled=${this.isBusy}
					@click=${this.handleResendCode}
				>
					${this.isRequesting ? "Reenviando..." : "Reenviar código"}
				</button>
			</form>
		`;
	}

	render() {
		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
					aria-labelledby="otp-title"
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

						<div class="rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
							<p
								class="text-sm font-semibold uppercase tracking-[0.3em] text-red-500"
							>
								Acceso sin contraseña
							</p>

							<h1 id="otp-title" class="mt-3 text-3xl font-black">
								Inicia sesión con código
							</h1>

							<p class="mt-3 text-sm leading-6 text-zinc-400">
								Introduce tu email y te enviaremos un código de 6 dígitos.
								Después confirma el código para crear tu sesión de forma segura.
							</p>
              ${this.renderFeedback()}
              ${this.isEmailStep ? this.renderEmailStep() : nothing}
              ${this.isCodeStep ? this.renderCodeStep() : nothing}
              ${
								this.status === "success"
									? html`
											<div
												class="mt-8 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-200"
											>
												Tu sesión se ha creado correctamente.
											</div>
										`
									: nothing
							}
						</div>

						<footer class="mt-8">
							<p class="text-sm text-zinc-400">
								¿Prefieres usar contraseña?
								<a
									class="font-medium text-red-400 transition hover:text-red-300"
									href="/login"
								>
									Ir a login
								</a>
							</p>

							<p class="mt-3 text-sm text-zinc-400">
								¿Aún no tienes cuenta?
								<a
									class="font-medium text-red-400 transition hover:text-red-300"
									href="/register"
								>
									Crear cuenta
								</a>
							</p>
						</footer>
					</article>
				</section>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"otp-page": OtpPage;
	}
}
