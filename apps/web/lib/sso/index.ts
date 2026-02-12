export type {
  SSOProvider,
  SAMLConfig,
  OIDCConfig,
  SSOUserProfile,
  SSOTestResult,
  OIDCProviderType,
} from "./types";

export { OIDC_PROVIDERS } from "./types";

export {
  createSAMLClient,
  getSAMLCallbackUrl,
  getSAMLMetadataUrl,
  generateSAMLMetadata,
  generateSAMLAuthUrl,
  validateSAMLResponse,
  testSAMLConfiguration,
} from "./saml";

export {
  getOIDCCallbackUrl,
  fetchOIDCDiscovery,
  generateOIDCAuthUrl,
  exchangeOIDCCode,
  fetchOIDCUserInfo,
  authenticateWithOIDC,
  testOIDCConfiguration,
  generateOIDCState,
  generateOIDCNonce,
} from "./oidc";
