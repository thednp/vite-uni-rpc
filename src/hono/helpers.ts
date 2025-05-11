// vite-mini-rpc/src/utils.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { FrameworkRequest, FrameworkResponse, JsonValue } from "../types";

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

export const getRequestDetails = (request: FrameworkRequest) => {
  const nodeRequest: IncomingMessage =
    (request.raw || request.req || request) as IncomingMessage;

  const url = request.originalUrl ||
    request.url ||
    nodeRequest.url;

  return {
    nodeRequest,
    url,
    headers: nodeRequest.headers,
    method: nodeRequest.method,
  };
};

export const getResponseDetails = (response: FrameworkResponse) => {
  const nodeResponse: ServerResponse =
    (response.raw || response.res || response) as ServerResponse;

  const isResponseSent = response.headersSent ||
    response.writableEnded ||
    nodeResponse.writableEnded;

  const setHeader = (name: string, value: string) => {
    if (response.header) {
      response.header(name, value);
    } else if (response.setHeader) {
      response.setHeader(name, value);
    } else {
      nodeResponse.setHeader(name, value);
    }
  };

  const getHeader = (name: string) => {
    if (response.getHeader) {
      return response.getHeader(name);
    }
    return nodeResponse.getHeader(name);
  };

  const setStatusCode = (code: number) => {
    if (response.status) {
      response.status(code);
    } else {
      nodeResponse.statusCode = code;
    }
  };

  const send = (output: Record<string, string | unknown>) => {
    if (response.send) {
      response.send(JSON.stringify(output));
    } else {
      nodeResponse.end(JSON.stringify(output));
    }
  };

  const sendResponse = (
    code: number,
    output: Record<string, JsonValue>,
    contentType?: string,
  ) => {
    setStatusCode(code);
    if (contentType) {
      setHeader("Content-Type", contentType);
    }
    send(output);
  };

  return {
    nodeResponse,
    isResponseSent,
    setHeader,
    getHeader,
    statusCode: nodeResponse.statusCode,
    setStatusCode,
    sendResponse,
  };
};
