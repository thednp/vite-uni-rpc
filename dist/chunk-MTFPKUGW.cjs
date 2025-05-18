"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils.ts
var _promises = require('fs/promises');
var _path = require('path');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var serverFunctionsMap = /* @__PURE__ */ new Map();
var functionMappings = /* @__PURE__ */ new Map();
var scanForServerFiles = async (initialCfg, devServer) => {
  functionMappings.clear();
  let server = devServer;
  const config = !initialCfg && !devServer || !initialCfg ? {
    // always scan relative to the real root
    root: _process2.default.cwd(),
    base: _process2.default.env.BASE || "/",
    server: { middlewareMode: true }
  } : {
    ...initialCfg,
    // always scan relative to the real root
    root: _process2.default.cwd()
  };
  if (!server) {
    const { createServer } = await Promise.resolve().then(() => _interopRequireWildcard(require("vite")));
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base,
      root: config.root
    });
  }
  const svFiles = [
    "server.ts",
    "server.js",
    "server.mjs",
    "server.mts"
  ];
  const apiDir = _path.join.call(void 0, config.root, "src", "api");
  const files = (await _promises.readdir.call(void 0, apiDir, { withFileTypes: true })).filter((f) => svFiles.some((fn) => f.name.includes(fn))).map((f) => _path.join.call(void 0, apiDir, f.name));
  for (const file of files) {
    try {
      const moduleExports = await server.ssrLoadModule(
        file
      );
      const moduleEntries = Object.entries(moduleExports);
      if (!moduleEntries.length) {
        console.warn("No server function found.");
        if (!devServer) {
          server.close();
        }
        return;
      }
      for (const [exportName, exportValue] of moduleEntries) {
        for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
          if (serverFn.name === registeredName && serverFn.fn === exportValue) {
            functionMappings.set(registeredName, exportName);
          }
        }
      }
      if (!devServer) {
        server.close();
      }
    } catch (error) {
      console.error("Error loading file:", file, error);
    }
  }
};
var getModule = (fnName, fnEntry, options) => {
  let bodyHandling;
  switch (options.contentType) {
    case "multipart/form-data":
      bodyHandling = `
    if (args.length !== 1 || !(args[0] instanceof FormData)) {
      throw new Error('For "multipart/form-data" contentType, you must provide exactly one argument, which must be a FormData object.');
    }
    const body = args[0];
    const headers = {};`;
      break;
    case "application/octet-stream":
      bodyHandling = `
    if (args.length !== 1 || !(args[0] instanceof Buffer || args[0] instanceof Uint8Array)) {
      throw new Error('For "application/octet-stream" contentType, you must provide exactly one argument, which must be a Buffer or Uint8Array.');
    }
    const body = args[0];
    const headers = {
      'Content-Type': 'application/octet-stream'
    };`;
      break;
    case "application/x-www-form-urlencoded":
      bodyHandling = `
    if (args.length !== 1 || typeof args[0] !== 'object') {
      throw new Error('For "application/x-www-form-urlencoded" contentType, you must provide exactly one object argument.');
    }
    const body = new URLSearchParams(args[0]).toString();
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };`;
      break;
    case "text/plain":
      bodyHandling = `
    if (args.length !== 1 || typeof args[0] !== 'string') {
      throw new Error('For "text/plain" contentType, you must provide exactly one string argument.');
    }
    const body = args[0];
    const headers = {
      'Content-Type': 'text/plain'
    };`;
      break;
    default:
      bodyHandling = `
    const body = JSON.stringify(args);
    const headers = {
      'Content-Type': 'application/json'
    };`;
  }
  return `
  export const ${fnEntry} = async (...args) => {
    ${bodyHandling}
    const response = await fetch('/${options.rpcPreffix}/${fnName}', {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: body,
    });
    return await handleResponse(response);
  }`;
};
var getClientModules = (initialOptions) => {
  return `
// Client-side RPC modules
const handleResponse = async (response) => {
if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
const result = await response.json();
if (result.error) throw new Error(result.error);
return result.data;
}
${Array.from(functionMappings.entries()).map(
    ([registeredName, exportName]) => getModule(registeredName, exportName, {
      ...initialOptions,
      ..._optionalChain([serverFunctionsMap, 'access', _ => _.get, 'call', _2 => _2(registeredName), 'optionalAccess', _3 => _3.options]) || {}
    })
  ).join("\n")}
`.trim();
};

// src/options.ts
var defaultServerFnOptions = {
  contentType: "application/json",
  ttl: 10 * 1e3,
  // 10s
  invalidateKeys: []
};
var defaultRPCOptions = {
  rpcPreffix: "__rpc",
  adapter: "express",
  headers: void 0,
  onError: void 0,
  onRequest: void 0,
  onResponse: void 0
};
var defaultMiddlewareOptions = {
  // rpcPreffix: defaultRPCOptions.rpcPreffix,
  rpcPreffix: void 0,
  path: void 0,
  headers: {},
  handler: void 0,
  onError: void 0,
  onRequest: void 0,
  onResponse: void 0
};












exports.__commonJS = __commonJS; exports.__toESM = __toESM; exports.__publicField = __publicField; exports.serverFunctionsMap = serverFunctionsMap; exports.functionMappings = functionMappings; exports.scanForServerFiles = scanForServerFiles; exports.getClientModules = getClientModules; exports.defaultServerFnOptions = defaultServerFnOptions; exports.defaultRPCOptions = defaultRPCOptions; exports.defaultMiddlewareOptions = defaultMiddlewareOptions;
