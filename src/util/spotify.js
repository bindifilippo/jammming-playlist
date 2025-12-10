// spotify.js (PKCE version)
// Flusso: Authorization Code + PKCE (consigliato per SPA)
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

const CLIENT_ID = '0da97fc81d1844d0b42359c1f46325f3';

// ATTENZIONE: deve essere registrata *identica* nella dashboard Spotify
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

/* -------------------- Helper PKCE -------------------- */

// genera stringa random (code_verifier / state)
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

// SHA-256 del code_verifier
const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

// base64 url-safe
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const createCodeChallenge = async (codeVerifier) => {
  const hashed = await sha256(codeVerifier);
  return base64encode(hashed);
};

/* -------------------- Gestione token in memoria/LS -------------------- */

function setTokenInMemoryAndStorage(tokenResponse) {
  accessToken = tokenResponse.access_token;
  refreshToken = tokenResponse.refresh_token || '';
  const expiresInSec = Number(tokenResponse.expires_in) || 3600;
  expiresAt = Date.now() + expiresInSec * 1000;

  // Salvataggio in localStorage per persistenza dopo reload
  localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
  localStorage.setItem(LS_EXPIRES_AT, String(expiresAt));
  if (refreshToken) {
    localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);
  }

  // timer per pulire il token
  if (tokenExpirationTimeout) clearTimeout(tokenExpirationTimeout);
  tokenExpirationTimeout = setTimeout(() => {
    console.log('[SpotifyAuth] access token scaduto (timer)');
    SpotifyAuth.clearAccessToken();
  }, expiresInSec * 1000);
}

function loadTokenFromStorageIfValid() {
  const storedToken = localStorage.getItem(LS_ACCESS_TOKEN);
  const storedExpiresAt = Number(localStorage.getItem(LS_EXPIRES_AT) || '0');
  const storedRefresh = localStorage.getItem(LS_REFRESH_TOKEN) || '';

  if (!storedToken || !storedExpiresAt) return false;

  const now = Date.now();
  if (now >= storedExpiresAt) {
    console.log('[SpotifyAuth] token in localStorage scaduto, pulisco');
    SpotifyAuth.clearAccessToken();
    return false;
  }

  accessToken = storedToken;
  refreshToken = storedRefresh;
  expiresAt = storedExpiresAt;

  // ricreo timer
  const remainingMs = storedExpiresAt - now;
  if (tokenExpirationTimeout) clearTimeout(tokenExpirationTimeout);
  tokenExpirationTimeout = setTimeout(() => {
    console.log('[SpotifyAuth] access token scaduto (timer, da storage)');
    SpotifyAuth.clearAccessToken();
  }, remainingMs);

  console.log('[SpotifyAuth] token caricato da localStorage');
  return true;
}

/* -------------------- Oggetto principale -------------------- */

const SpotifyAuth = {
  /**
   * Entry-point PKCE:
   * - se c'è un access token valido, lo restituisce;
   * - se siamo su redirect con ?code=..., scambia il code con un token;
   * - se non c'è nulla, fa partire il login (redirect a Spotify).
   */
  async getAccessToken() {
    console.log('[SpotifyAuth.getAccessToken] called');

    // 1) se ho in memoria ed è valido
    const now = Date.now();
    if (accessToken && now < expiresAt - 60_000) {
      return accessToken;
    }

    // 2) prova a caricare da localStorage
    if (!accessToken) {
      const ok = loadTokenFromStorageIfValid();
      if (ok && Date.now() < expiresAt - 60_000) {
        return accessToken;
      }
    }

    // 3) siamo nel redirect? (Authorization Code)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('[SpotifyAuth] errore da Spotify:', error);
      // pulisco query string almeno
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      return null;
    }

    if (code) {
      console.log('[SpotifyAuth] trovato authorization code in URL, scambio per token');
      await this._exchangeCodeForToken(code);

      // pulisco la query string (?code=...)
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return accessToken || null;
    }

    // 4) niente token e niente code → iniziamo login
    console.log('[SpotifyAuth] nessun token, avvio login PKCE');
    await this._startLoginPkce();
    // da qui in poi la pagina verrà redirectata, quindi return null
    return null;
  },

  getSavedAccessToken() {
    console.log('[SpotifyAuth.getSavedAccessToken] token:', accessToken);
    return accessToken;
  },

  clearAccessToken() {
    console.log('[SpotifyAuth.clearAccessToken] clearing token');
    accessToken = '';
    refreshToken = '';
    expiresAt = 0;

    if (tokenExpirationTimeout) {
      clearTimeout(tokenExpirationTimeout);
      tokenExpirationTimeout = null;
    }

    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_EXPIRES_AT);
  },

  // solo per test
  setAccessToken(token, expiresInSec = 3600) {
    console.log('[SpotifyAuth.setAccessToken] setting token manually');
    setTokenInMemoryAndStorage({
      access_token: token,
      refresh_token: '',
      expires_in: expiresInSec
    });
  },

  /* -------------------- PKCE internals -------------------- */

  async _startLoginPkce() {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    const state = generateRandomString(16);

    localStorage.setItem(LS_CODE_VERIFIER, codeVerifier);
    localStorage.setItem(LS_STATE, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('[SpotifyAuth] redirecting to Spotify auth (PKCE):', authUrl);

    window.location.href = authUrl;
  },

  async _exchangeCodeForToken(code) {
    const storedVerifier = localStorage.getItem(LS_CODE_VERIFIER);
    const storedState = localStorage.getItem(LS_STATE);

    const urlParams = new URLSearchParams(window.location.search);
    const stateFromUrl = urlParams.get('state');

    if (!storedVerifier) {
      console.error('[SpotifyAuth] nessun code_verifier in localStorage');
      return;
    }

    if (storedState && stateFromUrl && storedState !== stateFromUrl) {
      console.error('[SpotifyAuth] state mismatch, possibile CSRF');
      return;
    }

    // non ci servono più
    localStorage.removeItem(LS_CODE_VERIFIER);
    localStorage.removeItem(LS_STATE);

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: storedVerifier
    });

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      console.log('[SpotifyAuth._exchangeCodeForToken] status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('[SpotifyAuth._exchangeCodeForToken] error body:', text);
        throw new Error(`Token endpoint error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SpotifyAuth._exchangeCodeForToken] token response:', data);

      setTokenInMemoryAndStorage(data);
    } catch (err) {
      console.error('[SpotifyAuth._exchangeCodeForToken] error:', err);
    }
  },

  /* -------------------- Spotify Web API calls -------------------- */

  // Search function to query Spotify API for tracks
  search: async (searchTerm) => {
    console.log('[SpotifyAuth.search] searchTerm:', searchTerm);

    const token = SpotifyAuth.getSavedAccessToken();

    if (!token) {
      console.error('No access token available. Call SpotifyAuth.getAccessToken() first.');
      return [];
    }

    if (!searchTerm || searchTerm.trim() === '') {
      console.warn('[SpotifyAuth.search] empty search term');
      return [];
    }

    try {
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=track`;
      console.log('[SpotifyAuth.search] fetching:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[SpotifyAuth.search] response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('[SpotifyAuth.search] error body:', text);
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();

      const tracks = (data.tracks.items || []).map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0]?.name || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        uri: track.uri
      }));

      console.log('[SpotifyAuth.search] found tracks:', tracks.length);
      return tracks;
    } catch (error) {
      console.error('Error searching Spotify:', error);
      return [];
    }
  },

  // Get the current user's ID
  getUserId: async () => {
    const token = SpotifyAuth.getSavedAccessToken();

    if (!token) {
      console.error('No access token available.');
      return null;
    }

    try {
      console.log('[SpotifyAuth.getUserId] fetching /me');
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[SpotifyAuth.getUserId] response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('[SpotifyAuth.getUserId] error body:', text);
        throw new Error(`Failed to get user ID: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SpotifyAuth.getUserId] user data:', data);
      return data.id;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  },

  // Create a new playlist for the user
  createPlaylist: async (userId, playlistName, playlistDescription = '') => {
    const token = SpotifyAuth.getSavedAccessToken();

    if (!token) {
      console.error('No access token available.');
      return null;
    }

    try {
      const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
      console.log('[SpotifyAuth.createPlaylist] POST', url, 'name:', playlistName);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlistName,
          description: playlistDescription,
          public: false
        })
      });

      console.log('[SpotifyAuth.createPlaylist] response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('[SpotifyAuth.createPlaylist] error body:', text);
        throw new Error(`Failed to create playlist: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SpotifyAuth.createPlaylist] created playlist:', data);
      return data.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  },

  // Add tracks to a playlist
  addTracksToPlaylist: async (userId, playlistId, trackUris) => {
    const token = SpotifyAuth.getSavedAccessToken();

    if (!token) {
      console.error('No access token available.');
      return false;
    }

    if (!trackUris || trackUris.length === 0) {
      console.warn('No tracks to add to playlist.');
      return true; // Success with no tracks
    }

    try {
      console.log('[SpotifyAuth.addTracksToPlaylist] playlistId:', playlistId, 'tracks:', trackUris.length);

      const chunkSize = 100; // limite Spotify per request
      for (let i = 0; i < trackUris.length; i += chunkSize) {
        const chunk = trackUris.slice(i, i + chunkSize);

        const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
        console.log('[SpotifyAuth.addTracksToPlaylist] POST', url, 'chunk size:', chunk.length);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: chunk
          })
        });

        console.log('[SpotifyAuth.addTracksToPlaylist] response status:', response.status);

        if (!response.ok) {
          const text = await response.text();
          console.error('[SpotifyAuth.addTracksToPlaylist] error body:', text);
          throw new Error(`Failed to add tracks: ${response.status}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      return false;
    }
  }
};

export default SpotifyAuth;
