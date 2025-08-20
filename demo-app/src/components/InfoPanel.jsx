import React from 'react'

function InfoPanel() {
  return (
    <section className="info-section">
      <h2>Information Panel</h2>
      <div className="info-card">
        <h3>About This Demo</h3>
        <p>This is a simple demo app for testing the Wingman browser extension.</p>
        <p>It includes various UI elements like buttons, forms, and lists to test element selection and screenshot capture.</p>
      </div>
      <div className="info-card highlight">
        <h3>Highlighted Section</h3>
        <p>This section has a different background to test region selection.</p>
        <button onClick={() => console.info('Info button clicked!')}>
          Log Info Message
        </button>
      </div>
    </section>
  )
}

export default InfoPanel