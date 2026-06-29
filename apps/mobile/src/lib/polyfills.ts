// DOMException is not available in Hermes (React Native's JS engine).
// Firebase Auth uses it internally, so we polyfill it globally.
if (typeof global.DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
    code: number;
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
      this.code = 0;
    }
  };
}
