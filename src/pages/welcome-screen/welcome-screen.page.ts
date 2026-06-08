import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { ROUTES } from "../../core/config/routes";

@customElement("app-welcome-screen-page")
export class WelcomeScreenPage extends LitElement {
	protected createRenderRoot() {
		return this;
	}

	render() {
		return html`
			<main class="min-h-screen bg-black text-white">
				<div class="min-h-screen overflow-hidden bg-neutral-950 text-white">
					<div class="relative min-h-screen">
						<div
							class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.35),transparent_34%),linear-gradient(to_bottom,rgba(10,10,10,0.55),rgba(10,10,10,0.95)),linear-gradient(to_right,rgba(10,10,10,1),rgba(10,10,10,0.75),rgba(10,10,10,1))]"
							aria-hidden="true"
						></div>

						<div
							class="absolute -right-32 top-32 h-80 w-80 rounded-full bg-red-700/20 blur-3xl md:h-[28rem] md:w-[28rem]"
							aria-hidden="true"
						></div>

						<div
							class="absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-red-900/20 blur-3xl"
							aria-hidden="true"
						></div>

						<div class="relative z-10 flex min-h-screen flex-col">
							<header
								class="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10"
							>
								<a
									href="${ROUTES.welcomeScreen}"
									class="inline-flex items-center gap-2 rounded-md text-2xl font-black tracking-tight text-red-600 outline-none transition hover:text-red-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:text-3xl"
									aria-label="Ir a la pantalla de bienvenida"
								>
									<span>Nexlit</span>
								</a>

								<nav aria-label="Navegación principal">
									<a
										href="${ROUTES.login}"
										class="inline-flex min-h-10 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:px-5"
									>
										Iniciar sesión
									</a>
								</nav>
							</header>

							<main
								class="mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-12 sm:px-8 lg:px-10"
							>
								<section
									class="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]"
									aria-labelledby="welcome-title"
								>
									<div class="max-w-3xl text-center lg:text-left">
										<p
											class="mb-4 text-sm font-bold uppercase tracking-[0.35em] text-red-500"
										>
											Películas, series y documentales
										</p>

										<h1
											id="welcome-title"
											class="text-4xl font-black leading-3xl tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
										>
											Todo el entretenimiento en una sola pantalla.
										</h1>

										<p
											class="mx-auto mt-6 max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg md:text-xl lg:mx-0"
										>
											Explora una experiencia inspirada en las grandes
											plataformas de streaming. Crea tu perfil, descubre
											contenido y navega por categorías diseñadas para
											películas, series y documentales.
										</p>

										<div
											class="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
										>
											<a
												href="${ROUTES.register}"
												class="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-red-600 px-7 py-3 text-base font-bold text-white shadow-xl shadow-red-950/40 transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
											>
												Crear cuenta
											</a>

											<a
												href="${ROUTES.login}"
												class="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white/20 bg-white/10 px-7 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
											>
												Ya tengo cuenta
											</a>
										</div>

										<p class="mt-6 text-sm text-neutral-400">
											Proyecto educativo construido con Lit, TypeScript,
											Tailwind CSS, Appwrite y TMDB.
										</p>
									</div>

									<aside
										class="mx-auto hidden w-full max-w-md lg:block"
										aria-label="Vista previa visual de la plataforma"
									>
										<div
											class="relative rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/50 backdrop-blur"
										>
											<div
												class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950"
											>
												<div
													class="aspect-video bg-gradient-to-br from-red-700 via-neutral-900 to-black p-5"
												>
													<div class="flex h-full flex-col justify-between">
														<div class="flex items-center gap-2">
															<span
																class="h-3 w-3 rounded-full bg-red-500"
															></span>
															<span
																class="h-3 w-3 rounded-full bg-neutral-500"
															></span>
															<span
																class="h-3 w-3 rounded-full bg-neutral-700"
															></span>
														</div>

														<div>
															<div
																class="mb-3 h-4 w-2/3 rounded-full bg-white/80"
															></div>
															<div
																class="h-3 w-1/2 rounded-full bg-white/40"
															></div>
														</div>
													</div>
												</div>

												<div class="space-y-4 p-5">
													<div class="flex gap-3">
														<div
															class="h-24 flex-1 rounded-lg bg-red-900/80"
														></div>
														<div
															class="h-24 flex-1 rounded-lg bg-neutral-800"
														></div>
														<div
															class="h-24 flex-1 rounded-lg bg-neutral-700"
														></div>
													</div>

													<div class="flex gap-3">
														<div
															class="h-20 flex-1 rounded-lg bg-neutral-800"
														></div>
														<div
															class="h-20 flex-1 rounded-lg bg-neutral-700"
														></div>
														<div
															class="h-20 flex-1 rounded-lg bg-red-950/80"
														></div>
													</div>
												</div>
											</div>

											<div
												class="absolute -right-4 -top-4 rounded-2xl border border-red-500/20 bg-red-600 px-4 py-3 text-sm font-bold shadow-xl shadow-red-950/50"
											>
												Nuevo
											</div>
										</div>
									</aside>
								</section>
							</main>

							<footer
								class="relative z-10 px-5 pb-6 text-center text-xs text-neutral-500 sm:px-8"
							>
								<p>
									Nexlit Clone · Proyecto educativo sin afiliación con Netflix.
								</p>
							</footer>
						</div>
					</div>
				</div>
			</main>
		`;
	}
}
