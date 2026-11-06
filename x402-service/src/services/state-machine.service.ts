import { PaymentState } from "../types";

export class PaymentStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
    PAYMENT_REQUIRED: ["PAYMENT_SUBMITTED", "EXPIRED"],
    PAYMENT_SUBMITTED: ["VERIFYING", "FAILED"],
    VERIFYING: ["SETTLING", "FAILED"],
    SETTLING: ["SETTLEMENT_PENDING", "RECONCILIATION_REQUIRED", "CONFIRMED", "FAILED"],
    SETTLEMENT_PENDING: ["RECONCILIATION_REQUIRED", "CONFIRMED", "FAILED"],
    RECONCILIATION_REQUIRED: ["CONFIRMED", "FAILED"],
    CONFIRMED: [], // Terminal success state
    FAILED: ["PAYMENT_SUBMITTED"], // Can retry payment submission
    EXPIRED: [], // Terminal state
  };

  public static canTransition(from: PaymentState, to: PaymentState): boolean {
    if (from === to) {
      return true;
    }
    const allowed = this.ALLOWED_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  public static assertValidTransition(from: PaymentState, to: PaymentState): void {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Illegal payment state transition from "${from}" to "${to}". Permitted transitions: [${(
          this.ALLOWED_TRANSITIONS[from] || []
        ).join(", ")}]`
      );
    }
  }

  public static isTerminal(state: PaymentState): boolean {
    return state === "CONFIRMED" || state === "EXPIRED";
  }

  public static permitsResponseUnlock(state: PaymentState): boolean {
    return state === "CONFIRMED";
  }
}
