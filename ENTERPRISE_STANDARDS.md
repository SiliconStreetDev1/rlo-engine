# Enterprise Software Architecture & Coding Standards (JS13K Edition)

This document defines the strict, non-negotiable coding standards and architectural mindset that any developer (human or AI) must adopt when working on this codebase.

## 1. Role & Mindset
*   **Elite Enterprise Standard:** Code must represent the absolute highest standard of enterprise software engineering.
*   **No Quick Scripts:** Do not write quick scripts; architect robust, scalable, and memory-efficient systems.

## 2. Core Directives
*   **Zero Hacks & No Workarounds:** Code must be deterministic, mathematically sound, and leverage the language's core design patterns optimally. No "duct-tape" solutions or brute-force algorithms.
*   **Strict Modularity (No God Classes):** Adhere rigidly to SOLID principles. Separate concerns meticulously. Keep methods small and classes highly focused.
*   **Continuous Refactoring:** With every new iteration or feature request, evaluate the existing context and refactor for elegance, performance, and maintainability before adding new logic.
*   **Memory & Performance:** Explicitly handle garbage collection and memory lifecycle management where applicable. Avoid memory leaks, optimize time/space complexity, and ensure high-performance data processing.

## 3. JS13K Constraints (The Micro-Enterprise Paradigm)
*   **Byte-Conscious Architecture:** The target environment is a 13kb zipped bundle. Every architectural decision must heavily weigh its post-minification footprint.
*   **Leverage the Build Pipeline:** Do NOT manually mangle variable or method names to save space. Write highly descriptive, long-form clean code in the source. Rely on Terser (configured in Vite) to mangle properties prefixed with `_` down to single bytes. 
*   **Zero-Byte Overhead Solutions:** Native browser APIs and events (e.g., AudioNode `onended`) should be leveraged as zero-byte mechanisms, but they MUST be properly encapsulated, documented, and robustly error-handled.
*   **Tree-Shaking Dominance:** Modularity is not just for organization; it is essential for Rollup/Vite to perform aggressive dead-code elimination. Ensure no side-effects in modules to guarantee unused synths and engines are aggressively stripped from the final build.

## 4. Code Style & Documentation
*   **JSDoc / Standardized Commenting:** Every class, interface, method, and complex logical block must be fully documented using rich JSDoc. Explain *why* a decision was made, not just *what* it does.
*   **Clean Code:** Use highly descriptive, intention-revealing variable and method names.
*   **Naming Conventions:** Strictly forbid the use of Hungarian notation. Use modern, clean naming conventions.

## 5. Delivery & Output Rules (AI Specific)
*   **NEVER Truncate Code:** You are strictly forbidden from providing partial code snippets, using placeholders like `// ... rest of the code`, or skipping implementation details.
*   **Always Provide Full Blocks:** When creating or modifying a class, object, or file, output the complete, fully functioning code block from start to finish.
*   **Code as a Blueprint:** Treat the output as a production-ready blueprint that will be directly compiled and deployed in a mission-critical enterprise environment.
