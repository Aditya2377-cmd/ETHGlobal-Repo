import { describe, expect, it } from "vitest";
import {
  hbarToTinybars,
  tinybarsToHbar,
  validateTinybarAmount,
} from "../../src/utils/amount";

describe("Amount Converter Utilities", () => {
  describe("validateTinybarAmount", () => {
    it("should accept valid positive numbers", () => {
      expect(validateTinybarAmount(100)).toBe(100);
      expect(validateTinybarAmount(100_000_000)).toBe(100_000_000);
    });

    it("should accept valid positive BigInts", () => {
      expect(validateTinybarAmount(500n)).toBe(500);
      expect(validateTinybarAmount(100_000_000n)).toBe(100_000_000);
    });

    it("should accept valid positive string integers", () => {
      expect(validateTinybarAmount("1000")).toBe(1000);
      expect(validateTinybarAmount(" 250000 ")).toBe(250000);
    });

    it("should reject zero", () => {
      expect(() => validateTinybarAmount(0)).toThrow(TypeError);
      expect(() => validateTinybarAmount(0n)).toThrow(TypeError);
      expect(() => validateTinybarAmount("0")).toThrow(TypeError);
    });

    it("should reject negative amounts", () => {
      expect(() => validateTinybarAmount(-10)).toThrow(TypeError);
      expect(() => validateTinybarAmount(-100n)).toThrow(TypeError);
      expect(() => validateTinybarAmount("-50")).toThrow(TypeError);
    });

    it("should reject floating point numbers", () => {
      expect(() => validateTinybarAmount(10.5)).toThrow(TypeError);
      expect(() => validateTinybarAmount("10.5")).toThrow(TypeError);
    });

    it("should reject NaN, Infinity, and non-numeric types", () => {
      expect(() => validateTinybarAmount(NaN)).toThrow(TypeError);
      expect(() => validateTinybarAmount(Infinity)).toThrow(TypeError);
      expect(() => validateTinybarAmount(null)).toThrow(TypeError);
      expect(() => validateTinybarAmount({})).toThrow(TypeError);
      expect(() => validateTinybarAmount("abc")).toThrow(TypeError);
    });
  });

  describe("hbarToTinybars", () => {
    it("should convert integer HBAR correctly", () => {
      expect(hbarToTinybars(1)).toBe(100_000_000);
      expect(hbarToTinybars("5")).toBe(500_000_000);
      expect(hbarToTinybars("100")).toBe(10_000_000_000);
    });

    it("should convert fractional HBAR correctly with zero floating point drift", () => {
      expect(hbarToTinybars("0.1")).toBe(10_000_000);
      expect(hbarToTinybars("0.00000001")).toBe(1); // 1 tinybar
      expect(hbarToTinybars("0.00001000")).toBe(1000);
      expect(hbarToTinybars("1.5")).toBe(150_000_000);
      expect(hbarToTinybars("0.12345678")).toBe(12345678);
    });

    it("should reject HBAR with more than 8 decimal places", () => {
      expect(() => hbarToTinybars("0.000000001")).toThrow(TypeError);
      expect(() => hbarToTinybars("1.123456789")).toThrow(TypeError);
    });

    it("should reject malformed or negative HBAR strings", () => {
      expect(() => hbarToTinybars("-1.5")).toThrow(TypeError);
      expect(() => hbarToTinybars("1.2.3")).toThrow(TypeError);
      expect(() => hbarToTinybars("HBAR 1.0")).toThrow(TypeError);
    });
  });

  describe("tinybarsToHbar", () => {
    it("should convert integer tinybars to cleanly formatted HBAR string", () => {
      expect(tinybarsToHbar(100_000_000)).toBe("1");
      expect(tinybarsToHbar(500_000_000n)).toBe("5");
      expect(tinybarsToHbar(10_000_000)).toBe("0.1");
      expect(tinybarsToHbar(1)).toBe("0.00000001");
      expect(tinybarsToHbar(12345678)).toBe("0.12345678");
      expect(tinybarsToHbar(150_000_000)).toBe("1.5");
    });
  });
});
