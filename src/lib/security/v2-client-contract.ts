export const V2_CLIENT_CONTRACT_HEADER =
  "x-mimi-client-contract-version" as const;
export const V2_CLIENT_CONTRACT_VERSION = "v2-schema6" as const;

export function v2ClientContractHeaders() {
  return {
    [V2_CLIENT_CONTRACT_HEADER]: V2_CLIENT_CONTRACT_VERSION,
  } as const;
}
