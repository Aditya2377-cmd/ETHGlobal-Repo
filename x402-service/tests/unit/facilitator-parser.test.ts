import { describe, expect, it } from "vitest";
import { FacilitatorService } from "../../src/services/facilitator.service";
import { FacilitatorSupportedResponse } from "../../src/types";

describe("Facilitator Parser", () => {
  const service = new FacilitatorService("https://x402.org/facilitator");

  it("should successfully parse valid hedera:testnet exact response with feePayer", () => {
    const validResponse: FacilitatorSupportedResponse = {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: "hedera:testnet",
          extra: {
            feePayer: "0.0.9185802",
          },
        },
      ],
      signers: {
        "hedera:*": ["0.0.9185802"],
      },
    };

    const result = service.parseSupportedResponse(validResponse);
    expect(result.isCompatible).toBe(true);
    expect(result.feePayer).toBe("0.0.9185802");
  });

  it("should extract feePayer from signers dictionary when extra.feePayer is omitted", () => {
    const response: FacilitatorSupportedResponse = {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: "hedera:testnet",
        },
      ],
      signers: {
        "hedera:*": ["0.0.55555"],
      },
    };

    const result = service.parseSupportedResponse(response);
    expect(result.isCompatible).toBe(true);
    expect(result.feePayer).toBe("0.0.55555");
  });

  it("should reject response missing hedera:testnet kind", () => {
    const response: FacilitatorSupportedResponse = {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: "eip155:84532",
        },
      ],
    };

    const result = service.parseSupportedResponse(response);
    expect(result.isCompatible).toBe(false);
    expect(result.errorMessage).toContain("Facilitator does not support x402Version 2 exact scheme on hedera:testnet");
  });

  it("should reject response with malformed fee-payer account ID", () => {
    const response: FacilitatorSupportedResponse = {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: "hedera:testnet",
          extra: {
            feePayer: "invalid-account-id",
          },
        },
      ],
    };

    const result = service.parseSupportedResponse(response);
    expect(result.isCompatible).toBe(false);
    expect(result.errorMessage).toContain("Facilitator advertised invalid Hedera fee-payer account ID");
  });

  it("should reject empty or malformed payload without crashing", () => {
    const result = service.parseSupportedResponse({} as FacilitatorSupportedResponse);
    expect(result.isCompatible).toBe(false);
    expect(result.errorMessage).toContain("missing kinds array");
  });
});
