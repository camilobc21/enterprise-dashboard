export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Always use window.location.origin — never hardcode domains (see README best practices).
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // Encode both the redirectUri and the returnPath in state so the callback
  // can redirect the user back to the page they were on.
  const statePayload = JSON.stringify({
    redirectUri,
    returnPath: returnPath || window.location.pathname,
  });
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
