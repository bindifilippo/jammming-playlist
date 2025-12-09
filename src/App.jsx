import React, { useState } from 'react';
import styles from './App.module.css';
import './index.css';

import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import Playlist from './components/Playlist';

function App() {
  // Hard-coded search results for now
  const [searchResults] = useState([
    {
      id: '1',
      name: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMwbk'
    },
    {
      id: '2',
      name: 'Shape of You',
      artist: 'Ed Sheeran',
      album: '÷',
      uri: 'spotify:track:7qiZfU4dY1lsylvNzfJkFh'
    },
    {
      id: '3',
      name: 'Levitating',
      artist: 'Dua Lipa',
      album: 'Future Nostalgia',
      uri: 'spotify:track:3BZyEBhaORYsdFGelrnxtJ'
    },
    {
      id: '4',
      name: 'Anti-Hero',
      artist: 'Taylor Swift',
      album: 'Midnights',
      uri: 'spotify:track:0V3dS9VzJeowMVolia5Uyw'
    },
    {
      id: '5',
      name: 'As It Was',
      artist: 'Harry Styles',
      album: 'Harry\'s House',
      uri: 'spotify:track:41e6e75f1ebd3be33b13afc3'
    }
  ]);

  // Playlist state
  const [playlistName, setPlaylistName] = useState('My Epic Playlist');
  const [playlistTracks, setPlaylistTracks] = useState([
    {
      id: '1',
      name: 'Levitating',
      artist: 'Dua Lipa',
      album: 'Future Nostalgia',
      uri: 'spotify:track:3BZyEBhaORYsdFGelrnxtJ'
    },
    {
      id: '2',
      name: 'As It Was',
      artist: 'Harry Styles',
      album: 'Harry\'s House',
      uri: 'spotify:track:41e6e75f1ebd3be33b13afc3'
    },
    {
      id: '3',
      name: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMwbk'
    }
  ]);

  // Method to add a track to the playlist
  const addTrack = (track) => {
    // Check if track already exists in playlist using track.id
    if (playlistTracks.find(playlistTrack => playlistTrack.id === track.id)) {
      return; // Track already in playlist, do nothing
    }
    // Add track to playlist
    setPlaylistTracks([...playlistTracks, track]);
  };

  // Method to remove a track from the playlist
  const removeTrack = (track) => {
    // Filter out the track with matching id
    setPlaylistTracks(playlistTracks.filter(playlistTrack => playlistTrack.id !== track.id));
  };

  // Method to update the playlist name
  const updatePlaylistName = (newName) => {
    setPlaylistName(newName);
  };

  // Method to save playlist to Spotify and reset
  const savePlaylist = () => {
    // Create an array of track URIs
    const trackUris = playlistTracks.map(track => track.uri);
    
    // Log the playlist data (in real implementation, this would send to Spotify API)
    console.log('Saving playlist to Spotify:');
    console.log('Playlist Name:', playlistName);
    console.log('Track URIs:', trackUris);
    
    // TODO: Send trackUris and playlistName to Spotify API
    // For now, just reset the playlist
    setPlaylistName('New Playlist');
    setPlaylistTracks([]);
  };

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Jammming App</h1>
      <SearchBar />
      <SearchResults searchResults={searchResults} onAdd={addTrack} />
      <Playlist playlistName={playlistName} playlistTracks={playlistTracks} onRemove={removeTrack} onNameChange={updatePlaylistName} onSave={savePlaylist} />
    </div>
  );
}

export default App;