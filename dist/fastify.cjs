"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






var _chunkFIWPANLAcjs = require('./chunk-FIWPANLA.cjs');

// src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/lib/getPluginName.js
var require_getPluginName = _chunkFIWPANLAcjs.__commonJS.call(void 0, {
  "src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/lib/getPluginName.js"(exports, module) {
    "use strict";
    var fpStackTracePattern = /at\s{1}(?:.*\.)?plugin\s{1}.*\n\s*(.*)/;
    var fileNamePattern = /(\w*(\.\w*)*)\..*/;
    module.exports = function getPluginName(fn) {
      if (fn.name.length > 0) return fn.name;
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 10;
      try {
        throw new Error("anonymous function");
      } catch (e) {
        Error.stackTraceLimit = stackTraceLimit;
        return extractPluginName(e.stack);
      }
    };
    function extractPluginName(stack) {
      const m = stack.match(fpStackTracePattern);
      return m ? m[1].split(/[/\\]/).slice(-1)[0].match(fileNamePattern)[1] : "anonymous";
    }
    module.exports.extractPluginName = extractPluginName;
  }
});

// src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/lib/toCamelCase.js
var require_toCamelCase = _chunkFIWPANLAcjs.__commonJS.call(void 0, {
  "src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/lib/toCamelCase.js"(exports, module) {
    "use strict";
    module.exports = function toCamelCase(name) {
      if (name[0] === "@") {
        name = name.slice(1).replace("/", "-");
      }
      return name.replace(/-(.)/g, function(match, g1) {
        return g1.toUpperCase();
      });
    };
  }
});

// src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/plugin.js
var require_plugin = _chunkFIWPANLAcjs.__commonJS.call(void 0, {
  "src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/plugin.js"(exports, module) {
    "use strict";
    var getPluginName = require_getPluginName();
    var toCamelCase = require_toCamelCase();
    var count = 0;
    function plugin(fn, options = {}) {
      let autoName = false;
      if (fn.default !== void 0) {
        fn = fn.default;
      }
      if (typeof fn !== "function") {
        throw new TypeError(
          `fastify-plugin expects a function, instead got a '${typeof fn}'`
        );
      }
      if (typeof options === "string") {
        options = {
          fastify: options
        };
      }
      if (typeof options !== "object" || Array.isArray(options) || options === null) {
        throw new TypeError("The options object should be an object");
      }
      if (options.fastify !== void 0 && typeof options.fastify !== "string") {
        throw new TypeError(`fastify-plugin expects a version string, instead got '${typeof options.fastify}'`);
      }
      if (!options.name) {
        autoName = true;
        options.name = getPluginName(fn) + "-auto-" + count++;
      }
      fn[Symbol.for("skip-override")] = options.encapsulate !== true;
      fn[Symbol.for("fastify.display-name")] = options.name;
      fn[Symbol.for("plugin-meta")] = options;
      if (!fn.default) {
        fn.default = fn;
      }
      const camelCase = toCamelCase(options.name);
      if (!autoName && !fn[camelCase]) {
        fn[camelCase] = fn;
      }
      return fn;
    }
    module.exports = plugin;
    module.exports.default = plugin;
    module.exports.fastifyPlugin = plugin;
  }
});

// src/fastify/createMiddleware.ts
var createMiddleware = (initialOptions = {}) => {
  const {
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError
  } = {
    ..._chunkFIWPANLAcjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  if (path && rpcPreffix) {
    throw new Error(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. Skipping middleware registration.."
    );
  }
  return async (req, reply, done) => {
    const [pathname] = req.url.split("?");
    if (_chunkFIWPANLAcjs.serverFunctionsMap.size === 0) {
      await _chunkFIWPANLAcjs.scanForServerFiles.call(void 0, );
    }
    if (!handler) {
      done();
      return;
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(pathname || "")) {
          done();
          return;
        }
      }
      if (rpcPreffix && !_optionalChain([pathname, 'optionalAccess', _ => _.startsWith, 'call', _2 => _2(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          reply.header(key, value);
        });
      }
      if (handler) {
        await handler(req, reply, done);
        if (onResponse) {
          await onResponse(reply);
        }
        return;
      }
      done();
    } catch (error) {
      if (onResponse) {
        await onResponse(reply);
      }
      if (onError) {
        await onError(error, req, reply);
      } else {
        console.error("Middleware error:", String(error));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ..._chunkFIWPANLAcjs.defaultMiddlewareOptions,
    // RPC middleware needs to have the RPC prefix
    rpcPreffix: _chunkFIWPANLAcjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, reply, done) => {
      const { url } = req;
      const pathname = _optionalChain([url, 'optionalAccess', _3 => _3.split, 'call', _4 => _4("?"), 'access', _5 => _5[0]]);
      const { rpcPreffix } = options;
      if (!_optionalChain([pathname, 'optionalAccess', _6 => _6.startsWith, 'call', _7 => _7(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      const functionName = pathname.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkFIWPANLAcjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" not found`
        });
        return;
      }
      const args = req.body;
      const result = await serverFunction.fn(...args);
      reply.status(200).send({ data: result });
    }
  });
};

// src/fastify/plugin.ts
var import_fastify_plugin = _chunkFIWPANLAcjs.__toESM.call(void 0, require_plugin(), 1);
var miniRpcPlugin = (fastify, initialOptions = {}, done) => {
  if (initialOptions.path && initialOptions.rpcPreffix) {
    console.warn(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. Skipping middleware registration."
    );
    done();
    return;
  }
  const middleware = createMiddleware(initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      middleware(request, reply, resolve);
    });
    await next();
  });
  const rpcMiddleware = createRPCMiddleware(initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      rpcMiddleware(request, reply, resolve);
    });
    await next();
  });
  done();
};
var fastifyMiniRpcPlugin = (0, import_fastify_plugin.default)(miniRpcPlugin, {
  name: "vite-mini-rpc-fastify-plugin"
});



exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
