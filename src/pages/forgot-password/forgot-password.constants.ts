export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_PASSWORD_RECOVERY_REDIRECT_URL =
	"http://localhost:5173/create-new-password";

const configuredPasswordRecoveryRedirectUrl =
	import.meta.env.VITE_PASSWORD_RECOVERY_REDIRECT_URL?.trim();

export const PASSWORD_RECOVERY_REDIRECT_URL =
	configuredPasswordRecoveryRedirectUrl ||
	DEFAULT_PASSWORD_RECOVERY_REDIRECT_URL;

export const FORGOT_PASSWORD_TEXT = {
	brand: "Nexlit",

	page: {
		eyebrow: "Recuperación de acceso",
		title: "Restablece tu contraseña",
		description:
			"Introduce el email asociado a tu cuenta. Si está registrado, enviaremos instrucciones para crear una nueva contraseña.",
	},

	form: {
		emailLabel: "Email",
		emailPlaceholder: "tu@email.com",
		emailHelp:
			"Usaremos este correo solo para enviarte el enlace de recuperación.",
		submit: "Enviar enlace de recuperación",
		submitLoading: "Enviando...",
	},

	validation: {
		emailRequired: "El email es obligatorio.",
		emailInvalid: "Introduce un email válido.",
	},

	feedback: {
		loading: "Enviando solicitud de recuperación...",
		success:
			"Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
		error:
			"No pudimos procesar la solicitud en este momento. Inténtalo de nuevo más tarde.",
	},

	links: {
		backToWelcomeAriaLabel: "Ir a la pantalla de bienvenida de Nexlit",
		backToLogin: "Volver a iniciar sesión",
	},
} as const;
