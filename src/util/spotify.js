// spotify.js
// Utility module to obtain and manage a Spotify access token using
// the Implicit Grant Flow (token returned in URL hash).
// Replace `CLIENT_ID` with your Spotify application client ID and
// set `REDIRECT_URI` to the redirect URL configured in your Spotify app.

const CLIENT_ID = '0da97fc81d1844d0b42359c1f46325f3'; // <- il tuo client ID

// IMPORTANT:
// For local development with Spotify Web API, localhost is NOT allowed anymore.
// Use a loopback IP like 127.0.0.1 and make sure this EXACT URL is also
// registered in your Spotify app settings as a Redirect URI.
const REDIRECT_URI = 'http://127.0.0.1:5173';

const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ');

let accessToken = '';
let tokenExpirationTimeout = null;

const SpotifyAuth = {
  // Returns the access token if available. If not, tries to extract it
  // from the URL. If still not available, redirects the user to Spotify
  // authorization page to obtain an access token via the Implicit Grant Flow.
  getAccessToken() {
    // If we already have it in memory, just return it
    if (accessToken) return accessToken;

    // Try to get token from the URL hash after a redirect
    const tokenData = SpotifyAuth._getTokenFromUrl();
    console.log('[SpotifyAuth] tokenData from URL:', tokenData);

    if (tokenData && tokenData.access_token) {
      accessToken = tokenData.access_token;
      const expiresIn = Number(tokenData.expires_in) || 3600;

      // Automatically clear token when it expires
      if (tokenExpirationTimeout) clearTimeout(tokenExpirationTimeout);
      tokenExpirationTimeout = setTimeout(() => {
        console.log('[SpotifyAuth] token expired, clearing it');
        accessToken = '';
      }, expiresIn * 1000);

      // Clean the URL to remove token parameters (#access_token=...)
      try {
        const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('[SpotifyAuth] cleaned URL:', cleanUrl);
      } catch (e) {
        console.warn('[SpotifyAuth] error cleaning URL:', e);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      return accessToken;
    }

    // No token found — redirect to Spotify authorization
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(
      CLIENT_ID
    )}&response_type=token&scope=${encodeURIComponent(
      SCOPES
    )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log('[SpotifyAuth] redirecting to Spotify auth:', authUrl);

    // VERY IMPORTANT:
    // Navigate in the SAME TAB, do NOT use window.open,
    // otherwise the token will land in a different tab.
    window.location = authUrl;

    return null; // we are navigating away now
  },

  // Parse the URL hash (#access_token=...&expires_in=...)
  _getTokenFromUrl() {
    const fullHash = window.location.hash; // e.g. "#access_token=...&expires_in=3600"
    const hash = fullHash.substring(1); // remove '#'
    console.log('[SpotifyAuth._getTokenFromUrl] hash:', fullHash);

    if (!hash) return null;

    return hash.split('&').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
  },

  // Explicitly set the access token (useful for testing)
  setAccessToken(token, expiresInSec = 3600) {
    console.log('[SpotifyAuth.setAccessToken] setting token manually');
    accessToken = token;
    if (tokenExpirationTimeout) clearTimeout(tokenExpirationTimeout);
    tokenExpirationTimeout = setTimeout(() => {
      console.log('[SpotifyAuth] manual token expired, clearing it');
      accessToken = '';
    }, expiresInSec * 1000);
  },

  // Get current saved access token (may be empty)
  getSavedAccessToken() {
    console.log('[SpotifyAuth.getSavedAccessToken] token:', accessToken);
    return accessToken;
  },

  // Clear the saved token immediately
  clearAccessToken() {
    console.log('[SpotifyAuth.clearAccessToken] clearing token');
    accessToken = '';
    if (tokenExpirationTimeout) {
      clearTimeout(tokenExpirationTimeout);
      tokenExpirationTimeout = null;
    }
  }
};

// Search function to query Spotify API for tracks
SpotifyAuth.search = async (searchTerm) => {
  console.log('[SpotifyAuth.search] searchTerm:', searchTerm);

  const token = SpotifyAuth.getSavedAccessToken();

  if (!token) {
    console.error('No access token available. Please authenticate with Spotify first.');
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

    // Transform Spotify track objects to our format
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
};

// Get the current user's ID
SpotifyAuth.getUserId = async () => {
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
};

// Create a new playlist for the user
SpotifyAuth.createPlaylist = async (userId, playlistName, playlistDescription = '') => {
  const token = SpotifyAuth.getSavedAccessToken();

  if (!token) {
    console.error('No access token available.');
    return null;
  }

  try {
    const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
    console.log('[SpotifyAuth.createPlaylist] POST', url, 'name:', playlistName);

    const response = await fetch(
      url,
      {
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
      }
    );

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
};

// Add tracks to a playlist
SpotifyAuth.addTracksToPlaylist = async (userId, playlistId, trackUris) => {
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

    // Spotify API has a limit of 100 tracks per request, so we chunk them
    const chunkSize = 100;
    for (let i = 0; i < trackUris.length; i += chunkSize) {
      const chunk = trackUris.slice(i, i + chunkSize);

      const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      console.log('[SpotifyAuth.addTracksToPlaylist] POST', url, 'chunk size:', chunk.length);

      const response = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: chunk
          })
        }
      );

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
};

export default SpotifyAuth;
