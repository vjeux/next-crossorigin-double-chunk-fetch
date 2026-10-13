"use client";

import { useState } from "react";

export function AboutClient() {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>About</h1>
      <button onClick={() => setCount((c) => c + 1)}>clicked {count}</button>
    </main>
  );
}
