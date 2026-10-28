let wasm = null;

function getWasm() {
  return wasm;
}

async function loadWasm(url) {
  const resp = await fetch(url);
  const bytes = await resp.arrayBuffer();
  const module = new WebAssembly.Module(bytes);
  wasm = {};
  const instance = new WebAssembly.Instance(module, getImportObject());
  wasm = instance.exports;
}

function init(url) {
  return loadWasm(url).then(() => {
    wasm.__wbindgen_start();
  });
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  const w = getWasm();
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== w.memory.buffer)) {
    cachedDataViewMemory0 = new DataView(w.memory.buffer);
  }
  return cachedDataViewMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  const w = getWasm();
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(w.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}

function decodeText(ptr, len) {
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedTextEncoder = new TextEncoder();

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7F) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}

let WASM_VECTOR_LEN = 0;
const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => getWasm().__wbindgen_destroy_closure(state.a, state.b));

function makeMutClosure(arg0, arg1, f) {
  const state = { a: arg0, b: arg1, cnt: 1 };
  const real = (...args) => {
    state.cnt++;
    const a = state.a;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      state.a = a;
      real._wbg_cb_unref();
    }
  };
  real._wbg_cb_unref = () => {
    if (--state.cnt === 0) {
      getWasm().__wbindgen_destroy_closure(state.a, state.b);
      state.a = 0;
      CLOSURE_DTORS.unregister(state);
    }
  };
  CLOSURE_DTORS.register(real, state, state);
  return real;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    getWasm().__wbindgen_exn_store(idx);
  }
}

function addToExternrefTable0(obj) {
  const w = getWasm();
  const idx = w.__externref_table_alloc();
  w.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

const __wbindgen_enum_BinaryType = ["blob", "arraybuffer"];

function getObject(idx) { return getWasm().__wbindgen_externrefs.get(idx); }

function takeFromExternrefTable0(idx) {
  const value = getWasm().__wbindgen_externrefs.get(idx);
  getWasm().__externref_table_dealloc(idx);
  return value;
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function debugString(val) {
  const type = typeof val;
  if (type == 'number' || type == 'boolean' || val == null) {
    return  `${val}`;
  }
  if (type == 'string') {
    return `"${val}"`;
  }
  if (type == 'symbol') {
    const description = val.description;
    if (description == null) return 'Symbol';
    else return `Symbol(${description})`;
  }
  if (type == 'function') {
    const name = val.name;
    return typeof name == 'string' && name.length > 0 ? `Function(${name})` : 'Function';
  }
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = '[';
    if (length > 0) debug += debugString(val[0]);
    for (let i = 1; i < length; i++) debug += ', ' + debugString(val[i]);
    debug += ']';
    return debug;
  }
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) className = builtInMatches[1];
  else return toString.call(val);
  if (className == 'Object') {
    try { return 'Object(' + JSON.stringify(val) + ')'; }
    catch (_) { return 'Object'; }
  }
  if (val instanceof Error) return `${val.name}: ${val.message}\n${val.stack}`;
  return className;
}

function getImportObject() {
  const wbg = {
    __wbg___wbindgen_debug_string_c25d447a39f5578f: function(arg0, arg1) {
      const ret = debugString(arg1);
      const ptr1 = passStringToWasm0(ret, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_is_function_1ff95bcc5517c252: function(arg0) {
      return typeof arg0 === 'function';
    },
    __wbg___wbindgen_is_null_ea9085d691f535d3: function(arg0) {
      return arg0 === null;
    },
    __wbg___wbindgen_is_object_a27215656b807791: function(arg0) {
      const val = arg0;
      return typeof val === 'object' && val !== null;
    },
    __wbg___wbindgen_is_string_ea5e6cc2e4141dfe: function(arg0) {
      return typeof arg0 === 'string';
    },
    __wbg___wbindgen_is_undefined_c05833b95a3cf397: function(arg0) {
      return arg0 === undefined;
    },
    __wbg___wbindgen_string_get_b0ca35b86a603356: function(arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === 'string' ? obj : undefined;
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_throw_344f42d3211c4765: function(arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg__wbg_cb_unref_fffb441def202758: function(arg0) {
      arg0._wbg_cb_unref();
    },
    __wbg_buffer_54b87055582c8a81: function(arg0) {
      return arg0.buffer;
    },
    __wbg_call_8a2dd23819f8a60a: function() { return handleError(function(arg0, arg1) {
      return arg0.call(arg1);
    }, arguments); },
    __wbg_call_a6e5c5dce5018821: function() { return handleError(function(arg0, arg1, arg2) {
      return arg0.call(arg1, arg2);
    }, arguments); },
    __wbg_close_3423cc7dafc477bb: function(arg0) {
      arg0.close();
    },
    __wbg_close_c65ca0257e895318: function() { return handleError(function(arg0) {
      arg0.close();
    }, arguments); },
    __wbg_crypto_38df2bab126b63dc: function(arg0) {
      return arg0.crypto;
    },
    __wbg_data_328de4280640da92: function(arg0) {
      return arg0.data;
    },
    __wbg_entries_015dc610cd81ede0: function(arg0) {
      return Object.entries(arg0);
    },
    __wbg_error_744744ff0c9861e6: function(arg0) {
      console.error(arg0);
    },
    __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function(arg0, arg1) {
      arg0.getRandomValues(arg1);
    }, arguments); },
    __wbg_get_507a50627bffa49b: function(arg0, arg1) {
      return arg0[arg1 >>> 0];
    },
    __wbg_get_78f252d074a84d0b: function() { return handleError(function(arg0, arg1) {
      return Reflect.get(arg0, arg1);
    }, arguments); },
    __wbg_instanceof_ArrayBuffer_4480b9e0068a8adb: function(arg0) {
      let result;
      try { result = arg0 instanceof ArrayBuffer; } catch (_) { result = false; }
      return result;
    },
    __wbg_instanceof_MessagePort_b17bf77c564b57da: function(arg0) {
      let result;
      try { result = arg0 instanceof MessagePort; } catch (_) { result = false; }
      return result;
    },
    __wbg_instanceof_Object_33f20e6f12439f3e: function(arg0) {
      let result;
      try { result = arg0 instanceof Object; } catch (_) { result = false; }
      return result;
    },
    __wbg_instanceof_Uint8Array_309b927aaf7a3fc7: function(arg0) {
      let result;
      try { result = arg0 instanceof Uint8Array; } catch (_) { result = false; }
      return result;
    },
    __wbg_isArray_0677c962b281d01a: function(arg0) {
      return Array.isArray(arg0);
    },
    __wbg_is_7b9d0b289033c7de: function(arg0, arg1) {
      return Object.is(arg0, arg1);
    },
    __wbg_length_1f0964f4a5e2c6d8: function(arg0) {
      return arg0.length;
    },
    __wbg_length_370319915dc99107: function(arg0) {
      return arg0.length;
    },
    __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
      return arg0.msCrypto;
    },
    __wbg_new_0d809930cd1354c6: function() { return handleError(function() {
      return new Headers();
    }, arguments); },
    __wbg_new_bf8729ffe10e9ee7: function() { return handleError(function(arg0, arg1) {
      return new WebSocket(getStringFromWasm0(arg0, arg1));
    }, arguments); },
    __wbg_new_cd45aabdf6073e84: function(arg0) {
      return new Uint8Array(arg0);
    },
    __wbg_new_da52cf8fe3429cb2: function() {
      return new Object();
    },
    __wbg_new_from_slice_77cdfb7977362f3c: function(arg0, arg1) {
      return new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
    },
    __wbg_new_typed_1824d93f294193e5: function(arg0, arg1) {
      try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
          const a = state0.a;
          state0.a = 0;
          try {
            return wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___js_sys_a1da0b9fb8837369___Function_fn_wasm_bindgen_b487f9fc3dfc8056___JsValue_____wasm_bindgen_b487f9fc3dfc8056___sys__Undefined___js_sys_a1da0b9fb8837369___Function_fn_wasm_bindgen_b487f9fc3dfc8056___JsValue_____wasm_bindgen_b487f9fc3dfc8056___sys__Undefined_______true_(a, state0.b, arg0, arg1);
          } finally {
            state0.a = a;
          }
        };
        const ret = new Promise(cb0);
        return ret;
      } finally {
        state0.a = 0;
      }
    },
    __wbg_new_with_length_e6785c33c8e4cce8: function(arg0) {
      return new Uint8Array(arg0 >>> 0);
    },
    __wbg_new_with_opt_buffer_source_and_init_c8d6537f14c8efb5: function() { return handleError(function(arg0, arg1) {
      return new Response(arg0, arg1);
    }, arguments); },
    __wbg_node_84ea875411254db1: function(arg0) {
      return arg0.node;
    },
    __wbg_now_86c0d4ba3fa605b8: function() {
      return Date.now();
    },
    __wbg_postMessage_b80f20949a4b4f55: function() { return handleError(function(arg0, arg1) {
      arg0.postMessage(arg1);
    }, arguments); },
    __wbg_process_44c7a14e11e9f69e: function(arg0) {
      return arg0.process;
    },
    __wbg_prototypesetcall_4770620bbe4688a0: function(arg0, arg1, arg2) {
      Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    },
    __wbg_queueMicrotask_0ab5b2d2393e99b9: function(arg0) {
      return arg0.queueMicrotask;
    },
    __wbg_queueMicrotask_6a09b7bc46549209: function(arg0) {
      queueMicrotask(arg0);
    },
    __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function(arg0, arg1) {
      arg0.randomFillSync(arg1);
    }, arguments); },
    __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function() {
      return module.require;
    }, arguments); },
    __wbg_resolve_2191a4dfe481c25b: function(arg0) {
      return Promise.resolve(arg0);
    },
    __wbg_send_a321b376d40ec867: function() { return handleError(function(arg0, arg1, arg2) {
      arg0.send(getArrayU8FromWasm0(arg1, arg2));
    }, arguments); },
    __wbg_set_0de9c62c23d04ad5: function() { return handleError(function(arg0, arg1, arg2, arg3, arg4) {
      arg0.set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments); },
    __wbg_set_8535240470bf2500: function() { return handleError(function(arg0, arg1, arg2) {
      return Reflect.set(arg0, arg1, arg2);
    }, arguments); },
    __wbg_set_binaryType_a37b086c78ca7c29: function(arg0, arg1) {
      arg0.binaryType = __wbindgen_enum_BinaryType[arg1];
    },
    __wbg_set_headers_4be66d6f175ce615: function(arg0, arg1) {
      arg0.headers = arg1;
    },
    __wbg_set_onclose_f706475385ecce07: function(arg0, arg1) {
      arg0.onclose = arg1;
    },
    __wbg_set_onerror_9f5773fd31512333: function(arg0, arg1) {
      arg0.onerror = arg1;
    },
    __wbg_set_onmessage_836d2f72130b4706: function(arg0, arg1) {
      arg0.onmessage = arg1;
    },
    __wbg_set_onmessage_d511b70365304094: function(arg0, arg1) {
      arg0.onmessage = arg1;
    },
    __wbg_set_onopen_4f65470ae522a61a: function(arg0, arg1) {
      arg0.onopen = arg1;
    },
    __wbg_set_status_3593dfcb55e7ee3c: function(arg0, arg1) {
      arg0.status = arg1;
    },
    __wbg_start_d0cdf16ff965b3f3: function(arg0) {
      arg0.start();
    },
    __wbg_static_accessor_GLOBAL_4ef717fb391d88b7: function() {
      const ret = typeof global === 'undefined' ? null : global;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4: function() {
      const ret = typeof globalThis === 'undefined' ? null : globalThis;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_SELF_146583524fe1469b: function() {
      const ret = typeof self === 'undefined' ? null : self;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_WINDOW_f2829a2234d7819e: function() {
      const ret = typeof window === 'undefined' ? null : window;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_subarray_3ed232c8a6baee09: function(arg0, arg1, arg2) {
      return arg0.subarray(arg1 >>> 0, arg2 >>> 0);
    },
    __wbg_then_6ec10ae38b3e92f7: function(arg0, arg1) {
      return arg0.then(arg1);
    },
    __wbg_versions_276b2795b1c6a219: function(arg0) {
      return arg0.versions;
    },
    __wbg_wispwebsocket_new: function(arg0) {
      return WispWebSocket.__wrap(arg0);
    },
    __wbindgen_cast_0000000000000001: function(arg0, arg1) {
      return makeMutClosure(arg0, arg1, wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true_);
    },
    __wbindgen_cast_0000000000000002: function(arg0, arg1) {
      return makeMutClosure(arg0, arg1, wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_b487f9fc3dfc8056___JsError___true_);
    },
    __wbindgen_cast_0000000000000003: function(arg0, arg1) {
      return makeMutClosure(arg0, arg1, wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true__2);
    },
    __wbindgen_cast_0000000000000004: function(arg0, arg1) {
      return makeMutClosure(arg0, arg1, wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true__3);
    },
    __wbindgen_cast_0000000000000005: function(arg0, arg1) {
      return makeMutClosure(arg0, arg1, wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___web_sys_4a87bcd867846b81___features__gen_MessageEvent__MessageEvent______true_);
    },
    __wbindgen_cast_0000000000000006: function(arg0) {
      return arg0;
    },
    __wbindgen_cast_0000000000000007: function(arg0, arg1) {
      return getArrayU8FromWasm0(arg0, arg1);
    },
    __wbindgen_cast_0000000000000008: function(arg0, arg1) {
      return getStringFromWasm0(arg0, arg1);
    },
    __wbindgen_init_externref_table: function() {
      const w = getWasm();
      const table = w.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    },
  };
  return { "./drift_wasm_bg.js": wbg };
}

function wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true_(arg0, arg1, arg2) {
  getWasm().wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true_(arg0, arg1, arg2);
}
function wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true__2(arg0, arg1, arg2) {
  getWasm().wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true__2(arg0, arg1, arg2);
}
function wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true__3(arg0, arg1, arg2) {
  getWasm().wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue______true__3(arg0, arg1, arg2);
}
function wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___web_sys_4a87bcd867846b81___features__gen_MessageEvent__MessageEvent______true_(arg0, arg1, arg2) {
  getWasm().wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___web_sys_4a87bcd867846b81___features__gen_MessageEvent__MessageEvent______true_(arg0, arg1, arg2);
}
function wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_b487f9fc3dfc8056___JsError___true_(arg0, arg1, arg2) {
  const ret = getWasm().wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___wasm_bindgen_b487f9fc3dfc8056___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_b487f9fc3dfc8056___JsError___true_(arg0, arg1, arg2);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}
function wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___js_sys_a1da0b9fb8837369___Function_fn_wasm_bindgen_b487f9fc3dfc8056___JsValue_____wasm_bindgen_b487f9fc3dfc8056___sys__Undefined___js_sys_a1da0b9fb8837369___Function_fn_wasm_bindgen_b487f9fc3dfc8056___JsValue_____wasm_bindgen_b487f9fc3dfc8056___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
  getWasm().wasm_bindgen_b487f9fc3dfc8056___convert__closures_____invoke___js_sys_a1da0b9fb8837369___Function_fn_wasm_bindgen_b487f9fc3dfc8056___JsValue_____wasm_bindgen_b487f9fc3dfc8056___sys__Undefined___js_sys_a1da0b9fb8837369___Function_fn_wasm_bindgen_b487f9fc3dfc8056___JsValue_____wasm_bindgen_b487f9fc3dfc8056___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}

function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`);
  }
}

const LibCurlFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_libcurl_free(ptr, 1));
const LibCurlWebSocketFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_libcurlwebsocket_free(ptr, 1));
const WispFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_wisp_free(ptr, 1));
const WispClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_wispclient_free(ptr, 1));
const WispClientOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_wispclientoptions_free(ptr, 1));
const WispHTTPSessionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_wisphttpsession_free(ptr, 1));
const WispWebSocketFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => getWasm().__wbg_wispwebsocket_free(ptr, 1));

function passArrayJsValueToWasm0(array, malloc) {
  const ptr = malloc(array.length * 4, 4) >>> 0;
  for (let i = 0; i < array.length; i++) {
    const add = addToExternrefTable0(array[i]);
    getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
  }
  WASM_VECTOR_LEN = array.length;
  return ptr;
}

class LibCurl {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    LibCurlFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_libcurl_free(ptr, 0);
  }
  get HTTPSession() {
    return getWasm().libcurl_HTTPSession(this.__wbg_ptr);
  }
  get TLSSocket() {
    return getWasm().libcurl_TLSSocket(this.__wbg_ptr);
  }
  get WebSocket() {
    return getWasm().libcurl_WebSocket(this.__wbg_ptr);
  }
  fetch(url, opts) {
    const ptr0 = passStringToWasm0(url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    return getWasm().libcurl_fetch(this.__wbg_ptr, ptr0, len0, opts);
  }
  load_wasm(_url) {
    var ptr0 = isLikeNone(_url) ? 0 : passStringToWasm0(_url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    return getWasm().libcurl_load_wasm(this.__wbg_ptr, ptr0, len0);
  }
  constructor() {
    const ret = getWasm().libcurl_new();
    this.__wbg_ptr = ret;
    LibCurlFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  set_moonbeam_relay(relay) {
    const ret = getWasm().libcurl_set_moonbeam_relay(this.__wbg_ptr, relay);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  set_websocket(url) {
    const ptr0 = passStringToWasm0(url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().libcurl_set_websocket(this.__wbg_ptr, ptr0, len0);
  }
  get transport() {
    return getWasm().libcurl_transport(this.__wbg_ptr);
  }
  get version() {
    return getWasm().libcurl_version(this.__wbg_ptr);
  }
}

class LibCurlWebSocket {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    LibCurlWebSocketFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_libcurlwebsocket_free(ptr, 0);
  }
  addEventListener(event, cb) {
    const ptr0 = passStringToWasm0(event, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().libcurlwebsocket_addEventListener(this.__wbg_ptr, ptr0, len0, cb);
  }
  close(code, reason) {
    const ptr0 = passStringToWasm0(reason, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().libcurlwebsocket_close(this.__wbg_ptr, code, ptr0, len0);
  }
  constructor(url, protocols) {
    const ptr0 = passStringToWasm0(url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = isLikeNone(protocols) ? 0 : passArrayJsValueToWasm0(protocols, getWasm().__wbindgen_malloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = getWasm().libcurlwebsocket_new(ptr0, len0, ptr1, len1);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0];
    LibCurlWebSocketFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  get ready_state() {
    return getWasm().libcurlwebsocket_ready_state(this.__wbg_ptr);
  }
  removeEventListener(event, cb) {
    const ptr0 = passStringToWasm0(event, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().libcurlwebsocket_removeEventListener(this.__wbg_ptr, ptr0, len0, cb);
  }
  send(data) {
    getWasm().libcurlwebsocket_send(this.__wbg_ptr, data);
  }
  set onclose(cb) { getWasm().libcurlwebsocket_set_onclose(this.__wbg_ptr, cb); }
  set onerror(cb) { getWasm().libcurlwebsocket_set_onerror(this.__wbg_ptr, cb); }
  set onmessage(cb) { getWasm().libcurlwebsocket_set_onmessage(this.__wbg_ptr, cb); }
  set onopen(cb) { getWasm().libcurlwebsocket_set_onopen(this.__wbg_ptr, cb); }
}

class WispWebSocket {
  static __wrap(ptr) {
    const obj = Object.create(WispWebSocket.prototype);
    obj.__wbg_ptr = ptr;
    WispWebSocketFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    WispWebSocketFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_wispwebsocket_free(ptr, 0);
  }
  addEventListener(event, cb) {
    const ptr0 = passStringToWasm0(event, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().wispwebsocket_addEventListener(this.__wbg_ptr, ptr0, len0, cb);
  }
  close(code, reason) {
    const ptr0 = passStringToWasm0(reason, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().wispwebsocket_close(this.__wbg_ptr, code, ptr0, len0);
  }
  get ready_state() { return getWasm().wispwebsocket_ready_state(this.__wbg_ptr); }
  removeEventListener(event, cb) {
    const ptr0 = passStringToWasm0(event, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getWasm().wispwebsocket_removeEventListener(this.__wbg_ptr, ptr0, len0, cb);
  }
  send(data) { getWasm().wispwebsocket_send(this.__wbg_ptr, data); }
  set onclose(cb) { getWasm().wispwebsocket_set_onclose(this.__wbg_ptr, cb); }
  set onerror(cb) { getWasm().wispwebsocket_set_onerror(this.__wbg_ptr, cb); }
  set onmessage(cb) { getWasm().wispwebsocket_set_onmessage(this.__wbg_ptr, cb); }
  set onopen(cb) { getWasm().wispwebsocket_set_onopen(this.__wbg_ptr, cb); }
}

class Wisp {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    WispFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_wisp_free(ptr, 0);
  }
  constructor() {
    const ret = getWasm().wisp_new();
    this.__wbg_ptr = ret;
    WispFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  perform() {
    const ret = getWasm().wisp_perform(this.__wbg_ptr);
    return ret;
  }
  setopt(key, value) {
    const ptr0 = passStringToWasm0(key, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = getWasm().wisp_setopt(this.__wbg_ptr, ptr0, len0, value);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
}

class WispClientOptions {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    WispClientOptionsFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_wispclientoptions_free(ptr, 0);
  }
  get transport() {
    const ret = getWasm().__wbg_get_wispclientoptions_transport(this.__wbg_ptr);
    return ret;
  }
  set transport(arg0) {
    getWasm().__wbg_set_wispclientoptions_transport(this.__wbg_ptr, arg0);
  }
  constructor(transport) {
    const ret = getWasm().wispclientoptions_new(transport);
    this.__wbg_ptr = ret;
    WispClientOptionsFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
}

class WispClient {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    WispClientFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_wispclient_free(ptr, 0);
  }
  connectWebSocket(url, protocols, _headers) {
    const ptr0 = passStringToWasm0(url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = getWasm().wispclient_connectWebSocket(this.__wbg_ptr, ptr0, len0, protocols, _headers);
    return ret;
  }
  fetch(url, init) {
    const ptr0 = passStringToWasm0(url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = getWasm().wispclient_fetch(this.__wbg_ptr, ptr0, len0, init);
    return ret;
  }
  constructor(opts) {
    _assertClass(opts, WispClientOptions);
    var ptr0 = opts.__destroy_into_raw();
    const ret = getWasm().wispclient_new(ptr0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0];
    WispClientFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
}

class WispHTTPSession {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    WispHTTPSessionFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    getWasm().__wbg_wisphttpsession_free(ptr, 0);
  }
  close() {
    getWasm().wisphttpsession_close(this.__wbg_ptr);
  }
  fetch(url, opts) {
    const ptr0 = passStringToWasm0(url, getWasm().__wbindgen_malloc, getWasm().__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = getWasm().wisphttpsession_fetch(this.__wbg_ptr, ptr0, len0, opts);
    return ret;
  }
  constructor(_opts) {
    const ret = getWasm().wisphttpsession_new(_opts);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0];
    WispHTTPSessionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
}

export default init;
export { LibCurl, LibCurlWebSocket, WispWebSocket, Wisp, WispClient, WispClientOptions, WispHTTPSession };
