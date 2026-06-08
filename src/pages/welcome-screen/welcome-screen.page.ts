import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("app-welcome-screen-page")
export class WelcomeScreenPage extends LitElement {
	protected createRenderRoot() {
		return this;
	}

	render() {
		return html`
			<main class="min-h-screen bg-black text-white">
				<section
					class="min-h-screen flex flex-col items-center justify-center px-6 text-center"
				>
					<p class="mb-4 text-sm uppercase tracking-[0.4em] text-red-600">
						Sprint 0
					</p>

					<h1 class="max-w-4xl text-4xl font-black md:text-6xl">
						Netflix Clone con LitElement
					</h1>

					<p class="mt-6 max-w-2xl text-lg text-neutral-300 md:text-xl">
						Proyecto educativo para dominar Lit, TypeScript, Tailwind, Appwrite
						y TMDB a nivel intermedio-avanzado.
					</p>

					<div class="mt-10 flex flex-col gap-4 sm:flex-row">
						<a
							href="/login"
							class="rounded bg-red-600 px-8 py-3 font-semibold text-white transition hover:bg-red-700"
						>
							Iniciar sesión
						</a>

						<a
							href="/register"
							class="rounded bg-neutral-800 px-8 py-3 font-semibold text-white transition hover:bg-neutral-700"
						>
							Crear cuenta
						</a>
					</div>
				</section>
			</main>
		`;
	}
}
