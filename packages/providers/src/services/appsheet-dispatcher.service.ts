import { logger } from '../utils/logger.js';
import type { AppSheetProcesso } from '../transformers/appsheet.transformer.js';

export interface DispatchResult {
  success: boolean;
  status: number;
  statusText: string;
  body: string;
  method: 'json' | 'form-urlencoded';
}

/**
 * Sends AppSheet flat JSON to a Google Apps Script webhook.
 *
 * GAS webhook pattern:
 *   1. POST body to the /exec URL → GAS processes it and returns 302
 *   2. The 302 Location header points to the script's response
 *   3. GET the Location URL to retrieve the script's output
 *
 * We use redirect:"manual" so the POST body is sent properly,
 * then GET the redirect URL to read the response.
 */
export async function dispatchToAppSheet(
  webhookUrl: string,
  data: AppSheetProcesso,
): Promise<DispatchResult> {
  const jsonBody = JSON.stringify(data);

  // ── Strategy 1: POST JSON, then GET the redirect response ──
  try {
    const result = await postWithRedirectGet(webhookUrl, jsonBody, 'application/json');
    if (result.success) {
      logger.info({ status: result.status, method: 'json' }, 'AppSheet webhook delivered');
      return { ...result, method: 'json' };
    }
    logger.warn({ status: result.status }, 'JSON POST failed, trying form-urlencoded fallback');
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'JSON POST threw, trying fallback');
  }

  // ── Strategy 2: x-www-form-urlencoded with "payload" field ──
  try {
    const formBody = `payload=${encodeURIComponent(jsonBody)}`;
    const result = await postWithRedirectGet(webhookUrl, formBody, 'application/x-www-form-urlencoded');
    if (result.success) {
      logger.info({ status: result.status, method: 'form-urlencoded' }, 'AppSheet webhook delivered via form fallback');
    } else {
      logger.error({ status: result.status, body: result.body.slice(0, 200) }, 'AppSheet webhook delivery failed');
    }
    return { ...result, method: 'form-urlencoded' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'AppSheet webhook delivery failed completely');
    return { success: false, status: 0, statusText: msg, body: '', method: 'form-urlencoded' };
  }
}

/**
 * POST to GAS URL with redirect:"manual", then GET the redirect URL.
 * Follows up to 5 chained redirects on the GET side.
 */
async function postWithRedirectGet(
  url: string,
  body: string,
  contentType: string,
): Promise<Omit<DispatchResult, 'method'>> {
  // Step 1: POST the data — GAS processes it and returns 302
  const postResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
    redirect: 'manual',
  });

  // If GAS returned a direct response (no redirect), use it
  if (!isRedirect(postResponse.status)) {
    const responseBody = await postResponse.text();
    return {
      success: postResponse.ok,
      status: postResponse.status,
      statusText: postResponse.statusText,
      body: responseBody,
    };
  }

  // Step 2: GET the redirect URL to retrieve the script's response
  const redirectUrl = postResponse.headers.get('location');
  if (!redirectUrl) {
    return { success: false, status: 302, statusText: 'Redirect without Location header', body: '' };
  }

  const getResponse = await fetch(redirectUrl, {
    method: 'GET',
    redirect: 'follow',
  });

  const responseBody = await getResponse.text();
  return {
    success: getResponse.ok,
    status: getResponse.status,
    statusText: getResponse.statusText,
    body: responseBody,
  };
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
