# @incloodsolutions/node-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)
[![npm dm](https://img.shields.io/npm/dm/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)
[![downloads](https://img.shields.io/npm/dt/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)
[![licensee](https://img.shields.io/npm/l/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)

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
