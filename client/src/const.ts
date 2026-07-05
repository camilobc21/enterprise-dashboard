export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// For development domains, use the published domain for OAuth redirect to work correctly
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  // If we're on a development domain (manus.computer), use the published domain for OAuth
  let redirectOrigin = window.location.origin;
  if (window.location.hostname.includes('manus.computer')) {
    // For development, redirect to the published domain
    redirectOrigin = 'https://enterprisedash-bbvrvwnu.manus.space';
  }
  
  const redirectUri = `${redirectOrigin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
