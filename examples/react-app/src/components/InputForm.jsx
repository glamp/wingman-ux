import React from 'react';

function InputForm({ text, onTextChange, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with text:', text);
    alert(`You submitted: ${text}`);
    onSubmit();
  };

  console.log('InputForm rendered');

  return (
    <section className="form-section">
      <h2>Input Form</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Type something..."
          className="text-input"
        />
        <button type="submit" className="submit-btn">
          Submit
        </button>
      </form>
    </section>
  );
}

export default InputForm;
