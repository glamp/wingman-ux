import React from 'react'

function Header({ darkMode, onToggleDarkMode }) {
  return (
    <header className="header">
      <h1>Wingman Demo App</h1>
      <button 
        className="theme-toggle"
        onClick={onToggleDarkMode}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

export default Header