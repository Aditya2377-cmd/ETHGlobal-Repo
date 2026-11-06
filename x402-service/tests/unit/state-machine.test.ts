import { describe, expect, it } from "vitest";
import { PaymentStateMachine } from "../../src/services/state-machine.service";

describe("Payment State Machine", () => {
  it("should permit valid sequential forward transitions", () => {
    expect(PaymentStateMachine.canTransition("PAYMENT_REQUIRED", "PAYMENT_SUBMITTED")).toBe(true);
    expect(PaymentStateMachine.canTransition("PAYMENT_SUBMITTED", "VERIFYING")).toBe(true);
    expect(PaymentStateMachine.canTransition("VERIFYING", "SETTLING")).toBe(true);
    expect(PaymentStateMachine.canTransition("SETTLING", "RECONCILIATION_REQUIRED")).toBe(true);
    expect(PaymentStateMachine.canTransition("RECONCILIATION_REQUIRED", "CONFIRMED")).toBe(true);
  });

  it("should permit failure transitions from intermediate states", () => {
    expect(PaymentStateMachine.canTransition("PAYMENT_SUBMITTED", "FAILED")).toBe(true);
    expect(PaymentStateMachine.canTransition("VERIFYING", "FAILED")).toBe(true);
    expect(PaymentStateMachine.canTransition("SETTLING", "FAILED")).toBe(true);
    expect(PaymentStateMachine.canTransition("RECONCILIATION_REQUIRED", "FAILED")).toBe(true);
  });

  it("should permit retry from FAILED state", () => {
    expect(PaymentStateMachine.canTransition("FAILED", "PAYMENT_SUBMITTED")).toBe(true);
  });

  it("should reject illegal backward and skipping transitions", () => {
    expect(PaymentStateMachine.canTransition("CONFIRMED", "PAYMENT_REQUIRED")).toBe(false);
    expect(PaymentStateMachine.canTransition("CONFIRMED", "FAILED")).toBe(false);
    expect(PaymentStateMachine.canTransition("PAYMENT_REQUIRED", "CONFIRMED")).toBe(false);
    expect(PaymentStateMachine.canTransition("PAYMENT_REQUIRED", "SETTLING")).toBe(false);
    expect(PaymentStateMachine.canTransition("EXPIRED", "PAYMENT_SUBMITTED")).toBe(false);
  });

  it("should throw in assertValidTransition on illegal transition", () => {
    expect(() =>
      PaymentStateMachine.assertValidTransition("PAYMENT_REQUIRED", "CONFIRMED")
    ).toThrow(/Illegal payment state transition/);
  });

  it("should identify terminal states", () => {
    expect(PaymentStateMachine.isTerminal("CONFIRMED")).toBe(true);
    expect(PaymentStateMachine.isTerminal("EXPIRED")).toBe(true);
    expect(PaymentStateMachine.isTerminal("PAYMENT_REQUIRED")).toBe(false);
    expect(PaymentStateMachine.isTerminal("VERIFYING")).toBe(false);
  });

  it("should permit response unlock strictly when state is CONFIRMED", () => {
    expect(PaymentStateMachine.permitsResponseUnlock("CONFIRMED")).toBe(true);
    expect(PaymentStateMachine.permitsResponseUnlock("VERIFYING")).toBe(false);
    expect(PaymentStateMachine.permitsResponseUnlock("SETTLING")).toBe(false);
    expect(PaymentStateMachine.permitsResponseUnlock("SETTLEMENT_PENDING")).toBe(false);
    expect(PaymentStateMachine.permitsResponseUnlock("RECONCILIATION_REQUIRED")).toBe(false);
    expect(PaymentStateMachine.permitsResponseUnlock("FAILED")).toBe(false);
  });
});
