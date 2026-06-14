import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { buildCategoryRoute, ROUTES } from "../../../core/config/routes";

@customElement("app-navbar")
export class AppNavbar extends LitElement {
	@property({ type: String })
	profileName = "";

	@property({ type: String })
	profileAvatar = "";

	static styles = css`
		:host {
			position: relative;
			z-index: 20;
			display: block;
		}

		header {
			position: absolute;
			top: 0;
			right: 0;
			left: 0;
			display: flex;
			min-height: 4.5rem;
			gap: 1rem;
			align-items: center;
			padding: 0.75rem clamp(1rem, 4vw, 3.5rem);
			color: #ffffff;
			background: linear-gradient(
				180deg,
				rgba(9, 9, 11, 0.94),
				rgba(9, 9, 11, 0)
			);
		}

		.brand {
			flex: 0 0 auto;
			color: #e50914;
			font-size: clamp(1.4rem, 3vw, 2rem);
			font-weight: 900;
			letter-spacing: -0.06em;
			text-decoration: none;
		}

		nav {
			display: flex;
			gap: clamp(0.75rem, 2vw, 1.5rem);
			align-items: center;
		}

		nav a,
		.profile-link {
			color: #ffffff;
			font-size: 0.93rem;
			text-decoration: none;
		}

		nav a:hover,
		.profile-link:hover {
			text-decoration: underline;
			text-underline-offset: 0.3rem;
		}

		a:focus-visible {
			outline: 3px solid #ffffff;
			outline-offset: 4px;
			border-radius: 0.25rem;
		}

		.profile {
			display: flex;
			gap: 0.65rem;
			align-items: center;
			margin-left: auto;
		}

		.avatar {
			width: 2.25rem;
			height: 2.25rem;
			object-fit: cover;
			background: #3f3f46;
			border-radius: 0.35rem;
		}

		.profile-copy {
			display: grid;
			gap: 0.1rem;
		}

		.profile-name {
			font-size: 0.85rem;
			font-weight: 700;
		}

		.profile-link {
			color: #d4d4d8;
			font-size: 0.75rem;
		}

		@media (max-width: 760px) {
			nav {
				display: none;
			}
		}

		@media (max-width: 480px) {
			.profile-name {
				display: none;
			}

			.profile-copy {
				display: block;
			}
		}
	`;

	protected render() {
		return html`
			<header>
				<a
					class="brand"
					href=${ROUTES.welcome}
					aria-label="Nexlit, ir al inicio"
				>
					NEXLIT
				</a>

				<nav aria-label="Navegación principal">
					<a href=${ROUTES.welcome}>Inicio</a>
					<a href=${buildCategoryRoute("movies")}>Películas</a>
					<a href=${buildCategoryRoute("series")}>Series</a>
					<a href=${buildCategoryRoute("documentaries")}> Documentales </a>
				</nav>

				<div class="profile">
					${this.profileAvatar
						? html`
								<img
									class="avatar"
									src=${this.profileAvatar}
									alt=${`Avatar de ${this.profileName || "perfil activo"}`}
									width="36"
									height="36"
								/>
							`
						: nothing}

					<div class="profile-copy">
						<span class="profile-name">
							${this.profileName || "Perfil activo"}
						</span>

						<a class="profile-link" href=${ROUTES.profiles}> Cambiar perfil </a>
					</div>
				</div>
			</header>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"app-navbar": AppNavbar;
	}
}
