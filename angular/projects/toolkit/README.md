# @incloodsolutions/angular-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/angular-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit)
[![npm dm](https://img.shields.io/npm/dm/@incloodsolutions/angular-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit)
[![downloads](https://img.shields.io/npm/dt/@incloodsolutions/angular-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit)
[![licensee](https://img.shields.io/npm/l/@incloodsolutions/angular-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit)

A collection of Angular utilities and services extending the shared `@incloodsolutions/toolkit`.
Includes Angular-specific providers, Signal helpers , RxJS helpers, and decorators that streamline common development tasks and improve productivity in Angular applications.

---

## 📦 Installation

```bash
npm install @incloodsolutions/angular-toolkit
# or
yarn add @incloodsolutions/angular-toolkit
```

## 🚀 Usage
```typescript
import { UntilDestroy, untilDestroyed } from "@incloodsolutions/angular-toolkit";
import { Component, OnInit } from "@angular/core";
import { interval } from "rxjs";

@UntilDestroy()
@Component({
  selector: "app-example",
  template: "<p>Check console logs</p>",
})
export class ExampleComponent implements OnInit {
  ngOnInit() {
    interval(1000)
      .pipe(untilDestroyed(this))
      .subscribe(() => console.log("tick"));
  }
}
```
