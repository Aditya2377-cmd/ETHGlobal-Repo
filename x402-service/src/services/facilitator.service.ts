import {
  DEFAULT_FACILITATOR_FEE_PAYER,
  HEDERA_TESTNET_CAIP2,
  SCHEME_EXACT,
  X402_VERSION,
} from "../constants";
import {
  FacilitatorSupportedKind,
  FacilitatorSupportedResponse,
  PaymentPayloadDoc,
  PaymentRequirementDoc,
} from "../types";

export interface FacilitatorCheckResult {
  isCompatible: boolean;
  feePayer: string;
  kind?: FacilitatorSupportedKind;
  errorMessage?: string;
}

export class FacilitatorService {
  private cachedFeePayer: string | null = null;
  private lastCheckedTimestamp = 0;
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(private readonly facilitatorUrl: string) {}

  public getFacilitatorUrl(): string {
    return this.facilitatorUrl;
  }

  /**
   * Queries /supported and parses facilitator compatibility for Hedera Testnet x402 exact.
   */
  public async getSupported(): Promise<FacilitatorCheckResult> {
    const now = Date.now();
    if (this.cachedFeePayer && now - this.lastCheckedTimestamp < this.CACHE_TTL_MS) {
      return {
        isCompatible: true,
        feePayer: this.cachedFeePayer,
      };
    }

    try {
      const resp = await fetch(`${this.facilitatorUrl.replace(/\/+$/, "")}/supported`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (!resp.ok) {
        return {
          isCompatible: false,
          feePayer: DEFAULT_FACILITATOR_FEE_PAYER,
          errorMessage: `Facilitator returned HTTP ${resp.status} on /supported`,
        };
      }

      const body = (await resp.json()) as FacilitatorSupportedResponse;
      const parsed = this.parseSupportedResponse(body);

      if (parsed.isCompatible && parsed.feePayer) {
        this.cachedFeePayer = parsed.feePayer;
        this.lastCheckedTimestamp = now;
      }

      return parsed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isCompatible: false,
        feePayer: DEFAULT_FACILITATOR_FEE_PAYER,
        errorMessage: `Failed to query facilitator /supported: ${msg}`,
      };
    }
  }

  /**
   * Pure parser validating facilitator supported kind for hedera:testnet exact.
   */
  public parseSupportedResponse(response: FacilitatorSupportedResponse): FacilitatorCheckResult {
    if (!response || !Array.isArray(response.kinds)) {
      return {
        isCompatible: false,
        feePayer: DEFAULT_FACILITATOR_FEE_PAYER,
        errorMessage: "Invalid facilitator response format: missing kinds array",
      };
    }

    const matchingKind = response.kinds.find(
      (k) =>
        k.x402Version === X402_VERSION &&
        k.scheme === SCHEME_EXACT &&
        k.network === HEDERA_TESTNET_CAIP2
    );

    if (!matchingKind) {
      return {
        isCompatible: false,
        feePayer: DEFAULT_FACILITATOR_FEE_PAYER,
        errorMessage: `Facilitator does not support x402Version 2 exact scheme on ${HEDERA_TESTNET_CAIP2}`,
      };
    }

    // Inspect advertised fee-payer
    const feePayer =
      matchingKind.extra?.feePayer ||
      (response.signers && response.signers["hedera:*"]?.[0]) ||
      DEFAULT_FACILITATOR_FEE_PAYER;

    if (!/^0\.0\.[1-9][0-9]*$/.test(feePayer)) {
      return {
        isCompatible: false,
        feePayer: DEFAULT_FACILITATOR_FEE_PAYER,
        errorMessage: `Facilitator advertised invalid Hedera fee-payer account ID: "${feePayer}"`,
      };
    }

    return {
      isCompatible: true,
      feePayer,
      kind: matchingKind,
    };
  }

  /**
   * Dispatches payment payload to facilitator /verify endpoint.
   */
  public async verifyPayment(
    paymentPayload: PaymentPayloadDoc,
    requirements: PaymentRequirementDoc["accepts"][0]
  ): Promise<{ isValid: boolean; invalidReason?: string }> {
    try {
      const resp = await fetch(`${this.facilitatorUrl.replace(/\/+$/, "")}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x402Version: X402_VERSION,
          paymentPayload,
          paymentRequirements: requirements,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return {
          isValid: false,
          invalidReason: `Facilitator verify returned HTTP ${resp.status}: ${text}`,
        };
      }

      const data = (await resp.json()) as { isValid: boolean; invalidReason?: string };
      return {
        isValid: !!data.isValid,
        invalidReason: data.invalidReason,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isValid: false,
        invalidReason: `Facilitator verification call failed: ${msg}`,
      };
    }
  }

  /**
   * Dispatches payment payload to facilitator /settle endpoint to submit on Hedera Testnet.
   */
  public async settlePayment(
    paymentPayload: PaymentPayloadDoc,
    requirements: PaymentRequirementDoc["accepts"][0]
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const resp = await fetch(`${this.facilitatorUrl.replace(/\/+$/, "")}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x402Version: X402_VERSION,
          paymentPayload,
          paymentRequirements: requirements,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return {
          success: false,
          error: `Facilitator settlement returned HTTP ${resp.status}: ${text}`,
        };
      }

      const data = (await resp.json()) as {
        success: boolean;
        transaction?: string;
        transactionId?: string;
        error?: string;
      };

      const txId = data.transactionId || data.transaction;
      return {
        success: !!data.success && !!txId,
        transactionId: txId,
        error: data.error,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Facilitator settlement network error: ${msg}`,
      };
    }
  }
}
