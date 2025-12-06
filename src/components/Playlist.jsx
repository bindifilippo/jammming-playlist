import React from 'react';
import Tracklist from './Tracklist'; 
import styles from './Playlist.module.css'; 

function Playlist() {
  const tracks = [
    { id: 1, name: 'Song A', artist: 'Artist A', album: 'Album A' },
    { id: 2, name: 'Song B', artist: 'Artist B', album: 'Album B' },
    { id: 3, name: 'Song C', artist: 'Artist C', album: 'Album C' },
  ];

  return (
    <div className={styles.playlist}>
      <h2>My Playlist</h2>
      <Tracklist tracks={tracks} />
      <button className={styles.savePlaylistButton}>Save to Spotify</button>
    </div>
  );
}

export default Playlist;