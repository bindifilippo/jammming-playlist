import React from 'react'; 
import styles from './SearchBar.module.css';

function SearchBar() {
  return (
    <div className={styles.searchBar}>
      <h2>Search for a song</h2>

      <input
        type="text"
        placeholder="Enter a song, album or artist"
        className={styles.searchInput}
      />

      <button className={styles.searchButton}>Search</button>
    </div>
  );
}

export default SearchBar;