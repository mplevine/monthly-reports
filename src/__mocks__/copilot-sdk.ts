/**
 * Manual Jest mock for @copilot-extensions/preview-sdk.
 *
 * Used in tests to avoid loading the ESM-only package in a CommonJS Jest context.
 */

import { jest } from "@jest/globals";

export const createAckEvent = jest.fn(() => "event: copilot_ack\ndata: {}\n\n");
export const createTextEvent = jest.fn(
  (text: string) => `event: copilot_text\ndata: ${JSON.stringify({ body: text })}\n\n`,
);
export const createDoneEvent = jest.fn(() => "event: done\ndata: {}\n\n");
export const createErrorsEvent = jest.fn(
  () => "event: copilot_errors\ndata: {}\n\n",
);
export const getUserMessage = jest.fn();
export const parseRequestBody = jest.fn();
export const verifyAndParseRequest = jest.fn();
export const prompt = jest.fn();
