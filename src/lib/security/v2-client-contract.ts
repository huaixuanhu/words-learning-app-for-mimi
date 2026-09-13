export const V2_CLIENT_CONTRACT_HEADER =
  "x-mimi-client-contract-version" as const;
export const V2_CLIENT_CONTRACT_VERSION = "v2-schema6" as const;
// Storage save acknowledgements changed in V2.3 without changing Schema 6.
export const V2_STORAGE_CLIENT_REVISION_HEADER = "x-mimi-storage-client-revision" as const;
export const V2_STORAGE_CLIENT_REVISION = "v2.3" as const;

export function v2ClientContractHeaders() {
  return {
    [V2_CLIENT_CONTRACT_HEADER]: V2_CLIENT_CONTRACT_VERSION,
    [V2_STORAGE_CLIENT_REVISION_HEADER]: V2_STORAGE_CLIENT_REVISION,
  } as const;
}
