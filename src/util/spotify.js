// spotify.js (PKCE version)
// Authorization Code + PKCE (SPA-safe)

const CLIENT_ID = '0da97fc81d1844d0b42359c1f46325f3';
const REDIRECT_URI = 'http://127.0.0.1:5173';

const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ');

// LocalStorage keys
const LS_ACCESS_TOKEN = 'spotify_access_token';
const LS_REFRESH_TOKEN = 'spotify_refresh_token';
const LS_EXPIRES_AT = 'spotify_expires_at';
const LS_CODE_VERIFIER = 'spotify_code_verifier';
const LS_STATE = 'spotify_auth_state';

let accessToken = '';
let refreshToken = '';
let expiresAt = 0;
let tokenExpirationTimeout = null;

/* -------------------- PKCE helpers -------------------- */

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
};

const base64encode = (input) =>
  btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createCodeChallenge = async (verifier) =>
  base64encode(await sha256(verifier));

/* -------------------- Token storage -------------------- */

function setToken(tokenResponse) {
  accessToken = tokenResponse.access_token;
  refreshToken = tokenResponse.refresh_token || '';
  expiresAt = Date.now() + (tokenResponse.expires_in || 3600) * 1000;

  localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
  localStorage.setItem(LS_EXPIRES_AT, expiresAt.toString());
  if (refreshToken) {
    localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);
  }

  if (tokenExpirationTimeout) clearTimeout(tokenExpirationTimeout);
  tokenExpirationTimeout = setTimeout(clearToken, expiresAt - Date.now());
}

function loadTokenFromStorage() {
  const token = localStorage.getItem(LS_ACCESS_TOKEN);
  const exp = Number(localStorage.getItem(LS_EXPIRES_AT));

  if (!token || Date.now() >= exp) return false;

  accessToken = token;
  expiresAt = exp;
  return true;
}

function clearToken() {
  accessToken = '';
  refreshToken = '';
  expiresAt = 0;
  localStorage.clear();
}

/* -------------------- Main object -------------------- */

const SpotifyAuth = {
  async getAccessToken() {
    if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;
    if (!accessToken && loadTokenFromStorage()) return accessToken;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      await this._exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, REDIRECT_URI);
      return accessToken;
    }

    await this._startLoginPkce();
    return null;
  },

  clearAccessToken: clearToken,

  /* -------------------- PKCE internals -------------------- */

  async _startLoginPkce() {
    const verifier = generateRandomString(64);
    const challenge = await createCodeChallenge(verifier);
    const state = generateRandomString(16);

    localStorage.setItem(LS_CODE_VERIFIER, verifier);
    localStorage.setItem(LS_STATE, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  },

  async _exchangeCodeForToken(code) {
    const verifier = localStorage.getItem(LS_CODE_VERIFIER);

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const data = await response.json();
    setToken(data);

    localStorage.removeItem(LS_CODE_VERIFIER);
    localStorage.removeItem(LS_STATE);
  },

  /* -------------------- Spotify API -------------------- */

  async search(searchTerm) {
    const token = await this.getAccessToken();
    if (!token || !searchTerm?.trim()) return [];

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();

    return data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name ?? 'Unknown Artist',
      album: track.album?.name ?? 'Unknown Album',
      uri: track.uri
    }));
  },

  async getUserId() {
    const token = await this.getAccessToken();
    if (!token) return null;

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();
    return data.id;
  },

  async createPlaylist(userId, name, description = '') {
    const token = await this.getAccessToken();
    if (!token) return null;

    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description, public: false })
      }
    );

    const data = await response.json();
    return data.id;
  },

  async addTracksToPlaylist(playlistId, trackUris) {
    const token = await this.getAccessToken();
    if (!token || !trackUris.length) return false;

    const chunkSize = 100;

    for (let i = 0; i < trackUris.length; i += chunkSize) {
      const chunk = trackUris.slice(i, i + chunkSize);

      await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: chunk })
        }
      );
    }

    return true;
  }
};

export default SpotifyAuth;
