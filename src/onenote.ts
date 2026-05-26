/**
 * OneNote client that fetches meeting-note pages from Microsoft Graph API.
 *
 * Authentication uses the OAuth 2.0 client-credentials flow via MSAL so the
 * agent can run as an unattended service.  The Azure AD application must be
 * granted the `Notes.Read.All` application permission.
 */

import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { OneNoteConfig, OneNotePage, ReportPeriod } from "./types.js";

/** Graph API page object (subset of fields we care about). */
interface GraphOneNotePage {
  id: string;
  title: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  parentSection?: { displayName: string };
}

/**
 * Creates an authenticated Microsoft Graph client using app-only (client
 * credentials) authentication.
 */
async function createGraphClient(config: OneNoteConfig): Promise<Client> {
  const msalApp = new ConfidentialClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    },
  });

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const result = await msalApp.acquireTokenByClientCredential({
          scopes: ["https://graph.microsoft.com/.default"],
        });
        if (!result?.accessToken) {
          throw new Error("Failed to acquire Microsoft Graph access token.");
        }
        return result.accessToken;
      },
    },
  });
}

/**
 * Fetches OneNote pages from the configured notebook section, filtered to
 * those created or last modified within the given month/year.
 *
 * @param config  - Connection and credential configuration.
 * @param period  - The month and year to filter pages by.
 * @returns An array of `OneNotePage` objects with Markdown content.
 */
export async function fetchOneNotePages(
  config: OneNoteConfig,
  period: ReportPeriod,
): Promise<OneNotePage[]> {
  const client = await createGraphClient(config);

  // Build ISO-8601 date range for the target month
  const start = new Date(period.year, period.month - 1, 1).toISOString();
  const end = new Date(period.year, period.month, 1).toISOString();

  // Resolve the user's notebooks and find the configured section
  const sectionId = await resolveSectionId(client, config);

  // List pages in that section created within the target month
  const pagesResponse = await client
    .api(`/users/${config.userId}/onenote/sections/${sectionId}/pages`)
    .filter(
      `createdDateTime ge ${start} and createdDateTime lt ${end}`,
    )
    .select("id,title,createdDateTime,lastModifiedDateTime")
    .orderby("createdDateTime asc")
    .get() as { value: GraphOneNotePage[] };

  const pages: GraphOneNotePage[] = pagesResponse.value ?? [];

  // Fetch the HTML content of each page and convert it to Markdown
  const results: OneNotePage[] = [];
  for (const page of pages) {
    const htmlContent = await client
      .api(`/users/${config.userId}/onenote/pages/${page.id}/content`)
      .header("Accept", "text/html")
      .get() as string;

    const markdown = NodeHtmlMarkdown.translate(htmlContent ?? "");

    results.push({
      id: page.id,
      title: page.title ?? "(Untitled)",
      content: markdown.trim(),
      createdDateTime: page.createdDateTime,
      lastModifiedDateTime: page.lastModifiedDateTime,
    });
  }

  return results;
}

/**
 * Resolves the Graph API section ID for the configured notebook/section pair.
 *
 * @throws An error if the notebook or section cannot be found.
 */
async function resolveSectionId(
  client: Client,
  config: OneNoteConfig,
): Promise<string> {
  const notebooksResponse = await client
    .api(`/users/${config.userId}/onenote/notebooks`)
    .filter(`displayName eq '${escapeOdataFilter(config.notebookName)}'`)
    .select("id,displayName")
    .get() as { value: { id: string; displayName: string }[] };

  const notebooks = notebooksResponse.value ?? [];
  if (notebooks.length === 0) {
    throw new Error(
      `OneNote notebook "${config.notebookName}" not found for user ${config.userId}.`,
    );
  }

  const notebookId = notebooks[0].id;

  const sectionsResponse = await client
    .api(`/users/${config.userId}/onenote/notebooks/${notebookId}/sections`)
    .filter(`displayName eq '${escapeOdataFilter(config.sectionName)}'`)
    .select("id,displayName")
    .get() as { value: { id: string; displayName: string }[] };

  const sections = sectionsResponse.value ?? [];
  if (sections.length === 0) {
    throw new Error(
      `OneNote section "${config.sectionName}" not found in notebook "${config.notebookName}".`,
    );
  }

  return sections[0].id;
}

/**
 * Escapes single quotes in an OData filter string value.
 */
function escapeOdataFilter(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Loads OneNote configuration from environment variables.
 *
 * @throws If any required variable is missing.
 */
export function loadOneNoteConfig(): OneNoteConfig {
  const required: (keyof OneNoteConfig)[] = [
    "tenantId",
    "clientId",
    "clientSecret",
    "userId",
    "notebookName",
    "sectionName",
  ];

  const envMap: Record<keyof OneNoteConfig, string> = {
    tenantId: "AZURE_TENANT_ID",
    clientId: "AZURE_CLIENT_ID",
    clientSecret: "AZURE_CLIENT_SECRET",
    userId: "ONENOTE_USER_ID",
    notebookName: "ONENOTE_NOTEBOOK_NAME",
    sectionName: "ONENOTE_SECTION_NAME",
  };

  const config: Partial<OneNoteConfig> = {};
  const missing: string[] = [];

  for (const key of required) {
    const envVar = envMap[key];
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else {
      (config as Record<string, string>)[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return config as OneNoteConfig;
}
