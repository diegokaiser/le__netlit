export const MIN_PASSWORD_LENGTH = 8;

export const CREATE_NEW_PASSWORD_MESSAGES = {
	passwordRequired: "La contraseña es obligatoria.",
	confirmPasswordRequired: "La confirmación de contraseña es obligatoria.",
	passwordMinLength: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
	passwordUppercase: "La contraseña debe contener al menos una mayúscula.",
	passwordNumber: "La contraseña debe contener al menos un número.",
	passwordMatch: "Las contraseñas no coinciden.",
	genericError:
		"No se pudo actualizar la contraseña. Revisa el enlace o inténtalo nuevamente.",
	invalidLink: "El enlace de recuperación no es válido o ha expirado.",
} as const;
