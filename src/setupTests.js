import '@testing-library/jest-dom/vitest'

// jsdom no implementa scrollIntoView; por defecto no hace nada y los tests lo espían si lo necesitan
Element.prototype.scrollIntoView = function scrollIntoView() {}
