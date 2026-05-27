import { describe, expect, jest, test } from "@jest/globals";
import {
  buildBrowserLaunchCommand,
  getGraphAccessToken,
} from "../onenote-auth.js";

describe("getGraphAccessToken", () => {
  test("uses interactive sign-in after silent auth misses", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({
        accessToken: "graph-token",
        account: { username: "bi-team@yourorg.onmicrosoft.com" },
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
        account: { username: "bi-team@yourorg.onmicrosoft.com" },
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
        account: { username: "bi-team@yourorg.onmicrosoft.com" },
      })),
      acquireTokenByDeviceCode: jest.fn(),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).resolves.toBe("interactive-token");
    expect(app.acquireTokenSilent).not.toHaveBeenCalled();
    expect(app.acquireTokenInteractive).toHaveBeenCalledTimes(1);
  });

  test("falls back to device code when interactive auth returns a token for the wrong user", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({
        accessToken: "wrong-user-token",
        account: { username: "other-user@yourorg.onmicrosoft.com" },
      })),
      acquireTokenByDeviceCode: jest.fn(async () => ({
        accessToken: "device-token",
        account: { username: "bi-team@yourorg.onmicrosoft.com" },
      })),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).resolves.toBe("device-token");
    expect(app.acquireTokenByDeviceCode).toHaveBeenCalledTimes(1);
  });

  test("rejects device code auth when it returns a token for the wrong user", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({
        accessToken: "wrong-user-token",
        account: { username: "other-user@yourorg.onmicrosoft.com" },
      })),
      acquireTokenByDeviceCode: jest.fn(async () => ({
        accessToken: "wrong-device-token",
        account: { username: "other-user@yourorg.onmicrosoft.com" },
      })),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).rejects.toThrow("Failed to acquire a delegated Microsoft Graph access token.");
  });
});

describe("buildBrowserLaunchCommand", () => {
  test("uses explorer on Windows so auth URLs are not parsed by cmd", () => {
    expect(
      buildBrowserLaunchCommand(
        "https://login.microsoftonline.com/?a=1&b=2",
        "win32",
      ),
    ).toEqual({
      command: "explorer.exe",
      args: ["https://login.microsoftonline.com/?a=1&b=2"],
    });
  });
});
