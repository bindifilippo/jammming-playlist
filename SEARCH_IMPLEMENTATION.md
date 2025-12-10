# Spotify Search Implementation Guide

## Overview
The search functionality is now fully integrated with the Spotify API. Users can search for songs, and the results are displayed in real-time from Spotify's database.

## How It Works

### Flow Diagram
```
User Types in SearchBar
         ↓
User presses Enter or clicks Search button
         ↓
SearchBar.jsx calls onSearch(searchTerm)
         ↓
App.jsx handleSearch() function receives search term
         ↓
SpotifyAuth.search() calls Spotify /v1/search endpoint
         ↓
API returns JSON with track data
         ↓
Results transformed to our format (id, name, artist, album, uri)
         ↓
searchResults state updated with API response
         ↓
SearchResults component renders tracks
         ↓
User can add tracks to their playlist
```

### Components Updated

**src/util/spotify.js**
- Added `SpotifyAuth.search(searchTerm)` async function
- Makes authenticated GET request to `https://api.spotify.com/v1/search?q=...&type=track`
- Transforms Spotify response to our track format
- Error handling for invalid tokens and API failures

**src/components/SearchBar.jsx**
- Added `searchTerm` state
- `onChange` handler updates state as user types
- `onKeyPress` listener for Enter key
- Accepts `onSearch` prop callback from parent

**src/App.jsx**
- Added `searchResults` as mutable state (was hard-coded before)
- Added `isSearching` loading state
- Created `handleSearch()` async function
- Passes `handleSearch` to SearchBar as `onSearch` prop
- Passes `isSearching` to SearchResults as `isLoading` prop

**src/components/SearchResults.jsx**
- Added `isLoading` prop to show loading message
- Shows "No results" message if search was performed but nothing found
- Only renders Tracklist if there are actual results

## Features

✅ **Real-time API Requests**
- Searches query the live Spotify database
- Returns authentic track data with correct metadata

✅ **Error Handling**
- Invalid/expired tokens prompt re-authentication
- Empty search terms are ignored
- Network errors are caught and logged

✅ **User Feedback**
- "Searching..." message while API call is in progress
- "No results" message if search finds nothing
- Results display count in console

✅ **Proper Data Transformation**
- Spotify's complex response is converted to simple format:
  ```javascript
  {
    id: "spotify-track-id",
    name: "Song Name",
    artist: "Artist Name",
    album: "Album Name",
    uri: "spotify:track:..."
  }
  ```

## API Details

**Endpoint Used**: `https://api.spotify.com/v1/search`

**Parameters**:
- `q`: URL-encoded search term (song name, artist, album)
- `type=track`: Restricts results to tracks only

**Authentication**:
- Requires valid Bearer token in Authorization header
- Token obtained via Implicit Grant Flow (already implemented)

**Response Format**:
- JSON with `tracks.items[]` array
- Each item contains: `id`, `name`, `artists[]`, `album`, `uri`, and many other fields

## Usage Example

1. User types "Blinding Lights" in the search box
2. User presses Enter or clicks Search
3. App calls Spotify API with search term
4. Spotify returns ~20 matching tracks
5. Results are transformed and displayed
6. User clicks "+" to add a track to their playlist

## Troubleshooting

**"No access token available" error**
- User needs to authenticate with Spotify first
- App will redirect to Spotify login page
- Make sure your Client ID is set in `src/util/spotify.js`

**Empty search results but API returns data**
- Check the Spotify response in browser console
- Verify data transformation is mapping fields correctly
- Check if artists array is properly accessed: `track.artists[0]?.name`

**"Redirect URI mismatch" error**
- Your redirect URI in Spotify Dashboard must match exactly
- For local dev: must be `http://localhost:5173`
- For production: must match your deployed domain

## Testing Checklist

- [ ] Search for a popular song (e.g., "Shape of You")
- [ ] Verify results appear in less than 2 seconds
- [ ] Add a search result to playlist
- [ ] Search again, verify results update
- [ ] Try searching with artist name (e.g., "The Weeknd")
- [ ] Try searching with album name (e.g., "Midnights")
- [ ] Check browser console for no JavaScript errors
- [ ] Check Network tab to see API requests/responses

## Next Steps

The search integration is complete! Next you can:
1. Implement playlist saving to Spotify (POST to `/v1/me/playlists`)
2. Add search filtering and sorting
3. Implement pagination for large result sets
4. Add search history or recommendations
