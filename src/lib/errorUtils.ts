/**
 * Sanitizes error messages to hide technical details from end-users.
 * This prevents users from seeing service names like "Firebase" or "Convex",
 * or technical details like error IDs or mutation names.
 */
export function formatError(error: any): string {
  if (!error) return "An unexpected error occurred.";

  let message = typeof error === "string" ? error : error.message || "An unexpected error occurred.";

  // Normalize message (handle "Error: ..." prefix)
  message = message.replace(/^Error:\s*/i, "").trim();

  // If it's already a clean user-facing message (likely from our own validation), return it
  // We can add specific checks here if we have a pattern for our own errors
  const commonUserFriendlyPatterns = [
    /required/i,
    /invalid phone/i,
    /under review/i,
    /already exists/i,
    /not available/i,
    /permission denied/i,
    /valid 10-digit/i,
  ];

  if (commonUserFriendlyPatterns.some(pattern => pattern.test(message))) {
    // If it contains technical words, we still sanitize it
    if (!/firebase|convex|mutation|query|storage|uid|id:|credential|auth\//i.test(message)) {
      return message;
    }
  }

  // Handle Firebase specific error codes/messages
  if (message.includes("auth/") || message.includes("Firebase")) {
    if (message.includes("user-not-found") || message.includes("wrong-password")) {
      return "Invalid username or password.";
    }
    if (message.includes("too-many-requests")) {
      return "Too many attempts. Please try again later.";
    }
    if (message.includes("network-request-failed")) {
      return "Network error. Please check your connection.";
    }
    if (message.includes("popup-closed-by-user") || message.includes("cancelled")) {
      return "Sign-in cancelled.";
    }
    return "Authentication failed. Please try again.";
  }

  // Handle Convex specific messages
  if (message.includes("Convex") || message.includes("mutation") || message.includes("query")) {
    return "Database error. Please try again later.";
  }

  // If we identify it as a techincal error, provide a way to see details (simplified for now as a string)
  const technicalIdPattern = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}|[A-Z0-9]{20,}/i;
  let finalMessage = message;

  if (technicalIdPattern.test(message) || message.length > 200) {
    finalMessage = "A technical error occurred. Please try again.";
  }

  // Handle generic long technical dumps
  if (message.includes("RangeError") || message.includes("TypeError") || message.includes("ReferenceError")) {
    return `Application error: ${message.split('\n')[0]}`;
  }

  return finalMessage;
}
