/**
 * WCAG 2.1 Contrast Ratio Calculator
 * Calculates contrast ratio between two HEX colour strings (e.g. '#FFFFFF' and '#059669')
 */

function hexToRgb(hex) {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function sRgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * sRgbToLinear(r) +
    0.7152 * sRgbToLinear(g) +
    0.0722 * sRgbToLinear(b)
  );
}

/**
 * Returns contrast ratio between 1 and 21 (rounded to 2 decimal places)
 */
export function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function checkWcagCompliance(hex1, hex2) {
  const ratio = getContrastRatio(hex1, hex2);
  return {
    ratio,
    passesNormalTextAA: ratio >= 4.5,
    passesNormalTextAAA: ratio >= 7.0,
    passesLargeTextAA: ratio >= 3.0,
    passesLargeTextAAA: ratio >= 4.5,
  };
}
