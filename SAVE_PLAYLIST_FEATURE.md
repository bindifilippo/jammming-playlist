# Save Playlist to Spotify Feature

## Overview
The save playlist feature allows users to export their custom playlist from Jammming directly to their Spotify account with a single click.

## Implementation Details

### Flow Diagram
```
User clicks "Save to Spotify" button
         ↓
Playlist.jsx calls onSave()
         ↓
App.jsx savePlaylist() function executes
         ↓
Step 1: Get user's Spotify ID
        GET /v1/me (returns user.id)
         ↓
Step 2: Create new playlist
        POST /v1/users/{userId}/playlists
        (sends: name, description, public status)
         ↓
Step 3: Add tracks to playlist
        POST /v1/playlists/{playlistId}/tracks
        (sends: array of track URIs)
         ↓
Playlist created successfully in user's Spotify account
Reset Jammming playlist to start fresh
Show success message
```

### API Endpoints Used

**1. Get User ID**
```
GET https://api.spotify.com/v1/me
Authorization: Bearer {token}

Response: { id: "user123", ..., other_user_data }
```

**2. Create Playlist**
```
POST https://api.spotify.com/v1/users/{userId}/playlists
Authorization: Bearer {token}
Content-Type: application/json

Body: {
  "name": "My Playlist Name",
  "description": "Optional description",
  "public": false
}

Response: { id: "playlist123", ..., playlist_data }
```

**3. Add Tracks to Playlist**
```
POST https://api.spotify.com/v1/playlists/{playlistId}/tracks
Authorization: Bearer {token}
Content-Type: application/json

Body: {
  "uris": [
    "spotify:track:id1",
    "spotify:track:id2",
    ...
  ]
}

Response: { snapshot_id: "abc123" }
```

### Functions Added to spotify.js

**`SpotifyAuth.getUserId()`**
- Calls `/v1/me` endpoint
- Returns the current user's Spotify ID
- Error handling: returns null if fails

**`SpotifyAuth.createPlaylist(userId, playlistName, description)`**
- Calls `/v1/users/{userId}/playlists`
- Creates a new private playlist
- Returns the playlist ID
- Error handling: returns null if fails

**`SpotifyAuth.addTracksToPlaylist(userId, playlistId, trackUris)`**
- Calls `/v1/playlists/{playlistId}/tracks`
- Handles batching (max 100 tracks per request)
- Returns true if successful, false otherwise
- Automatically chunks large playlists

### Updated savePlaylist() in App.jsx

The function now:
1. ✅ Validates that playlist has tracks
2. ✅ Gets the user's ID
3. ✅ Creates a new playlist on Spotify
4. ✅ Adds all tracks to the playlist
5. ✅ Shows user feedback (success/error messages)
6. ✅ Resets the local playlist after successful save
7. ✅ Handles errors gracefully at each step

### UI Enhancements

**Playlist.jsx**
- Added `isSaving` state to track save operation
- Button shows "Saving..." while operation is in progress
- Button is disabled during save to prevent duplicate requests
- Automatic state reset after save completes

## User Experience Flow

### Success Case
1. User builds their playlist in Jammming
2. User clicks "Save to Spotify" button
3. Button changes to "Saving..." (disabled)
4. App communicates with Spotify API (usually <2 seconds)
5. Success alert: "Playlist 'My Playlist' saved to Spotify with 15 tracks!"
6. Playlist is cleared, ready to create a new one
7. User can check their Spotify app to see the new playlist

### Error Cases

**Empty Playlist**
- Alert: "Your playlist is empty! Add some tracks before saving."
- No API calls made

**Failed to Get User ID**
- Alert: "Failed to get your Spotify user ID. Please try again."
- Likely cause: Invalid or expired token

**Failed to Create Playlist**
- Alert: "Failed to create playlist. Please try again."
- Possible causes: Network error, API rate limit, user account issue

**Failed to Add Tracks**
- Alert: "Playlist created but failed to add some tracks. Please check Spotify."
- Playlist still exists on Spotify, but tracks may not have been added
- User should manually add tracks or try again

## Important Notes

### Track Batching
- Spotify API limits to 100 tracks per POST request
- For playlists with >100 tracks, the function automatically chunks them
- Multiple requests are made as needed (transparent to user)

### Playlist Visibility
- Created playlists are **private** by default
- Users can change visibility in their Spotify app if desired

### Track URIs
- The app stores Spotify URIs for each track (format: `spotify:track:xxxxx`)
- URIs are required for the add tracks endpoint
- These URIs persist across searches and add operations

### Token Expiration
- If token expires while saving, you'll see an error
- The app will need to re-authenticate
- After re-auth, try saving again

## Testing Checklist

- [ ] Create a playlist with 1 track and save it
- [ ] Create a playlist with 5-10 tracks and save it
- [ ] Create a playlist with 100+ tracks and save it (test batching)
- [ ] Try to save an empty playlist (should show error)
- [ ] Check that the playlist appears in your Spotify account
- [ ] Verify playlist name and track count are correct
- [ ] Check console for any warnings or errors
- [ ] Save multiple playlists in succession
- [ ] Test with invalid/expired token (should prompt re-auth)

## Console Output

When saving, you'll see these logs:
```javascript
User ID: spotify123456
Playlist created with ID: 4abcdef123
```

And from the Spotify module:
```javascript
// If successful, no additional logs
// If errors occur, they're logged with context
```

## Debugging

If save fails, check:
1. **Browser Console** (F12 → Console tab) for error messages
2. **Network Tab** (F12 → Network) to see API request/response details
3. **Token validity** - re-authenticate if needed
4. **Playlist content** - ensure you have tracks before saving
5. **Spotify account status** - check if account is in good standing

## Future Enhancements

Possible improvements:
- Add success/error toasts instead of alerts
- Show progress bar for large playlists
- Allow users to choose public/private visibility
- Add option to update existing playlists instead of creating new ones
- Implement automatic retry on network errors
