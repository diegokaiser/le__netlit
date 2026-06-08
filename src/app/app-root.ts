import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";

import { initRouter } from "./app-router";

@customElement("app-root")
export class AppRoot extends LitElement {
	// busca #router-outlet en el template
	@query("#router-outlet")
	// guarda la referencia en routerOutlet
	private routerOutlet!: HTMLElement;

	// usa light DOM para aplicar estilos globales
	protected createRenderRoot() {
		return this;
	}

	// ejecutado solo una vez despues del primer render
	firstUpdated() {
		// recibe el elemento routerOutlet donde se va a renderizar las paginas
		initRouter(this.routerOutlet);
	}

	render() {
		// contenedor donde el router renderizara las paginas
		return html` <main id="router-outlet"></main> `;
	}
}
