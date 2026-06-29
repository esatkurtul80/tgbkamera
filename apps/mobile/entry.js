// Polyfill'ler herşeyden önce çalışmalı
if (!global.DOMException) {
  class DOMException extends Error {
    constructor(message, name = 'DOMException') {
      super(message);
      this.name = name;
      this.code = 0;
    }
  }
  Object.defineProperty(global, 'DOMException', {
    value: DOMException,
    writable: true,
    configurable: true,
  });
}

if (!global.structuredClone) {
  Object.defineProperty(global, 'structuredClone', {
    value: (obj) => JSON.parse(JSON.stringify(obj)),
    writable: true,
    configurable: true,
  });
}

// Expo Router entry point
require('expo-router/entry');
