# OCR dependencies

Tesseract.js v7.0.0, Tesseract.js-core v7.0.0, and @tesseract.js-data English/Simplified Chinese v1.0.0 are distributed unmodified from their published npm CDN artifacts.

Project: https://github.com/naptha/tesseract.js
Core: https://github.com/naptha/tesseract.js-core
Language data: https://github.com/naptha/tessdata
Upstream Tesseract: https://github.com/tesseract-ocr/tesseract

These components use the Apache License, Version 2.0; see LICENSE-tesseract.md. The two 4.0.0_best_int models are the LSTM integer models. Six core .wasm.js variants provide legacy, LSTM, SIMD, and relaxed SIMD support. Browser loads only its matching core variant. The wrapper contains its WebAssembly payload.

No user transaction data or screenshots are bundled with these dependencies.
