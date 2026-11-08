var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
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

// src/presets.ts
var init_presets = __esm({
  "src/presets.ts"() {
  }
});

// src/freeai.ts
var FACT_RULES;
var init_freeai = __esm({
  "src/freeai.ts"() {
    FACT_RULES = "Hard fact rules: use ONLY the facts supplied in this prompt - the business's own information. Never invent or guess prices, discounts, opening hours, dates, services, products, guarantees, qualifications, years of experience, people's names, addresses, phone numbers or any other detail. If a fact is not supplied, leave it out or say the team will confirm - never fill the gap. Money may only be quoted as an amount supplied here, always in South African rand (R). You are the business's WhatsApp employee writing as the business itself: never mention AI, never name any technology vendor, tool or model. Plain, simple English a customer reads in one pass.";
  }
});

// src/receptionist.ts
var RULES;
var init_receptionist = __esm({
  "src/receptionist.ts"() {
    init_freeai();
    init_presets();
    RULES = "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); no emojis. When the customer sends photos, acknowledge them by count and never describe, diagnose or price what might be in them - a person from the team assesses photos. IMPORTANT: the business information above is the COMPLETE list of what this business offers. If the customer asks about a service, product, price or policy that is not listed there, do NOT say yes and do NOT say no - say a person from the team will confirm. If you do not know, say a person will confirm. " + FACT_RULES;
  }
});

// src/reviews.ts
var init_reviews = __esm({
  "src/reviews.ts"() {
  }
});

// node_modules/spark-md5/spark-md5.js
var require_spark_md5 = __commonJS({
  "node_modules/spark-md5/spark-md5.js"(exports, module) {
    (function(factory) {
      if (typeof exports === "object") {
        module.exports = factory();
      } else if (typeof define === "function" && define.amd) {
        define(factory);
      } else {
        var glob;
        try {
          glob = window;
        } catch (e) {
          glob = self;
        }
        glob.SparkMD5 = factory();
      }
    })(function(undefined2) {
      "use strict";
      var add32 = function(a, b) {
        return a + b & 4294967295;
      }, hex_chr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
      function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32(a << s | a >>> 32 - s, b);
      }
      function md5cycle(x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];
        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
      }
      function md5blk(s) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
      }
      function md5blk_array(a) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
      }
      function md51(s) {
        var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }
      function md51_array(a) {
        var n = a.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }
        a = i - 64 < n ? a.subarray(i - 64) : new Uint8Array(0);
        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= a[i] << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }
      function rhex(n) {
        var s = "", j;
        for (j = 0; j < 4; j += 1) {
          s += hex_chr[n >> j * 8 + 4 & 15] + hex_chr[n >> j * 8 & 15];
        }
        return s;
      }
      function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
          x[i] = rhex(x[i]);
        }
        return x.join("");
      }
      if (hex(md51("hello")) !== "5d41402abc4b2a76b9719d911017c592") {
        add32 = function(x, y) {
          var lsw = (x & 65535) + (y & 65535), msw = (x >> 16) + (y >> 16) + (lsw >> 16);
          return msw << 16 | lsw & 65535;
        };
      }
      if (typeof ArrayBuffer !== "undefined" && !ArrayBuffer.prototype.slice) {
        (function() {
          function clamp(val, length) {
            val = val | 0 || 0;
            if (val < 0) {
              return Math.max(val + length, 0);
            }
            return Math.min(val, length);
          }
          ArrayBuffer.prototype.slice = function(from, to) {
            var length = this.byteLength, begin = clamp(from, length), end = length, num, target, targetArray, sourceArray;
            if (to !== undefined2) {
              end = clamp(to, length);
            }
            if (begin > end) {
              return new ArrayBuffer(0);
            }
            num = end - begin;
            target = new ArrayBuffer(num);
            targetArray = new Uint8Array(target);
            sourceArray = new Uint8Array(this, begin, num);
            targetArray.set(sourceArray);
            return target;
          };
        })();
      }
      function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
          str = unescape(encodeURIComponent(str));
        }
        return str;
      }
      function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length, buff = new ArrayBuffer(length), arr = new Uint8Array(buff), i;
        for (i = 0; i < length; i += 1) {
          arr[i] = str.charCodeAt(i);
        }
        return returnUInt8Array ? arr : buff;
      }
      function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
      }
      function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);
        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);
        return returnUInt8Array ? result : result.buffer;
      }
      function hexToBinaryString(hex2) {
        var bytes = [], length = hex2.length, x;
        for (x = 0; x < length - 1; x += 2) {
          bytes.push(parseInt(hex2.substr(x, 2), 16));
        }
        return String.fromCharCode.apply(String, bytes);
      }
      function SparkMD52() {
        this.reset();
      }
      SparkMD52.prototype.append = function(str) {
        this.appendBinary(toUtf8(str));
        return this;
      };
      SparkMD52.prototype.appendBinary = function(contents) {
        this._buff += contents;
        this._length += contents.length;
        var length = this._buff.length, i;
        for (i = 64; i <= length; i += 64) {
          md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }
        this._buff = this._buff.substring(i - 64);
        return this;
      };
      SparkMD52.prototype.end = function(raw) {
        var buff = this._buff, length = buff.length, i, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ret;
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= buff.charCodeAt(i) << (i % 4 << 3);
        }
        this._finish(tail, length);
        ret = hex(this._hash);
        if (raw) {
          ret = hexToBinaryString(ret);
        }
        this.reset();
        return ret;
      };
      SparkMD52.prototype.reset = function() {
        this._buff = "";
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];
        return this;
      };
      SparkMD52.prototype.getState = function() {
        return {
          buff: this._buff,
          length: this._length,
          hash: this._hash.slice()
        };
      };
      SparkMD52.prototype.setState = function(state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;
        return this;
      };
      SparkMD52.prototype.destroy = function() {
        delete this._hash;
        delete this._buff;
        delete this._length;
      };
      SparkMD52.prototype._finish = function(tail, length) {
        var i = length, tmp, lo, hi;
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(this._hash, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
      };
      SparkMD52.hash = function(str, raw) {
        return SparkMD52.hashBinary(toUtf8(str), raw);
      };
      SparkMD52.hashBinary = function(content, raw) {
        var hash = md51(content), ret = hex(hash);
        return raw ? hexToBinaryString(ret) : ret;
      };
      SparkMD52.ArrayBuffer = function() {
        this.reset();
      };
      SparkMD52.ArrayBuffer.prototype.append = function(arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true), length = buff.length, i;
        this._length += arr.byteLength;
        for (i = 64; i <= length; i += 64) {
          md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }
        this._buff = i - 64 < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);
        return this;
      };
      SparkMD52.ArrayBuffer.prototype.end = function(raw) {
        var buff = this._buff, length = buff.length, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], i, ret;
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= buff[i] << (i % 4 << 3);
        }
        this._finish(tail, length);
        ret = hex(this._hash);
        if (raw) {
          ret = hexToBinaryString(ret);
        }
        this.reset();
        return ret;
      };
      SparkMD52.ArrayBuffer.prototype.reset = function() {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];
        return this;
      };
      SparkMD52.ArrayBuffer.prototype.getState = function() {
        var state = SparkMD52.prototype.getState.call(this);
        state.buff = arrayBuffer2Utf8Str(state.buff);
        return state;
      };
      SparkMD52.ArrayBuffer.prototype.setState = function(state) {
        state.buff = utf8Str2ArrayBuffer(state.buff, true);
        return SparkMD52.prototype.setState.call(this, state);
      };
      SparkMD52.ArrayBuffer.prototype.destroy = SparkMD52.prototype.destroy;
      SparkMD52.ArrayBuffer.prototype._finish = SparkMD52.prototype._finish;
      SparkMD52.ArrayBuffer.hash = function(arr, raw) {
        var hash = md51_array(new Uint8Array(arr)), ret = hex(hash);
        return raw ? hexToBinaryString(ret) : ret;
      };
      return SparkMD52;
    });
  }
});

// src/index.ts
import { Client, Pool } from "pg";
init_presets();
init_receptionist();
init_reviews();

// src/pages.ts
init_freeai();
init_presets();
var COPY_RULES = `You write landing page copy for South African small businesses.
Rules: plain warm SA English, short sentences, no hype words (no "revolutionary", "game-changing", "unlock"), prices in rand (R) if any, mobile-first so keep headings under 9 words, body text under 60 words per section, bullets under 12 words each.
The page speaks to ONE customer pain only - every section must tie back to that pain.
NEVER invent facts: no phone numbers, no prices, no opening hours, no services not in the brief, no guarantees, no qualifications, no names, no years of experience, no claims the business did not state. Only use details given in this brief. For contact, always point to the button (e.g. "tap the button below"), never write a phone number or email in the copy.
${FACT_RULES}
If the brief gives no testimonials, do NOT write fake quotes or claims about what customers say. In a proof section, state plainly how the product works and what the business itself commits to.`;

// src/features.ts
init_reviews();

// src/index.ts
var import_spark_md5 = __toESM(require_spark_md5(), 1);
init_freeai();

// src/socialteam.ts
init_freeai();
var A = (slug, name, dept, does = "") => ({ slug, name, dept, live: false, does });
var TEAM_AGENTS = [
  // 1 Niche Research
  { slug: "researcher", name: "Researcher", dept: "Niche Research", live: true, does: "Studies your business, your customers and your area, and brings you fresh post ideas worth your time." },
  A("audience-mapper", "Audience Mapper", "Niche Research"),
  A("offer-analyst", "Offer Analyst", "Niche Research"),
  A("local-scout", "Local Market Scout", "Niche Research"),
  A("question-collector", "Question Collector", "Niche Research"),
  // 2 Competitor Tracking
  A("competitor-tracker", "Competitor Tracker", "Competitor Tracking"),
  A("ad-watcher", "Ad Watcher", "Competitor Tracking"),
  A("price-spotter", "Price Spotter", "Competitor Tracking"),
  A("review-reader", "Review Reader", "Competitor Tracking"),
  A("move-reporter", "Move Reporter", "Competitor Tracking"),
  // 3 Viral Video Research
  A("video-scout", "Video Scout", "Viral Video Research"),
  A("format-analyst", "Format Analyst", "Viral Video Research"),
  A("sound-tracker", "Sound Tracker", "Viral Video Research"),
  A("watchtime-analyst", "Watch-Time Analyst", "Viral Video Research"),
  A("trend-catcher", "Trend Catcher", "Viral Video Research"),
  // 4 Top Creator Research
  A("creator-scout", "Creator Scout", "Top Creator Research"),
  A("collab-finder", "Collab Finder", "Top Creator Research"),
  A("style-analyst", "Style Analyst", "Top Creator Research"),
  A("growth-tracker", "Growth Tracker", "Top Creator Research"),
  A("outreach-planner", "Outreach Planner", "Top Creator Research"),
  // 5 Scroll-Stopping Hooks
  A("hook-writer", "Hook Writer", "Scroll-Stopping Hooks"),
  A("first-line-tester", "First-Line Tester", "Scroll-Stopping Hooks"),
  A("curiosity-builder", "Curiosity Builder", "Scroll-Stopping Hooks"),
  A("painpoint-finder", "Pain-Point Finder", "Scroll-Stopping Hooks"),
  A("headline-polisher", "Headline Polisher", "Scroll-Stopping Hooks"),
  // 6 Content Trends & Formats
  A("trend-watcher", "Trend Watcher", "Content Trends & Formats"),
  A("format-librarian", "Format Librarian", "Content Trends & Formats"),
  A("platform-specialist", "Platform Specialist", "Content Trends & Formats"),
  A("calendar-planner", "Calendar Planner", "Content Trends & Formats"),
  A("seasonal-scout", "Seasonal Scout", "Content Trends & Formats"),
  // 7 Scriptwriting
  { slug: "writer", name: "Writer", dept: "Scriptwriting", live: true, does: "Turns the idea you pick into a ready post in your business's voice - caption, words and hashtags." },
  A("caption-writer", "Caption Writer", "Scriptwriting"),
  A("story-builder", "Story Builder", "Scriptwriting"),
  A("cta-writer", "CTA Writer", "Scriptwriting"),
  A("editor", "Editor", "Scriptwriting"),
  // 8 Viral Content Scaling
  A("repurpose-specialist", "Repurpose Specialist", "Viral Content Scaling"),
  A("series-planner", "Series Planner", "Viral Content Scaling"),
  A("format-adapter", "Format Adapter", "Viral Content Scaling"),
  A("distribution-planner", "Distribution Planner", "Viral Content Scaling"),
  A("booster", "Booster", "Viral Content Scaling"),
  // 9 Performance Reporting
  A("performance-reporter", "Performance Reporter", "Performance Reporting"),
  A("number-cruncher", "Number Cruncher", "Performance Reporting"),
  A("insight-writer", "Insight Writer", "Performance Reporting"),
  A("digest-builder", "Weekly Digest Builder", "Performance Reporting"),
  A("wins-tracker", "Wins Tracker", "Performance Reporting"),
  // 10 Content Operations
  { slug: "reviewer", name: "Reviewer", dept: "Content Operations", live: true, does: "Checks every post before you see it - facts, tone, and your rules. Nothing reaches you unchecked." },
  A("scheduler", "Scheduler", "Content Operations"),
  A("approval-chaser", "Approval Chaser", "Content Operations"),
  A("asset-organizer", "Asset Organizer", "Content Operations"),
  A("publishing-checker", "Publishing Checker", "Content Operations")
];
var LIVE_AGENTS = TEAM_AGENTS.filter((a) => a.live);
var TEAM_DEPARTMENTS = [...new Set(TEAM_AGENTS.map((a) => a.dept))];

// src/index.ts
async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function navLinks(user) {
  const g = Array.isArray(user._goals) ? user._goals : [];
  const show = (...need) => !g.length || need.some((n) => g.includes(n));
  let h = `<a href="/">Dashboard</a>`;
  if (show("leads", "receptionist")) h += `<a href="/inbox">Inbox</a>`;
  if (show("leads")) h += `<a href="/frontdesk">Leads</a>`;
  if (show("reviews", "leads", "receptionist")) h += `<a href="/approvals">Approvals</a>`;
  if (show("social")) h += `<a href="/posts">Posts</a>`;
  if (show("social")) h += `<a href="/team">Team</a>`;
  if (show("reviews")) h += `<a href="/reviews">Reviews</a>`;
  if (show("receptionist")) h += `<a href="/receptionist">Receptionist</a>`;
  let more = "";
  if (show("social")) more += `<a href="/analytics">Analytics</a>`;
  if (show("reviews")) more += `<a href="/radar">Radar</a>`;
  if (show("social")) more += `<a href="/media">Media</a>`;
  more += `<a href="/onboarding">Onboarding</a>`;
  if (show("receptionist")) more += `<a href="/assistant">Assistant</a>`;
  if (show("receptionist")) more += `<a href="/bookings">Bookings</a>`;
  if (show("receptionist")) more += `<a href="/waitlist">Waitlist</a>`;
  if (show("receptionist")) more += `<a href="/loyalty">Loyalty</a>`;
  if (show("receptionist")) more += `<a href="/quotes">Quotes</a>`;
  if (show("receptionist")) more += `<a href="/campaigns">Campaigns</a>`;
  if (show("receptionist", "social", "leads")) more += `<a href="/pages">Pages</a>`;
  if (show("receptionist")) more += `<a href="/competitors">Competitors</a>`;
  if (show("receptionist")) more += `<a href="/support">Support</a>`;
  if (show("receptionist")) more += `<a href="/wifi-card">WiFi Card</a>`;
  more += `<a href="/billing">Billing</a>`;
  h += `<details class="nav-more"><summary>More</summary><div class="nav-more-panel">${more}</div></details>`;
  return h;
}
function layout(title, body, user) {
  const nav = user ? `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links">${navLinks(user)}${user._cur_ws ? `<a href="/switch" title="Switch business" style="border:1px solid var(--line);border-radius:8px;padding:2px 8px">${esc(user._cur_ws)}${(user._ws_count || 0) > 1 ? " &#9662;" : ""}</a>` : ""}<form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></div></nav>` : `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links"><a class="btn btn-ghost" href="/login">Log in</a><a class="btn btn-primary" href="/signup">Get started</a></div></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} \xB7 RevUp</title><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap" rel="stylesheet"><style>
:root{--brand:#F97316;--brand-dark:#EA580C;--brand-soft:#FFF7ED;--ink:#1C1917;--ink2:#57534E;--ink3:#A8A29E;--line:#E7E5E4;--bg:#FAFAF9}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Manrope,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
a{color:var(--brand-dark);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line);margin-bottom:32px;flex-wrap:wrap;gap:12px}
.logo img{height:30px;width:auto}
.nav-links{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.nav-links a{color:var(--ink2);font-size:14px;font-weight:500}
.nav-links a:hover{color:var(--ink);text-decoration:none}
.nav-more{position:relative}
.nav-more summary{list-style:none;cursor:pointer;color:var(--ink2);font-size:14px;font-weight:500;display:flex;align-items:center;gap:4px;user-select:none}
.nav-more summary::-webkit-details-marker{display:none}
.nav-more summary::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px)}
.nav-more summary:hover{color:var(--ink)}
.nav-more[open] summary{color:var(--ink)}
.nav-more-panel{position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.06);z-index:50;display:grid;gap:2px}
.nav-more-panel a{display:block;padding:6px 12px;border-radius:8px;white-space:nowrap;color:var(--ink2)}
.nav-more-panel a:hover{background:var(--bg);color:var(--ink);text-decoration:none}
@media (max-width:640px){.nav-more-panel{left:0;right:auto}}
.btn{display:inline-block;padding:10px 20px;border-radius:10px;font-weight:500;font-size:15px;text-decoration:none;transition:background .15s;border:0;cursor:pointer}
.btn-primary{background:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-dark);text-decoration:none}
.btn-ghost{color:var(--ink);border:1px solid var(--line);background:#fff}
h1{font-size:24px;font-weight:500;margin:0 0 8px}h2{font-size:16px;font-weight:500;margin:24px 0 8px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin:12px 0}
input,select,textarea{width:100%;box-sizing:border-box;padding:12px 16px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);margin:4px 0 16px;font-size:14px;font-family:inherit}
input:focus{outline:2px solid var(--brand-soft);border-color:var(--brand)}
button,.btn-form{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:10px 20px;font-weight:500;cursor:pointer;font-size:14px}
button:hover{background:var(--brand-dark)}
button.link{background:none;color:var(--ink2);padding:0;font-weight:500;font-size:14px}
button.link:hover{color:var(--ink)}
.mut{color:var(--ink3);font-size:13px}.ok{color:#16A34A}.bad{color:#DC2626}.warn{color:#B45309}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:8px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:12px;font-weight:500;color:var(--ink3)}
.pill{font-size:12px;color:var(--brand-dark);font-weight:500}
.pill.warn{color:#B45309}.pill.ok{color:#15803D}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(208px,1fr));gap:16px}
form.inline{display:inline}
.stat{font-size:28px;font-weight:500;margin:2px 0;font-variant-numeric:tabular-nums}
.stat-t{font-size:20px;font-weight:500;margin:2px 0}
label{font-size:13px;font-weight:500;color:var(--ink2)}
</style></head><body><div class="wrap">${nav}<h1>${esc(title)}</h1>${body}</div></body></html>`;
}
function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
async function getUser(req, db) {
  const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
  if (!m) return null;
  const th = await sha256hex(m[1]);
  const r = await db.query(
    `UPDATE cf_sessions SET last_seen_at=now() WHERE token_hash=$1 AND expires_at>now()
     RETURNING user_id`,
    [th]
  );
  if (!r.rows[0]) return null;
  const u = await db.query(`SELECT id,email,name,is_superuser FROM accounts_user WHERE id=$1 AND is_active`, [r.rows[0].user_id]);
  return u.rows[0] || null;
}
async function newSession(db, userId, req) {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const th = await sha256hex(token);
  await db.query(
    `INSERT INTO cf_sessions(token_hash,user_id,device_info,expires_at) VALUES($1,$2,$3,now()+interval '14 days')`,
    [th, userId, (req.headers.get("user-agent") || "").slice(0, 200)]
  );
  return token;
}
async function rateLimited(db, bucket, req, limit) {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await db.query(
    `INSERT INTO cf_ratelimit(key,count) VALUES($1,1) ON CONFLICT (key) DO UPDATE SET count=cf_ratelimit.count+1 RETURNING count`,
    [`${bucket}:${ip}:${day}`]
  );
  return Number(r.rows[0].count) > limit;
}
async function rateLimitExceeded(db, bucket, req, limit) {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await db.query(`SELECT count FROM cf_ratelimit WHERE key=$1`, [`${bucket}:${ip}:${day}`]);
  return r.rows[0] ? Number(r.rows[0].count) > limit : false;
}
function sessionCookie(token) {
  return `cf_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${14 * 86400}`;
}
var VERIFY_SQL = `SELECT crypt(encode(digest($1,'sha256'),'hex'), '$2a$' || substring($2 from 5)) = '$2a$' || substring($2 from 5) AS ok`;
async function membership(db, userId, req) {
  const r = await db.query(
    `SELECT w.id AS workspace_id, w.name AS workspace_name, w.approval_workflow_mode,
            o.id AS org_id, o.name AS org_name, o.plan, o.subscription_status, o.payment_reference,
            o.trial_started_at, o.activated_at, o.goals, m.workspace_role
     FROM members_workspace_membership m
     JOIN workspaces_workspace w ON w.id=m.workspace_id
     JOIN organizations_organization o ON o.id=w.organization_id
     WHERE m.user_id=$1 AND w.is_archived=false AND o.deleted_at IS NULL
     ORDER BY m.added_at`,
    [userId]
  );
  if (!r.rows.length) return null;
  const want = req ? (/(?:^|;\s*)cf_ws=([0-9a-f-]{36})/.exec(req.headers.get("cookie") || "") || [])[1] : null;
  const cur = want && r.rows.find((x) => x.workspace_id === want) || r.rows[0];
  cur.workspaces = r.rows.map((x) => ({ id: x.workspace_id, name: x.workspace_name, org: x.org_name, plan: x.plan, status: x.subscription_status }));
  return cur;
}
async function formData(req) {
  const fd = await req.formData();
  const o = {};
  fd.forEach((v, k) => {
    o[k] = String(v);
  });
  return o;
}
var DRAFT_RULES = "Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. South African English. Keep the caption under 900 characters including hashtags. " + FACT_RULES;

// src/chatapp.ts
var CHATAPP_SCOPE = "revup:read";
var CODE_TTL_MIN = 10;
var ACCESS_TTL_DAYS = 30;
async function ensureChatAppTables(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_client(
    client_id text PRIMARY KEY,
    client_name text NOT NULL DEFAULT '',
    redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_code(
    code_hash text PRIMARY KEY,
    client_id text NOT NULL,
    redirect_uri text NOT NULL,
    code_challenge text NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL DEFAULT 'revup:read',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_token(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    access_hash text UNIQUE NOT NULL,
    refresh_hash text UNIQUE NOT NULL,
    client_id text NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL DEFAULT 'revup:read',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked boolean NOT NULL DEFAULT false)`);
}
function base64url(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function pkceS256(verifier) {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
}
function validRedirectUri(uri, registered) {
  return registered.includes(uri);
}
function popiaSnippet(s, max = 140) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function firstName(s) {
  return String(s || "").trim().split(/\s+/)[0] || "";
}
function authMetadata(base) {
  return {
    issuer: base,
    authorization_response_iss_parameter_supported: true,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    token_endpoint_auth_methods_supported: ["none"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [CHATAPP_SCOPE]
  };
}
function protectedResourceMetadata(base) {
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    scopes_supported: [CHATAPP_SCOPE],
    resource_name: "RevUp",
    resource_documentation: `${base}/privacy`
  };
}
function consentPage(qs, mem, clientName, err = "") {
  return layout("Connect RevUp to ChatGPT", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><h2>Connect ${esc(mem.org_name)} to ChatGPT</h2>
<p><b>${esc(clientName || "ChatGPT")}</b> is asking for <b>read-only</b> access to this workspace:</p>
<ul>
<li>Today's enquiry summary (counts and message snippets)</li>
<li>Review stats (counts only)</li>
<li>Your demand radar feed</li>
<li>Upcoming bookings (service, time, status, first name)</li>
</ul>
<p class="mut">No write actions. No customer phone numbers, emails or addresses are shared. You can disconnect any time from ChatGPT's app settings.</p>
<form method="post" action="/oauth/authorize?${qs}">
<button name="action" value="approve">Allow read-only access</button>
<button class="link" name="action" value="deny" formnovalidate>Cancel</button>
</form></div>`);
}
function connectLoginPage(qs, err = "") {
  return layout("Log in to connect ChatGPT", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><h2>Log in to RevUp to connect ChatGPT</h2>
<form method="post" action="/oauth/authorize?${qs}">
<label>Email<input type="email" name="email" required autocomplete="email"></label>
<label>Password<input type="password" name="password" required autocomplete="current-password"></label>
<button>Log in and continue</button>
</form></div>`);
}
function oauthErr(redirectUri, state, error, desc, iss) {
  if (redirectUri) {
    const u = new URL(redirectUri);
    u.searchParams.set("error", error);
    u.searchParams.set("error_description", desc);
    if (state) u.searchParams.set("state", state);
    u.searchParams.set("iss", iss);
    return new Response(null, { status: 302, headers: { location: u.toString() } });
  }
  return json({ error, error_description: desc }, 400);
}
async function handleAuthorize(req, env, url, poolFn) {
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    const p = url.searchParams;
    const base = url.origin;
    const clientId = p.get("client_id") || "";
    const redirectUri = p.get("redirect_uri") || "";
    const state = p.get("state") || "";
    const challenge = p.get("code_challenge") || "";
    const method = p.get("code_challenge_method") || "";
    if ((p.get("response_type") || "") !== "code") return oauthErr(null, state, "unsupported_response_type", "response_type must be code", base);
    const cr = await db.query(`SELECT client_id, client_name, redirect_uris FROM cf_oauth_client WHERE client_id=$1`, [clientId]);
    const client = cr.rows[0];
    if (!client) return json({ error: "invalid_client", error_description: "unknown client_id" }, 400);
    if (!validRedirectUri(redirectUri, client.redirect_uris || [])) return json({ error: "invalid_request", error_description: "redirect_uri not registered" }, 400);
    if (!challenge || method !== "S256") return oauthErr(redirectUri, state, "invalid_request", "PKCE S256 required", base);
    const qs = url.search.replace(/^\?/, "");
    if (req.method === "POST") {
      const f = await formData(req);
      if (f.email !== void 0) {
        if (await rateLimitExceeded(db, "login", req, 20)) return html(connectLoginPage(qs, "Too many failed attempts from this network today - please try again tomorrow."), 429);
        const r = await db.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
        const row = r.rows[0];
        let ok = false;
        if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
          const v = await db.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
          ok = v.rows[0]?.ok === true;
        }
        if (!ok) {
          await rateLimited(db, "login", req, 20);
          return html(connectLoginPage(qs, "Wrong email or password."), 401);
        }
        const token = await newSession(db, row.id, req);
        return new Response(null, { status: 303, headers: { location: `/oauth/authorize?${qs}`, "set-cookie": sessionCookie(token) } });
      }
      if (f.action === "deny") return oauthErr(redirectUri, state, "access_denied", "The owner declined the connection.", base);
      if (f.action !== "approve") return json({ error: "invalid_request" }, 400);
    }
    const user = await getUser(req, db);
    if (!user) return html(connectLoginPage(qs));
    const mem = await membership(db, user.id, req);
    if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet.</p>`, user), 403);
    if (mem.workspace_role && !["owner", "admin"].includes(mem.workspace_role) && req.method === "POST")
      return html(consentPage(qs, mem, client.client_name, "Only a workspace owner or admin can connect apps."), 403);
    if (req.method === "POST") {
      const code = base64url(crypto.getRandomValues(new Uint8Array(32)));
      await db.query(
        `INSERT INTO cf_oauth_code(code_hash,client_id,redirect_uri,code_challenge,workspace_id,scope,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,now()+interval '${CODE_TTL_MIN} minutes')`,
        [await sha256hex(code), clientId, redirectUri, challenge, mem.workspace_id, CHATAPP_SCOPE]
      );
      const u = new URL(redirectUri);
      u.searchParams.set("code", code);
      if (state) u.searchParams.set("state", state);
      u.searchParams.set("iss", base);
      return new Response(null, { status: 302, headers: { location: u.toString() } });
    }
    return html(consentPage(qs, mem, client.client_name));
  } finally {
    await db.end().catch(() => {
    });
  }
}
async function handleRegisterReal(req, env, poolFn) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_client_metadata", error_description: "JSON body required" }, 400);
  }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u) => typeof u === "string" && u.startsWith("https://")) : [];
  if (!uris.length) return json({ error: "invalid_redirect_uri", error_description: "at least one https redirect_uri required" }, 400);
  const clientId = crypto.randomUUID();
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    await db.query(
      `INSERT INTO cf_oauth_client(client_id,client_name,redirect_uris) VALUES($1,$2,$3)`,
      [clientId, String(body.client_name || "").slice(0, 120), JSON.stringify(uris)]
    );
    return json({
      client_id: clientId,
      client_name: String(body.client_name || "").slice(0, 120),
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: CHATAPP_SCOPE,
      client_id_issued_at: Math.floor(Date.now() / 1e3)
    }, 201);
  } finally {
    await db.end().catch(() => {
    });
  }
}
function tokenJson(access, refresh) {
  return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_DAYS * 86400, refresh_token: refresh, scope: CHATAPP_SCOPE });
}
async function issueTokens(db, clientId, workspaceId) {
  const access = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await db.query(
    `INSERT INTO cf_oauth_token(access_hash,refresh_hash,client_id,workspace_id,scope,expires_at)
     VALUES($1,$2,$3,$4,$5,now()+interval '${ACCESS_TTL_DAYS} days')`,
    [await sha256hex(access), await sha256hex(refresh), clientId, workspaceId, CHATAPP_SCOPE]
  );
  return { access, refresh };
}
async function handleToken(req, env, poolFn) {
  const f = await formData(req);
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    if (f.grant_type === "authorization_code") {
      const ch = await sha256hex(f.code || "");
      const r = await db.query(
        `DELETE FROM cf_oauth_code WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 AND expires_at>now()
         RETURNING code_challenge, workspace_id`,
        [ch, f.client_id || "", f.redirect_uri || ""]
      );
      const row = r.rows[0];
      if (!row) return json({ error: "invalid_grant", error_description: "code unknown, expired or already used" }, 400);
      if (await pkceS256(f.code_verifier || "") !== row.code_challenge)
        return json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
      const t = await issueTokens(db, f.client_id || "", row.workspace_id);
      return tokenJson(t.access, t.refresh);
    }
    if (f.grant_type === "refresh_token") {
      const rh = await sha256hex(f.refresh_token || "");
      const r = await db.query(`SELECT id, client_id, workspace_id FROM cf_oauth_token WHERE refresh_hash=$1 AND NOT revoked`, [rh]);
      const row = r.rows[0];
      if (!row) return json({ error: "invalid_grant" }, 400);
      const access = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
      await db.query(
        `UPDATE cf_oauth_token SET access_hash=$1, refresh_hash=$2, expires_at=now()+interval '${ACCESS_TTL_DAYS} days', created_at=now() WHERE id=$3`,
        [await sha256hex(access), await sha256hex(refresh), row.id]
      );
      return tokenJson(access, refresh);
    }
    return json({ error: "unsupported_grant_type" }, 400);
  } finally {
    await db.end().catch(() => {
    });
  }
}
async function workspaceForToken(req, env, poolFn) {
  const auth = req.headers.get("authorization") || "";
  const tok = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!tok) return null;
  const db = poolFn(env);
  try {
    const r = await db.query(
      `SELECT t.workspace_id, o.name AS org_name, w.name AS workspace_name FROM cf_oauth_token t
       JOIN workspaces_workspace w ON w.id=t.workspace_id
       JOIN organizations_organization o ON o.id=w.organization_id
       WHERE t.access_hash=$1 AND NOT t.revoked AND t.expires_at>now()`,
      [await sha256hex(tok)]
    );
    return r.rows[0] || null;
  } finally {
    await db.end().catch(() => {
    });
  }
}
async function toolTodayEnquiries(db, ws) {
  const [today, stages, latest] = await Promise.all([
    db.query(`SELECT count(*) c FROM frontdesk_lead WHERE workspace_id=$1 AND (created_at AT TIME ZONE 'Africa/Johannesburg')::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date`, [ws]),
    db.query(`SELECT stage, count(*) c FROM frontdesk_lead WHERE workspace_id=$1 GROUP BY stage`, [ws]),
    db.query(`SELECT message, stage, created_at FROM frontdesk_lead WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 3`, [ws])
  ]);
  const data = {
    day: (/* @__PURE__ */ new Date()).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" }),
    enquiries_today: Number(today.rows[0].c),
    all_time_by_stage: Object.fromEntries(stages.rows.map((r) => [r.stage, Number(r.c)])),
    latest: latest.rows.map((r) => ({
      at: new Date(r.created_at).toLocaleTimeString("en-ZA", { hour12: false, timeZone: "Africa/Johannesburg" }),
      stage: r.stage,
      snippet: popiaSnippet(r.message)
    }))
  };
  const lines = [`${data.enquiries_today} new enquir${data.enquiries_today === 1 ? "y" : "ies"} today (${data.day}).`];
  const stageStr = Object.entries(data.all_time_by_stage).map(([k, v]) => `${k}: ${v}`).join(", ");
  if (stageStr) lines.push(`Pipeline (all time): ${stageStr}.`);
  for (const l of data.latest) lines.push(`- ${l.at} [${l.stage}] ${l.snippet}`);
  return { data, text: lines.join("\n") };
}
async function toolReviewStats(db, ws) {
  const [links, clicked, contacts, events] = await Promise.all([
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [ws]),
    db.query(`SELECT count(*) c FROM receptionist_contact WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT step, status, count(*) c FROM receptionist_reviewevent WHERE workspace_id=$1 GROUP BY step, status`, [ws])
  ]);
  const data = {
    review_links_sent: Number(links.rows[0].c),
    links_clicked: Number(clicked.rows[0].c),
    contacts_in_inbox: Number(contacts.rows[0].c),
    events: events.rows.map((r) => ({ step: r.step, status: r.status, count: Number(r.c) }))
  };
  const ev = data.events.map((e) => `${e.step}/${e.status}: ${e.count}`).join(", ");
  return {
    data,
    text: `Review links sent: ${data.review_links_sent} (${data.links_clicked} clicked). Contacts in inbox: ${data.contacts_in_inbox}.${ev ? ` Events - ${ev}.` : ""}`
  };
}
async function toolRadarFeed(db, ws) {
  const w = await db.query(`SELECT industry FROM workspaces_workspace WHERE id=$1`, [ws]);
  const feed = await db.query(
    `SELECT title, source, summary, published_at FROM radar_radarfeeditem WHERE workspace_id=$1 ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT 10`,
    [ws]
  );
  const data = {
    industry: w.rows[0]?.industry || "general",
    items: feed.rows.map((r) => ({
      title: popiaSnippet(r.title, 200),
      source: popiaSnippet(r.source, 80),
      published_at: r.published_at ? new Date(r.published_at).toISOString().slice(0, 10) : null,
      snippet: popiaSnippet(r.summary)
    }))
  };
  const lines = [`Demand radar (${data.industry}): ${data.items.length} recent signal${data.items.length === 1 ? "" : "s"}.`];
  for (const i of data.items) lines.push(`- ${i.published_at || "undated"} \xB7 ${i.title}${i.source ? ` (${i.source})` : ""}`);
  return { data, text: lines.join("\n") };
}
async function toolUpcomingBookings(db, ws) {
  const r = await db.query(
    `SELECT b.service, b.scheduled_start, b.preferred_time, b.status, c.name AS contact_name
     FROM receptionist_booking b LEFT JOIN receptionist_contact c ON c.id=b.contact_id
     WHERE b.workspace_id=$1 AND b.status IN ('requested','confirmed')
     ORDER BY b.scheduled_start NULLS LAST, b.created_at LIMIT 10`,
    [ws]
  );
  const data = {
    upcoming: r.rows.map((b) => ({
      service: popiaSnippet(b.service, 80),
      when: b.scheduled_start ? new Date(b.scheduled_start).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : popiaSnippet(b.preferred_time, 60),
      status: b.status,
      customer: firstName(b.contact_name)
    })),
    requested: r.rows.filter((b) => b.status === "requested").length,
    confirmed: r.rows.filter((b) => b.status === "confirmed").length
  };
  const lines = [`${data.upcoming.length} upcoming booking${data.upcoming.length === 1 ? "" : "s"} (${data.confirmed} confirmed, ${data.requested} awaiting confirmation).`];
  for (const b of data.upcoming) lines.push(`- ${b.when || "time to confirm"} \xB7 ${b.service || "booking"} \xB7 ${b.status}${b.customer ? ` \xB7 ${b.customer}` : ""}`);
  return { data, text: lines.join("\n") };
}
var WIDGET_URI = "ui://widget/revup-overview-v1.html";
var WIDGET_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#fff;color:#1d1d1f}
h2{font-size:15px;margin:0 0 8px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}
.row:last-child{border:none}.mut{color:#6e6e73;font-size:12px}.n{font-weight:700;font-size:22px}
.grid{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #e5e5ea;border-radius:10px;padding:10px 14px;min-width:110px}
</style></head><body><div id="root"><p class="mut">Loading\u2026</p></div><script>
const o=(window.openai&&window.openai.toolOutput)||{};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let h='';
if(o.enquiries_today!==undefined){h+='<h2>Today\\'s enquiries - '+esc(o.day)+'</h2><div class="grid"><div class="card"><div class="n">'+esc(o.enquiries_today)+'</div><div class="mut">today</div></div>';
for(const[k,v]of Object.entries(o.all_time_by_stage||{}))h+='<div class="card"><div class="n">'+esc(v)+'</div><div class="mut">'+esc(k)+'</div></div>';
h+='</div>';for(const l of(o.latest||[]))h+='<div class="row"><span>'+esc(l.snippet)+'</span><span class="mut">'+esc(l.at)+' \xB7 '+esc(l.stage)+'</span></div>';}
else if(o.review_links_sent!==undefined){h+='<h2>Review stats</h2><div class="grid"><div class="card"><div class="n">'+esc(o.review_links_sent)+'</div><div class="mut">links sent</div></div><div class="card"><div class="n">'+esc(o.links_clicked)+'</div><div class="mut">clicked</div></div><div class="card"><div class="n">'+esc(o.contacts_in_inbox)+'</div><div class="mut">contacts</div></div></div>';}
else if(o.items){h+='<h2>Demand radar - '+esc(o.industry)+'</h2>';for(const i of o.items)h+='<div class="row"><span>'+esc(i.title)+'</span><span class="mut">'+esc(i.published_at||'')+'</span></div>';}
else if(o.upcoming){h+='<h2>Upcoming bookings</h2>';for(const b of o.upcoming)h+='<div class="row"><span>'+esc(b.service||'booking')+(b.customer?' \xB7 '+esc(b.customer):'')+'</span><span class="mut">'+esc(b.when||'')+' \xB7 '+esc(b.status)+'</span></div>';if(!o.upcoming.length)h+='<p class="mut">No upcoming bookings.</p>';}
else h='<p class="mut">No data.</p>';
document.getElementById('root').innerHTML=h;
</script></body></html>`;
var TOOLS = [
  {
    name: "get_today_enquiry_summary",
    title: "Today's enquiry summary",
    description: "Use this when the owner asks how many website enquiries came in today, or wants the latest enquiry messages. Returns today's count, the all-time lead pipeline by stage, and short snippets of the 3 newest enquiry messages. Read-only; contains no contact details.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "Cards with today's enquiry count, pipeline stages and the newest enquiry snippets.", "openai/toolInvocation/invoking": "Checking today's enquiries", "openai/toolInvocation/invoked": "Enquiry summary ready" },
    run: toolTodayEnquiries
  },
  {
    name: "get_review_stats",
    title: "Review stats",
    description: "Use this when the owner asks about Google review performance: how many review links were sent, how many customers clicked, inbox size, and review/reminder event counts. Read-only; counts only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "Cards with review links sent, clicked and contacts in inbox.", "openai/toolInvocation/invoking": "Pulling review stats", "openai/toolInvocation/invoked": "Review stats ready" },
    run: toolReviewStats
  },
  {
    name: "get_radar_feed",
    title: "Demand radar feed",
    description: "Use this when the owner asks what is happening in their industry or area: the latest South African demand signals and news the radar collected for their business. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "List of the newest demand radar signals with source and date.", "openai/toolInvocation/invoking": "Scanning the demand radar", "openai/toolInvocation/invoked": "Radar feed ready" },
    run: toolRadarFeed
  },
  {
    name: "get_upcoming_bookings",
    title: "Upcoming bookings",
    description: "Use this when the owner asks about today's or this week's bookings: service, time, status and customer first name for the next bookings, with requested vs confirmed counts. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "List of upcoming bookings with service, time and status.", "openai/toolInvocation/invoking": "Checking the diary", "openai/toolInvocation/invoked": "Bookings ready" },
    run: toolUpcomingBookings
  }
];
function rpcResult(id, result) {
  return json({ jsonrpc: "2.0", id, result });
}
function rpcError(id, code, message) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}
function mcpUnauthorized(base) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "OAuth required" } }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`
    }
  });
}
async function handleMcp(req, env, url, poolFn) {
  const base = url.origin;
  if (req.method === "GET") return json({ error: "SSE not supported; POST JSON-RPC here" }, 405);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  let msg;
  try {
    msg = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (Array.isArray(msg)) return rpcError(null, -32600, "Batches not supported");
  const id = msg.id;
  if (id === void 0 || id === null) {
    if (msg.method === "notifications/initialized" || msg.method === "notifications/cancelled") return new Response(null, { status: 202 });
  }
  switch (msg.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: msg.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "revup", title: "RevUp", version: "1.0.0" },
        instructions: "RevUp read-only tools for the connected business workspace: today's enquiries, review stats, demand radar, upcoming bookings. All tools are read-only and POPIA-safe (counts and short snippets only, no contact details)."
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "resources/list":
      return rpcResult(id, { resources: [{ uri: WIDGET_URI, name: "RevUp overview", mimeType: "text/html+skybridge", description: "Visual summary for RevUp read-only tools." }] });
    case "resources/read":
      if (msg.params?.uri !== WIDGET_URI) return rpcError(id, -32602, "Unknown resource");
      return rpcResult(id, { contents: [{ uri: WIDGET_URI, mimeType: "text/html+skybridge", text: WIDGET_HTML }] });
    case "tools/call": {
      const ws = await workspaceForToken(req, env, poolFn);
      if (!ws) return mcpUnauthorized(base);
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return rpcError(id, -32602, "Unknown tool");
      const db = poolFn(env);
      try {
        const { data, text } = await tool.run(db, ws.workspace_id);
        return rpcResult(id, {
          content: [{ type: "text", text }],
          structuredContent: { ...data, workspace: ws.workspace_name, business: ws.org_name }
        });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: `RevUp could not load that right now: ${String(e).slice(0, 160)}` }], isError: true });
      } finally {
        await db.end().catch(() => {
        });
      }
    }
    default:
      return rpcError(id, -32601, "Method not found");
  }
}
function corsHeaders() {
  return { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type,mcp-protocol-version,mcp-session-id" };
}
function privacyPage() {
  return layout("Privacy policy", `
<div class="card"><h2>Privacy policy - RevUp</h2>
<p class="mut">Last updated 8 November 2026 \xB7 NahaLabs, South Africa</p>
<p>RevUp is a business tool from NahaLabs that helps South African businesses answer enquiries, collect Google reviews, follow up leads and manage bookings. This policy explains what we collect and why, in line with the Protection of Personal Information Act (POPIA).</p>
<h3>What we collect</h3>
<ul>
<li>Account details you give us: name, email, business name.</li>
<li>Customer information your customers send you through RevUp: enquiry messages, WhatsApp conversations, booking details.</li>
<li>Usage and technical data needed to run the service.</li>
</ul>
<h3>How we use it</h3>
<ul>
<li>To provide the features you switched on: replying to enquiries, requesting reviews, reminders, bookings and posts.</li>
<li>We never sell personal information and never use your customer data to advertise.</li>
</ul>
<h3>ChatGPT app connection</h3>
<p>If you connect RevUp to ChatGPT, the connection is read-only. It shares counts and short message snippets only - never customer phone numbers, email addresses or full records. You can disconnect at any time from ChatGPT's app settings, which stops all further sharing immediately.</p>
<h3>Your rights</h3>
<p>You may ask to see, correct or delete your information at any time. Customers of a business using RevUp can ask that business directly, or contact us and we will route the request.</p>
<h3>Contact</h3>
<p>Information officer: Thabiso Naha \xB7 <a href="mailto:hello@nahalabs.co.za">hello@nahalabs.co.za</a> \xB7 South Africa. Complaints may also be lodged with the Information Regulator (South Africa).</p>
</div>`);
}
async function handleChatAppRoute(req, env, url, poolFn) {
  const path = url.pathname;
  const base = url.origin;
  if (path === "/.well-known/oauth-protected-resource") {
    const r = json({ ...protectedResourceMetadata(base) });
    for (const [k, v] of Object.entries(corsHeaders())) r.headers.set(k, v);
    return r;
  }
  if (path === "/.well-known/oauth-authorization-server") {
    const r = json(authMetadata(base));
    for (const [k, v] of Object.entries(corsHeaders())) r.headers.set(k, v);
    return r;
  }
  if (path === "/oauth/register" && req.method === "POST") return handleRegisterReal(req, env, poolFn);
  if (path === "/oauth/authorize" && (req.method === "GET" || req.method === "POST")) return handleAuthorize(req, env, url, poolFn);
  if (path === "/oauth/token" && req.method === "POST") return handleToken(req, env, poolFn);
  if (path === "/mcp" || path === "/mcp/") return handleMcp(req, env, url, poolFn);
  if (path === "/privacy") return html(privacyPage());
  return null;
}
export {
  CHATAPP_SCOPE,
  base64url,
  ensureChatAppTables,
  firstName,
  handleChatAppRoute,
  pkceS256,
  popiaSnippet,
  privacyPage,
  protectedResourceMetadata,
  validRedirectUri
};
