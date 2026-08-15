/**
 * Internal login destination for local email/password authentication.
 * This replaces the former OAuth URL builder and never contacts an external provider.
 */
export const getLoginUrl = (_returnPath?: string) => "/login";
