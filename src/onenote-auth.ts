import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { PublicClientApplication } from "@azure/msal-node";

type GraphAuthApp = {
  getAllAccounts: PublicClientApplication["getAllAccounts"];
  acquireTokenSilent: PublicClientApplication["acquireTokenSilent"];
  acquireTokenInteractive: PublicClientApplication["acquireTokenInteractive"];
  acquireTokenByDeviceCode: PublicClientApplication["acquireTokenByDeviceCode"];
};

export async function createPublicClient(
  tenantId: string,
  clientId: string,
): Promise<PublicClientApplication> {
  const { PublicClientApplication } = await import("@azure/msal-node");
  const {
    DataProtectionScope,
    FilePersistenceWithDataProtection,
    PersistenceCachePlugin,
  } = await import("@azure/msal-node-extensions");
  const cacheDirectory = path.join(os.homedir(), ".monthly-reports");
  const cachePath = path.join(cacheDirectory, "msal-cache.json");
  await mkdir(cacheDirectory, { recursive: true });

  const persistence = await FilePersistenceWithDataProtection.create(
    cachePath,
    DataProtectionScope.CurrentUser,
    "",
  );

  return new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: {
      cachePlugin: new PersistenceCachePlugin(persistence),
    },
  });
}

export async function getGraphAccessToken(
  app: GraphAuthApp,
  loginHint: string,
): Promise<string> {
  const scopes = ["Notes.Read"];
  const accounts = await app.getAllAccounts();
  const preferredAccount = accounts.find(
    (account) => account.username === loginHint,
  );

  if (preferredAccount) {
    try {
      const silent = await app.acquireTokenSilent({
        account: preferredAccount,
        scopes,
      });
      if (silent?.accessToken) {
        return silent.accessToken;
      }
    } catch {
      // fall through to interactive auth
    }
  }

  try {
    const interactive = await app.acquireTokenInteractive({
      scopes,
      loginHint,
      openBrowser,
    });
    if (interactive?.accessToken) {
      return interactive.accessToken;
    }
  } catch {
    // fall through to device-code auth
  }

  try {
    const device = await app.acquireTokenByDeviceCode({
      scopes,
      deviceCodeCallback: ({ message }) => {
        console.log(message);
      },
    });
    if (device?.accessToken) {
      return device.accessToken;
    }
  } catch {
    // fall through to the final delegated-auth error
  }

  throw new Error("Failed to acquire a delegated Microsoft Graph access token.");
}

function openBrowser(url: string): Promise<void> {
  const launcher =
    process.platform === "win32"
      ? { command: "cmd", args: ["/c", "start", "", url] }
      : process.platform === "darwin"
        ? { command: "open", args: [url] }
        : { command: "xdg-open", args: [url] };

  return new Promise((resolve, reject) => {
    const child = spawn(launcher.command, launcher.args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
