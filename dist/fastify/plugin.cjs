"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkPSGDJPNMcjs = require('../chunk-PSGDJPNM.cjs');



var _chunk2P4UAVG6cjs = require('../chunk-2P4UAVG6.cjs');

// src/fastify/node_modules/.pnpm/fastify-plugin@5.0.1/node_modules/fastify-plugin/lib/getPluginName.js
var require_getPluginName = _chunk2P4UAVG6cjs.__commonJS.call(void 0, {
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
var require_toCamelCase = _chunk2P4UAVG6cjs.__commonJS.call(void 0, {
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
var require_plugin = _chunk2P4UAVG6cjs.__commonJS.call(void 0, {
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

// src/fastify/plugin.ts
var import_fastify_plugin = _chunk2P4UAVG6cjs.__toESM.call(void 0, require_plugin(), 1);
var RpcPlugin = (fastify, initialOptions = {}, done) => {
  const rpcMiddleware = _chunkPSGDJPNMcjs.createRPCMiddleware.call(void 0, initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      rpcMiddleware(request, reply, resolve);
    });
    await next();
  });
  done();
};
var fastifyRpcPlugin = (0, import_fastify_plugin.default)(RpcPlugin, {
  name: "uni-rpc-fastify-plugin"
});


exports.default = fastifyRpcPlugin;
