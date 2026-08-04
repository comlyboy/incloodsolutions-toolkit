# @incloodsolutions/devkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)
[![npm dm](https://img.shields.io/npm/dm/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)
[![downloads](https://img.shields.io/npm/dt/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)

A comprehensive development toolkit for Node.js and TypeScript applications. It provides reusable development utilities, configuration helpers, AWS CDK constructs and stacks, build tooling, project scaffolding, and other resources to simplify modern application development and infrastructure management.

---

## 📦 Installation

```bash
npm install @incloodsolutions/devkit
# or
yarn add @incloodsolutions/devkit
```

## 🚀 Usage

```typescript
import { EnvironmentHelper } from "@incloodsolutions/devkit";

// Example usage
const env = EnvironmentHelper.load();
```

## ✨ Features

- ⚙️ Node.js development utilities
- 📝 Configuration management
- 🏗️ AWS CDK constructs
- ☁️ Reusable AWS CDK stacks
- 🛠️ Infrastructure helpers
- 🔐 IAM, Route53, ACM, Lambda, API Gateway, S3 & DynamoDB utilities
- 🏷️ Resource naming & tagging helpers
- 📁 Project templates & scaffolding
- 🧩 Build & release utilities
- 🔧 Development tooling and helpers
- 💙 First-class TypeScript support

## 🎯 Goals

- Reduce development and infrastructure boilerplate
- Standardise project structure and configuration
- Promote reusable infrastructure components
- Simplify AWS CDK development
- Improve developer productivity
- Encourage consistency across projects
- Provide sensible defaults while remaining extensible

## 📚 Part of the IncloodSolutions Toolkit Ecosystem

- **@incloodsolutions/toolkit** — Core utilities and shared helpers
- **@incloodsolutions/node-toolkit** — Node.js runtime and backend utilities
- **@incloodsolutions/toolkit-react** — React utilities and components
- **@incloodsolutions/devkit** — Development tooling, configuration, AWS CDK constructs, stacks, and infrastructure utilities