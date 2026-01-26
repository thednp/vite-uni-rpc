// src/express/helpers.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { BodyResult, JsonValue } from "../types.d.ts";

export const readBody = (
  req: ExpressRequest | IncomingMessage,
): Promise<BodyResult> => {
  return new Promise((resolve, reject) => {
    // const contentType = req.headers["content-type"]?.toLowerCase() || "";

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        resolve({ contentType: "application/json", data: JSON.parse(body) });
      } catch (_e) {
        reject(new Error("Invalid JSON"));
      }

      resolve({ contentType: "text/plain", data: body });
    });

    req.on("error", reject);
  });
};

export const isExpressRequest = (
  req: IncomingMessage | ExpressRequest,
): req is ExpressRequest => {
  return "originalUrl" in req;
};

export const isExpressResponse = (
  res: ServerResponse | ExpressResponse,
): res is ExpressResponse => {
  return "json" in res && "send" in res;
};

export const getRequestDetails = (
  request: ExpressRequest | IncomingMessage,
) => {
  const rawUrl =
    (isExpressRequest(request) ? request.originalUrl : request.url) as string;
  const url = new URL(rawUrl, "http://localhost");

  return {
    url: url.pathname,
    search: url.search,
    searchParams: url.searchParams,
    headers: request.headers,
    method: request.method,
  };
};

export const getResponseDetails = (
  response: ExpressResponse | ServerResponse,
) => {
  const isResponseSent = response.headersSent ||
    response.writableEnded;

  const setHeader = (name: string, value: string) => {
    if (isExpressResponse(response)) {
      response.header(name, value);
    } else {
      response.setHeader(name, value);
    }
  };

  const setStatusCode = (code: number) => {
    if (isExpressResponse(response)) {
      response.status(code);
    } else {
      response.statusCode = code;
    }
  };

  const sendResponse = (
    code: number,
    output: Record<string, JsonValue>,
  ) => {
    setStatusCode(code);

    if (isExpressResponse(response)) {
      response.send(JSON.stringify(output));
    } else {
      response.end(JSON.stringify(output));
    }
  };

  return {
    isResponseSent,
    setHeader,
    statusCode: response.statusCode,
    setStatusCode,
    sendResponse,
  };
};
