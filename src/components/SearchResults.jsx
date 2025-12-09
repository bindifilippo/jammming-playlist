import React from 'react';
import styles from './SearchResults.module.css';
import Tracklist from './Tracklist';

function SearchResults({ searchResults, onAdd }) {
  return (
    <div className={styles.playlist}>
      <h2>Results</h2>
      <Tracklist tracks={searchResults} onAdd={onAdd} />
    </div>
  );
}

export default SearchResults;