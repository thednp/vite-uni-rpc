// src/express/helpers.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { JsonValue } from "../types";

export const readBody = (
  req: ExpressRequest | IncomingMessage,
): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
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
  const url = isExpressRequest(request) ? request.originalUrl : request.url;

  return {
    url,
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
