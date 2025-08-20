import React from 'react'

function Counter({ count, onIncrement, onDecrement, onReset }) {
  return (
    <section className="counter-section">
      <h2>Counter Section</h2>
      <div className="counter">
        <button onClick={onDecrement}>-</button>
        <span className="count-display">{count}</span>
        <button onClick={onIncrement}>+</button>
      </div>
      <button className="reset-btn" onClick={onReset}>
        Reset Counter
      </button>
    </section>
  )
}

export default Counter