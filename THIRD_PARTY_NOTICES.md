# Third-Party Software Notices and Licenses

This project contains third-party software components licensed under open-source licenses. Below is the copyright and license notice for the procedural WebGL background component integrated into PerPay.

---

## 1. My Universe (WebGL 2 Procedural Network)

- **Original Author**: kakaxi0618
- **Original Source**: https://codepen.io/kakaxi0618/pen/JmLpYj
- **License**: MIT License

```text
The MIT License (MIT)

Copyright (c) 2026 kakaxi0618 (https://codepen.io/kakaxi0618/pen/JmLpYj)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Architectural Adaptations in PerPay:
- Refactored from global imperative scripts into a modular, lifecycle-safe React component (`PerPayBackground.tsx`).
- Color palette adapted to PerPay's fintech identity: deep charcoal, muted forest green, sage, subtle copper, and warm ivory, eliminating random RGB cycling.
- Added responsive viewport dynamic resizing via `ResizeObserver` and window resize handlers.
- Implemented automatic pausing on background tab (`document.visibilityState === 'hidden'`) and off-screen viewport intersection (`IntersectionObserver`) to eliminate unnecessary GPU load.
- Full compliance with `prefers-reduced-motion` media queries with elegant fallback.
- Context loss (`webglcontextlost`, `webglcontextrestored`) and shader failure handling with clean SVG canvas fallback.
- Strict isolation using `pointer-events: none` to guarantee all interactive UI buttons and inputs are unobstructed.
- Selective placement: restricted to onboarding/welcome surfaces and compact brand elements, never distracting from financial ledgers or payment review documents.

