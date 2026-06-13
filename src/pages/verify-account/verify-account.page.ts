import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authService } from "../../services/auth/auth.service";

type VerifyAccountStatus = "idle" | "loading" | "success" | "error";
type VerifyAccountAction = "confirm" | "resend" | null;

@customElement("verify-account-page")
export class VerifyAccountPage extends LitElement {
	@state()
	private status: VerifyAccountStatus = "idle";

	@state()
	private activeAction: VerifyAccountAction = null;

	@state()
	private errorMessage = "";

	@state()
	private successTitle = "";

	@state()
	private successMessage = "";

	private userId: string | null = null;

	private secret: string | null = null;

	private hasStartedAutoConfirmation = false;

	protected createRenderRoot() {
		return this;
	}

	connectedCallback() {
		super.connectedCallback();

		if (this.hasStartedAutoConfirmation) {
			return;
		}

		this.hasStartedAutoConfirmation = true;

		const params = new URLSearchParams(window.location.search);
		this.userId = params.get("userId")?.trim() ?? null;
		this.secret = params.get("secret")?.trim() ?? null;

		if (this.userId && this.secret) {
			void this.confirmAccount(this.userId, this.secret);
		}
	}

	private async confirmAccount(userId: string, secret: string) {
		this.status = "loading";
		this.activeAction = "confirm";
		this.errorMessage = "";
		this.successTitle = "";
		this.successMessage = "";

		try {
			await authService.confirmVerification(userId, secret);

			this.status = "success";
			this.successTitle = "Cuenta verificada";
			this.successMessage =
				"Tu email fue verificado correctamente. Ya puedes iniciar sesión en Nexlit.";
		} catch (error) {
			this.status = "error";
			this.errorMessage = this.getReadableErrorMessage(
				error,
				"No pudimos verificar tu cuenta. El enlace puede haber expirado o ya haber sido usado.",
			);
		}
	}

	private async handleResendVerification() {
		this.status = "loading";
		this.activeAction = "resend";
		this.errorMessage = "";
		this.successTitle = "";
		this.successMessage = "";

		try {
			await authService.sendVerification(this.getVerificationUrl());

			this.status = "success";
			this.successTitle = "Email de verificación enviado";
			this.successMessage =
				"Te enviamos un nuevo enlace de verificación. Revisa tu bandeja de entrada y tu carpeta de spam.";
		} catch (error) {
			this.status = "error";
			this.errorMessage = this.getReadableErrorMessage(
				error,
				"No pudimos reenviar el email de verificación. Asegúrate de tener una sesión activa.",
			);
		}
	}

	private getVerificationUrl() {
		return `${window.location.origin}/verify-account`;
	}

	private getReadableErrorMessage(error: unknown, fallback: string) {
		if (error instanceof Error && error.message) {
			return error.message;
		}

		return fallback;
	}

	private retryLastAction() {
		if (this.activeAction === "confirm" && this.userId && this.secret) {
			void this.confirmAccount(this.userId, this.secret);
			return;
		}

		if (this.activeAction === "resend") {
			void this.handleResendVerification();
		}
	}

	private renderContent() {
		if (this.status === "loading") {
			const message =
				this.activeAction === "confirm"
					? "Estamos confirmando la verificación de tu cuenta."
					: "Estamos enviando un nuevo email de verificación.";

			return html`
				<div class="space-y-5 text-center" role="status" aria-live="polite">
					<div
						class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"
						aria-hidden="true"
					></div>

					<div class="space-y-2">
						<h1 id="verify-account-title" class="text-3xl font-bold text-white">
							Procesando verificación
						</h1>
						<p class="text-base text-zinc-300">${message}</p>
					</div>
				</div>
			`;
		}

		if (this.status === "success") {
			return html`
				<div class="space-y-6 text-center" role="status" aria-live="polite">
					<div
						class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-400"
						aria-hidden="true"
					>
						✓
					</div>

					<div class="space-y-2">
						<h1 id="verify-account-title" class="text-3xl font-bold text-white">
							${this.successTitle}
						</h1>
						<p class="text-base leading-7 text-zinc-300">
							${this.successMessage}
						</p>
					</div>

					<a
						class="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
						href="/login"
						aria-label="Ir a iniciar sesión"
					>
						Ir a iniciar sesión
					</a>
				</div>
			`;
		}

		if (this.status === "error") {
			return html`
				<div class="space-y-6 text-center" role="alert">
					<div
						class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-3xl text-red-400"
						aria-hidden="true"
					>
						!
					</div>

					<div class="space-y-2">
						<h1 id="verify-account-title" class="text-3xl font-bold text-white">
							No se pudo completar la verificación
						</h1>
						<p class="text-base leading-7 text-zinc-300">
							${this.errorMessage}
						</p>
					</div>

					<div class="space-y-3">
						${this.activeAction
							? html`
									<button
										class="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
										type="button"
										@click=${() => this.retryLastAction()}
									>
										Reintentar
									</button>
								`
							: null}

						<a
							class="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
							href="/login"
						>
							Volver a iniciar sesión
						</a>
					</div>
				</div>
			`;
		}

		return html`
			<div
				class="rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl shadow-black/40 backdrop-blur md:p-8"
			>
				<div
					class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-3xl text-red-400 mb-6"
					aria-hidden="true"
				>
					✉
				</div>

				<div class="space-y-2">
					<h1
						id="verify-account-title"
						class="text-3xl font-bold text-white mb-6"
					>
						Verifica tu cuenta
					</h1>
					<p class="text-base leading-7 text-zinc-300 mb-6">
						Revisa tu email y abre el enlace de verificación que te enviamos.
						Cuando vuelvas a Nexlit con ese enlace, confirmaremos tu cuenta
						automáticamente.
					</p>
				</div>

				<div
					class="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 text-left mb-6"
				>
					<p class="text-sm leading-6 text-zinc-400">
						Si ya iniciaste sesión y necesitas otro enlace, puedes solicitar un
						nuevo email de verificación desde aquí.
					</p>
				</div>

				<div class="space-y-3">
					<button
						class="cursor-pointer inline-flex w-full items-center justify-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
						type="button"
						@click=${() => this.handleResendVerification()}
					>
						Reenviar email de verificación
					</button>

					<a
						class="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
						href="/login"
					>
						Ir a iniciar sesión
					</a>
				</div>
			</div>
		`;
	}

	render() {
		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
					aria-labelledby="verify-account-title"
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

						${this.renderContent()}
					</div>
				</section>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"verify-account-page": VerifyAccountPage;
	}
}
