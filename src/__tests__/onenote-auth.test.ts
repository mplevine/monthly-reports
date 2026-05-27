import { describe, expect, jest, test } from "@jest/globals";
import { getGraphAccessToken } from "../onenote-auth.js";

describe("getGraphAccessToken", () => {
  test("uses interactive sign-in after silent auth misses", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({
        accessToken: "graph-token",
      })),
      acquireTokenByDeviceCode: jest.fn(),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).resolves.toBe("graph-token");
    expect(app.acquireTokenInteractive).toHaveBeenCalledTimes(1);
    expect(app.acquireTokenInteractive).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["Notes.Read"],
        loginHint: "bi-team@yourorg.onmicrosoft.com",
        openBrowser: expect.any(Function),
      }),
    );
  });

  test("throws a consistent error when interactive and device code auth both fail", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => {
        throw new Error("interactive failed");
      }),
      acquireTokenByDeviceCode: jest.fn(async () => {
        throw new Error("device failed");
      }),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).rejects.toThrow("Failed to acquire a delegated Microsoft Graph access token.");
  });

  test("uses device code after interactive auth returns without an access token", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({})),
      acquireTokenByDeviceCode: jest.fn(async () => ({
        accessToken: "device-token",
      })),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).resolves.toBe("device-token");
    expect(app.acquireTokenInteractive).toHaveBeenCalledTimes(1);
    expect(app.acquireTokenByDeviceCode).toHaveBeenCalledTimes(1);
  });

  test("skips silent auth when the cached account does not match the configured user", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => [{ username: "other-user@yourorg.onmicrosoft.com" }]),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({
        accessToken: "interactive-token",
      })),
      acquireTokenByDeviceCode: jest.fn(),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).resolves.toBe("interactive-token");
    expect(app.acquireTokenSilent).not.toHaveBeenCalled();
    expect(app.acquireTokenInteractive).toHaveBeenCalledTimes(1);
  });
});
