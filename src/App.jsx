import React, { useState, useEffect } from 'react';
import styles from './App.module.css';
import './index.css';

import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import Playlist from './components/Playlist';
import SpotifyAuth from './util/spotify';

function App() {
  // Initialize Spotify auth on app load
  useEffect(() => {
    const token = SpotifyAuth.getAccessToken();
    if (token) {
      console.log('Spotify access token obtained:', token);
    }
  }, []);

  // Search results state (now mutable for API results)
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle search from SearchBar
  const handleSearch = async (searchTerm) => {
    setIsSearching(true);
    try {
      const results = await SpotifyAuth.search(searchTerm);
      setSearchResults(results);
      console.log(`Found ${results.length} tracks for "${searchTerm}"`);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Playlist state
  const [playlistName, setPlaylistName] = useState('My Playlist');
  const [playlistTracks, setPlaylistTracks] = useState([
    // Example initial track (can be removed)
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
  const savePlaylist = async () => {
    if (playlistTracks.length === 0) {
      alert('Your playlist is empty! Add some tracks before saving.');
      return;
    }

    try {
      // Step 1: Get the user's ID
      const userId = await SpotifyAuth.getUserId();
      if (!userId) {
        alert('Failed to get your Spotify user ID. Please try again.');
        return;
      }
      console.log('User ID:', userId);

      // Step 2: Create a new playlist
      const playlistId = await SpotifyAuth.createPlaylist(playlistName, `Created by Jammming on ${new Date().toLocaleDateString()}`);
      if (!playlistId) {
        alert('Failed to create playlist. Please try again.');
        return;
      }
      console.log('Playlist created with ID:', playlistId);

      // Step 3: Add tracks to the playlist
      const trackUris = playlistTracks.map(track => track.uri);
      const success = await SpotifyAuth.addTracksToPlaylist(userId, playlistId, trackUris);
      
      if (success) {
        alert(`Playlist "${playlistName}" saved to Spotify with ${trackUris.length} tracks!`);
        // Reset the playlist
        setPlaylistName('New Playlist');
        setPlaylistTracks([]);
      } else {
        alert('Playlist created but failed to add some tracks. Please check Spotify.');
      }
    } catch (error) {
      console.error('Error saving playlist:', error);
      alert('An error occurred while saving your playlist. Please try again.');
    }
  };

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Jammming App</h1>
      <SearchBar onSearch={handleSearch} />
      <SearchResults searchResults={searchResults} onAdd={addTrack} isLoading={isSearching} />
      <Playlist playlistName={playlistName} playlistTracks={playlistTracks} onRemove={removeTrack} onNameChange={updatePlaylistName} onSave={savePlaylist} />
    </div>
  );
}

export default App;