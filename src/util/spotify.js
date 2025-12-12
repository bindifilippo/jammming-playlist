// spotify.js (versione finale pronta React)
const CLIENT_ID = '0da97fc81d1844d0b42359c1f46325f3';
const REDIRECT_URI = 'http://127.0.0.1:5173';
const SCOPES = ['playlist-modify-public', 'playlist-modify-private'].join(' ');

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
  return Array.from(values).map(x => possible[x % possible.length]).join('');
};

const sha256 = async (plain) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));

const base64encode = (input) =>
  btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createCodeChallenge = async (verifier) => base64encode(await sha256(verifier));

/* -------------------- Token storage -------------------- */
function setToken(tokenResponse) {
  accessToken = tokenResponse.access_token;
  refreshToken = tokenResponse.refresh_token || refreshToken;
  expiresAt = Date.now() + (tokenResponse.expires_in || 3600) * 1000;

  localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
  localStorage.setItem(LS_EXPIRES_AT, expiresAt.toString());
  if (refreshToken) localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);

  if (tokenExpirationTimeout) clearTimeout(tokenExpirationTimeout);
  tokenExpirationTimeout = setTimeout(clearToken, expiresAt - Date.now());

  console.log('Token set:', { accessToken, refreshToken, expiresAt });
}

function loadTokenFromStorage() {
  const token = localStorage.getItem(LS_ACCESS_TOKEN);
  const exp = Number(localStorage.getItem(LS_EXPIRES_AT));
  const storedRefresh = localStorage.getItem(LS_REFRESH_TOKEN);

  if (!token || Date.now() >= exp) return false;

  accessToken = token;
  expiresAt = exp;
  refreshToken = storedRefresh || '';
  console.log('Loaded token from storage:', { accessToken, refreshToken, expiresAt });
  return true;
}

function clearToken() {
  accessToken = '';
  refreshToken = '';
  expiresAt = 0;
  localStorage.removeItem(LS_ACCESS_TOKEN);
  localStorage.removeItem(LS_REFRESH_TOKEN);
  localStorage.removeItem(LS_EXPIRES_AT);
  console.log('Tokens cleared');
}

/* -------------------- Main SpotifyAuth object -------------------- */
const SpotifyAuth = {
  async getAccessToken() {
    if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;
    if (!accessToken && loadTokenFromStorage() && Date.now() < expiresAt - 60_000) return accessToken;

    if (refreshToken) {
      await this._refreshToken();
      return accessToken;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code) {
      const savedState = localStorage.getItem(LS_STATE);
      if (!state || state !== savedState) {
        throw new Error('State mismatch. Possible CSRF attack.');
      }

      await this._exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, REDIRECT_URI);
      return accessToken;
    }

    await this._startLoginPkce();
    return null;
  },

  clearAccessToken: clearToken,

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

    console.log('Redirecting to Spotify auth with state:', state);
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

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('Failed to exchange code for token:', text);
      throw new Error(`Failed to exchange code for token: ${text}`);
    }

    const data = JSON.parse(text);
    setToken(data);

    localStorage.removeItem(LS_CODE_VERIFIER);
    localStorage.removeItem(LS_STATE);
    console.log('Code exchanged for token successfully', data);
  },

  async _refreshToken() {
    if (!refreshToken) return this._startLoginPkce();

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const text = await res.text();
    if (!res.ok) {
      clearToken();
      console.error('Failed to refresh token:', text);
      return this._startLoginPkce();
    }

    const data = JSON.parse(text);
    setToken({ ...data, refresh_token: refreshToken });
    console.log('Token refreshed successfully', data);
  },

  async _fetchSpotify(url, options = {}) {
    const token = await this.getAccessToken();
    if (!token) {
      console.error('No valid access token available');
      return null;
    }

    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch(e) { json = text; }

    if (res.status === 401 && refreshToken) {
      console.warn('401 Unauthorized. Attempting token refresh...');
      await this._refreshToken();
      return this._fetchSpotify(url, options);
    }

    if (!res.ok) {
      console.error('Spotify API Error', res.status, json, { url, options });
      return null;
    }

    return json;
  },

  /* -------------------- Spotify API methods -------------------- */
  async search(searchTerm) {
    if (!searchTerm?.trim()) return [];
    const data = await this._fetchSpotify(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=track&limit=10`
    );

    return data?.tracks?.items?.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name ?? 'Unknown Artist',
      album: track.album?.name ?? 'Unknown Album',
      uri: track.uri
    })) || [];
  },

  async getUserId() {
    const data = await this._fetchSpotify('https://api.spotify.com/v1/me');
    if (!data?.id) console.error('Failed to get Spotify user ID', data);
    return data?.id || null;
  },

  async createPlaylist(name, description = '') {
    if (!name?.trim()) {
      console.error('Cannot create playlist: name is empty');
      return null;
    }

    const data = await this._fetchSpotify(
      `https://api.spotify.com/v1/me/playlists`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, public: false })
      }
    );

    if (!data) {
      console.error('Failed to create playlist', { name });
    } else {
      console.log('Playlist created successfully:', data);
    }

    return data?.id || null;
  },

  async addTracksToPlaylist(playlistId, trackUris) {
    if (!Array.isArray(trackUris)) {
      console.error('trackUris must be an array', trackUris);
      return { success: [], failed: [] };
    }

    if (!trackUris.length) {
      console.warn('No tracks provided');
      return { success: [], failed: [] };
    }

    const chunkSize = 100;
    const success = [];
    const failed = [];

    const validUris = trackUris.filter(uri => typeof uri === 'string' && uri.startsWith('spotify:track:'));
    if (validUris.length !== trackUris.length) {
      const invalid = trackUris.filter(uri => !validUris.includes(uri));
      console.warn('Some track URIs are invalid and will be skipped:', invalid);
      failed.push(...invalid);
    }

    for (let i = 0; i < validUris.length; i += chunkSize) {
      const chunk = validUris.slice(i, i + chunkSize);

      const res = await this._fetchSpotify(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uris: chunk })
        }
      );

      if (!res) {
        console.error('Failed to add tracks to playlist', { playlistId, chunk });
        failed.push(...chunk);
      } else {
        success.push(...chunk);
        console.log(`Added ${chunk.length} tracks successfully`);
      }
    }

    return { success, failed };
  }
};

export default SpotifyAuth;