var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/serverFunctionsMap.ts
var serverFunctionsMap = /* @__PURE__ */ new Map();

// src/options.ts
var defaultOptions = {
  ttl: 1e4,
  rpcPrefix: "__rpc"
};

export {
  __publicField,
  serverFunctionsMap,
  defaultOptions
};
