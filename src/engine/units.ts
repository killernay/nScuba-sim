/**
 * Unit conversion utilities.
 */

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function feetToMeters(ft: number): number {
  return ft / 3.28084;
}

export function barToPsi(bar: number): number {
  return bar * 14.5038;
}

export function psiToBar(psi: number): number {
  return psi / 14.5038;
}

export function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9;
}

export function litersToTubicFeet(l: number): number {
  return l * 0.0353147;
}
