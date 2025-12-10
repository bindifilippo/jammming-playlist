import React from 'react';
import styles from './SearchResults.module.css';
import Tracklist from './Tracklist';

function SearchResults({ searchResults, onAdd, isLoading }) {
  return (
    <div className={styles.playlist}>
      <h2>Results</h2>
      {isLoading && <p>Searching...</p>}
      {!isLoading && searchResults.length === 0 && <p>No results. Try searching for a song!</p>}
      {searchResults.length > 0 && <Tracklist tracks={searchResults} onAdd={onAdd} />}
    </div>
  );
}

export default SearchResults;