import React, { useState } from 'react'

function ErrorTester() {
  const [showError, setShowError] = useState(false)

  const triggerError = () => {
    console.error('User triggered an intentional error!')
    setShowError(true)
    setTimeout(() => {
      throw new Error('This is an intentional error for testing!')
    }, 100)
  }

  return (
    <section className="error-section">
      <h2>Error Testing</h2>
      <button 
        className="error-btn"
        onClick={triggerError}
      >
        Trigger Error
      </button>
      {showError && (
        <div className="error-message">
          An error will be thrown shortly!
        </div>
      )}
    </section>
  )
}

export default ErrorTester