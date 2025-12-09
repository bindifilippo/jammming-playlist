┌─────────────────────────────────────────────────────────────┐
│                       App.jsx (ROOT)                        │
│  • Stato centrale: searchResults, playlistName,             │
│    playlistTracks                                           │
│  • Funzioni: addTrack, removeTrack, updatePlaylistName,     │
│    savePlaylist                                             │
└─────────────────────────────────────────────────────────────┘
          │                                      │
          │ props: searchResults, onAdd          │ props: playlistName, playlistTracks,
          │                                      │ onRemove, onNameChange, onSave
          ▼                                      ▼
┌─────────────────────────┐          ┌──────────────────────────┐
│  SearchResults.jsx      │          │    Playlist.jsx          │
│  • Mostra risultati     │          │  • Nome playlist         │
│    ricerca              │          │    (input modificabile)  │
│  • Passa brani a        │          │  • Passa brani a         │
│    Tracklist            │          │    Tracklist             │
│  • Chiama onAdd quando  │          │  • Pulsante Save         │
│    utente clicca +      │          │    to Spotify            │
└─────────────────────────┘          └──────────────────────────┘
          │                                      │
          │ props: tracks, onAdd                 │ props: tracks, isRemoval,
          │                                      │ onRemove
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Tracklist.jsx (SHARED)                        │
│  • Itera su array tracks con map()                          │
│  • Crea una lista dinamica di Track                         │
│  • Passa onAdd/onRemove a ogni Track                        │
└─────────────────────────────────────────────────────────────┘
          │ props: track, onAdd/onRemove, isRemoval
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Track.jsx                                │
│  • Visualizza: nome brano, artista, album                   │
│  • Bottone + (se isRemoval=false) o − (se isRemoval=true)   │
│  • Chiama onAdd/onRemove quando cliccato                    │
└─────────────────────────────────────────────────────────────┘
