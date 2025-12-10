## Components architecture

- `App.jsx` (root)
  - Central state:
    - `searchResults`
    - `playlistName`
    - `playlistTracks`
  - Functions:
    - `addTrack(track)`
    - `removeTrack(track)`
    - `updatePlaylistName(newName)`
    - `savePlaylist()`
  - Renders:
    - `<SearchResults searchResults={searchResults} onAdd={addTrack} />`
    - `<Playlist
        playlistName={playlistName}
        playlistTracks={playlistTracks}
        onRemove={removeTrack}
        onNameChange={updatePlaylistName}
        onSave={savePlaylist}
      />`

---

- `SearchResults.jsx`
  - Receives via props:
    - `searchResults`
    - `onAdd`
  - Behavior:
    - Displays the search results
    - Passes `searchResults` to `Tracklist`
    - Calls `onAdd(track)` when the user clicks `+`

---

- `Playlist.jsx`
  - Receives via props:
    - `playlistName`
    - `playlistTracks`
    - `onRemove`
    - `onNameChange`
    - `onSave`
  - Behavior:
    - Displays the playlist name (editable input)
    - Passes `playlistTracks` to `Tracklist`
    - On "Save to Spotify" click, calls `onSave()`

---

- `Tracklist.jsx` (shared component)
  - Receives via props:
    - `tracks`
    - `isRemoval`
    - `onAdd`
    - `onRemove`
  - Behavior:
    - Iterates over `tracks` with `map()`
    - Creates a list of `<Track />`
    - Passes `onAdd` / `onRemove` and `isRemoval` to each `Track`

---

- `Track.jsx`
  - Receives via props:
    - `track`
    - `onAdd`
    - `onRemove`
    - `isRemoval`
  - Behavior:
    - Displays: track name, artist, album
    - If `isRemoval === false` shows a `+` button
    - If `isRemoval === true` shows a `−` button
    - On click, calls `onAdd(track)` or `onRemove(track)`


