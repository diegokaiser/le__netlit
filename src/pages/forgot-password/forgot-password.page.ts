import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authService } from "../../services/auth/auth.service";
import {
	EMAIL_PATTERN,
	FORGOT_PASSWORD_TEXT,
	PASSWORD_RECOVERY_REDIRECT_URL,
} from "./forgot-password.constants";

type ForgotPasswordStatus = "idle" | "loading" | "success" | "error";

@customElement("forgot-password-page")
export class ForgotPasswordPage extends LitElement {
	@state()
	private email = "";

	@state()
	private emailError = "";

	@state()
	private status: ForgotPasswordStatus = "idle";

	@state()
	private formMessage = "";

	protected createRenderRoot() {
		return this;
	}

	private handleEmailInput(event: Event) {
		const input = event.target as HTMLInputElement;

		this.email = input.value;
		this.emailError = "";

		if (this.status === "error") {
			this.status = "idle";
			this.formMessage = "";
		}
	}

	private validateEmail() {
		const email = this.email.trim();

		if (!email) {
			this.emailError = FORGOT_PASSWORD_TEXT.validation.emailRequired;
			return false;
		}

		if (!EMAIL_PATTERN.test(email)) {
			this.emailError = FORGOT_PASSWORD_TEXT.validation.emailInvalid;
			return false;
		}

		this.emailError = "";
		return true;
	}

	private async handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		this.formMessage = "";
		this.status = "idle";

		if (!this.validateEmail()) {
			return;
		}

		this.status = "loading";

		try {
			await authService.forgotPassword(
				this.email.trim(),
				PASSWORD_RECOVERY_REDIRECT_URL,
			);

			this.status = "success";
			this.formMessage = FORGOT_PASSWORD_TEXT.feedback.success;
		} catch {
			this.status = "error";
			this.formMessage = FORGOT_PASSWORD_TEXT.feedback.error;
		}
	}

	private renderFeedback() {
		if (this.status === "loading") {
			return html`
				<p
					class="mt-4 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300"
					role="status"
					aria-live="polite"
				>
					${FORGOT_PASSWORD_TEXT.feedback.loading}
				</p>
			`;
		}

		if (this.status === "success") {
			return html`
				<div
					class="mt-4 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
					role="status"
					aria-live="polite"
				>
					<p>${this.formMessage}</p>

					<a
						class="mt-4 inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
						href="/login"
					>
						${FORGOT_PASSWORD_TEXT.links.backToLogin}
					</a>
				</div>
			`;
		}

		if (this.status === "error") {
			return html`
				<p
					class="mt-4 rounded-md border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
					role="alert"
				>
					${this.formMessage}
				</p>
			`;
		}

		return "";
	}

	render() {
		const isLoading = this.status === "loading";

		return html`
			<main class="min-h-screen bg-neutral-950 text-white">
				<section
					class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
					aria-labelledby="forgot-password-title"
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
								aria-label="${FORGOT_PASSWORD_TEXT.links
									.backToWelcomeAriaLabel}"
							>
								${FORGOT_PASSWORD_TEXT.brand}
							</a>
						</header>

						<article
							class="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-8 shadow-2xl shadow-red-950/20"
						>
							<div>
								<p
									class="text-sm font-medium uppercase tracking-[0.25em] text-red-500"
								>
									${FORGOT_PASSWORD_TEXT.page.eyebrow}
								</p>

								<h1
									id="forgot-password-title"
									class="mt-3 text-3xl font-bold tracking-tight"
								>
									${FORGOT_PASSWORD_TEXT.page.title}
								</h1>

								<p class="mt-3 text-sm leading-6 text-zinc-400">
									${FORGOT_PASSWORD_TEXT.page.description}
								</p>
							</div>

							<form
								class="mt-8 space-y-5"
								novalidate
								@submit=${this.handleSubmit}
								aria-busy=${isLoading ? "true" : "false"}
							>
								<div>
									<label
										class="mb-2 block text-sm font-medium text-zinc-200"
										for="forgot-password-email"
									>
										${FORGOT_PASSWORD_TEXT.form.emailLabel}
									</label>

									<input
										id="forgot-password-email"
										class="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/40"
										type="email"
										name="email"
										autocomplete="email"
										.placeholder=${FORGOT_PASSWORD_TEXT.form.emailPlaceholder}
										.value=${this.email}
										?disabled=${isLoading}
										aria-invalid=${this.emailError ? "true" : "false"}
										aria-describedby=${this.emailError
											? "forgot-password-email-error"
											: "forgot-password-email-help"}
										@input=${this.handleEmailInput}
									/>

									${this.emailError
										? html`
												<p
													id="forgot-password-email-error"
													class="mt-2 text-sm text-red-400"
													role="alert"
												>
													${this.emailError}
												</p>
											`
										: html`
												<p
													id="forgot-password-email-help"
													class="mt-2 text-sm text-zinc-500"
												>
													${FORGOT_PASSWORD_TEXT.form.emailHelp}
												</p>
											`}
								</div>

								<button
									class="cursor-pointer w-full rounded-md bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
									type="submit"
									?disabled=${isLoading}
								>
									${isLoading
										? FORGOT_PASSWORD_TEXT.form.submitLoading
										: FORGOT_PASSWORD_TEXT.form.submit}
								</button>
							</form>

							${this.renderFeedback()}

							<footer class="mt-6 text-center text-sm text-zinc-400">
								<a
									class="font-medium text-white underline-offset-4 transition hover:text-red-400 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
									href="/login"
								>
									${FORGOT_PASSWORD_TEXT.links.backToLogin}
								</a>
							</footer>
						</article>
					</div>
				</section>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"forgot-password-page": ForgotPasswordPage;
	}
}
