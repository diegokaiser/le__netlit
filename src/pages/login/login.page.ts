import { Router } from "@vaadin/router";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authService } from "../../services/auth/auth.service";
import type {
	AuthStatus,
	LoginFormErrors,
	LoginPayload,
} from "../../services/auth/auth.types";

@customElement("login-page")
export class LoginPage extends LitElement {
	@state()
	private form: LoginPayload = {
		email: "",
		password: "",
	};

	@state()
	private errors: LoginFormErrors = {};

	@state()
	private status: AuthStatus = "idle";

	@state()
	private generalError = "";

	protected createRenderRoot() {
		return this;
	}

	private get isLoading() {
		return this.status === "loading";
	}

	private handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const { name, value } = input;

		if (name !== "email" && name !== "password") {
			return;
		}

		this.form = {
			...this.form,
			[name]: value,
		};

		if (this.errors[name]) {
			this.errors = {
				...this.errors,
				[name]: undefined,
			};
		}

		if (this.generalError) {
			this.generalError = "";
		}

		if (this.status === "error" || this.status === "success") {
			this.status = "idle";
		}
	}

	private validateForm() {
		const nextErrors: LoginFormErrors = {};
		const email = this.form.email.trim();

		if (!email) {
			nextErrors.email = "El email es obligatorio.";
		} else if (!this.isValidEmail(email)) {
			nextErrors.email = "Introduce un email válido.";
		}

		if (!this.form.password) {
			nextErrors.password = "La contraseña es obligatoria.";
		}

		this.errors = nextErrors;

		return Object.keys(nextErrors).length === 0;
	}

	private isValidEmail(email: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	private async handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (this.isLoading) {
			return;
		}

		this.generalError = "";

		if (!this.validateForm()) {
			this.status = "idle";
			return;
		}

		this.status = "loading";

		try {
			await authService.login({
				email: this.form.email.trim(),
				password: this.form.password,
			});

			this.status = "success";

			Router.go("/welcome");
		} catch (error) {
			this.status = "error";
			this.generalError = this.getErrorMessage(error);
		}
	}

	private getErrorMessage(error: unknown) {
		if (error instanceof Error && error.message) {
			return error.message;
		}

		return "No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.";
	}

	render() {
		const emailErrorId = "login-email-error";
		const passwordErrorId = "login-password-error";

		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
					aria-labelledby="login-title"
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

						<form
							class="rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl shadow-black/40 backdrop-blur md:p-8"
							novalidate
							aria-busy=${this.isLoading ? "true" : "false"}
							@submit=${this.handleSubmit}
						>
							<div class="mb-6">
								<p
									class="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-red-500"
								>
									Bienvenido de nuevo
								</p>
								<h1 id="login-title" class="text-3xl font-bold text-white">
									Iniciar sesión
								</h1>
								<p class="mt-3 text-sm leading-6 text-neutral-400">
									Accede con tu email y contraseña para continuar en Nexlit.
								</p>
							</div>

							${this.generalError
								? html`
										<p
											class="mb-5 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200"
											role="alert"
										>
											${this.generalError}
										</p>
									`
								: nothing}
							${this.status === "success"
								? html`
										<p
											class="mb-5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
											role="status"
										>
											Login correcto. Redirigiendo...
										</p>
									`
								: nothing}

							<div class="space-y-5">
								<div>
									<label
										for="login-email"
										class="mb-2 block text-sm font-medium text-neutral-200"
									>
										Email
									</label>
									<input
										id="login-email"
										name="email"
										type="email"
										autocomplete="email"
										.value=${this.form.email}
										?disabled=${this.isLoading}
										aria-invalid=${this.errors.email ? "true" : "false"}
										aria-describedby=${this.errors.email
											? emailErrorId
											: nothing}
										class="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-500 focus:border-red-600 focus:ring-2 focus:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-70"
										placeholder="tu@email.com"
										@input=${this.handleInput}
									/>
									${this.errors.email
										? html`
												<p id=${emailErrorId} class="mt-2 text-sm text-red-400">
													${this.errors.email}
												</p>
											`
										: nothing}
								</div>

								<div>
									<div class="mb-2 flex items-center justify-between gap-4">
										<label
											for="login-password"
											class="block text-sm font-medium text-neutral-200"
										>
											Contraseña
										</label>
										<a
											href="/forgot-password"
											class="text-sm font-medium text-red-500 transition hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-600/60"
										>
											¿Olvidaste tu contraseña?
										</a>
									</div>

									<input
										id="login-password"
										name="password"
										type="password"
										autocomplete="current-password"
										.value=${this.form.password}
										?disabled=${this.isLoading}
										aria-invalid=${this.errors.password ? "true" : "false"}
										aria-describedby=${this.errors.password
											? passwordErrorId
											: nothing}
										class="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-500 focus:border-red-600 focus:ring-2 focus:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-70"
										placeholder="Tu contraseña"
										@input=${this.handleInput}
									/>
									${this.errors.password
										? html`
												<p
													id=${passwordErrorId}
													class="mt-2 text-sm text-red-400"
												>
													${this.errors.password}
												</p>
											`
										: nothing}
								</div>
							</div>

							<button
								type="submit"
								?disabled=${this.isLoading}
								class="cursor-pointer mt-7 w-full rounded-lg bg-red-600 px-5 py-3 text-base font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:bg-red-900 disabled:text-neutral-300"
							>
								${this.isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
							</button>

							<p class="mt-6 text-center text-sm text-neutral-400">
								¿Todavía no tienes cuenta?
								<a
									href="/register"
									class="font-semibold text-white underline decoration-red-600 underline-offset-4 transition hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-600/60"
								>
									Regístrate
								</a>
							</p>
						</form>
					</div>
				</section>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"login-page": LoginPage;
	}
}
