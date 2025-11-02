import { useState } from "react";

function App() {
  const [text, setText] = useState("Test text");
  
  return (
    <div className="App">
      <div style={{ height: '100vh', padding: '8px' }}>
        <h1>Mind::Type Web Demo</h1>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type here..."
        />
      </div>
    </div>
  );
}

export default App;
