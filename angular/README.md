# @incloodsolutions/node-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/node-toolkit.svg)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/node-toolkit.svg)](LICENSE)

A Node.js-focused extension of `@incloodsolutions/toolkit`, offering utilities for server-side applications.
Includes async helpers, file system utilities, configuration management, and runtime tools optimised for building scalable Node.js backends and CLI tools.

---

## 📦 Installation

```bash
npm install @incloodsolutions/node-toolkit
# or
yarn add @incloodsolutions/node-toolkit
```

## 🚀 Usage

```typescript
import { readJsonFile } from "@incloodsolutions/node-toolkit";

async function main() {
  const config = await readJsonFile("./config.json");
  console.log(config);
}

main();
```
