# Spotify API Setup Guide

This guide explains how to set up Spotify authentication for the Jammming app using the Implicit Grant Flow.

## Step 1: Register Your App on Spotify

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in or create a Spotify account (free account is fine)
3. Click **Create an App**
4. Accept the terms and create the app
5. You'll get a **Client ID** — copy this value

## Step 2: Set the Redirect URI

1. In your app's dashboard, go to **Edit Settings**
2. Under **Redirect URIs**, add your application's URL:
   - For local development: `http://localhost:5173`
   - For production: your actual domain (e.g., `https://myapp.com`)
3. Click **Save**

## Step 3: Update the Spotify Auth Module

Open `src/util/spotify.js` and replace `YOUR_SPOTIFY_CLIENT_ID_HERE` with your actual Client ID:

```javascript
const CLIENT_ID = 'YOUR_CLIENT_ID_FROM_SPOTIFY_DASHBOARD'; // <- replace this
const REDIRECT_URI = window.location.origin; // or set explicitly to 'http://localhost:5173'
```

## Step 4: How It Works

When you run the app:

1. **First visit**: If no token is found, the app redirects to Spotify's authorization page
2. **User grants access**: The user logs in and approves the app's permissions
3. **Token in URL**: Spotify redirects back to your app with the token in the URL hash
4. **Token extraction**: The `SpotifyAuth` module extracts the token and stores it
5. **Token expiration**: The token automatically expires after ~1 hour (set by Spotify)
6. **Clean URL**: The URL parameters are removed to keep it clean

## Step 5: Using the Token in Your App

The app is already configured to get the token on startup (see `App.jsx`):

```javascript
useEffect(() => {
  const token = SpotifyAuth.getAccessToken();
  if (token) {
    console.log('Spotify access token obtained:', token);
  }
}, []);
```

To use the token for API requests, call:

```javascript
const token = SpotifyAuth.getSavedAccessToken();

// Example API call to create a playlist
fetch('https://api.spotify.com/v1/me/playlists', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Playlist',
    public: false
  })
})
.then(response => response.json())
.then(data => console.log('Playlist created:', data))
.catch(error => console.error('Error:', error));
```

## Available Functions in SpotifyAuth

- `getAccessToken()` — Get or obtain a new token (redirects to Spotify if needed)
- `getSavedAccessToken()` — Get the currently saved token (may be empty)
- `setAccessToken(token, expiresInSec)` — Manually set a token (useful for testing)
- `clearAccessToken()` — Clear the stored token

## Scopes Requested

The app requests these permissions from Spotify:
- `playlist-modify-public` — Create and modify public playlists
- `playlist-modify-private` — Create and modify private playlists

You can add more scopes as needed (see [Spotify scopes documentation](https://developer.spotify.com/documentation/web-api/concepts/scopes)).

## Troubleshooting

**"Authorization Error" or "Invalid Client ID"**
- Make sure your Client ID is correct and copied completely
- Check that your Redirect URI matches exactly (case-sensitive)

**Token disappears after page refresh**
- This is expected with Implicit Flow — tokens are stored in memory, not persisted
- For persistence, use `localStorage` or implement Authorization Code Flow with a backend

**"Redirect URI mismatch"**
- The URI you added in Spotify Dashboard must match exactly (including `http://` vs `https://`)
- For local development, use `http://localhost:5173`

## Next Steps

Once the token is working, you can:
1. Implement search functionality by calling `/v1/search` endpoint
2. Save playlists by calling `/v1/me/playlists` (POST)
3. Add tracks to playlist using `/v1/playlists/{id}/tracks` (POST)

See [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api) for endpoint details.
