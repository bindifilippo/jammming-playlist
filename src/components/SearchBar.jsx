import React, { useState } from 'react'; 
import styles from './SearchBar.module.css';

function SearchBar({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onSearch(searchTerm);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={styles.searchBar}>
      <h2>Search for a song</h2>

      <input
        type="text"
        placeholder="Enter a song, album or artist"
        className={styles.searchInput}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
      />

      <button className={styles.searchButton} onClick={handleSearch}>Search</button>
    </div>
  );
}

export default SearchBar;