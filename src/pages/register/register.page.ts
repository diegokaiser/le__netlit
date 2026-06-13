// src/pages/register/register.page.ts

import { AppwriteException } from "appwrite";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authService } from "../../services/auth/auth.service";

type RegisterForm = {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterForm, string>>;

type RegisterStatus = "idle" | "loading" | "success" | "error";

@customElement("register-page")
export class RegisterPage extends LitElement {
	@state()
	private form: RegisterForm = {
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
	};

	@state()
	private errors: RegisterFormErrors = {};

	@state()
	private status: RegisterStatus = "idle";

	@state()
	private submitError = "";

	protected createRenderRoot() {
		return this;
	}

	private get isLoading() {
		return this.status === "loading";
	}

	private handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const fieldName = input.name as keyof RegisterForm;

		this.form = {
			...this.form,
			[fieldName]: input.value,
		};

		if (this.errors[fieldName]) {
			const nextErrors = { ...this.errors };
			delete nextErrors[fieldName];
			this.errors = nextErrors;
		}

		if (this.status === "error" || this.status === "success") {
			this.status = "idle";
			this.submitError = "";
		}
	}

	private validateForm(): RegisterFormErrors {
		const errors: RegisterFormErrors = {};

		const name = this.form.name.trim();
		const email = this.form.email.trim();
		const password = this.form.password;
		const confirmPassword = this.form.confirmPassword;

		if (!name) {
			errors.name = "El nombre es obligatorio.";
		} else if (name.length < 2) {
			errors.name = "El nombre debe tener al menos 2 caracteres.";
		} else if (name.length > 128) {
			errors.name = "El nombre no puede superar los 128 caracteres.";
		}

		if (!email) {
			errors.email = "El email es obligatorio.";
		} else if (!this.isValidEmail(email)) {
			errors.email = "Introduce un email válido.";
		}

		if (!password) {
			errors.password = "La contraseña es obligatoria.";
		} else if (password.length < 8) {
			errors.password = "La contraseña debe tener al menos 8 caracteres.";
		} else if (password.length > 256) {
			errors.password = "La contraseña no puede superar los 256 caracteres.";
		} else if (!/[A-Z]/.test(password)) {
			errors.password = "La contraseña debe incluir al menos una mayúscula.";
		} else if (!/[0-9]/.test(password)) {
			errors.password = "La contraseña debe incluir al menos un número.";
		}

		if (!confirmPassword) {
			errors.confirmPassword = "Confirma tu contraseña.";
		} else if (password !== confirmPassword) {
			errors.confirmPassword = "Las contraseñas no coinciden.";
		}

		return errors;
	}

	private isValidEmail(email: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	private async handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (this.isLoading) {
			return;
		}

		const errors = this.validateForm();
		this.errors = errors;
		this.submitError = "";

		if (Object.keys(errors).length > 0) {
			this.status = "idle";
			return;
		}

		this.status = "loading";

		try {
			await authService.register({
				name: this.form.name.trim(),
				email: this.form.email.trim(),
				password: this.form.password,
			});

			this.form = {
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
			};

			this.errors = {};
			this.status = "success";
		} catch (error) {
			this.status = "error";
			this.submitError = this.getSubmitErrorMessage(error);
		}
	}

	private getSubmitErrorMessage(error: unknown) {
		if (error instanceof AppwriteException) {
			if (error.code === 409) {
				return "Ya existe una cuenta registrada con este email.";
			}

			return (
				error.message || "No se pudo crear la cuenta. Inténtalo nuevamente."
			);
		}

		return "No se pudo crear la cuenta. Inténtalo nuevamente.";
	}

	private inputClass(fieldName: keyof RegisterForm) {
		const hasError = Boolean(this.errors[fieldName]);

		return [
			"w-full rounded-md border bg-black/40 px-4 py-3 text-sm text-white outline-none transition",
			"placeholder:text-zinc-500 focus:ring-2",
			hasError
				? "border-red-500 focus:border-red-400 focus:ring-red-500/30"
				: "border-white/15 focus:border-red-500 focus:ring-red-500/30",
		].join(" ");
	}

	private renderFieldError(fieldName: keyof RegisterForm) {
		const error = this.errors[fieldName];

		if (!error) {
			return nothing;
		}

		return html`
			<p id="${fieldName}-error" class="mt-2 text-sm text-red-400">${error}</p>
		`;
	}

	render() {
		return html`
			<main class="min-h-screen bg-black text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10"
					aria-labelledby="register-title"
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
								class="inline-block text-3xl font-extrabold uppercase tracking-tight text-red-600"
								aria-label="Volver a la pantalla de inicio de Nexlit"
							>
								Nexlit
							</a>

							<h1
								id="register-title"
								class="mt-8 text-3xl font-bold tracking-tight sm:text-4xl"
							>
								Crear cuenta
							</h1>

							<p class="mt-3 text-sm leading-6 text-zinc-300">
								Empieza a explorar películas, series y documentales desde una
								experiencia inspirada en Netflix.
							</p>
						</header>

						<form
							class="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-red-950/20 backdrop-blur sm:p-8"
							@submit=${this.handleSubmit}
							novalidate
							aria-describedby="register-form-description"
						>
							<p id="register-form-description" class="sr-only">
								Formulario para crear una nueva cuenta en Nexlit.
							</p>

							<div class="space-y-5">
								<div>
									<label
										for="name"
										class="mb-2 block text-sm font-medium text-zinc-200"
									>
										Nombre
									</label>
									<input
										id="name"
										name="name"
										type="text"
										autocomplete="name"
										.value=${this.form.name}
										class=${this.inputClass("name")}
										placeholder="Tu nombre"
										?disabled=${this.isLoading}
										aria-invalid=${this.errors.name ? "true" : "false"}
										aria-describedby=${this.errors.name
											? "name-error"
											: nothing}
										@input=${this.handleInput}
									/>
									${this.errors.name
										? html`
												<p
													id="name-error"
													role="alert"
													class="text-red-500 text-sm"
												>
													${this.errors.name}
												</p>
											`
										: null}
									${this.renderFieldError("name")}
								</div>

								<div>
									<label
										for="email"
										class="mb-2 block text-sm font-medium text-zinc-200"
									>
										Email
									</label>
									<input
										id="email"
										name="email"
										type="email"
										autocomplete="email"
										.value=${this.form.email}
										class=${this.inputClass("email")}
										placeholder="tu@email.com"
										?disabled=${this.isLoading}
										aria-invalid=${this.errors.email ? "true" : "false"}
										aria-describedby=${this.errors.email
											? "email-error"
											: nothing}
										@input=${this.handleInput}
									/>
									${this.errors.email
										? html`
												<p
													id="email-error"
													role="alert"
													class="text-red-500 text-sm"
												>
													${this.errors.email}
												</p>
											`
										: null}
									${this.renderFieldError("email")}
								</div>

								<div>
									<label
										for="password"
										class="mb-2 block text-sm font-medium text-zinc-200"
									>
										Contraseña
									</label>
									<input
										id="password"
										name="password"
										type="password"
										autocomplete="new-password"
										.value=${this.form.password}
										class=${this.inputClass("password")}
										placeholder="Mínimo 8 caracteres"
										?disabled=${this.isLoading}
										aria-invalid=${this.errors.password ? "true" : "false"}
										aria-describedby=${this.errors.password
											? "password-error"
											: nothing}
										@input=${this.handleInput}
									/>
									${this.errors.password
										? html`
												<p
													id="password-error"
													role="alert"
													class="text-red-500 text-sm"
												>
													${this.errors.password}
												</p>
											`
										: null}
									${this.renderFieldError("password")}
								</div>

								<div>
									<label
										for="confirmPassword"
										class="mb-2 block text-sm font-medium text-zinc-200"
									>
										Confirmar contraseña
									</label>
									<input
										id="confirmPassword"
										name="confirmPassword"
										type="password"
										autocomplete="new-password"
										.value=${this.form.confirmPassword}
										class=${this.inputClass("confirmPassword")}
										placeholder="Repite tu contraseña"
										?disabled=${this.isLoading}
										aria-invalid=${this.errors.confirmPassword
											? "true"
											: "false"}
										aria-describedby=${this.errors.confirmPassword
											? "confirmPassword-error"
											: nothing}
										@input=${this.handleInput}
									/>
									${this.errors.confirmPassword
										? html`
												<p
													id="confirm-password-error"
													role="alert"
													class="text-red-500 text-sm"
												>
													${this.errors.confirmPassword}
												</p>
											`
										: null}
									${this.renderFieldError("confirmPassword")}
								</div>
							</div>

							${this.status === "error"
								? html`
										<div
											class="mt-5 rounded-md border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
											role="alert"
										>
											${this.submitError}
										</div>
									`
								: nothing}
							${this.status === "success"
								? html`
										<div
											class="mt-5 rounded-md border border-green-500/30 bg-green-950/40 px-4 py-3 text-sm text-green-200"
											role="status"
											aria-live="polite"
										>
											Cuenta creada correctamente. En un próximo sprint
											conectaremos el inicio de sesión.
										</div>
									`
								: nothing}

							<button
								type="submit"
								class="mt-6 flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
								?disabled=${this.isLoading}
							>
								${this.isLoading ? "Creando cuenta..." : "Crear cuenta"}
							</button>

							<p class="mt-6 text-center text-sm text-zinc-400">
								¿Ya tienes una cuenta?
								<a
									href="/login"
									class="font-medium text-white underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
								>
									Inicia sesión
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
		"register-page": RegisterPage;
	}
}
