# @incloodsolutions/react-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/react-toolkit.svg)](https://www.npmjs.com/package/@incloodsolutions/react-toolkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/react-toolkit.svg)](LICENSE)

A utility and helper library for React applications, built on top of `@incloodsolutions/toolkit`.
Provides hooks, context utilities, and reusable patterns that simplify state management, component logic, and developer experience in modern React projects.

---

## 📦 Installation

```bash
npm install @incloodsolutions/react-toolkit
# or
yarn add @incloodsolutions/react-toolkit
```

## 🚀 Usage
```typescript
import { useToggle } from "@incloodsolutions/react-toolkit";

function ExampleComponent() {
  const [isOpen, toggle] = useToggle();

  return (
    <button onClick={toggle}>
      {isOpen ? "Open" : "Closed"}
    </button>
  );
}

```