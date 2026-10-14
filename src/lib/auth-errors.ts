type AuthError = { code?: string; message?: string; status?: number } | null | undefined;

export function authErrorMessage(error: AuthError) {
  if (!error) return "Something went wrong. Try again.";
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already an account with this email. Log in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters.";
    case "INVALID_TOKEN":
      return "This link has expired or was already used. Ask for a new one.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    default:
      return error.message || "Something went wrong. Try again.";
  }
}
