import React from 'react';
import Tracklist from './Tracklist'; 
import styles from './Playlist.module.css'; 

function Playlist({ playlistName, playlistTracks, onRemove, onNameChange, onSave }) {
  const handleNameChange = (e) => {
    onNameChange(e.target.value);
  };

  const handleSave = () => {
    onSave();
  };

  return (
    <div className={styles.playlist}>
      <input 
        type="text" 
        value={playlistName} 
        onChange={handleNameChange}
        className={styles.playlistNameInput}
      />
      <Tracklist tracks={playlistTracks} isRemoval={true} onRemove={onRemove} />
      <button className={styles.savePlaylistButton} onClick={handleSave}>Save to Spotify</button>
    </div>
  );
}

export default Playlist;