import { createHash, randomBytes } from "node:crypto";
import {
  authUnavailableError,
  invalidCredentialsError,
} from "./errors.js";
import { hashPassword, verifyAccountPassword } from "./passwords.js";

export const ACCESS_TOKEN_TTL_SECONDS = 3600;

export class AuthService {
  constructor({ store }) {
    this.store = store;
  }

  async signup(input) {
    const { passwordSalt, passwordHash } = await hashPassword(input.password);
    const { accountId } = this.store.createAccount({
      documentType: input.documentType,
      document: input.document,
      email: input.email,
      passwordSalt,
      passwordHash,
    });

    return { account_id: accountId, status: "REGISTERED" };
  }

  async login(input) {
    const account = this.store.findAccountByDocument(
      input.documentType,
      input.document,
    );
    const passwordMatches = await verifyAccountPassword(input.password, account);

    if (!account || !passwordMatches) {
      throw invalidCredentialsError();
    }

    if (
      typeof account.accountId !== "string" ||
      account.accountId.length === 0
    ) {
      throw authUnavailableError();
    }

    const accessToken = randomBytes(32).toString("base64url");
    const now = Date.now();
    const tokenHash = createHash("sha256").update(accessToken).digest("hex");

    try {
      this.store.removeExpiredTokens(now);
      this.store.saveAccessToken({
        tokenHash,
        accountId: account.accountId,
        expiresAt: now + ACCESS_TOKEN_TTL_SECONDS * 1000,
      });
    } catch {
      process.stderr.write("W0 token persistence unavailable\n");
      throw authUnavailableError();
    }

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      account_id: account.accountId,
    };
  }
}
