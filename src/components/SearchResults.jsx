import React from 'react';
import styles from './SearchResults.module.css';

function SearchResults() {
  return (
    <div className={styles.playlist}>
      <h2>Playlist</h2>
      <ul>
        <li>Song 1 - Artist 1</li>
        <li>Song 2 - Artist 2</li>
        <li>Song 3 - Artist 3</li>
      </ul>
    </div>
  );
}

export default SearchResults;