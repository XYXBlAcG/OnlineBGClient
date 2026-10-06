export default {
7902: function (n, e, t) {
  var companionBridge = t.bridge;
  t.r(e);
  var r = t(885),
    a = t(7313),
    i = t(5982),
    c = t(3953),
    o = t(3515),
    l = t(1124),
    s = t(4595),
    u = t(7992),
    d = t(9414),
    f = t(2262),
    h = t(6417);
  function p(n) {
    var e = Math.min(n, l.R$),
      t = Math.floor(e / 60),
      r = e % 60,
      a = "".concat(t, ":").concat(String(r).padStart(2, "0"));
    return e >= l.R$ ? "".concat(a, "+") : a;
  }
  e.default = function (n) {
    var e = n.room,
      t = n.game,
      m = n.send,
      v = t.version,
      b = o.d4.decode(t.data),
      y = n.view,
      w = !!e.position,
      g = w ? e.position - 1 : null,
      x = e.position === e.owner,
      k = w && (0, u.Yw)(e, y.waitFor) ? y.waitFor : null,
      j = !!y.enableCt,
      N = !!y.winner.length,
      C = N ? null : (0, l.g$)(y),
      O = (0, a.useState)(0),
      Z = (0, r.Z)(O, 2)[1];
    (0, a.useEffect)(function () {
      if (j && !N) {
        var n = setInterval(function () {
          return Z(function (n) {
            return n + 1;
          });
        }, 1e3);
        return function () {
          return clearInterval(n);
        };
      }
    }, [j, N]);
    var E = (0, a.useRef)({
      version: t.version,
      at: e.create + t.time
    });
    E.current.version !== t.version && (E.current = {
      version: t.version,
      at: Date.now()
    });
    var L = function (n) {
        var e = y.costs[n] || 0;
        return y.ptOwner === n && (e += Math.max(0, Math.floor(t.time / 1e3) - y.pt)), C === n && (e += Math.max(0, Math.floor((Date.now() - E.current.at) / 1e3))), e;
      },
      A = (0, a.useRef)({
        version: v,
        pending: !1
      });
    return A.current.version !== v && (A.current = {
      version: v,
      pending: !1
    }), (0, c.N)([]), (0, h.jsxs)(h.Fragment, {
      children: [x && (0, h.jsx)("div", {
        className: "button-container",
        children: (0, h.jsx)("div", {
          className: "button-right",
          children: (0, h.jsx)(s.Z, {
            small: !0,
            onClick: function () {
              return (0, c.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return m(i.Z.OwnerExitGame, {
                  data: o.d4.encode(y.enableCt ? {
                    ct: new Uint8Array([1])
                  } : {}).finish()
                });
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, h.jsx)(f.Z, {
        view: y,
        playerId: g,
        readOnly: !w,
        onAction: function (move) {
          if (!companionBridge.readOnly && g !== null && !A.current.pending) {
            A.current.pending = true;
            companionBridge.sink({
              type: "ccbs-action",
              move: move
            });
          }
        },
        version: v,
        afkPlayerId: k,
        renderSeat: function (n) {
          return (0, h.jsxs)(h.Fragment, {
            children: [(0, h.jsx)(u.ZP, {
              room: e,
              index: n,
              send: m,
              isTurn: !N && y.waitFor === n
            }), j && (0, h.jsx)("div", {
              className: "text-xs whitespace-nowrap",
              children: "\u23f1 ".concat(p(L(n)))
            })]
          });
        }
      }), N && y.initial && (0, h.jsx)("div", {
        className: "text-center mt-4",
        children: (0, h.jsx)(s.Z, {
          to: "/ccbs".concat((0, d.HF)(y)),
          children: "\u67e5\u770b\u5bf9\u5c40\u590d\u76d8"
        })
      })]
    });
  };
},
885: function (e, t, n) {
  "use strict";

  n.d(t, {
    Z: function () {
      return a;
    }
  });
  var r = n(181);
  function a(e, t) {
    return function (e) {
      if (Array.isArray(e)) return e;
    }(e) || function (e, t) {
      var n = null == e ? null : "undefined" !== typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
      if (null != n) {
        var r,
          a,
          l = [],
          o = !0,
          i = !1;
        try {
          for (n = n.call(e); !(o = (r = n.next()).done) && (l.push(r.value), !t || l.length !== t); o = !0);
        } catch (u) {
          i = !0, a = u;
        } finally {
          try {
            o || null == n.return || n.return();
          } finally {
            if (i) throw a;
          }
        }
        return l;
      }
    }(e, t) || (0, r.Z)(e, t) || function () {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }
},
181: function (e, t, n) {
  "use strict";

  n.d(t, {
    Z: function () {
      return a;
    }
  });
  var r = n(907);
  function a(e, t) {
    if (e) {
      if ("string" === typeof e) return (0, r.Z)(e, t);
      var n = Object.prototype.toString.call(e).slice(8, -1);
      return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? (0, r.Z)(e, t) : void 0;
    }
  }
},
907: function (e, t, n) {
  "use strict";

  function r(e, t) {
    (null == t || t > e.length) && (t = e.length);
    for (var n = 0, r = new Array(t); n < t; n++) r[n] = e[n];
    return r;
  }
  n.d(t, {
    Z: function () {
      return r;
    }
  });
},
5982: function (e, t, n) {
  "use strict";

  var i, a;
  n.d(t, {
    Z: function () {
      return i;
    },
    q: function () {
      return a;
    }
  }), function (e) {
    e[e.PlayerUpdateGameData = 0] = "PlayerUpdateGameData", e[e.VisitorJoinGame = 1] = "VisitorJoinGame", e[e.PlayerUpdateUserInfo = 2] = "PlayerUpdateUserInfo", e[e.PlayerChangeSeat = 3] = "PlayerChangeSeat", e[e.OwnerStartGame = 4] = "OwnerStartGame", e[e.OwnerExitGame = 5] = "OwnerExitGame", e[e.OwnerChangePlayerCount = 6] = "OwnerChangePlayerCount", e[e.OwnerKickOut = 7] = "OwnerKickOut", e[e.OwnerUpdateGameData = 9] = "OwnerUpdateGameData", e[e.PlayerUpdatePlayerData = 10] = "PlayerUpdatePlayerData", e[e.PlayerInteraction = 11] = "PlayerInteraction";
  }(i || (i = {})), function (e) {
    e[e.UpdateGameData = 0] = "UpdateGameData", e[e.UpdatePlayerOffline = 1] = "UpdatePlayerOffline", e[e.UpdatePlayerData = 2] = "UpdatePlayerData", e[e.UpdatePlayerState = 3] = "UpdatePlayerState", e[e.ShowPlayerInteraction = 4] = "ShowPlayerInteraction", e[e.UpdateVisitorCount = 5] = "UpdateVisitorCount";
  }(a || (a = {}));
},
3515: function (n, e, t) {
  t.d(e, {
    d4: function () {
      return l;
    }
  });
  var r = t(7710),
    a = r.Reader,
    i = r.Writer,
    c = r.util,
    o = r.roots.default || (r.roots.default = {}),
    l = (o.CCBSOperation = function () {
      function n(n) {
        if (this.noble = [], this.noblePos = [], this.gemDelta = [], n) for (var e = Object.keys(n), t = 0; t < e.length; ++t) null != n[e[t]] && (this[e[t]] = n[e[t]]);
      }
      return n.prototype.type = 0, n.prototype.playerId = 0, n.prototype.card = 0, n.prototype.cardPos = 0, n.prototype.noble = c.emptyArray, n.prototype.noblePos = c.emptyArray, n.prototype.gemDelta = c.emptyArray, n.encode = function (n, e) {
        if (e || (e = i.create()), null != n.type && Object.hasOwnProperty.call(n, "type") && e.uint32(8).uint32(n.type), null != n.playerId && Object.hasOwnProperty.call(n, "playerId") && e.uint32(16).uint32(n.playerId), null != n.card && Object.hasOwnProperty.call(n, "card") && e.uint32(24).uint32(n.card), null != n.cardPos && Object.hasOwnProperty.call(n, "cardPos") && e.uint32(32).uint32(n.cardPos), null != n.noble && n.noble.length) {
          e.uint32(42).fork();
          for (var t = 0; t < n.noble.length; ++t) e.uint32(n.noble[t]);
          e.ldelim();
        }
        if (null != n.noblePos && n.noblePos.length) {
          e.uint32(50).fork();
          for (t = 0; t < n.noblePos.length; ++t) e.uint32(n.noblePos[t]);
          e.ldelim();
        }
        if (null != n.gemDelta && n.gemDelta.length) {
          e.uint32(58).fork();
          for (t = 0; t < n.gemDelta.length; ++t) e.uint32(n.gemDelta[t]);
          e.ldelim();
        }
        return e;
      }, n.decode = function (n, e) {
        n instanceof a || (n = a.create(n));
        for (var t = void 0 === e ? n.len : n.pos + e, r = new o.CCBSOperation(); n.pos < t;) {
          var i = n.uint32();
          switch (i >>> 3) {
            case 1:
              r.type = n.uint32();
              break;
            case 2:
              r.playerId = n.uint32();
              break;
            case 3:
              r.card = n.uint32();
              break;
            case 4:
              r.cardPos = n.uint32();
              break;
            case 5:
              if (r.noble && r.noble.length || (r.noble = []), 2 === (7 & i)) for (var c = n.uint32() + n.pos; n.pos < c;) r.noble.push(n.uint32());else r.noble.push(n.uint32());
              break;
            case 6:
              if (r.noblePos && r.noblePos.length || (r.noblePos = []), 2 === (7 & i)) for (c = n.uint32() + n.pos; n.pos < c;) r.noblePos.push(n.uint32());else r.noblePos.push(n.uint32());
              break;
            case 7:
              if (r.gemDelta && r.gemDelta.length || (r.gemDelta = []), 2 === (7 & i)) for (c = n.uint32() + n.pos; n.pos < c;) r.gemDelta.push(n.uint32());else r.gemDelta.push(n.uint32());
              break;
            default:
              n.skipType(7 & i);
          }
        }
        return r;
      }, n;
    }(), o.CCBSGameData = function () {
      function n(n) {
        if (this.cardList = [], this.nobleList = [], n) for (var e = Object.keys(n), t = 0; t < e.length; ++t) null != n[e[t]] && (this[e[t]] = n[e[t]]);
      }
      return n.prototype.state = 0, n.prototype.cardList = c.emptyArray, n.prototype.nobleList = c.emptyArray, n.prototype.gem = c.newBuffer([]), n.prototype.lastOp = null, n.prototype.ct = c.newBuffer([]), n.prototype.initial = c.newBuffer([]), n.prototype.records = c.newBuffer([]), n.encode = function (n, e) {
        if (e || (e = i.create()), null != n.state && Object.hasOwnProperty.call(n, "state") && e.uint32(8).uint32(n.state), null != n.cardList && n.cardList.length) {
          e.uint32(18).fork();
          for (var t = 0; t < n.cardList.length; ++t) e.uint32(n.cardList[t]);
          e.ldelim();
        }
        if (null != n.nobleList && n.nobleList.length) {
          e.uint32(26).fork();
          for (t = 0; t < n.nobleList.length; ++t) e.uint32(n.nobleList[t]);
          e.ldelim();
        }
        return null != n.gem && Object.hasOwnProperty.call(n, "gem") && e.uint32(34).bytes(n.gem), null != n.lastOp && Object.hasOwnProperty.call(n, "lastOp") && o.CCBSOperation.encode(n.lastOp, e.uint32(42).fork()).ldelim(), null != n.ct && Object.hasOwnProperty.call(n, "ct") && e.uint32(50).bytes(n.ct), null != n.initial && Object.hasOwnProperty.call(n, "initial") && e.uint32(58).bytes(n.initial), null != n.records && Object.hasOwnProperty.call(n, "records") && e.uint32(66).bytes(n.records), e;
      }, n.decode = function (n, e) {
        n instanceof a || (n = a.create(n));
        for (var t = void 0 === e ? n.len : n.pos + e, r = new o.CCBSGameData(); n.pos < t;) {
          var i = n.uint32();
          switch (i >>> 3) {
            case 1:
              r.state = n.uint32();
              break;
            case 2:
              if (r.cardList && r.cardList.length || (r.cardList = []), 2 === (7 & i)) for (var c = n.uint32() + n.pos; n.pos < c;) r.cardList.push(n.uint32());else r.cardList.push(n.uint32());
              break;
            case 3:
              if (r.nobleList && r.nobleList.length || (r.nobleList = []), 2 === (7 & i)) for (c = n.uint32() + n.pos; n.pos < c;) r.nobleList.push(n.uint32());else r.nobleList.push(n.uint32());
              break;
            case 4:
              r.gem = n.bytes();
              break;
            case 5:
              r.lastOp = o.CCBSOperation.decode(n, n.uint32());
              break;
            case 6:
              r.ct = n.bytes();
              break;
            case 7:
              r.initial = n.bytes();
              break;
            case 8:
              r.records = n.bytes();
              break;
            default:
              n.skipType(7 & i);
          }
        }
        return r;
      }, n;
    }());
},
7710: function (e, t, n) {
  "use strict";

  e.exports = n(9488);
},
9488: function (e, t, n) {
  "use strict";

  var r = t;
  function a() {
    r.util._configure(), r.Writer._configure(r.BufferWriter), r.Reader._configure(r.BufferReader);
  }
  r.build = "minimal", r.Writer = n(8050), r.BufferWriter = n(2149), r.Reader = n(2422), r.BufferReader = n(4148), r.util = n(9716), r.rpc = n(7523), r.roots = n(3107), r.configure = a, a();
},
8050: function (e, t, n) {
  "use strict";

  e.exports = f;
  var r,
    a = n(9716),
    l = a.LongBits,
    o = a.base64,
    i = a.utf8;
  function u(e, t, n) {
    this.fn = e, this.len = t, this.next = void 0, this.val = n;
  }
  function s() {}
  function c(e) {
    this.head = e.head, this.tail = e.tail, this.len = e.len, this.next = e.states;
  }
  function f() {
    this.len = 0, this.head = new u(s, 0, 0), this.tail = this.head, this.states = null;
  }
  var d = function () {
    return a.Buffer ? function () {
      return (f.create = function () {
        return new r();
      })();
    } : function () {
      return new f();
    };
  };
  function p(e, t, n) {
    t[n] = 255 & e;
  }
  function h(e, t) {
    this.len = e, this.next = void 0, this.val = t;
  }
  function m(e, t, n) {
    for (; e.hi;) t[n++] = 127 & e.lo | 128, e.lo = (e.lo >>> 7 | e.hi << 25) >>> 0, e.hi >>>= 7;
    for (; e.lo > 127;) t[n++] = 127 & e.lo | 128, e.lo = e.lo >>> 7;
    t[n++] = e.lo;
  }
  function v(e, t, n) {
    t[n] = 255 & e, t[n + 1] = e >>> 8 & 255, t[n + 2] = e >>> 16 & 255, t[n + 3] = e >>> 24;
  }
  f.create = d(), f.alloc = function (e) {
    return new a.Array(e);
  }, a.Array !== Array && (f.alloc = a.pool(f.alloc, a.Array.prototype.subarray)), f.prototype._push = function (e, t, n) {
    return this.tail = this.tail.next = new u(e, t, n), this.len += t, this;
  }, h.prototype = Object.create(u.prototype), h.prototype.fn = function (e, t, n) {
    for (; e > 127;) t[n++] = 127 & e | 128, e >>>= 7;
    t[n] = e;
  }, f.prototype.uint32 = function (e) {
    return this.len += (this.tail = this.tail.next = new h((e >>>= 0) < 128 ? 1 : e < 16384 ? 2 : e < 2097152 ? 3 : e < 268435456 ? 4 : 5, e)).len, this;
  }, f.prototype.int32 = function (e) {
    return e < 0 ? this._push(m, 10, l.fromNumber(e)) : this.uint32(e);
  }, f.prototype.sint32 = function (e) {
    return this.uint32((e << 1 ^ e >> 31) >>> 0);
  }, f.prototype.uint64 = function (e) {
    var t = l.from(e);
    return this._push(m, t.length(), t);
  }, f.prototype.int64 = f.prototype.uint64, f.prototype.sint64 = function (e) {
    var t = l.from(e).zzEncode();
    return this._push(m, t.length(), t);
  }, f.prototype.bool = function (e) {
    return this._push(p, 1, e ? 1 : 0);
  }, f.prototype.fixed32 = function (e) {
    return this._push(v, 4, e >>> 0);
  }, f.prototype.sfixed32 = f.prototype.fixed32, f.prototype.fixed64 = function (e) {
    var t = l.from(e);
    return this._push(v, 4, t.lo)._push(v, 4, t.hi);
  }, f.prototype.sfixed64 = f.prototype.fixed64, f.prototype.float = function (e) {
    return this._push(a.float.writeFloatLE, 4, e);
  }, f.prototype.double = function (e) {
    return this._push(a.float.writeDoubleLE, 8, e);
  };
  var y = a.Array.prototype.set ? function (e, t, n) {
    t.set(e, n);
  } : function (e, t, n) {
    for (var r = 0; r < e.length; ++r) t[n + r] = e[r];
  };
  f.prototype.bytes = function (e) {
    var t = e.length >>> 0;
    if (!t) return this._push(p, 1, 0);
    if (a.isString(e)) {
      var n = f.alloc(t = o.length(e));
      o.decode(e, n, 0), e = n;
    }
    return this.uint32(t)._push(y, t, e);
  }, f.prototype.string = function (e) {
    var t = i.length(e);
    return t ? this.uint32(t)._push(i.write, t, e) : this._push(p, 1, 0);
  }, f.prototype.fork = function () {
    return this.states = new c(this), this.head = this.tail = new u(s, 0, 0), this.len = 0, this;
  }, f.prototype.reset = function () {
    return this.states ? (this.head = this.states.head, this.tail = this.states.tail, this.len = this.states.len, this.states = this.states.next) : (this.head = this.tail = new u(s, 0, 0), this.len = 0), this;
  }, f.prototype.ldelim = function () {
    var e = this.head,
      t = this.tail,
      n = this.len;
    return this.reset().uint32(n), n && (this.tail.next = e.next, this.tail = t, this.len += n), this;
  }, f.prototype.finish = function () {
    for (var e = this.head.next, t = this.constructor.alloc(this.len), n = 0; e;) e.fn(e.val, t, n), n += e.len, e = e.next;
    return t;
  }, f._configure = function (e) {
    r = e, f.create = d(), r._configure();
  };
},
9716: function (e, t, n) {
  "use strict";

  var r = t;
  function a(e, t, n) {
    for (var r = Object.keys(t), a = 0; a < r.length; ++a) void 0 !== e[r[a]] && n || (e[r[a]] = t[r[a]]);
    return e;
  }
  function l(e) {
    function t(e, n) {
      if (!(this instanceof t)) return new t(e, n);
      Object.defineProperty(this, "message", {
        get: function () {
          return e;
        }
      }), Error.captureStackTrace ? Error.captureStackTrace(this, t) : Object.defineProperty(this, "stack", {
        value: new Error().stack || ""
      }), n && a(this, n);
    }
    return t.prototype = Object.create(Error.prototype, {
      constructor: {
        value: t,
        writable: !0,
        enumerable: !1,
        configurable: !0
      },
      name: {
        get: function () {
          return e;
        },
        set: void 0,
        enumerable: !1,
        configurable: !0
      },
      toString: {
        value: function () {
          return this.name + ": " + this.message;
        },
        writable: !0,
        enumerable: !1,
        configurable: !0
      }
    }), t;
  }
  r.asPromise = n(7223), r.base64 = n(1938), r.EventEmitter = n(6597), r.float = n(2678), r.inquire = n(7640), r.utf8 = n(2842), r.pool = n(110), r.LongBits = n(6112), r.isNode = Boolean("undefined" !== typeof n.g && n.g && n.g.process && n.g.process.versions && n.g.process.versions.node), r.global = r.isNode && n.g || "undefined" !== typeof window && window || "undefined" !== typeof self && self || this, r.emptyArray = Object.freeze ? Object.freeze([]) : [], r.emptyObject = Object.freeze ? Object.freeze({}) : {}, r.isInteger = Number.isInteger || function (e) {
    return "number" === typeof e && isFinite(e) && Math.floor(e) === e;
  }, r.isString = function (e) {
    return "string" === typeof e || e instanceof String;
  }, r.isObject = function (e) {
    return e && "object" === typeof e;
  }, r.isset = r.isSet = function (e, t) {
    var n = e[t];
    return !(null == n || !e.hasOwnProperty(t)) && ("object" !== typeof n || (Array.isArray(n) ? n.length : Object.keys(n).length) > 0);
  }, r.Buffer = function () {
    try {
      var e = r.inquire("buffer").Buffer;
      return e.prototype.utf8Write ? e : null;
    } catch (t) {
      return null;
    }
  }(), r._Buffer_from = null, r._Buffer_allocUnsafe = null, r.newBuffer = function (e) {
    return "number" === typeof e ? r.Buffer ? r._Buffer_allocUnsafe(e) : new r.Array(e) : r.Buffer ? r._Buffer_from(e) : "undefined" === typeof Uint8Array ? e : new Uint8Array(e);
  }, r.Array = "undefined" !== typeof Uint8Array ? Uint8Array : Array, r.Long = r.global.dcodeIO && r.global.dcodeIO.Long || r.global.Long || r.inquire("long"), r.key2Re = /^true|false|0|1$/, r.key32Re = /^-?(?:0|[1-9][0-9]*)$/, r.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/, r.longToHash = function (e) {
    return e ? r.LongBits.from(e).toHash() : r.LongBits.zeroHash;
  }, r.longFromHash = function (e, t) {
    var n = r.LongBits.fromHash(e);
    return r.Long ? r.Long.fromBits(n.lo, n.hi, t) : n.toNumber(Boolean(t));
  }, r.merge = a, r.lcFirst = function (e) {
    return e.charAt(0).toLowerCase() + e.substring(1);
  }, r.newError = l, r.ProtocolError = l("ProtocolError"), r.oneOfGetter = function (e) {
    for (var t = {}, n = 0; n < e.length; ++n) t[e[n]] = 1;
    return function () {
      for (var e = Object.keys(this), n = e.length - 1; n > -1; --n) if (1 === t[e[n]] && void 0 !== this[e[n]] && null !== this[e[n]]) return e[n];
    };
  }, r.oneOfSetter = function (e) {
    return function (t) {
      for (var n = 0; n < e.length; ++n) e[n] !== t && delete this[e[n]];
    };
  }, r.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String,
    json: !0
  }, r._configure = function () {
    var e = r.Buffer;
    e ? (r._Buffer_from = e.from !== Uint8Array.from && e.from || function (t, n) {
      return new e(t, n);
    }, r._Buffer_allocUnsafe = e.allocUnsafe || function (t) {
      return new e(t);
    }) : r._Buffer_from = r._Buffer_allocUnsafe = null;
  };
},
7223: function (e) {
  "use strict";

  e.exports = function (e, t) {
    var n = new Array(arguments.length - 1),
      r = 0,
      a = 2,
      l = !0;
    for (; a < arguments.length;) n[r++] = arguments[a++];
    return new Promise(function (a, o) {
      n[r] = function (e) {
        if (l) if (l = !1, e) o(e);else {
          for (var t = new Array(arguments.length - 1), n = 0; n < t.length;) t[n++] = arguments[n];
          a.apply(null, t);
        }
      };
      try {
        e.apply(t || null, n);
      } catch (i) {
        l && (l = !1, o(i));
      }
    });
  };
},
1938: function (e, t) {
  "use strict";

  var n = t;
  n.length = function (e) {
    var t = e.length;
    if (!t) return 0;
    for (var n = 0; --t % 4 > 1 && "=" === e.charAt(t);) ++n;
    return Math.ceil(3 * e.length) / 4 - n;
  };
  for (var r = new Array(64), a = new Array(123), l = 0; l < 64;) a[r[l] = l < 26 ? l + 65 : l < 52 ? l + 71 : l < 62 ? l - 4 : l - 59 | 43] = l++;
  n.encode = function (e, t, n) {
    for (var a, l = null, o = [], i = 0, u = 0; t < n;) {
      var s = e[t++];
      switch (u) {
        case 0:
          o[i++] = r[s >> 2], a = (3 & s) << 4, u = 1;
          break;
        case 1:
          o[i++] = r[a | s >> 4], a = (15 & s) << 2, u = 2;
          break;
        case 2:
          o[i++] = r[a | s >> 6], o[i++] = r[63 & s], u = 0;
      }
      i > 8191 && ((l || (l = [])).push(String.fromCharCode.apply(String, o)), i = 0);
    }
    return u && (o[i++] = r[a], o[i++] = 61, 1 === u && (o[i++] = 61)), l ? (i && l.push(String.fromCharCode.apply(String, o.slice(0, i))), l.join("")) : String.fromCharCode.apply(String, o.slice(0, i));
  };
  var o = "invalid encoding";
  n.decode = function (e, t, n) {
    for (var r, l = n, i = 0, u = 0; u < e.length;) {
      var s = e.charCodeAt(u++);
      if (61 === s && i > 1) break;
      if (void 0 === (s = a[s])) throw Error(o);
      switch (i) {
        case 0:
          r = s, i = 1;
          break;
        case 1:
          t[n++] = r << 2 | (48 & s) >> 4, r = s, i = 2;
          break;
        case 2:
          t[n++] = (15 & r) << 4 | (60 & s) >> 2, r = s, i = 3;
          break;
        case 3:
          t[n++] = (3 & r) << 6 | s, i = 0;
      }
    }
    if (1 === i) throw Error(o);
    return n - l;
  }, n.test = function (e) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(e);
  };
},
6597: function (e) {
  "use strict";

  function t() {
    this._listeners = {};
  }
  e.exports = t, t.prototype.on = function (e, t, n) {
    return (this._listeners[e] || (this._listeners[e] = [])).push({
      fn: t,
      ctx: n || this
    }), this;
  }, t.prototype.off = function (e, t) {
    if (void 0 === e) this._listeners = {};else if (void 0 === t) this._listeners[e] = [];else for (var n = this._listeners[e], r = 0; r < n.length;) n[r].fn === t ? n.splice(r, 1) : ++r;
    return this;
  }, t.prototype.emit = function (e) {
    var t = this._listeners[e];
    if (t) {
      for (var n = [], r = 1; r < arguments.length;) n.push(arguments[r++]);
      for (r = 0; r < t.length;) t[r].fn.apply(t[r++].ctx, n);
    }
    return this;
  };
},
2678: function (e) {
  "use strict";

  function t(e) {
    return "undefined" !== typeof Float32Array ? function () {
      var t = new Float32Array([-0]),
        n = new Uint8Array(t.buffer),
        r = 128 === n[3];
      function a(e, r, a) {
        t[0] = e, r[a] = n[0], r[a + 1] = n[1], r[a + 2] = n[2], r[a + 3] = n[3];
      }
      function l(e, r, a) {
        t[0] = e, r[a] = n[3], r[a + 1] = n[2], r[a + 2] = n[1], r[a + 3] = n[0];
      }
      function o(e, r) {
        return n[0] = e[r], n[1] = e[r + 1], n[2] = e[r + 2], n[3] = e[r + 3], t[0];
      }
      function i(e, r) {
        return n[3] = e[r], n[2] = e[r + 1], n[1] = e[r + 2], n[0] = e[r + 3], t[0];
      }
      e.writeFloatLE = r ? a : l, e.writeFloatBE = r ? l : a, e.readFloatLE = r ? o : i, e.readFloatBE = r ? i : o;
    }() : function () {
      function t(e, t, n, r) {
        var a = t < 0 ? 1 : 0;
        if (a && (t = -t), 0 === t) e(1 / t > 0 ? 0 : 2147483648, n, r);else if (isNaN(t)) e(2143289344, n, r);else if (t > 34028234663852886e22) e((a << 31 | 2139095040) >>> 0, n, r);else if (t < 11754943508222875e-54) e((a << 31 | Math.round(t / 1401298464324817e-60)) >>> 0, n, r);else {
          var l = Math.floor(Math.log(t) / Math.LN2);
          e((a << 31 | l + 127 << 23 | 8388607 & Math.round(t * Math.pow(2, -l) * 8388608)) >>> 0, n, r);
        }
      }
      function o(e, t, n) {
        var r = e(t, n),
          a = 2 * (r >> 31) + 1,
          l = r >>> 23 & 255,
          o = 8388607 & r;
        return 255 === l ? o ? NaN : a * (1 / 0) : 0 === l ? 1401298464324817e-60 * a * o : a * Math.pow(2, l - 150) * (o + 8388608);
      }
      e.writeFloatLE = t.bind(null, n), e.writeFloatBE = t.bind(null, r), e.readFloatLE = o.bind(null, a), e.readFloatBE = o.bind(null, l);
    }(), "undefined" !== typeof Float64Array ? function () {
      var t = new Float64Array([-0]),
        n = new Uint8Array(t.buffer),
        r = 128 === n[7];
      function a(e, r, a) {
        t[0] = e, r[a] = n[0], r[a + 1] = n[1], r[a + 2] = n[2], r[a + 3] = n[3], r[a + 4] = n[4], r[a + 5] = n[5], r[a + 6] = n[6], r[a + 7] = n[7];
      }
      function l(e, r, a) {
        t[0] = e, r[a] = n[7], r[a + 1] = n[6], r[a + 2] = n[5], r[a + 3] = n[4], r[a + 4] = n[3], r[a + 5] = n[2], r[a + 6] = n[1], r[a + 7] = n[0];
      }
      function o(e, r) {
        return n[0] = e[r], n[1] = e[r + 1], n[2] = e[r + 2], n[3] = e[r + 3], n[4] = e[r + 4], n[5] = e[r + 5], n[6] = e[r + 6], n[7] = e[r + 7], t[0];
      }
      function i(e, r) {
        return n[7] = e[r], n[6] = e[r + 1], n[5] = e[r + 2], n[4] = e[r + 3], n[3] = e[r + 4], n[2] = e[r + 5], n[1] = e[r + 6], n[0] = e[r + 7], t[0];
      }
      e.writeDoubleLE = r ? a : l, e.writeDoubleBE = r ? l : a, e.readDoubleLE = r ? o : i, e.readDoubleBE = r ? i : o;
    }() : function () {
      function t(e, t, n, r, a, l) {
        var o = r < 0 ? 1 : 0;
        if (o && (r = -r), 0 === r) e(0, a, l + t), e(1 / r > 0 ? 0 : 2147483648, a, l + n);else if (isNaN(r)) e(0, a, l + t), e(2146959360, a, l + n);else if (r > 17976931348623157e292) e(0, a, l + t), e((o << 31 | 2146435072) >>> 0, a, l + n);else {
          var i;
          if (r < 22250738585072014e-324) e((i = r / 5e-324) >>> 0, a, l + t), e((o << 31 | i / 4294967296) >>> 0, a, l + n);else {
            var u = Math.floor(Math.log(r) / Math.LN2);
            1024 === u && (u = 1023), e(4503599627370496 * (i = r * Math.pow(2, -u)) >>> 0, a, l + t), e((o << 31 | u + 1023 << 20 | 1048576 * i & 1048575) >>> 0, a, l + n);
          }
        }
      }
      function o(e, t, n, r, a) {
        var l = e(r, a + t),
          o = e(r, a + n),
          i = 2 * (o >> 31) + 1,
          u = o >>> 20 & 2047,
          s = 4294967296 * (1048575 & o) + l;
        return 2047 === u ? s ? NaN : i * (1 / 0) : 0 === u ? 5e-324 * i * s : i * Math.pow(2, u - 1075) * (s + 4503599627370496);
      }
      e.writeDoubleLE = t.bind(null, n, 0, 4), e.writeDoubleBE = t.bind(null, r, 4, 0), e.readDoubleLE = o.bind(null, a, 0, 4), e.readDoubleBE = o.bind(null, l, 4, 0);
    }(), e;
  }
  function n(e, t, n) {
    t[n] = 255 & e, t[n + 1] = e >>> 8 & 255, t[n + 2] = e >>> 16 & 255, t[n + 3] = e >>> 24;
  }
  function r(e, t, n) {
    t[n] = e >>> 24, t[n + 1] = e >>> 16 & 255, t[n + 2] = e >>> 8 & 255, t[n + 3] = 255 & e;
  }
  function a(e, t) {
    return (e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24) >>> 0;
  }
  function l(e, t) {
    return (e[t] << 24 | e[t + 1] << 16 | e[t + 2] << 8 | e[t + 3]) >>> 0;
  }
  e.exports = t(t);
},
7640: function (module) {
  module.exports = function (name) {
    return name === "buffer" && typeof Buffer !== "undefined" ? {
      Buffer
    } : null;
  };
},
2842: function (e, t) {
  "use strict";

  var n = t;
  n.length = function (e) {
    for (var t = 0, n = 0, r = 0; r < e.length; ++r) (n = e.charCodeAt(r)) < 128 ? t += 1 : n < 2048 ? t += 2 : 55296 === (64512 & n) && 56320 === (64512 & e.charCodeAt(r + 1)) ? (++r, t += 4) : t += 3;
    return t;
  }, n.read = function (e, t, n) {
    if (n - t < 1) return "";
    for (var r, a = null, l = [], o = 0; t < n;) (r = e[t++]) < 128 ? l[o++] = r : r > 191 && r < 224 ? l[o++] = (31 & r) << 6 | 63 & e[t++] : r > 239 && r < 365 ? (r = ((7 & r) << 18 | (63 & e[t++]) << 12 | (63 & e[t++]) << 6 | 63 & e[t++]) - 65536, l[o++] = 55296 + (r >> 10), l[o++] = 56320 + (1023 & r)) : l[o++] = (15 & r) << 12 | (63 & e[t++]) << 6 | 63 & e[t++], o > 8191 && ((a || (a = [])).push(String.fromCharCode.apply(String, l)), o = 0);
    return a ? (o && a.push(String.fromCharCode.apply(String, l.slice(0, o))), a.join("")) : String.fromCharCode.apply(String, l.slice(0, o));
  }, n.write = function (e, t, n) {
    for (var r, a, l = n, o = 0; o < e.length; ++o) (r = e.charCodeAt(o)) < 128 ? t[n++] = r : r < 2048 ? (t[n++] = r >> 6 | 192, t[n++] = 63 & r | 128) : 55296 === (64512 & r) && 56320 === (64512 & (a = e.charCodeAt(o + 1))) ? (r = 65536 + ((1023 & r) << 10) + (1023 & a), ++o, t[n++] = r >> 18 | 240, t[n++] = r >> 12 & 63 | 128, t[n++] = r >> 6 & 63 | 128, t[n++] = 63 & r | 128) : (t[n++] = r >> 12 | 224, t[n++] = r >> 6 & 63 | 128, t[n++] = 63 & r | 128);
    return n - l;
  };
},
110: function (e) {
  "use strict";

  e.exports = function (e, t, n) {
    var r = n || 8192,
      a = r >>> 1,
      l = null,
      o = r;
    return function (n) {
      if (n < 1 || n > a) return e(n);
      o + n > r && (l = e(r), o = 0);
      var i = t.call(l, o, o += n);
      return 7 & o && (o = 1 + (7 | o)), i;
    };
  };
},
6112: function (e, t, n) {
  "use strict";

  e.exports = a;
  var r = n(9716);
  function a(e, t) {
    this.lo = e >>> 0, this.hi = t >>> 0;
  }
  var l = a.zero = new a(0, 0);
  l.toNumber = function () {
    return 0;
  }, l.zzEncode = l.zzDecode = function () {
    return this;
  }, l.length = function () {
    return 1;
  };
  var o = a.zeroHash = "\0\0\0\0\0\0\0\0";
  a.fromNumber = function (e) {
    if (0 === e) return l;
    var t = e < 0;
    t && (e = -e);
    var n = e >>> 0,
      r = (e - n) / 4294967296 >>> 0;
    return t && (r = ~r >>> 0, n = ~n >>> 0, ++n > 4294967295 && (n = 0, ++r > 4294967295 && (r = 0))), new a(n, r);
  }, a.from = function (e) {
    if ("number" === typeof e) return a.fromNumber(e);
    if (r.isString(e)) {
      if (!r.Long) return a.fromNumber(parseInt(e, 10));
      e = r.Long.fromString(e);
    }
    return e.low || e.high ? new a(e.low >>> 0, e.high >>> 0) : l;
  }, a.prototype.toNumber = function (e) {
    if (!e && this.hi >>> 31) {
      var t = 1 + ~this.lo >>> 0,
        n = ~this.hi >>> 0;
      return t || (n = n + 1 >>> 0), -(t + 4294967296 * n);
    }
    return this.lo + 4294967296 * this.hi;
  }, a.prototype.toLong = function (e) {
    return r.Long ? new r.Long(0 | this.lo, 0 | this.hi, Boolean(e)) : {
      low: 0 | this.lo,
      high: 0 | this.hi,
      unsigned: Boolean(e)
    };
  };
  var i = String.prototype.charCodeAt;
  a.fromHash = function (e) {
    return e === o ? l : new a((i.call(e, 0) | i.call(e, 1) << 8 | i.call(e, 2) << 16 | i.call(e, 3) << 24) >>> 0, (i.call(e, 4) | i.call(e, 5) << 8 | i.call(e, 6) << 16 | i.call(e, 7) << 24) >>> 0);
  }, a.prototype.toHash = function () {
    return String.fromCharCode(255 & this.lo, this.lo >>> 8 & 255, this.lo >>> 16 & 255, this.lo >>> 24, 255 & this.hi, this.hi >>> 8 & 255, this.hi >>> 16 & 255, this.hi >>> 24);
  }, a.prototype.zzEncode = function () {
    var e = this.hi >> 31;
    return this.hi = ((this.hi << 1 | this.lo >>> 31) ^ e) >>> 0, this.lo = (this.lo << 1 ^ e) >>> 0, this;
  }, a.prototype.zzDecode = function () {
    var e = -(1 & this.lo);
    return this.lo = ((this.lo >>> 1 | this.hi << 31) ^ e) >>> 0, this.hi = (this.hi >>> 1 ^ e) >>> 0, this;
  }, a.prototype.length = function () {
    var e = this.lo,
      t = (this.lo >>> 28 | this.hi << 4) >>> 0,
      n = this.hi >>> 24;
    return 0 === n ? 0 === t ? e < 16384 ? e < 128 ? 1 : 2 : e < 2097152 ? 3 : 4 : t < 16384 ? t < 128 ? 5 : 6 : t < 2097152 ? 7 : 8 : n < 128 ? 9 : 10;
  };
},
2149: function (e, t, n) {
  "use strict";

  e.exports = l;
  var r = n(8050);
  (l.prototype = Object.create(r.prototype)).constructor = l;
  var a = n(9716);
  function l() {
    r.call(this);
  }
  function o(e, t, n) {
    e.length < 40 ? a.utf8.write(e, t, n) : t.utf8Write ? t.utf8Write(e, n) : t.write(e, n);
  }
  l._configure = function () {
    l.alloc = a._Buffer_allocUnsafe, l.writeBytesBuffer = a.Buffer && a.Buffer.prototype instanceof Uint8Array && "set" === a.Buffer.prototype.set.name ? function (e, t, n) {
      t.set(e, n);
    } : function (e, t, n) {
      if (e.copy) e.copy(t, n, 0, e.length);else for (var r = 0; r < e.length;) t[n++] = e[r++];
    };
  }, l.prototype.bytes = function (e) {
    a.isString(e) && (e = a._Buffer_from(e, "base64"));
    var t = e.length >>> 0;
    return this.uint32(t), t && this._push(l.writeBytesBuffer, t, e), this;
  }, l.prototype.string = function (e) {
    var t = a.Buffer.byteLength(e);
    return this.uint32(t), t && this._push(o, t, e), this;
  }, l._configure();
},
2422: function (e, t, n) {
  "use strict";

  e.exports = u;
  var r,
    a = n(9716),
    l = a.LongBits,
    o = a.utf8;
  function i(e, t) {
    return RangeError("index out of range: " + e.pos + " + " + (t || 1) + " > " + e.len);
  }
  function u(e) {
    this.buf = e, this.pos = 0, this.len = e.length;
  }
  var s = "undefined" !== typeof Uint8Array ? function (e) {
      if (e instanceof Uint8Array || Array.isArray(e)) return new u(e);
      throw Error("illegal buffer");
    } : function (e) {
      if (Array.isArray(e)) return new u(e);
      throw Error("illegal buffer");
    },
    c = function () {
      return a.Buffer ? function (e) {
        return (u.create = function (e) {
          return a.Buffer.isBuffer(e) ? new r(e) : s(e);
        })(e);
      } : s;
    };
  function f() {
    var e = new l(0, 0),
      t = 0;
    if (!(this.len - this.pos > 4)) {
      for (; t < 3; ++t) {
        if (this.pos >= this.len) throw i(this);
        if (e.lo = (e.lo | (127 & this.buf[this.pos]) << 7 * t) >>> 0, this.buf[this.pos++] < 128) return e;
      }
      return e.lo = (e.lo | (127 & this.buf[this.pos++]) << 7 * t) >>> 0, e;
    }
    for (; t < 4; ++t) if (e.lo = (e.lo | (127 & this.buf[this.pos]) << 7 * t) >>> 0, this.buf[this.pos++] < 128) return e;
    if (e.lo = (e.lo | (127 & this.buf[this.pos]) << 28) >>> 0, e.hi = (e.hi | (127 & this.buf[this.pos]) >> 4) >>> 0, this.buf[this.pos++] < 128) return e;
    if (t = 0, this.len - this.pos > 4) {
      for (; t < 5; ++t) if (e.hi = (e.hi | (127 & this.buf[this.pos]) << 7 * t + 3) >>> 0, this.buf[this.pos++] < 128) return e;
    } else for (; t < 5; ++t) {
      if (this.pos >= this.len) throw i(this);
      if (e.hi = (e.hi | (127 & this.buf[this.pos]) << 7 * t + 3) >>> 0, this.buf[this.pos++] < 128) return e;
    }
    throw Error("invalid varint encoding");
  }
  function d(e, t) {
    return (e[t - 4] | e[t - 3] << 8 | e[t - 2] << 16 | e[t - 1] << 24) >>> 0;
  }
  function p() {
    if (this.pos + 8 > this.len) throw i(this, 8);
    return new l(d(this.buf, this.pos += 4), d(this.buf, this.pos += 4));
  }
  u.create = c(), u.prototype._slice = a.Array.prototype.subarray || a.Array.prototype.slice, u.prototype.uint32 = function () {
    var e = 4294967295;
    return function () {
      if (e = (127 & this.buf[this.pos]) >>> 0, this.buf[this.pos++] < 128) return e;
      if (e = (e | (127 & this.buf[this.pos]) << 7) >>> 0, this.buf[this.pos++] < 128) return e;
      if (e = (e | (127 & this.buf[this.pos]) << 14) >>> 0, this.buf[this.pos++] < 128) return e;
      if (e = (e | (127 & this.buf[this.pos]) << 21) >>> 0, this.buf[this.pos++] < 128) return e;
      if (e = (e | (15 & this.buf[this.pos]) << 28) >>> 0, this.buf[this.pos++] < 128) return e;
      if ((this.pos += 5) > this.len) throw this.pos = this.len, i(this, 10);
      return e;
    };
  }(), u.prototype.int32 = function () {
    return 0 | this.uint32();
  }, u.prototype.sint32 = function () {
    var e = this.uint32();
    return e >>> 1 ^ -(1 & e) | 0;
  }, u.prototype.bool = function () {
    return 0 !== this.uint32();
  }, u.prototype.fixed32 = function () {
    if (this.pos + 4 > this.len) throw i(this, 4);
    return d(this.buf, this.pos += 4);
  }, u.prototype.sfixed32 = function () {
    if (this.pos + 4 > this.len) throw i(this, 4);
    return 0 | d(this.buf, this.pos += 4);
  }, u.prototype.float = function () {
    if (this.pos + 4 > this.len) throw i(this, 4);
    var e = a.float.readFloatLE(this.buf, this.pos);
    return this.pos += 4, e;
  }, u.prototype.double = function () {
    if (this.pos + 8 > this.len) throw i(this, 4);
    var e = a.float.readDoubleLE(this.buf, this.pos);
    return this.pos += 8, e;
  }, u.prototype.bytes = function () {
    var e = this.uint32(),
      t = this.pos,
      n = this.pos + e;
    if (n > this.len) throw i(this, e);
    return this.pos += e, Array.isArray(this.buf) ? this.buf.slice(t, n) : t === n ? new this.buf.constructor(0) : this._slice.call(this.buf, t, n);
  }, u.prototype.string = function () {
    var e = this.bytes();
    return o.read(e, 0, e.length);
  }, u.prototype.skip = function (e) {
    if ("number" === typeof e) {
      if (this.pos + e > this.len) throw i(this, e);
      this.pos += e;
    } else do {
      if (this.pos >= this.len) throw i(this);
    } while (128 & this.buf[this.pos++]);
    return this;
  }, u.prototype.skipType = function (e) {
    switch (e) {
      case 0:
        this.skip();
        break;
      case 1:
        this.skip(8);
        break;
      case 2:
        this.skip(this.uint32());
        break;
      case 3:
        for (; 4 !== (e = 7 & this.uint32());) this.skipType(e);
        break;
      case 5:
        this.skip(4);
        break;
      default:
        throw Error("invalid wire type " + e + " at offset " + this.pos);
    }
    return this;
  }, u._configure = function (e) {
    r = e, u.create = c(), r._configure();
    var t = a.Long ? "toLong" : "toNumber";
    a.merge(u.prototype, {
      int64: function () {
        return f.call(this)[t](!1);
      },
      uint64: function () {
        return f.call(this)[t](!0);
      },
      sint64: function () {
        return f.call(this).zzDecode()[t](!1);
      },
      fixed64: function () {
        return p.call(this)[t](!0);
      },
      sfixed64: function () {
        return p.call(this)[t](!1);
      }
    });
  };
},
4148: function (e, t, n) {
  "use strict";

  e.exports = l;
  var r = n(2422);
  (l.prototype = Object.create(r.prototype)).constructor = l;
  var a = n(9716);
  function l(e) {
    r.call(this, e);
  }
  l._configure = function () {
    a.Buffer && (l.prototype._slice = a.Buffer.prototype.slice);
  }, l.prototype.string = function () {
    var e = this.uint32();
    return this.buf.utf8Slice ? this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + e, this.len)) : this.buf.toString("utf-8", this.pos, this.pos = Math.min(this.pos + e, this.len));
  }, l._configure();
},
7523: function (e, t, n) {
  "use strict";

  t.Service = n(1331);
},
1331: function (e, t, n) {
  "use strict";

  e.exports = a;
  var r = n(9716);
  function a(e, t, n) {
    if ("function" !== typeof e) throw TypeError("rpcImpl must be a function");
    r.EventEmitter.call(this), this.rpcImpl = e, this.requestDelimited = Boolean(t), this.responseDelimited = Boolean(n);
  }
  (a.prototype = Object.create(r.EventEmitter.prototype)).constructor = a, a.prototype.rpcCall = function e(t, n, a, l, o) {
    if (!l) throw TypeError("request must be specified");
    var i = this;
    if (!o) return r.asPromise(e, i, t, n, a, l);
    if (i.rpcImpl) try {
      return i.rpcImpl(t, n[i.requestDelimited ? "encodeDelimited" : "encode"](l).finish(), function (e, n) {
        if (e) return i.emit("error", e, t), o(e);
        if (null !== n) {
          if (!(n instanceof a)) try {
            n = a[i.responseDelimited ? "decodeDelimited" : "decode"](n);
          } catch (e) {
            return i.emit("error", e, t), o(e);
          }
          return i.emit("data", n, t), o(null, n);
        }
        i.end(!0);
      });
    } catch (u) {
      return i.emit("error", u, t), void setTimeout(function () {
        o(u);
      }, 0);
    } else setTimeout(function () {
      o(Error("already ended"));
    }, 0);
  }, a.prototype.end = function (e) {
    return this.rpcImpl && (e || this.rpcImpl(null, null, null), this.rpcImpl = null, this.emit("end").off()), this;
  };
},
3107: function (e) {
  "use strict";

  e.exports = {};
},
1124: function (n, e, t) {
  t.d(e, {
    Y7: function () {
      return v;
    },
    R$: function () {
      return b;
    },
    jp: function () {
      return rn;
    },
    QW: function () {
      return en;
    },
    au: function () {
      return z;
    },
    Us: function () {
      return J;
    },
    EL: function () {
      return U;
    },
    Wq: function () {
      return D;
    },
    s0: function () {
      return R;
    },
    Cs: function () {
      return T;
    },
    y5: function () {
      return W;
    },
    th: function () {
      return G;
    },
    kY: function () {
      return I;
    },
    fX: function () {
      return tn;
    },
    RJ: function () {
      return B;
    },
    my: function () {
      return E;
    },
    Q$: function () {
      return Q;
    },
    fU: function () {
      return F;
    },
    j7: function () {
      return Nn;
    },
    QU: function () {
      return M;
    },
    h: function () {
      return P;
    },
    t2: function () {
      return $;
    },
    g$: function () {
      return k;
    },
    h3: function () {
      return jn;
    },
    Bx: function () {
      return A;
    },
    fM: function () {
      return On;
    },
    M_: function () {
      return gn;
    },
    eq: function () {
      return kn;
    },
    gO: function () {
      return j;
    },
    LI: function () {
      return Cn;
    },
    lH: function () {
      return Zn;
    },
    Eg: function () {
      return xn;
    },
    qA: function () {
      return L;
    }
  });
  var r = t(1413),
    a = t(885),
    i = t(2982),
    c = t(7698),
    o = t(3797),
    l = t(3329),
    s = t(3515),
    u = t(4420);
  function d(n, e) {
    if (!(n instanceof e)) throw new TypeError("Cannot call a class as a function");
  }
  function f(n, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(n, r.key, r);
    }
  }
  function h(n, e, t) {
    return e && f(n.prototype, e), t && f(n, t), Object.defineProperty(n, "prototype", {
      writable: !1
    }), n;
  }
  var p = function () {
      function n() {
        d(this, n), this.bytes = [], this.current = 0, this.offset = 0;
      }
      return h(n, [{
        key: "write",
        value: function (n, e) {
          var t,
            r,
            c = (0, l.F)(this.current, this.offset, n, e),
            o = (0, a.Z)(c, 3);
          this.current = o[0], this.offset = o[1], r = o[2], (t = this.bytes).push.apply(t, (0, i.Z)(r));
        }
      }, {
        key: "choice",
        value: function (n, e) {
          var t, r;
          if (!Number.isInteger(n) || n < 0 || n >= e || e > 511) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u5019\u9009");
          var c = (0, l.p2)(this.current, this.offset, n, e),
            o = (0, a.Z)(c, 3);
          this.current = o[0], this.offset = o[1], r = o[2], (t = this.bytes).push.apply(t, (0, i.Z)(r));
        }
      }, {
        key: "count",
        value: function (n) {
          if (!Number.isSafeInteger(n) || n < 0) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u957f\u5ea6");
          do {
            var e = n % 128;
            n = Math.floor(n / 128), this.write(e | (n ? 128 : 0), 8);
          } while (n);
        }
      }, {
        key: "finish",
        value: function () {
          return Uint8Array.from(this.offset ? [].concat((0, i.Z)(this.bytes), [this.current]) : this.bytes);
        }
      }]), n;
    }(),
    m = function () {
      function n(e) {
        d(this, n), this.bytes = e, this.offset = 0;
      }
      return h(n, [{
        key: "read",
        value: function (n) {
          var e,
            t = (0, l.lS)(this.bytes, this.offset, n),
            r = (0, a.Z)(t, 2);
          return e = r[0], this.offset = r[1], e;
        }
      }, {
        key: "choice",
        value: function (n) {
          if (!Number.isInteger(n) || n < 1 || n > 511) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u5019\u9009");
          var e,
            t = (0, l.Su)(this.bytes, this.offset, n),
            r = (0, a.Z)(t, 2);
          return e = r[0], this.offset = r[1], e;
        }
      }, {
        key: "count",
        value: function () {
          for (var n = 0, e = 1, t = 0; t < 5; t++) {
            var r = this.read(8);
            if (n += (127 & r) * e, !(128 & r)) {
              if (t && !(127 & r)) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u957f\u5ea6");
              return n;
            }
            e *= 128;
          }
          throw new Error("\u590d\u76d8\u957f\u5ea6\u8fc7\u5927");
        }
      }, {
        key: "finish",
        value: function () {
          var n = 8 * this.bytes.length - this.offset;
          if (n >= 8 || n && this.read(n)) throw new Error("\u590d\u76d8\u5b58\u5728\u591a\u4f59\u6570\u636e");
        }
      }]), n;
    }(),
    v = 8,
    b = 4095,
    y = function (n) {
      return n.reduce(function (n, e) {
        return n + e;
      }, 0);
    },
    w = function (n, e) {
      var t,
        r = [],
        c = 0,
        o = 0;
      return [n].concat((0, i.Z)(e)).forEach(function (n) {
        for (var e = 0; e < 6; e++) {
          var s = (0, l.F)(c, o, n[e], 3),
            u = (0, a.Z)(s, 3);
          c = u[0], o = u[1], t = u[2], r.push.apply(r, (0, i.Z)(t));
        }
      }), o && r.push(c), Uint8Array.from(r);
    },
    g = function (n) {
      var e,
        t = [],
        r = 0,
        c = 0,
        o = function (n, o) {
          var s = (0, l.F)(r, c, n, o),
            u = (0, a.Z)(s, 3);
          r = u[0], c = u[1], e = u[2], t.push.apply(t, (0, i.Z)(e));
        };
      return o(n.pt >> 16 & 15, 4), o(n.pt >> 8 & 255, 8), o(255 & n.pt, 8), n.playerGem.forEach(function (e, t) {
        var r = Math.min(n.costs[t] || 0, b);
        o(r >> 8 & 15, 4), o(255 & r, 8);
      }), o(null === n.ptOwner ? 0 : n.ptOwner + 1, 3), c && t.push(r), Uint8Array.from(t);
    },
    x = function (n, e) {
      if (!n || n.length < function (n) {
        return Math.ceil((20 + 12 * n + 3) / 8);
      }(e)) return {
        pt: 0,
        costs: new Array(e).fill(0),
        ptOwner: null
      };
      var t,
        r = 0,
        i = function (e) {
          var i = (0, l.lS)(n, r, e),
            c = (0, a.Z)(i, 2);
          return t = c[0], r = c[1], t;
        },
        c = i(4) << 16;
      c |= i(8) << 8, c |= i(8);
      for (var o = [], s = 0; s < e; s++) {
        var u = i(4);
        o.push(u << 8 | i(8));
      }
      var d = i(3);
      return {
        pt: c,
        costs: o,
        ptOwner: d && d - 1 < e ? d - 1 : null
      };
    },
    k = function (n) {
      return n.winner.length ? null : n.waitFor;
    },
    j = function (n, e, t) {
      if (e.enableCt) {
        var r = Math.min(Math.floor(t / 1e3), 1048575);
        if (null !== e.ptOwner) {
          var a = Math.max(0, r - e.pt);
          n.costs[e.ptOwner] = Math.min(n.costs[e.ptOwner] + a, b);
        }
        n.pt = r, n.ptOwner = k(e);
      }
    },
    N = function (n) {
      var e = new Set();
      n.bankCard.forEach(function (n) {
        return n.forEach(function (n) {
          return n && e.add(n - 1);
        });
      }), n.playerCard.forEach(function (n) {
        return n.forEach(function (n) {
          return e.add(n);
        });
      }), n.playerBooked.forEach(function (n) {
        return n.forEach(function (n) {
          return e.add(n);
        });
      });
      for (var t = [[], [], []], r = 0; r < 90; r++) e.has(r) || t[o.XO[r]].push(r);
      return t;
    },
    C = function (n, e) {
      var t = [0, 0, 0, 0, 0];
      n.playerCard[e].forEach(function (n) {
        t[o.dS[n]] += 1;
      });
      var r = [];
      return n.bankNoble.forEach(function (n, e) {
        n && o.Hf[n - 1].every(function (n, e) {
          return t[e] >= n;
        }) && r.push(e);
      }), r;
    },
    O = function (n) {
      var e;
      if (n.playerCard.forEach(function (n) {
        return n.sort(function (n, e) {
          return n - e;
        });
      }), n.playerBooked.forEach(function (n) {
        return n.sort(function (n, e) {
          return n - e;
        });
      }), n.playerNoble.forEach(function (n) {
        return n.sort(function (n, e) {
          return n - e;
        });
      }), n.lastOp = {
        type: (e = n.lastOp).type || 0,
        playerId: e.playerId || 0,
        card: e.card || 0,
        cardPos: e.cardPos || 0,
        noble: e.noble || [],
        noblePos: e.noblePos || [],
        gemDelta: e.gemDelta || []
      }, n.playerCardCount = n.playerCard.map(function (n) {
        var e = [0, 0, 0, 0, 0];
        return n.forEach(function (n) {
          e[o.dS[n]] += 1;
        }), e;
      }), n.playerScore = n.playerCard.map(function (e, t) {
        return y(e.map(function (n) {
          return o.KI[n];
        })) + 3 * n.playerNoble[t].length;
      }), n.bankLeftCard = N(n), n.bankLeftCardCount = n.bankLeftCard.map(function (n) {
        return n.length;
      }), n.nobleCandidates = C(n, n.waitFor), n.winner = [], n.lastTurn = !1, n.playerScore.some(function (n) {
        return n >= 15;
      })) if (n.waitFor || n.waitThrowing || n.waitNoble) n.lastTurn = !0;else {
        var t = n.playerScore.map(function (e, t) {
            return e >= 15 ? e - .01 * y(n.playerCardCount[t]) : -1;
          }),
          r = Math.max.apply(Math, (0, i.Z)(t));
        n.winner = t.map(function (n, e) {
          return n === r ? e + 1 : 0;
        }).filter(Boolean);
      }
    },
    Z = function (n) {
      return JSON.parse(JSON.stringify(n));
    },
    E = function (n, e) {
      var t,
        r = function (n, e) {
          var t,
            r = 0,
            i = function () {
              for (var e = [], i = 0; i < 6; i++) {
                var c = (0, l.lS)(n, r, 3),
                  o = (0, a.Z)(c, 2);
                t = o[0], r = o[1], e.push(t);
              }
              return e;
            };
          return {
            bankGem: i(),
            playerGem: new Array(e).fill(0).map(i)
          };
        }(n.gem, e),
        i = r.bankGem,
        c = r.playerGem,
        s = x(n.ct, e),
        u = {
          waitFor: 3 & n.state,
          waitThrowing: !!(4 & n.state),
          waitNoble: !!(8 & n.state),
          bankGem: i,
          bankCard: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
          bankNoble: new Array(e + 1).fill(0),
          playerGem: c,
          playerCard: new Array(e).fill(0).map(function () {
            return [];
          }),
          playerBooked: new Array(e).fill(0).map(function () {
            return [];
          }),
          playerNoble: new Array(e).fill(0).map(function () {
            return [];
          }),
          lastOp: n.lastOp,
          initial: null,
          recordList: [],
          enableCt: n.ct && n.ct.length ? 1 : 0,
          costs: s.costs,
          pt: s.pt,
          ptOwner: s.ptOwner,
          bankLeftCard: [[], [], []],
          bankLeftCardCount: [0, 0, 0],
          playerScore: [],
          playerCardCount: [],
          nobleCandidates: [],
          winner: [],
          lastTurn: !1
        };
      if (n.cardList.forEach(function (n, e) {
        8 & n ? 4 & n || (u.bankCard[o.XO[e]][3 & n] = e + 1) : 4 & n ? u.playerCard[3 & n].push(e) : u.playerBooked[3 & n].push(e);
      }), n.nobleList.forEach(function (n, e) {
        16 & n ? 8 & n || (u.bankNoble[7 & n] = e + 1) : u.playerNoble[7 & n].push(e);
      }), O(u), null !== (t = n.initial) && void 0 !== t && t.length) try {
        var d = pn(n.initial, e),
          f = wn(n.records || new Uint8Array(), d, e);
        on(u) === on(f) && (u.initial = d, u.recordList = f.recordList);
      } catch (h) {}
      return u;
    },
    L = function (n) {
      var e = new Array(90).fill(12),
        t = new Array(10).fill(24);
      return n.bankCard.forEach(function (n) {
        return n.forEach(function (n, t) {
          n && (e[n - 1] = 8 | t);
        });
      }), n.bankNoble.forEach(function (n, e) {
        n && (t[n - 1] = 16 | e);
      }), n.playerBooked.forEach(function (n, t) {
        return n.forEach(function (n) {
          e[n] = t;
        });
      }), n.playerCard.forEach(function (n, t) {
        return n.forEach(function (n) {
          e[n] = 4 | t;
        });
      }), n.playerNoble.forEach(function (n, e) {
        return n.forEach(function (n) {
          t[n] = e;
        });
      }), {
        state: n.waitFor | (n.waitThrowing ? 4 : 0) | (n.waitNoble ? 8 : 0),
        cardList: e,
        nobleList: t,
        gem: w(n.bankGem, n.playerGem),
        lastOp: n.lastOp,
        ct: n.enableCt ? g(n) : void 0,
        initial: n.initial ? hn(n.initial, n.playerGem.length) : void 0,
        records: n.initial ? yn(n.initial, n.recordList, n.playerGem.length) : void 0
      };
    },
    A = function (n, e) {
      var t = n.playerList.length,
        r = 0;
      if (e && e.length) try {
        var a;
        r = null !== (a = s.d4.decode(e).ct) && void 0 !== a && a.length ? 1 : 0;
      } catch (i) {
        r = 0;
      }
      return L(I(t, void 0, r));
    },
    I = function (n, e) {
      var t = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0;
      if (![2, 3, 4].includes(n)) throw new Error("\u7480\u74a8\u5b9d\u77f3\u9700\u8981 2 \u81f3 4 \u4eba");
      var r = e ? [] : (0, u.T)(new Array(10).fill(0).map(function (n, e) {
          return e;
        })),
        a = {
          2: 4,
          3: 5
        }[n] || 7,
        o = {
          waitFor: 0,
          waitThrowing: !1,
          waitNoble: !1,
          bankGem: [a, a, a, a, a, 5],
          bankCard: e ? e.bankCard.map(function (n) {
            return (0, i.Z)(n);
          }) : [0, 1, 2].map(function (n) {
            var e = (0, u.T)(new Array([40, 30, 20][n]).fill(0).map(function (n, e) {
                return e;
              })),
              t = [8, 6, 4][n],
              r = [0, 8, 14][n];
            return new Array(4).fill(0).map(function (n, a) {
              return 18 * Math.floor(e[a] / t) + e[a] % t + r + 1;
            });
          }),
          bankNoble: e ? (0, i.Z)(e.bankNoble) : new Array(n + 1).fill(0).map(function (n, e) {
            return r[e] + 1;
          }),
          playerGem: new Array(n).fill(0).map(function () {
            return [0, 0, 0, 0, 0, 0];
          }),
          playerCard: new Array(n).fill(0).map(function () {
            return [];
          }),
          playerBooked: new Array(n).fill(0).map(function () {
            return [];
          }),
          playerNoble: new Array(n).fill(0).map(function () {
            return [];
          }),
          lastOp: {
            type: c.W.NULL
          },
          initial: null,
          recordList: [],
          enableCt: t,
          costs: new Array(n).fill(0),
          pt: 0,
          ptOwner: null,
          bankLeftCard: [[], [], []],
          bankLeftCardCount: [0, 0, 0],
          playerScore: [],
          playerCardCount: [],
          nobleCandidates: [],
          winner: [],
          lastTurn: !1
        };
      return o.initial = {
        bankCard: o.bankCard.map(function (n) {
          return (0, i.Z)(n);
        }),
        bankNoble: (0, i.Z)(o.bankNoble)
      }, O(o), o;
    },
    B = function (n) {
      return n.map(function (n, e) {
        return n ? "".concat(n).concat("\u767d\u84dd\u7eff\u7ea2\u9ed1\u91d1"[e]) : "";
      }).join("");
    },
    S = function (n, e, t) {
      var r = n.playerCardCount[t];
      return o.s2[e].map(function (n, e) {
        return Math.max(0, n - r[e]);
      });
    },
    F = function (n, e, t) {
      var r = n.playerGem[t],
        a = S(n, e, t),
        i = a.map(function (n, e) {
          return Math.max(0, n - r[e]);
        }),
        c = a.map(function (n, e) {
          return Math.min(r[e], n);
        }),
        o = y(i),
        l = r[5] >= o;
      return {
        need: i,
        spend: c,
        needGold: o,
        enough: l,
        hasChoice: l && r[5] > o && y(c) > 0
      };
    },
    P = function (n, e, t) {
      var r = n.playerGem[t],
        a = S(n, e, t),
        i = [],
        c = [0, 0, 0, 0, 0];
      return function n(e, t) {
        if (5 !== e) {
          for (var o = Math.max(0, a[e] - r[e]), l = Math.min(a[e], t); l >= o; l--) c[e] = l, n(e + 1, t - l);
          c[e] = 0;
        } else i.push({
          spend: a.map(function (n, e) {
            return n - c[e];
          }),
          gold: y(c)
        });
      }(0, r[5]), i.sort(function (n, e) {
        return n.gold - e.gold;
      });
    },
    G = function (n, e, t) {
      if (5 === t) return "\u4e0d\u53ef\u4ee5\u62ff\u9ec4\u91d1\uff0c\u9ec4\u91d1\u53ea\u80fd\u901a\u8fc7\u9884\u5b9a\u53d1\u5c55\u5361\u83b7\u53d6";
      if (e.length > 2) return "\u6700\u591a\u62ff3\u4e2a\u5b9d\u77f3";
      if (e.length > 1 && e[0] === e[1]) return "\u82e5\u62ff\u76f8\u540c\u5b9d\u77f3\uff0c\u603b\u5171\u53ea\u80fd\u62ff2\u4e2a";
      if (e.length > 1 && e.includes(t)) return "\u53ea\u80fd\u62ff3\u4e2a\u4e0d\u540c\u5b9d\u77f3\u62162\u4e2a\u76f8\u540c\u5b9d\u77f3";
      var r = n.bankGem[t] - e.filter(function (n) {
        return n === t;
      }).length;
      return 1 === e.length && e[0] === t && r < 3 ? "\u94f6\u884c\u8be5\u5b9d\u77f3\u6570\u91cf\u4e0d\u8db34\uff0c\u4e0d\u5141\u8bb8\u62ff2\u4e2a\u8be5\u5b9d\u77f3" : r ? "" : "\u8be5\u5b9d\u77f3\u62ff\u5b8c\u4e86";
    },
    M = function (n, e) {
      return y(n.playerGem[e]) - 10;
    },
    T = function (n, e) {
      return e.length > 0;
    },
    U = function (n) {
      return n.playerBooked[n.waitFor].length < 3;
    },
    D = function (n, e) {
      return F(n, e, n.waitFor).enough;
    },
    W = function (n, e) {
      var t = n.playerGem[n.waitFor];
      return y(e) === M(n, n.waitFor) && e.every(function (n, e) {
        return n <= t[e];
      });
    },
    R = function (n, e) {
      return n.waitNoble && n.nobleCandidates.includes(e);
    },
    Y = function (n, e, t) {
      var r = n.bankNoble[t];
      n.bankNoble[t] = 0, n.playerNoble[e].push(r - 1), n.lastOp.noble = [r], n.lastOp.noblePos = [t];
    },
    V = function (n, e) {
      var t = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
      if (!t) {
        var r = C(n, e);
        if (r.length > 1) return void (n.waitNoble = !0);
        1 === r.length && Y(n, e, r[0]);
      }
      n.waitNoble = !1, y(n.playerGem[e]) > 10 ? n.waitThrowing = !0 : (n.waitThrowing = !1, n.waitFor = (e + 1) % n.playerGem.length);
    },
    K = function (n, e, t, r) {
      var a = N(n)[e];
      n.bankCard[e][t] = a.length ? (void 0 === r ? a[(0, u.M)(a.length)] : r) + 1 : 0;
    },
    _ = function (n, e, t, r) {
      var a = Z(n),
        i = a.waitFor,
        l = o.XO[e],
        s = a.bankGem[5] > 0 ? 1 : 0;
      return a.bankGem[5] -= s, a.playerGem[i][5] += s, a.playerBooked[i].push(e), a.lastOp = {
        type: c.W.BOOK,
        playerId: i,
        card: e + 1,
        cardPos: t,
        gemDelta: [0, 0, 0, 0, 0, s]
      }, t !== v && (a.bankCard[l][t] = 0, K(a, l, t, r)), V(a, i), O(a), cn(n, a, t === v ? {
        kind: "deck",
        level: l
      } : {
        kind: "book",
        cardId: e,
        pos: t
      }, t === v ? e : a.bankCard[l][t] ? a.bankCard[l][t] - 1 : void 0), a;
    },
    H = function (n, e) {
      var t = Z(n),
        r = t.waitFor;
      return t.lastOp = {
        type: c.W.CHOOSE_NOBLE,
        playerId: r
      }, Y(t, r, e), V(t, r, !0), O(t), cn(n, t, {
        kind: "noble",
        noblePos: e
      }), t;
    },
    X = function (n, e) {
      var t = Z(n),
        r = t.waitFor;
      return e.forEach(function (n, e) {
        t.bankGem[e] += n, t.playerGem[r][e] -= n;
      }), t.waitThrowing = !1, t.waitFor = (r + 1) % t.playerGem.length, t.lastOp = {
        type: c.W.THROW,
        playerId: r,
        gemDelta: e
      }, O(t), cn(n, t, {
        kind: "throw",
        gemDelta: e
      }), t;
    },
    q = function (n) {
      for (var e = n.playerGem[n.waitFor], t = new Array(6).fill(0), r = M(n, n.waitFor), a = 5; a >= 0 && r > 0; a--) t[a] = Math.min(e[a], r), r -= t[a];
      return t;
    },
    $ = function (n) {
      var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : n.waitFor;
      if (e !== n.waitFor || n.winner.length) return [];
      if (n.waitNoble) return n.nobleCandidates.map(function (n) {
        return {
          kind: "noble",
          noblePos: n
        };
      });
      var t = [];
      if (n.waitThrowing) {
        var r = [0, 0, 0, 0, 0, 0],
          a = function a(i, c) {
            if (6 !== i) for (var o = 0; o <= Math.min(c, n.playerGem[e][i]); o++) r[i] = o, a(i + 1, c - o);else c || t.push({
              kind: "throw",
              gemDelta: [].concat(r)
            });
          };
        return a(0, M(n, e)), t;
      }
      for (var c = function e(r, a, c) {
          if (c) for (var o = a; o < 5; o++) n.bankGem[o] > 0 && e([].concat((0, i.Z)(r), [o]), o + 1, c - 1);else t.push({
            kind: "take",
            selected: (0, i.Z)(r)
          });
        }, o = 1; o <= 3; o++) c([], 0, o);
      for (var l = 0; l < 5; l++) n.bankGem[l] >= 4 && t.push({
        kind: "take",
        selected: [l, l]
      });
      U(n) && (n.bankCard.forEach(function (n) {
        return n.forEach(function (n, e) {
          n && t.push({
            kind: "book",
            cardId: n - 1,
            pos: e
          });
        });
      }), n.bankLeftCard.forEach(function (n, e) {
        n.length && t.push({
          kind: "deck",
          level: e
        });
      }));
      var s = function (r, a, i) {
        P(n, r, e).forEach(function (n) {
          t.push({
            kind: "buy",
            cardId: r,
            pos: a,
            booked: i,
            payment: n
          });
        });
      };
      return n.bankCard.forEach(function (n) {
        return n.forEach(function (n, e) {
          n && s(n - 1, e, !1);
        });
      }), n.playerBooked[e].forEach(function (n, e) {
        return s(n, e, !0);
      }), t.push({
        kind: "pass"
      }), t;
    },
    J = function (n, e) {
      var t = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : n.waitFor,
        a = "take" === e.kind ? (0, r.Z)((0, r.Z)({}, e), {}, {
          selected: (0, i.Z)(e.selected).sort(function (n, e) {
            return n - e;
          })
        }) : e,
        c = an(a);
      return $(n, t).some(function (n) {
        return an(n) === c;
      });
    },
    Q = function (n) {
      return n.winner.length ? null : n.waitNoble ? {
        kind: "noble",
        noblePos: n.nobleCandidates[0]
      } : n.waitThrowing ? {
        kind: "throw",
        gemDelta: q(n)
      } : {
        kind: "pass"
      };
    },
    z = function (n, e) {
      var t = Q(n);
      return null !== t && an(t) === an(e);
    },
    nn = function (n, e) {
      var t = null;
      return "deck" === e.kind ? t = e.level : ("book" === e.kind || "buy" === e.kind && !e.booked) && (t = o.XO[e.cardId]), null !== t && n.bankLeftCard[t].length ? t : null;
    },
    en = function (n, e, t) {
      switch (e.kind) {
        case "take":
          return function (n, e) {
            var t = Z(n),
              r = t.waitFor,
              a = new Array(6).fill(0).map(function (n, t) {
                return e.filter(function (n) {
                  return n === t;
                }).length;
              });
            return a.forEach(function (n, e) {
              t.bankGem[e] -= n, t.playerGem[r][e] += n;
            }), t.lastOp = {
              type: c.W.GEM,
              playerId: r,
              gemDelta: a
            }, V(t, r), O(t), cn(n, t, {
              kind: "take",
              selected: (0, i.Z)(e).sort(function (n, e) {
                return n - e;
              })
            }), t;
          }(n, e.selected);
        case "book":
          return _(n, e.cardId, e.pos, t);
        case "deck":
          return function (n, e, t) {
            var r = n.bankLeftCard[e];
            return _(n, void 0 === t ? r[(0, u.M)(r.length)] : t, v);
          }(n, e.level, t);
        case "buy":
          return function (n, e, t, r, a, l) {
            var s = Z(n),
              u = s.waitFor,
              d = o.XO[e],
              f = F(n, e, u),
              h = a ? [].concat((0, i.Z)(a.spend), [a.gold]) : [].concat((0, i.Z)(f.spend), [f.needGold]);
            return h.forEach(function (n, e) {
              s.bankGem[e] += n, s.playerGem[u][e] -= n;
            }), s.playerCard[u].push(e), s.lastOp = {
              type: r ? c.W.BUY_BOOKED : c.W.BUY,
              playerId: u,
              card: e + 1,
              cardPos: t,
              gemDelta: h
            }, r ? s.playerBooked[u].splice(s.playerBooked[u].indexOf(e), 1) : (s.bankCard[d][t] = 0, K(s, d, t, l)), V(s, u), O(s), cn(n, s, {
              kind: "buy",
              cardId: e,
              pos: t,
              booked: r,
              payment: a || {
                spend: f.spend,
                gold: f.needGold
              }
            }, !r && s.bankCard[d][t] ? s.bankCard[d][t] - 1 : void 0), s;
          }(n, e.cardId, e.pos, e.booked, e.payment, t);
        case "noble":
          return H(n, e.noblePos);
        case "throw":
          return X(n, e.gemDelta);
        case "pass":
          return function (n) {
            var e = Z(n),
              t = e.waitFor;
            return e.waitFor = (t + 1) % e.playerGem.length, e.lastOp = {
              type: c.W.NULL,
              playerId: t
            }, O(e), cn(n, e, {
              kind: "pass"
            }), e;
          }(n);
        default:
          return n;
      }
    },
    tn = function () {
      return [[], [], []];
    },
    rn = function (n, e, t) {
      var r = nn(n, e),
        a = en(n, e, null === r ? void 0 : t[r][0]),
        c = t.map(function (n) {
          return (0, i.Z)(n);
        });
      return null !== r && c[r].length && c[r].shift(), {
        view: a,
        tail: c
      };
    },
    an = function (n) {
      switch (n.kind) {
        case "take":
          return "take:".concat(n.selected.join(","));
        case "book":
          return "book:".concat(n.cardId, ":").concat(n.pos);
        case "deck":
          return "deck:".concat(n.level);
        case "buy":
          return "buy:".concat(n.cardId, ":").concat(n.pos, ":").concat(n.booked, ":").concat(n.payment.spend.join(","), ":").concat(n.payment.gold);
        case "noble":
          return "noble:".concat(n.noblePos);
        case "throw":
          return "throw:".concat(n.gemDelta.join(","));
        case "pass":
          return "pass";
        default:
          return "";
      }
    },
    cn = function (n, e, t, r) {
      if (n.initial) {
        var a = M(n, n.waitFor) > 3 ? [] : $(n),
          i = an(t),
          c = a.findIndex(function (n) {
            return an(n) === i;
          });
        if (c < 0 || a.length > 511) return e.initial = null, void (e.recordList = []);
        e.recordList.push(void 0 === r ? {
          candidateId: c
        } : {
          candidateId: c,
          drawCard: r
        });
      }
    },
    on = function (n) {
      return JSON.stringify([n.waitFor, n.waitNoble, n.waitThrowing, n.bankGem, n.bankCard, n.bankNoble, n.playerGem, n.playerCard, n.playerBooked, n.playerNoble, n.lastOp]);
    },
    ln = 1e5,
    sn = [[], [], []];
  o.XO.forEach(function (n, e) {
    return sn[n].push(e);
  });
  var un = function (n, e, t) {
      if (![2, 3, 4].includes(t) || 3 !== e.bankCard.length || e.bankNoble.length !== t + 1) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u5f00\u5c40");
      e.bankCard.forEach(function (e, t) {
        if (4 !== e.length) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u573a\u724c");
        var r = (0, i.Z)(sn[t]);
        e.forEach(function (e) {
          var t = r.indexOf(e - 1);
          n.choice(t, r.length), r.splice(t, 1);
        });
      });
      var r = new Array(10).fill(0).map(function (n, e) {
        return e + 1;
      });
      e.bankNoble.forEach(function (e) {
        var t = r.indexOf(e);
        n.choice(t, r.length), r.splice(t, 1);
      });
    },
    dn = function (n, e) {
      if (![2, 3, 4].includes(e)) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u4eba\u6570");
      var t = sn.map(function (e) {
          var t = (0, i.Z)(e);
          return new Array(4).fill(0).map(function () {
            return t.splice(n.choice(t.length), 1)[0] + 1;
          });
        }),
        r = new Array(10).fill(0).map(function (n, e) {
          return e + 1;
        });
      return {
        bankCard: t,
        bankNoble: new Array(e + 1).fill(0).map(function () {
          return r.splice(n.choice(r.length), 1)[0];
        })
      };
    },
    fn = function (n) {
      if (1 !== n.read(3)) throw new Error("\u4e0d\u652f\u6301\u7684\u590d\u76d8\u7248\u672c");
    },
    hn = function (n, e) {
      var t = new p();
      return t.write(1, 3), un(t, n, e), t.finish();
    },
    pn = function (n, e) {
      var t = new m(n);
      fn(t);
      var r = dn(t, e);
      return t.finish(), r;
    },
    mn = function (n, e) {
      var t = $(n);
      if (!Number.isInteger(e.candidateId) || e.candidateId < 0 || e.candidateId >= t.length) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u64cd\u4f5c");
      var r = t[e.candidateId],
        a = nn(n, r);
      if (null === a ? void 0 !== e.drawCard : !n.bankLeftCard[a].includes(e.drawCard)) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u62bd\u724c");
      return {
        candidates: t,
        action: r,
        level: a
      };
    },
    vn = function (n, e, t, r) {
      if (t.length > ln) throw new Error("\u590d\u76d8\u8bb0\u5f55\u8fc7\u591a");
      n.count(t.length);
      var a = I(r, e);
      a.initial = null, t.forEach(function (e) {
        var t = mn(a, e),
          r = t.candidates,
          i = t.action,
          c = t.level;
        if (n.choice(e.candidateId, r.length), null !== c) {
          var o = a.bankLeftCard[c];
          n.choice(o.indexOf(e.drawCard), o.length);
        }
        a = en(a, i, e.drawCard);
      });
    },
    bn = function (n, e, t) {
      var r = n.count();
      if (r > ln) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u957f\u5ea6");
      var a = I(t, e),
        i = a.initial,
        c = [],
        o = [0];
      a.initial = null;
      for (var l = 0; l < r; l++) {
        var s = $(a),
          u = n.choice(s.length),
          d = s[u],
          f = nn(a, d),
          h = null === f ? void 0 : a.bankLeftCard[f][n.choice(a.bankLeftCard[f].length)];
        a = en(a, d, h), c.push(void 0 === h ? {
          candidateId: u
        } : {
          candidateId: u,
          drawCard: h
        }), a.waitNoble || a.waitThrowing || o.push(l + 1);
      }
      return o[o.length - 1] !== r && o.push(r), a.initial = i, a.recordList = c, {
        view: a,
        offsets: o
      };
    },
    yn = function (n, e, t) {
      if (!e.length) return new Uint8Array();
      var r = new p();
      return r.write(1, 3), vn(r, n, e, t), r.finish();
    },
    wn = function (n, e, t) {
      if (!n.length) return I(t, e);
      var r = new m(n);
      fn(r);
      var a = bn(r, e, t).view;
      if (r.finish(), !a.recordList.length) throw new Error("\u7a7a\u5386\u53f2\u5e94\u7f16\u7801\u4e3a\u7a7a\u5b57\u8282");
      return a;
    },
    gn = function (n) {
      if (!n.initial) throw new Error("\u8fd9\u5c40\u6ca1\u6709\u5b8c\u6574\u5386\u53f2");
      var e = new p();
      return e.write(1, 3), un(e, n.initial, n.playerGem.length), vn(e, n.initial, n.recordList, n.playerGem.length), e.finish();
    },
    xn = function (n, e) {
      var t = new m(n);
      fn(t);
      var r = dn(t, e),
        a = bn(t, r, e);
      return t.finish(), a;
    },
    kn = function (n, e) {
      if (!n.initial || !Number.isInteger(e) || e < 0 || e > n.recordList.length) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u4f4d\u7f6e");
      return function (n, e, t) {
        var a = I(t, n),
          i = a.initial;
        return a.initial = null, e.forEach(function (n) {
          var e = mn(a, n).action;
          a = en(a, e, n.drawCard);
        }), a.initial = i, a.recordList = e.map(function (n) {
          return (0, r.Z)({}, n);
        }), a;
      }(n.initial, n.recordList.slice(0, e), n.playerGem.length);
    },
    jn = function (n) {
      var e = [0];
      if (!n.initial) return e;
      var t = I(n.playerGem.length, n.initial);
      return t.initial = null, n.recordList.forEach(function (n, r) {
        var a = mn(t, n).action;
        (t = en(t, a, n.drawCard)).waitNoble || t.waitThrowing || e.push(r + 1);
      }), e[e.length - 1] !== n.recordList.length && e.push(n.recordList.length), e;
    },
    Nn = function (n, e, t) {
      if (!n.initial || !Number.isInteger(e) || e < 0 || e > n.recordList.length) throw new Error("\u65e0\u6548\u7684\u590d\u76d8\u4f4d\u7f6e");
      var r = [[], [], []];
      return n.recordList.slice(e).forEach(function (n) {
        void 0 !== n.drawCard && r[o.XO[n.drawCard]].push(n.drawCard);
      }), r.forEach(function (n, e) {
        return n.push.apply(n, (0, i.Z)(t[e]));
      }), r;
    },
    Cn = function (n, e) {
      var t = jn(n);
      return function (n, e, t) {
        return {
          view: kn(n, t),
          tail: Nn(n, t, e)
        };
      }(n, e, t[t.length - 2]);
    },
    On = function (n, e) {
      if (3 !== e.length) throw new Error("\u65e0\u6548\u7684\u5df2\u77e5\u724c\u5e8f");
      if (e.every(function (n) {
        return !n.length;
      })) return new Uint8Array();
      var t = new p();
      return t.write(1, 3), e.forEach(function (e, r) {
        var a = (0, i.Z)(n.bankLeftCard[r]);
        t.choice(e.length, a.length + 1), e.forEach(function (n) {
          var e = a.indexOf(n);
          t.choice(e, a.length), a.splice(e, 1);
        });
      }), t.finish();
    },
    Zn = function (n, e) {
      if (!e.length) return [[], [], []];
      var t = new m(e);
      fn(t);
      var r = n.bankLeftCard.map(function (n) {
        var e = (0, i.Z)(n),
          r = t.choice(e.length + 1);
        return new Array(r).fill(0).map(function () {
          return e.splice(t.choice(e.length), 1)[0];
        });
      });
      if (t.finish(), r.every(function (n) {
        return !n.length;
      })) throw new Error("\u7a7a\u724c\u5e8f\u5e94\u7f16\u7801\u4e3a\u7a7a\u5b57\u8282");
      return r;
    };
},
1413: function (e, t, n) {
  "use strict";

  n.d(t, {
    Z: function () {
      return l;
    }
  });
  var r = n(4942);
  function a(e, t) {
    var n = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var r = Object.getOwnPropertySymbols(e);
      t && (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })), n.push.apply(n, r);
    }
    return n;
  }
  function l(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = null != arguments[t] ? arguments[t] : {};
      t % 2 ? a(Object(n), !0).forEach(function (t) {
        (0, r.Z)(e, t, n[t]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : a(Object(n)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
      });
    }
    return e;
  }
},
4942: function (e, t, n) {
  "use strict";

  function r(e, t, n) {
    return t in e ? Object.defineProperty(e, t, {
      value: n,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : e[t] = n, e;
  }
  n.d(t, {
    Z: function () {
      return r;
    }
  });
},
2982: function (e, t, n) {
  "use strict";

  n.d(t, {
    Z: function () {
      return l;
    }
  });
  var r = n(907);
  var a = n(181);
  function l(e) {
    return function (e) {
      if (Array.isArray(e)) return (0, r.Z)(e);
    }(e) || function (e) {
      if ("undefined" !== typeof Symbol && null != e[Symbol.iterator] || null != e["@@iterator"]) return Array.from(e);
    }(e) || (0, a.Z)(e) || function () {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }
},
7698: function (n, e, t) {
  var r;
  t.d(e, {
    W: function () {
      return r;
    }
  }), function (n) {
    n[n.NULL = 0] = "NULL", n[n.GEM = 1] = "GEM", n[n.BOOK = 2] = "BOOK", n[n.BUY = 3] = "BUY", n[n.BUY_BOOKED = 4] = "BUY_BOOKED", n[n.THROW = 5] = "THROW", n[n.CHOOSE_NOBLE = 6] = "CHOOSE_NOBLE";
  }(r || (r = {}));
},
3797: function (n, e, t) {
  t.d(e, {
    FL: function () {
      return d;
    },
    Hf: function () {
      return a;
    },
    KI: function () {
      return i;
    },
    XO: function () {
      return o;
    },
    dS: function () {
      return c;
    },
    s2: function () {
      return s;
    }
  });
  var r = t(2982),
    a = [[0, 0, 4, 4, 0], [0, 4, 4, 0, 0], [4, 4, 0, 0, 0], [4, 0, 0, 0, 4], [0, 0, 0, 4, 4], [3, 3, 0, 0, 3], [0, 0, 3, 3, 3], [3, 0, 0, 3, 3], [0, 3, 3, 3, 0], [3, 3, 3, 0, 0]],
    i = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5];
  i.push.apply(i, i.concat(i, i, i));
  var c = [].concat((0, r.Z)(new Array(18).fill(0)), (0, r.Z)(new Array(18).fill(1)), (0, r.Z)(new Array(18).fill(2)), (0, r.Z)(new Array(18).fill(3)), (0, r.Z)(new Array(18).fill(4))),
    o = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2];
  o.push.apply(o, o.concat(o, o, o));
  for (var l = [[0, 1, 1, 1, 1], [0, 1, 2, 1, 1], [3, 1, 0, 0, 1], [0, 2, 2, 0, 1], [0, 2, 0, 0, 2], [0, 0, 0, 2, 1], [0, 3, 0, 0, 0], [0, 0, 4, 0, 0], [2, 3, 0, 3, 0], [0, 0, 3, 2, 2], [0, 0, 1, 4, 2], [0, 0, 0, 5, 0], [0, 0, 0, 5, 3], [6, 0, 0, 0, 0], [0, 3, 3, 5, 3], [0, 0, 0, 0, 7], [3, 0, 0, 3, 6], [3, 0, 0, 0, 7]], s = l.map(function (n) {
      return n.map(function (n) {
        return n;
      });
    }), u = 1; u < 5; u++) l.forEach(function (n) {
    var e = n[0];
    n[0] = n[4], n[4] = n[3], n[3] = n[2], n[2] = n[1], n[1] = e;
  }), s.push.apply(s, (0, r.Z)(l.map(function (n) {
    return n.map(function (n) {
      return n;
    });
  })));
  s[20] = [0, 1, 3, 1, 0], s[22] = [0, 0, 2, 0, 2], s[24] = [0, 0, 0, 0, 3], s[27] = [0, 2, 2, 3, 0], s[29] = [0, 5, 0, 0, 0], s[30] = [5, 3, 0, 0, 0], s[38] = [1, 3, 1, 0, 0], s[45] = [2, 3, 0, 0, 2], s[47] = [0, 0, 5, 0, 0], s[48] = [0, 5, 3, 0, 0], s[56] = [1, 0, 0, 1, 3], s[58] = [2, 0, 0, 2, 0], s[60] = [3, 0, 0, 0, 0], s[63] = [2, 0, 0, 2, 3], s[65] = [0, 0, 0, 0, 5], s[66] = [3, 0, 0, 0, 5], s[74] = [0, 0, 1, 3, 1], s[76] = [2, 0, 2, 0, 0], s[78] = [0, 0, 3, 0, 0], s[81] = [3, 2, 2, 0, 0], s[83] = [5, 0, 0, 0, 0];
  var d = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 4, 3, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1, 1, 2, 1, 4, 4, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 1, 1, 1, 3, 4, 4, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 1, 1, 1, 4, 4, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4, 4, 3];
},
3329: function (e, t, n) {
  "use strict";

  n.d(t, {
    F: function () {
      return s;
    },
    H0: function () {
      return d;
    },
    I$: function () {
      return m;
    },
    Su: function () {
      return u;
    },
    lS: function () {
      return l;
    },
    p2: function () {
      return c;
    }
  });
  var i = n(2982),
    a = n(885),
    r = new Map([]),
    o = new Map([]);
  function s(e, t, n, i) {
    n = Math.min(n, (1 << i) - 1);
    var a = e,
      r = t,
      o = [];
    return t + i < 8 ? (a |= n << 8 - i - t, r += i) : t + i === 8 ? (o.push(e | n), a = 0, r = 0) : (a |= n >> t - 8 + i, o.push(a), a = n << 16 - t - i & 255, r = t - 8 + i), [a, r, o];
  }
  function c(e, t, n, c) {
    if (c < 2) return [e, t, []];
    var l = o.get(c),
      u = r.get(c),
      d = Math.pow(2, l),
      m = c - d;
    if (l === u || n < d - m) return s(e, t, n, l);
    var f,
      h = e,
      x = t,
      p = [];
    if (n < d) {
      var j = s(h, x, n, l),
        y = (0, a.Z)(j, 3);
      h = y[0], x = y[1], f = y[2], p.push.apply(p, (0, i.Z)(f));
      var b = s(h, x, 0, 1),
        g = (0, a.Z)(b, 3);
      h = g[0], x = g[1], f = g[2], p.push.apply(p, (0, i.Z)(f));
    } else {
      var v = s(h, x, n - m, l),
        w = (0, a.Z)(v, 3);
      h = w[0], x = w[1], f = w[2], p.push.apply(p, (0, i.Z)(f));
      var W = s(h, x, 1, 1),
        k = (0, a.Z)(W, 3);
      h = k[0], x = k[1], f = k[2], p.push.apply(p, (0, i.Z)(f));
    }
    return [h, x, p];
  }
  function l(e, t, n) {
    var i = t % 8,
      a = Math.floor(t / 8);
    if (i + n > 8 && a + 1 >= e.length || i + n <= 8 && a >= e.length) throw new Error("readBitsError");
    var r = i + n <= 8 ? e[a] : e[a] << 8 | e[a + 1];
    return r >>= (i + n <= 8 ? 8 : 16) - n - i, [r &= [0, 1, 3, 7, 15, 31, 63, 127, 255][n], t + n];
  }
  function u(e, t, n) {
    if (!n) throw new Error("readBitsError");
    if (1 === n) return [0, t];
    var i = o.get(n),
      s = r.get(n),
      c = Math.pow(2, i),
      u = n - c,
      d = l(e, t, i),
      m = (0, a.Z)(d, 2),
      f = m[0],
      h = m[1];
    if (i === s || f < c - u) return [f, h];
    var x = l(e, h, 1),
      p = (0, a.Z)(x, 2),
      j = p[0],
      y = p[1];
    return j ? [f + u, y] : [f, y];
  }
  function d(e, t) {
    for (var n = [], i = 0; i < t; i++) n.push(!!(e >> i & 1));
    return n;
  }
  function m(e) {
    var t = 0;
    return e.forEach(function (e, n) {
      e && (t |= 1 << n);
    }), t;
  }
  new Array(511).fill(0).forEach(function (e, t) {
    var n = Math.log2(t + 1);
    r.set(t + 1, Math.ceil(n)), o.set(t + 1, Math.floor(n));
  });
},
4595: function (e, t, n) {
  "use strict";

  n.d(t, {
    P: function () {
      return l;
    }
  });
  var i = n(1413),
    a = n(7313),
    r = n(7890),
    o = n(9466),
    s = n(161),
    c = n(6417);
  function l(e) {
    var t = (0, r.s0)(),
      n = (0, r.TH)().state,
      i = null === n || void 0 === n ? void 0 : n.keepSession;
    return function () {
      i ? t(-1) : 1 === window.history.length ? t(e, {
        replace: !0
      }) : (t(e, {
        replace: !0
      }), t(e), t(-1));
    };
  }
  function u(e) {
    var t = e.to,
      n = e.children,
      i = e.className,
      a = e.lastClickTime,
      r = l(t);
    return (0, c.jsx)(o.rU, {
      to: t,
      className: i,
      onClick: function (e) {
        if (0 === e.button && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
          e.preventDefault();
          var t = new Date().getTime();
          t - a.current > 100 && (a.current = t, r());
        }
      },
      children: n
    });
  }
  t.Z = function (e) {
    var t,
      n = e.to,
      r = e.state,
      l = e.replace,
      d = e.back,
      m = e.children,
      f = e.onClick,
      h = e.disabled,
      x = e.small,
      p = e.primary,
      j = e.noStyle,
      y = e.className,
      b = (0, a.useRef)(0),
      g = n && !h;
    j ? t = y || "" : (t = "inline-block flex-shrink-0 overflow-hidden whitespace-nowrap transition-colors rounded-full box-shadow ", t += x ? "h-6 leading-6 px-2 text-xs " : "h-10 leading-10 px-4 text-base ", t += h ? "text-black/40 bg-gray-200 cursor-not-allowed" : p ? "text-white primary" : "text-black/90 bg-slate-200/80 active:bg-slate-300/70", y && (t += " ".concat(y)));
    var v = h || !f ? void 0 : function (e) {
      if (g) {
        if (0 !== e.button) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
      }
      var t = new Date().getTime();
      t - b.current > 100 && (b.current = t, f(e));
    };
    return g ? d ? (0, c.jsx)(u, {
      to: n,
      className: t,
      lastClickTime: b,
      children: m
    }) : n.startsWith("http") ? s.ot && !n.startsWith("https://mp.weixin.qq.com") || s.ot && !s.at ? null : (0, c.jsx)("a", {
      href: n,
      target: "_blank",
      rel: "noreferrer noopener",
      className: t,
      onClick: v,
      children: m
    }) : (0, c.jsx)(o.rU, {
      to: n,
      state: (0, i.Z)((0, i.Z)({}, r), {}, {
        keepSession: !0
      }),
      replace: l,
      className: t,
      onClick: v,
      children: m
    }) : (0, c.jsx)("button", {
      type: "button",
      className: t,
      onClick: v,
      children: m,
      disabled: h,
      "data-guide-target": e["data-guide-target"],
      "data-guide-id": e["data-guide-id"],
      "data-guide-player": e["data-guide-player"]
    });
  };
},
7890: function (e, t, n) {
  "use strict";

  n.d(t, {
    AW: function () {
      return T;
    },
    F0: function () {
      return R;
    },
    TH: function () {
      return _;
    },
    UO: function () {
      return N;
    },
    WU: function () {
      return z;
    },
    Z5: function () {
      return M;
    },
    j3: function () {
      return L;
    },
    oQ: function () {
      return x;
    },
    s0: function () {
      return C;
    }
  });
  var r = n(885),
    a = n(5216),
    l = n(7313),
    o = (0, l.createContext)(null);
  var i = (0, l.createContext)(null);
  var u = (0, l.createContext)({
    outlet: null,
    matches: []
  });
  function s(e, t) {
    if (!e) throw new Error(t);
  }
  function c(e, t, n) {
    void 0 === n && (n = "/");
    var r = g(("string" === typeof t ? (0, a.cP)(t) : t).pathname || "/", n);
    if (null == r) return null;
    var l = f(e);
    !function (e) {
      e.sort(function (e, t) {
        return e.score !== t.score ? t.score - e.score : function (e, t) {
          var n = e.length === t.length && e.slice(0, -1).every(function (e, n) {
            return e === t[n];
          });
          return n ? e[e.length - 1] - t[t.length - 1] : 0;
        }(e.routesMeta.map(function (e) {
          return e.childrenIndex;
        }), t.routesMeta.map(function (e) {
          return e.childrenIndex;
        }));
      });
    }(l);
    for (var o = null, i = 0; null == o && i < l.length; ++i) o = m(l[i], r);
    return o;
  }
  function f(e, t, n, r) {
    return void 0 === t && (t = []), void 0 === n && (n = []), void 0 === r && (r = ""), e.forEach(function (e, a) {
      var l = {
        relativePath: e.path || "",
        caseSensitive: !0 === e.caseSensitive,
        childrenIndex: a,
        route: e
      };
      l.relativePath.startsWith("/") && (l.relativePath.startsWith(r) || s(!1), l.relativePath = l.relativePath.slice(r.length));
      var o = b([r, l.relativePath]),
        i = n.concat(l);
      e.children && e.children.length > 0 && (!0 === e.index && s(!1), f(e.children, t, i, o)), (null != e.path || e.index) && t.push({
        path: o,
        score: h(o, e.index),
        routesMeta: i
      });
    }), t;
  }
  var d = /^:\w+$/,
    p = function (e) {
      return "*" === e;
    };
  function h(e, t) {
    var n = e.split("/"),
      r = n.length;
    return n.some(p) && (r += -2), t && (r += 2), n.filter(function (e) {
      return !p(e);
    }).reduce(function (e, t) {
      return e + (d.test(t) ? 3 : "" === t ? 1 : 10);
    }, r);
  }
  function m(e, t) {
    for (var n = e.routesMeta, r = {}, a = "/", l = [], o = 0; o < n.length; ++o) {
      var i = n[o],
        u = o === n.length - 1,
        s = "/" === a ? t : t.slice(a.length) || "/",
        c = v({
          path: i.relativePath,
          caseSensitive: i.caseSensitive,
          end: u
        }, s);
      if (!c) return null;
      Object.assign(r, c.params);
      var f = i.route;
      l.push({
        params: r,
        pathname: b([a, c.pathname]),
        pathnameBase: w(b([a, c.pathnameBase])),
        route: f
      }), "/" !== c.pathnameBase && (a = b([a, c.pathnameBase]));
    }
    return l;
  }
  function v(e, t) {
    "string" === typeof e && (e = {
      path: e,
      caseSensitive: !1,
      end: !0
    });
    var n = function (e, t, n) {
        void 0 === t && (t = !1);
        void 0 === n && (n = !0);
        var r = [],
          a = "^" + e.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^$?{}|()[\]]/g, "\\$&").replace(/:(\w+)/g, function (e, t) {
            return r.push(t), "([^\\/]+)";
          });
        e.endsWith("*") ? (r.push("*"), a += "*" === e || "/*" === e ? "(.*)$" : "(?:\\/(.+)|\\/*)$") : a += n ? "\\/*$" : "(?:(?=[.~-]|%[0-9A-F]{2})|\\b|\\/|$)";
        return [new RegExp(a, t ? void 0 : "i"), r];
      }(e.path, e.caseSensitive, e.end),
      a = (0, r.Z)(n, 2),
      l = a[0],
      o = a[1],
      i = t.match(l);
    if (!i) return null;
    var u = i[0],
      s = u.replace(/(.)\/+$/, "$1"),
      c = i.slice(1);
    return {
      params: o.reduce(function (e, t, n) {
        if ("*" === t) {
          var r = c[n] || "";
          s = u.slice(0, u.length - r.length).replace(/(.)\/+$/, "$1");
        }
        return e[t] = function (e, t) {
          try {
            return decodeURIComponent(e);
          } catch (n) {
            return e;
          }
        }(c[n] || ""), e;
      }, {}),
      pathname: u,
      pathnameBase: s,
      pattern: e
    };
  }
  function y(e, t, n) {
    var r,
      l = "string" === typeof e ? (0, a.cP)(e) : e,
      o = "" === e || "" === l.pathname ? "/" : l.pathname;
    if (null == o) r = n;else {
      var i = t.length - 1;
      if (o.startsWith("..")) {
        for (var u = o.split("/"); ".." === u[0];) u.shift(), i -= 1;
        l.pathname = u.join("/");
      }
      r = i >= 0 ? t[i] : "/";
    }
    var s = function (e, t) {
      void 0 === t && (t = "/");
      var n = "string" === typeof e ? (0, a.cP)(e) : e,
        r = n.pathname,
        l = n.search,
        o = void 0 === l ? "" : l,
        i = n.hash,
        u = void 0 === i ? "" : i,
        s = r ? r.startsWith("/") ? r : function (e, t) {
          var n = t.replace(/\/+$/, "").split("/");
          return e.split("/").forEach(function (e) {
            ".." === e ? n.length > 1 && n.pop() : "." !== e && n.push(e);
          }), n.length > 1 ? n.join("/") : "/";
        }(r, t) : t;
      return {
        pathname: s,
        search: k(o),
        hash: S(u)
      };
    }(l, r);
    return o && "/" !== o && o.endsWith("/") && !s.pathname.endsWith("/") && (s.pathname += "/"), s;
  }
  function g(e, t) {
    if ("/" === t) return e;
    if (!e.toLowerCase().startsWith(t.toLowerCase())) return null;
    var n = e.charAt(t.length);
    return n && "/" !== n ? null : e.slice(t.length) || "/";
  }
  var b = function (e) {
      return e.join("/").replace(/\/\/+/g, "/");
    },
    w = function (e) {
      return e.replace(/\/+$/, "").replace(/^\/*/, "/");
    },
    k = function (e) {
      return e && "?" !== e ? e.startsWith("?") ? e : "?" + e : "";
    },
    S = function (e) {
      return e && "#" !== e ? e.startsWith("#") ? e : "#" + e : "";
    };
  function x(e) {
    E() || s(!1);
    var t = (0, l.useContext)(o),
      n = t.basename,
      r = t.navigator,
      i = z(e),
      u = i.hash,
      c = i.pathname,
      f = i.search,
      d = c;
    if ("/" !== n) {
      var p = function (e) {
          return "" === e || "" === e.pathname ? "/" : "string" === typeof e ? (0, a.cP)(e).pathname : e.pathname;
        }(e),
        h = null != p && p.endsWith("/");
      d = "/" === c ? n + (h ? "/" : "") : b([n, c]);
    }
    return r.createHref({
      pathname: d,
      search: f,
      hash: u
    });
  }
  function E() {
    return null != (0, l.useContext)(i);
  }
  function _() {
    return E() || s(!1), (0, l.useContext)(i).location;
  }
  function C() {
    E() || s(!1);
    var e = (0, l.useContext)(o),
      t = e.basename,
      n = e.navigator,
      r = (0, l.useContext)(u).matches,
      a = _().pathname,
      i = JSON.stringify(r.map(function (e) {
        return e.pathnameBase;
      })),
      c = (0, l.useRef)(!1);
    return (0, l.useEffect)(function () {
      c.current = !0;
    }), (0, l.useCallback)(function (e, r) {
      if (void 0 === r && (r = {}), c.current) if ("number" !== typeof e) {
        var l = y(e, JSON.parse(i), a);
        "/" !== t && (l.pathname = b([t, l.pathname])), (r.replace ? n.replace : n.push)(l, r.state);
      } else n.go(e);
    }, [t, n, i, a]);
  }
  var P = (0, l.createContext)(null);
  function N() {
    var e = (0, l.useContext)(u).matches,
      t = e[e.length - 1];
    return t ? t.params : {};
  }
  function z(e) {
    var t = (0, l.useContext)(u).matches,
      n = _().pathname,
      r = JSON.stringify(t.map(function (e) {
        return e.pathnameBase;
      }));
    return (0, l.useMemo)(function () {
      return y(e, JSON.parse(r), n);
    }, [e, r, n]);
  }
  function O(e, t) {
    return void 0 === t && (t = []), null == e ? null : e.reduceRight(function (n, r, a) {
      return (0, l.createElement)(u.Provider, {
        children: void 0 !== r.route.element ? r.route.element : n,
        value: {
          outlet: n,
          matches: t.concat(e.slice(0, a + 1))
        }
      });
    }, null);
  }
  function L(e) {
    return function (e) {
      var t = (0, l.useContext)(u).outlet;
      return t ? (0, l.createElement)(P.Provider, {
        value: e
      }, t) : t;
    }(e.context);
  }
  function T(e) {
    s(!1);
  }
  function R(e) {
    var t = e.basename,
      n = void 0 === t ? "/" : t,
      r = e.children,
      u = void 0 === r ? null : r,
      c = e.location,
      f = e.navigationType,
      d = void 0 === f ? a.aU.Pop : f,
      p = e.navigator,
      h = e.static,
      m = void 0 !== h && h;
    E() && s(!1);
    var v = w(n),
      y = (0, l.useMemo)(function () {
        return {
          basename: v,
          navigator: p,
          static: m
        };
      }, [v, p, m]);
    "string" === typeof c && (c = (0, a.cP)(c));
    var b = c,
      k = b.pathname,
      S = void 0 === k ? "/" : k,
      x = b.search,
      _ = void 0 === x ? "" : x,
      C = b.hash,
      P = void 0 === C ? "" : C,
      N = b.state,
      z = void 0 === N ? null : N,
      O = b.key,
      L = void 0 === O ? "default" : O,
      T = (0, l.useMemo)(function () {
        var e = g(S, v);
        return null == e ? null : {
          pathname: e,
          search: _,
          hash: P,
          state: z,
          key: L
        };
      }, [v, S, _, P, z, L]);
    return null == T ? null : (0, l.createElement)(o.Provider, {
      value: y
    }, (0, l.createElement)(i.Provider, {
      children: u,
      value: {
        location: T,
        navigationType: d
      }
    }));
  }
  function M(e) {
    var t = e.children,
      n = e.location;
    return function (e, t) {
      E() || s(!1);
      var n,
        r = (0, l.useContext)(u).matches,
        o = r[r.length - 1],
        i = o ? o.params : {},
        f = (o && o.pathname, o ? o.pathnameBase : "/"),
        d = (o && o.route, _());
      if (t) {
        var p,
          h = "string" === typeof t ? (0, a.cP)(t) : t;
        "/" === f || (null == (p = h.pathname) ? void 0 : p.startsWith(f)) || s(!1), n = h;
      } else n = d;
      var m = n.pathname || "/",
        v = c(e, {
          pathname: "/" === f ? m : m.slice(f.length) || "/"
        });
      return O(v && v.map(function (e) {
        return Object.assign({}, e, {
          params: Object.assign({}, i, e.params),
          pathname: b([f, e.pathname]),
          pathnameBase: "/" === e.pathnameBase ? f : b([f, e.pathnameBase])
        });
      }), r);
    }(F(t), n);
  }
  function F(e) {
    var t = [];
    return l.Children.forEach(e, function (e) {
      if ((0, l.isValidElement)(e)) if (e.type !== l.Fragment) {
        e.type !== T && s(!1);
        var n = {
          caseSensitive: e.props.caseSensitive,
          element: e.props.element,
          index: e.props.index,
          path: e.props.path
        };
        e.props.children && (n.children = F(e.props.children)), t.push(n);
      } else t.push.apply(t, F(e.props.children));
    }), t;
  }
},
5216: function (e, t, n) {
  "use strict";

  function r() {
    return r = Object.assign ? Object.assign.bind() : function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = arguments[t];
        for (var r in n) Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
      }
      return e;
    }, r.apply(this, arguments);
  }
  var a;
  n.d(t, {
    aU: function () {
      return a;
    },
    lX: function () {
      return u;
    },
    Ep: function () {
      return d;
    },
    cP: function () {
      return p;
    }
  }), function (e) {
    e.Pop = "POP", e.Push = "PUSH", e.Replace = "REPLACE";
  }(a || (a = {}));
  var l = function (e) {
    return e;
  };
  var o = "beforeunload",
    i = "popstate";
  function u(e) {
    void 0 === e && (e = {});
    var t = e.window,
      n = void 0 === t ? document.defaultView : t,
      u = n.history;
    function h() {
      var e = n.location,
        t = e.pathname,
        r = e.search,
        a = e.hash,
        o = u.state || {};
      return [o.idx, l({
        pathname: t,
        search: r,
        hash: a,
        state: o.usr || null,
        key: o.key || "default"
      })];
    }
    var m = null;
    n.addEventListener(i, function () {
      if (m) k.call(m), m = null;else {
        var e = a.Pop,
          t = h(),
          n = t[0],
          r = t[1];
        if (k.length) {
          if (null != n) {
            var l = g - n;
            l && (m = {
              action: e,
              location: r,
              retry: function () {
                P(-1 * l);
              }
            }, P(l));
          }
        } else C(e);
      }
    });
    var v = a.Pop,
      y = h(),
      g = y[0],
      b = y[1],
      w = c(),
      k = c();
    function S(e) {
      return "string" === typeof e ? e : d(e);
    }
    function x(e, t) {
      return void 0 === t && (t = null), l(r({
        pathname: b.pathname,
        hash: "",
        search: ""
      }, "string" === typeof e ? p(e) : e, {
        state: t,
        key: f()
      }));
    }
    function E(e, t) {
      return [{
        usr: e.state,
        key: e.key,
        idx: t
      }, S(e)];
    }
    function _(e, t, n) {
      return !k.length || (k.call({
        action: e,
        location: t,
        retry: n
      }), !1);
    }
    function C(e) {
      v = e;
      var t = h();
      g = t[0], b = t[1], w.call({
        action: v,
        location: b
      });
    }
    function P(e) {
      u.go(e);
    }
    null == g && (g = 0, u.replaceState(r({}, u.state, {
      idx: g
    }), ""));
    var N = {
      get action() {
        return v;
      },
      get location() {
        return b;
      },
      createHref: S,
      push: function e(t, r) {
        var l = a.Push,
          o = x(t, r);
        if (_(l, o, function () {
          e(t, r);
        })) {
          var i = E(o, g + 1),
            s = i[0],
            c = i[1];
          try {
            u.pushState(s, "", c);
          } catch (f) {
            n.location.assign(c);
          }
          C(l);
        }
      },
      replace: function e(t, n) {
        var r = a.Replace,
          l = x(t, n);
        if (_(r, l, function () {
          e(t, n);
        })) {
          var o = E(l, g),
            i = o[0],
            s = o[1];
          u.replaceState(i, "", s), C(r);
        }
      },
      go: P,
      back: function () {
        P(-1);
      },
      forward: function () {
        P(1);
      },
      listen: function (e) {
        return w.push(e);
      },
      block: function (e) {
        var t = k.push(e);
        return 1 === k.length && n.addEventListener(o, s), function () {
          t(), k.length || n.removeEventListener(o, s);
        };
      }
    };
    return N;
  }
  function s(e) {
    e.preventDefault(), e.returnValue = "";
  }
  function c() {
    var e = [];
    return {
      get length() {
        return e.length;
      },
      push: function (t) {
        return e.push(t), function () {
          e = e.filter(function (e) {
            return e !== t;
          });
        };
      },
      call: function (t) {
        e.forEach(function (e) {
          return e && e(t);
        });
      }
    };
  }
  function f() {
    return Math.random().toString(36).substr(2, 8);
  }
  function d(e) {
    var t = e.pathname,
      n = void 0 === t ? "/" : t,
      r = e.search,
      a = void 0 === r ? "" : r,
      l = e.hash,
      o = void 0 === l ? "" : l;
    return a && "?" !== a && (n += "?" === a.charAt(0) ? a : "?" + a), o && "#" !== o && (n += "#" === o.charAt(0) ? o : "#" + o), n;
  }
  function p(e) {
    var t = {};
    if (e) {
      var n = e.indexOf("#");
      n >= 0 && (t.hash = e.substr(n), e = e.substr(0, n));
      var r = e.indexOf("?");
      r >= 0 && (t.search = e.substr(r), e = e.substr(0, r)), e && (t.pathname = e);
    }
    return t;
  }
},
9466: function (e, t, n) {
  "use strict";

  n.d(t, {
    VK: function () {
      return f;
    },
    lr: function () {
      return p;
    },
    rU: function () {
      return d;
    }
  });
  var r = n(7762),
    a = n(885),
    l = n(7313),
    o = n(5216),
    i = n(7890);
  function u() {
    return u = Object.assign || function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = arguments[t];
        for (var r in n) Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
      }
      return e;
    }, u.apply(this, arguments);
  }
  function s(e, t) {
    if (null == e) return {};
    var n,
      r,
      a = {},
      l = Object.keys(e);
    for (r = 0; r < l.length; r++) n = l[r], t.indexOf(n) >= 0 || (a[n] = e[n]);
    return a;
  }
  var c = ["onClick", "reloadDocument", "replace", "state", "target", "to"];
  function f(e) {
    var t = e.basename,
      n = e.children,
      r = e.window,
      u = (0, l.useRef)();
    null == u.current && (u.current = (0, o.lX)({
      window: r
    }));
    var s = u.current,
      c = (0, l.useState)({
        action: s.action,
        location: s.location
      }),
      f = (0, a.Z)(c, 2),
      d = f[0],
      p = f[1];
    return (0, l.useLayoutEffect)(function () {
      return s.listen(p);
    }, [s]), (0, l.createElement)(i.F0, {
      basename: t,
      children: n,
      location: d.location,
      navigationType: d.action,
      navigator: s
    });
  }
  var d = (0, l.forwardRef)(function (e, t) {
    var n = e.onClick,
      r = e.reloadDocument,
      a = e.replace,
      f = void 0 !== a && a,
      d = e.state,
      p = e.target,
      h = e.to,
      m = s(e, c),
      v = (0, i.oQ)(h),
      y = function (e, t) {
        var n = void 0 === t ? {} : t,
          r = n.target,
          a = n.replace,
          u = n.state,
          s = (0, i.s0)(),
          c = (0, i.TH)(),
          f = (0, i.WU)(e);
        return (0, l.useCallback)(function (t) {
          if (0 === t.button && (!r || "_self" === r) && !function (e) {
            return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
          }(t)) {
            t.preventDefault();
            var n = !!a || (0, o.Ep)(c) === (0, o.Ep)(f);
            s(e, {
              replace: n,
              state: u
            });
          }
        }, [c, s, f, a, u, r, e]);
      }(h, {
        replace: f,
        state: d,
        target: p
      });
    return (0, l.createElement)("a", u({}, m, {
      href: v,
      onClick: function (e) {
        n && n(e), e.defaultPrevented || r || y(e);
      },
      ref: t,
      target: p
    }));
  });
  function p(e) {
    var t = (0, l.useRef)(h(e)),
      n = (0, i.TH)(),
      a = (0, l.useMemo)(function () {
        var e,
          a = h(n.search),
          l = (0, r.Z)(t.current.keys());
        try {
          var o = function () {
            var n = e.value;
            a.has(n) || t.current.getAll(n).forEach(function (e) {
              a.append(n, e);
            });
          };
          for (l.s(); !(e = l.n()).done;) o();
        } catch (i) {
          l.e(i);
        } finally {
          l.f();
        }
        return a;
      }, [n.search]),
      o = (0, i.s0)();
    return [a, (0, l.useCallback)(function (e, t) {
      o("?" + h(e), t);
    }, [o])];
  }
  function h(e) {
    return void 0 === e && (e = ""), new URLSearchParams("string" === typeof e || Array.isArray(e) || e instanceof URLSearchParams ? e : Object.keys(e).reduce(function (t, n) {
      var r = e[n];
      return t.concat(Array.isArray(r) ? r.map(function (e) {
        return [n, e];
      }) : [[n, r]]);
    }, []));
  }
},
7762: function (e, t, n) {
  "use strict";

  n.d(t, {
    Z: function () {
      return a;
    }
  });
  var r = n(181);
  function a(e, t) {
    var n = "undefined" !== typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
    if (!n) {
      if (Array.isArray(e) || (n = (0, r.Z)(e)) || t && e && "number" === typeof e.length) {
        n && (e = n);
        var a = 0,
          l = function () {};
        return {
          s: l,
          n: function () {
            return a >= e.length ? {
              done: !0
            } : {
              done: !1,
              value: e[a++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: l
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    var o,
      i = !0,
      u = !1;
    return {
      s: function () {
        n = n.call(e);
      },
      n: function () {
        var e = n.next();
        return i = e.done, e;
      },
      e: function (e) {
        u = !0, o = e;
      },
      f: function () {
        try {
          i || null == n.return || n.return();
        } finally {
          if (u) throw o;
        }
      }
    };
  }
},
7992: function (e, t, n) {
  "use strict";

  n.d(t, {
    Yw: function () {
      return m;
    }
  });
  var i,
    a = n(885),
    r = n(7313),
    o = n(3299),
    s = n(5982),
    c = n(4595),
    l = n(2335),
    u = n(3366),
    d = n(6417);
  !function (e) {
    e[e.None = 0] = "None", e[e.OK = 1] = "OK", e[e.NO = 2] = "NO", e[e.AddPosition = 3] = "AddPosition", e[e.LetsStart = 4] = "LetsStart", e[e.SitBeforeAndStart = 5] = "SitBeforeAndStart", e[e.AreYouReady = 6] = "AreYouReady", e[e.WaitFiveMin = 7] = "WaitFiveMin", e[e.WaitThreeMin = 8] = "WaitThreeMin", e[e.WaitOneMin = 9] = "WaitOneMin", e[e.INeedLeave = 10] = "INeedLeave", e[e.Bye = 11] = "Bye", e[e.IHaveToHangUp = 12] = "IHaveToHangUp", e[e.MyLastGame = 13] = "MyLastGame", e[e.StartAgain = 14] = "StartAgain", e[e.BeQuick = 15] = "BeQuick", e[e.Wait30S = 16] = "Wait30S", e[e.Wait60S = 17] = "Wait60S", e[e.Wait120S = 18] = "Wait120S", e[e.WaitMore = 19] = "WaitMore", e[e.Proud = 20] = "Proud", e[e.Sad = 21] = "Sad", e[e.Help = 22] = "Help", e[e.Thanks = 23] = "Thanks", e[e.Haha = 24] = "Haha";
  }(i || (i = {}));
  var m = function (e, t) {
      var n = e.playerList[t];
      return n.state === i.IHaveToHangUp || n.offline && +new Date() - n.offlineTime > 6e4;
    },
    f = [i.WaitFiveMin, i.WaitThreeMin, i.WaitOneMin, i.IHaveToHangUp, i.Wait30S, i.Wait60S, i.Wait120S, i.WaitMore],
    h = [[i.WaitFiveMin, 300], [i.WaitThreeMin, 180], [i.WaitOneMin, 60], [i.Wait30S, 30], [i.Wait60S, 60], [i.Wait120S, 120]],
    x = ["", "\u597d\u554a", "\u62b1\u6b49\uff0c\u4e0d\u884c", "\u623f\u4e3b\u52a0\u4e2a\u4f4d\u7f6e", "\u5f00\u59cb\u5427", "\u5927\u5bb6\u5f80\u524d\u5750\uff0c\u4e0d\u7b49\u4e86\uff0c\u51c6\u5907\u5f00", "\u51c6\u5907\u597d\u4e86\u5417\uff1f\u8981\u5f00\u59cb\u4e86", "\u7b49\u4e94\u5206\u949f\u5f00", "\u7b49\u4e09\u5206\u949f\u5f00", "\u7b49\u4e00\u5206\u949f\u5f00", "\u6211\u6709\u4e8b\u4e0d\u73a9\u4e86\uff0c\u62dc\u62dc", "\u62dc\u62dc", "\u6211\u6302\u673a\u4e86\uff0c\u4f60\u4eec\u73a9", "\u6700\u540e\u4e00\u5c40\uff0c\u73a9\u5b8c\u8fd9\u5c40\u6211\u4e0b\u4e86", "\u518d\u6765\u4e00\u5c40", "\u8bf7\u64cd\u4f5c\u5feb\u4e00\u70b9", "\u7b49\u6211\u601d\u800330\u79d2", "\u7b49\u6211\u601d\u800360\u79d2", "\u7b49\u6211\u601d\u8003120\u79d2", "\u6211\u4e34\u65f6\u6709\u4e8b\uff0c\u7b49\u6211\u51e0\u5206\u949f", "\u563f\u563f", "\u545c\u545c", "\u9976\u547d", "\u8c22\u8c22", "\u54c8\u54c8"],
    p = ["", "\ud83c\udd97", "\u274c", "\u2795", "\ud83c\udfae", "", "", "\u23f3", "\u23f3", "\u23f3", "\ud83d\udc4b", "\ud83d\udc4b", "\ud83c\udfc3", "\ud83d\udc4b", "\ud83c\udfae", "\ud83e\udd40", "\u23f3", "\u23f3", "\u23f3", "\ud83d\ude4f", "\ud83d\ude0e", "\ud83d\ude2d", "\ud83e\udd7a", "\ud83d\ude4f", "\ud83d\ude02"];
  t.ZP = function (e) {
    var t,
      n,
      m,
      j,
      y,
      b,
      g = e.room,
      v = e.index,
      w = e.isTurn,
      W = e.className,
      k = e.empty,
      A = e.children,
      z = e.send,
      Z = e.player,
      N = e.isMe,
      L = e.isOwner,
      C = e.position;
    g && void 0 !== v && (Z = g.playerList[v], N = g.position === v + 1, L = g.owner === v + 1, void 0 === C && (C = v + 1));
    var q = Z || {},
      O = q.source,
      T = void 0 === O ? 0 : O,
      S = q.emoji,
      D = void 0 === S ? "" : S,
      I = (q.name, q.imgUrl),
      P = void 0 === I ? "" : I,
      E = q.offline,
      U = (0, r.useState)(!1),
      G = (0, a.Z)(U, 2),
      M = G[0],
      K = G[1],
      B = (0, r.useState)(!1),
      _ = (0, a.Z)(B, 2),
      R = _[0],
      H = _[1],
      Y = (0, r.useState)(0),
      Q = (0, a.Z)(Y, 2),
      V = Q[0],
      F = Q[1],
      J = (0, r.useRef)(+new Date()),
      X = (0, r.useRef)(null),
      $ = (0, r.useRef)(0),
      ee = !E,
      te = (0, r.useMemo)(function () {
        return !D || T && P ? D : (0, o.ZF)(D) ? (0, o.mY)(D) > o.Dj + 5 ? D.substring(0, 2) : D : "\ud83d\ude0a";
      }, [D]),
      ne = !T && !D,
      ie = "absolute whitespace-nowrap px-1 translate-x-[-50%] rounded-full text-white text-xs ".concat(N ? "bg-orange-600" : "bg-gray-600"),
      ae = null !== (t = Z) && void 0 !== t && t.state ? Math.ceil((+new Date() - Z.stateTime) / 1e3) : 999999,
      re = !(null === (n = Z) || void 0 === n || !n.state) && ae < (f.includes(Z.state) ? 86400 : 30),
      oe = !ne && !!z && (!N || !R),
      se = (0, r.useState)(+new Date()),
      ce = (0, a.Z)(se, 2),
      le = ce[0],
      ue = ce[1];
    (0, r.useEffect)(function () {
      H(!1), K(!1), F(0), ue(+new Date());
    }, [T, D]), (0, r.useEffect)(function () {
      var e;
      if (null !== (e = Z) && void 0 !== e && e.state && !(+new Date() - J.current < 150 && ae > 3)) {
        H(!0);
        var t = window.setTimeout(function () {
          H(!1);
        }, 3e3);
        return function () {
          window.clearTimeout(t);
        };
      }
    }, [null === (m = Z) || void 0 === m ? void 0 : m.stateTime]), (0, r.useEffect)(function () {
      var e,
        t,
        n = null;
      return re && null !== (e = Z) && void 0 !== e && e.stateTime && null !== (t = Z) && void 0 !== t && t.state && h.findIndex(function (e) {
        var t;
        return e[0] === (null === (t = Z) || void 0 === t ? void 0 : t.state) || 0;
      }) >= 0 && (n = window.setInterval(function () {
        var e = +new Date();
        e - Z.stateTime > 303e3 ? (null !== n && window.clearInterval(n), n = null) : null !== n && ue(e);
      }, 300)), function () {
        null !== n && window.clearInterval(n), n = null;
      };
    }, [null === (j = Z) || void 0 === j ? void 0 : j.state, null === (y = Z) || void 0 === y ? void 0 : y.stateTime, re, h.findIndex(function (e) {
      var t;
      return e[0] === (null === (t = Z) || void 0 === t ? void 0 : t.state) || 0;
    }) >= 0]);
    var de = re && h.findIndex(function (e) {
      var t;
      return e[0] === (null === (t = Z) || void 0 === t ? void 0 : t.state) || 0;
    }) >= 0 ? h.find(function (e) {
      return e[0] === Z.state;
    })[1] : 60;
    return (0, d.jsxs)("div", {
      id: g ? "userseat".concat(v) : void 0,
      ref: X,
      className: "relative box-shadow w-14 h-14 rounded-full border text-center flex items-center justify-center ".concat(W || ""),
      children: [ne ? k : T && P ? (0, d.jsx)("div", {
        className: "head-image",
        style: {
          backgroundImage: 'url("'.concat(P, '")')
        }
      }) : (0, d.jsx)("div", {
        className: "text-2xl overflow-hidden",
        children: te
      }), L && (0, d.jsx)("div", {
        className: "".concat(ie, " top-0 left-[7px]"),
        children: "\u623f\u4e3b"
      }), !!C && (0, d.jsx)("div", {
        className: "".concat(ie, " font-mono top-[39px] left-[46px]"),
        children: C
      }), N ? (0, d.jsx)("div", {
        className: "".concat(ie, " top-[39px] left-[7px]"),
        children: "\u6211"
      }) : !ne && (0, d.jsx)("div", {
        className: "absolute left-[3px] top-[42px] border border-black rounded-full w-2.5 h-2.5 ".concat(ee ? "bg-green-500" : "bg-gray-500")
      }), re && (0, d.jsx)("div", {
        className: "absolute rounded-full w-4 h-4 leading-4 text-xs top-[20px] left-[-8px] text-black bg-white",
        children: p[Z.state] || "\ud83d\udcac"
      }), w && (0, d.jsx)("div", {
        className: "absolute text-lg top-[-6px] left-[37px] text-black ".concat(N ? " game-swing" : ""),
        children: "\u23f0\ufe0f"
      }), re && h.findIndex(function (e) {
        var t;
        return e[0] === (null === (t = Z) || void 0 === t ? void 0 : t.state) || 0;
      }) >= 0 && le - Z.stateTime < 1e3 * de && (0, d.jsx)("div", {
        className: "absolute h-1 rounded-full bg-black",
        style: {
          width: 56,
          top: -5
        },
        children: (0, d.jsx)("div", {
          className: "absolute h-1 transition-all rounded-full bg-purple-400",
          style: {
            minWidth: 0,
            maxWidth: 56,
            width: 56 * (1 - (le - Z.stateTime) / 1e3 / de)
          }
        })
      }), oe && (0, d.jsx)(c.Z, {
        noStyle: !0,
        className: "block absolute w-14 h-14 rounded-full",
        onClick: function () {
          if (M) K(!1);else if (X.current) {
            var e = X.current.getBoundingClientRect(),
              t = e.left + e.width / 2;
            t - 120 < 1 ? F(120 - t + 1) : t + 120 > window.innerWidth - 1 && F(-(t + 120 - window.innerWidth + 1)), K(!0);
          }
        }
      }), A, (0, d.jsxs)("div", {
        className: "absolute w-0 h-0",
        children: [R && !(null === (b = Z) || void 0 === b || !b.state) && (0, d.jsxs)("div", {
          className: "relative translate-x-[-50%] translate-y-[-50%] break-all text-center min-w-[72px] px-1 py-0.5 border rounded text-white text-xs border-black bg-gray-700 bg-opacity-90",
          style: {
            zIndex: 1008
          },
          children: [f.includes(Z.state) ? ae < 4 ? "" : ae < 121 ? "".concat(ae, "\u79d2\u524d:") : ae < 3600 ? "".concat(Math.ceil(ae / 60), "\u5206\u949f\u524d:") : "".concat((ae / 3600).toFixed(1), "\u5c0f\u65f6\u524d:") : "", p[Z.state] || "\ud83d\udcac", x[Z.state]]
        }), M && oe && (0, d.jsxs)("div", {
          className: "relative border translate-x-[-50%] overflow-y-auto rounded text-white text-sm border-black bg-gray-700 bg-opacity-90",
          style: {
            left: V,
            width: 240,
            maxHeight: 450,
            zIndex: 1009
          },
          children: [(0, d.jsx)("div", {
            className: "text-center",
            children: (0, d.jsx)(c.Z, {
              small: !0,
              className: "w-full",
              onClick: function () {
                return K(!1);
              },
              children: "\u5173\u95ed\u804a\u5929\u9762\u677f"
            })
          }), (0, d.jsx)("div", {
            children: N ? x.map(function (e, t) {
              var n;
              if (!t) return null;
              if (g) if (g.state) {
                if (t === i.IHaveToHangUp && !["ccbs", "ktd", "bzm", "fxq", "lm", "dy"].includes(l.s_.key)) return null;
                if ([i.AddPosition, i.LetsStart, i.SitBeforeAndStart, i.AreYouReady, i.WaitFiveMin, i.WaitThreeMin, i.WaitOneMin, i.INeedLeave, i.Bye].includes(t)) return null;
              } else {
                if (N && L && [i.AddPosition, i.LetsStart].includes(t)) return null;
                if (N && !L && [i.SitBeforeAndStart, i.AreYouReady, i.WaitFiveMin, i.WaitThreeMin, i.WaitOneMin].includes(t)) return null;
                if ([i.IHaveToHangUp, i.MyLastGame, i.StartAgain, i.BeQuick, i.Wait30S, i.Wait60S, i.Wait120S, i.WaitMore, i.Proud, i.Sad, i.Help, i.Thanks, i.Haha].includes(t)) return null;
              }
              return (0, d.jsx)(c.Z, {
                className: "block w-full leading-6".concat(t === (null === (n = Z) || void 0 === n ? void 0 : n.state) && re && f.includes(Z.state) ? " text-red-400" : ""),
                noStyle: !0,
                onClick: function () {
                  z(s.Z.PlayerUpdateUserInfo, {
                    payload: t
                  }), K(!1);
                },
                children: e
              }, t);
            }) : [["\u9001\ud83c\udf39", 3], ["\u9001\u2615\ufe0f", 9], ["\u6254\ud83e\udd5a", 15], ["\u6254\ud83e\ude74", 15]].map(function (e, t) {
              var n = (0, a.Z)(e, 2),
                i = n[0],
                r = n[1];
              return (0, d.jsx)(c.Z, {
                className: "block w-full leading-6",
                noStyle: !0,
                onClick: function () {
                  var e;
                  if (K(!1), !document.cookie.includes("gsid=")) return (0, u.Z)("\u70b9\u51fb\u4e0a\u9762\u7684 \u516d\u8fb9\u5f62Logo \u8bb8\u613f\uff0c\u5e76\u901a\u8fc7\u5fae\u4fe1\u767b\u9646\uff0c\u624d\u6709\u673a\u4f1a\u4f7f\u7528\u8be5\u529f\u80fd");
                  if (!g.position) return (0, u.Z)("\u70b9\u51fb\u4e0a\u9762\u7684 \u516d\u8fb9\u5f62Logo \u8bb8\u613f\uff0c\u52a0\u5165\u5ea7\u4f4d\u540e\uff0c\u624d\u6709\u673a\u4f1a\u4f7f\u7528\u8be5\u529f\u80fd");
                  if (((null === (e = g.playerList[g.position - 1]) || void 0 === e ? void 0 : e.wishCount) || 0) < r) return (0, u.Z)("\u6700\u8fd1\u51e0\u5929\u8bb8\u613f\u6b21\u6570\u4e0d\u591f\u591a\uff0c\u65e0\u6cd5\u4f7f\u7528".concat(i, "\uff0c\u70b9\u51fb\u4e0a\u9762\u7684 \u516d\u8fb9\u5f62Logo \u53bb\u8bb8\u613f\u5427\uff01"));
                  if (!g.state) return (0, u.Z)("\u5f00\u59cb\u540e\u624d\u80fd\u7528\u8be5\u529f\u80fd");
                  var n = +new Date();
                  n > $.current + 1400 && ($.current = n, z(s.Z.PlayerInteraction, {
                    payload: t << 5 | v
                  }));
                },
                children: i
              }, t);
            })
          })]
        })]
      })]
    });
  };
},
3299: function (e, t, n) {
  "use strict";

  n.d(t, {
    Dj: function () {
      return r;
    },
    Vo: function () {
      return o;
    },
    ZF: function () {
      return s;
    },
    mY: function () {
      return a;
    }
  });
  var i = new Map(),
    a = function (e) {
      var t = i.get(e);
      if (t) return t;
      var n = document.createElement("span");
      n.setAttribute("aria-hidden", "true"), n.setAttribute("class", "absolute top-0 opacity-0"), n.setAttribute("style", 'font-size:16px!important;font-family:Consolas,"Liberation Mono","Courier New",monospace'), n.textContent = e, document.body.appendChild(n);
      var a = n.clientWidth;
      return document.body.removeChild(n), i.set(e, a), a;
    },
    r = typeof document === "undefined" ? 16 : a("😀"),
    o = function (e, t) {
      return function (e) {
        return Math.abs(a(e) - r) < 7;
      }(e) ? e : t;
    },
    s = function (e) {
      return !new RegExp("\ud83c\uddf9\u200d?\ud83c\uddfc|[\\u" + "9a9a5c4c5c447fe07fd24e605201535267406bba6b7b4ea1827260278d4c8d3c8cca8ced6bd25ad65a3c903c64cd8279808f5993809b8fb17a2357fa9e2172d77f05819c86e48bc89a975f115a4a".match(/.{4}/g).join("\\u") + "]").test(e) && !["sb", "jb"].includes(e.toLowerCase());
    };
},
9414: function (n, e, t) {
  t.d(e, {
    HF: function () {
      return s;
    },
    Ie: function () {
      return o;
    },
    MP: function () {
      return i;
    },
    Ml: function () {
      return c;
    },
    YU: function () {
      return l;
    },
    vo: function () {
      return u;
    }
  });
  var r = t(4962),
    a = t(1124),
    i = function (n) {
      return "1" === n ? 3 : "2" === n ? 4 : 2;
    },
    c = function (n, e) {
      if (null === n) return null;
      var t = Number(n);
      return Math.min(e, Math.max(0, Number.isSafeInteger(t) ? t : 0));
    },
    o = function (n, e, t) {
      var c = i(e),
        o = (0, r.I)(n);
      if (!o) throw new Error("\u94fe\u63a5\u65e0\u6548");
      var l = (0, a.Eg)(o, c),
        s = l.view,
        u = l.offsets,
        d = (0, a.fX)();
      if (null !== t && "" !== t) {
        var f = (0, r.I)(t);
        if (!f) throw new Error("\u724c\u5e8f\u65e0\u6548");
        d = (0, a.lH)(s, f);
      }
      return {
        view: s,
        tail: d,
        playerCount: c,
        offsets: u
      };
    },
    l = function (n) {
      var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : (0, a.fX)(),
        t = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null,
        i = new URLSearchParams({
          p: (0, r.Z)((0, a.M_)(n))
        }),
        c = n.playerGem.length;
      return 2 !== c && i.set("r", String(c - 2)), e.some(function (n) {
        return n.length > 0;
      }) && i.set("ts", (0, r.Z)((0, a.fM)(n, e))), null !== t && i.set("s", String(t)), "?".concat(i.toString());
    },
    s = function (n) {
      var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : (0, a.fX)();
      return l(n, e, (0, a.h3)(n).length - 1);
    },
    u = function (n) {
      var e = new URLSearchParams(n);
      return e.delete("ts"), e;
    };
},
4962: function (n, e, t) {
  t.d(e, {
    I: function () {
      return a;
    },
    Z: function () {
      return i;
    }
  });
  var r = t(2982);
  function a(n) {
    if (n.length % 4 === 1) return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(n)) return null;
    var e = n.replace(/_/g, "/").replace(/-/g, "+");
    return e.length % 4 === 3 ? e += "=" : e.length % 4 === 2 && (e += "=="), new Uint8Array(Array.from(window.atob(e)).map(function (n) {
      return n.charCodeAt(0);
    }));
  }
  function i(n) {
    return window.btoa(String.fromCharCode.apply(String, (0, r.Z)(n))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
  }
},
2262: function (n, e, t) {
  var companionFeedbackBridge = t.bridge;
  t.d(e, {
    Z: function () {
      return E;
    }
  });
  var r = t(885),
    a = t(7313),
    i = t(1124),
    c = t(3797),
    o = t(6417);
  var l = function (n) {
      var e = n.id,
        t = n.eid,
        r = n.small,
        a = n.className,
        i = n.children;
      if (!e) return (0, o.jsx)("div", {
        id: t,
        className: "ccbs-noble-wrapper".concat(r ? " ccbs-small" : ""),
        children: (0, o.jsx)("div", {
          className: "ccbs-noble ccbs-empty"
        }),
        "data-guide-target": "ccbs.noble",
        "data-guide-id": e,
        "data-guide-small": !!r
      });
      var l = e - 1,
        s = c.Hf[l];
      return (0, o.jsx)("div", {
        id: t,
        className: "ccbs-noble-wrapper".concat(r ? " ccbs-small" : ""),
        children: (0, o.jsxs)("div", {
          className: "ccbs-noble ccbs-noble-".concat(l, " ").concat(a || ""),
          children: [(0, o.jsx)("div", {
            className: "ccbs-noble-left"
          }), (0, o.jsx)("div", {
            className: "ccbs-score right-0",
            children: "3"
          }), (0, o.jsx)("div", {
            className: "bottom-0.5 left-0.5 absolute flex flex-col-reverse",
            children: s.map(function (n, e) {
              return n > 0 && (0, o.jsx)("div", {
                className: "ccbs-rect m-0.5 basis-1/2 ccbs-color-".concat(e),
                children: n
              }, e);
            })
          }), i]
        }),
        "data-guide-target": "ccbs.noble",
        "data-guide-id": e,
        "data-guide-small": !!r
      });
    },
    s = t(4595),
    u = a.memo(function (n) {
      return companionFeedbackBridge.feedback ? (0, o.jsx)(companionFeedbackBridge.feedback, {
        event: n.lastOp,
        version: n.gameVersion,
        target: "ccbs.noble"
      }) : null;
    }, function (n, e) {
      return n.gameVersion === e.gameVersion;
    });
  var d = function (n) {
      var e = n.view,
        t = n.canAct,
        r = n.onAction,
        c = n.gameVersion,
        d = n.animate,
        f = e.waitNoble && t;
      return (0, o.jsxs)(o.Fragment, {
        children: [(0, o.jsx)("div", {
          className: "flex justify-center space-x-2",
          children: e.bankNoble.map(function (n, c) {
            var u = e.waitNoble && e.nobleCandidates.includes(c),
              d = (0, o.jsx)(l, {
                eid: "ccbs-noble-".concat(c),
                id: n,
                className: u ? "ccbs-candidate" : ""
              });
            return f && u ? (0, o.jsx)(s.Z, {
              noStyle: !0,
              className: "cursor-pointer",
              disabled: !(0, i.s0)(e, c),
              onClick: function () {
                t && (0, i.s0)(e, c) && r({
                  kind: "noble",
                  noblePos: c
                });
              },
              children: d
            }, n || -c) : (0, o.jsx)(a.Fragment, {
              children: d
            }, n || -c);
          })
        }), e.waitNoble && (0, o.jsx)("div", {
          className: "mt-1 text-sm",
          children: f ? "\u540c\u65f6\u6ee1\u8db3\u591a\u5f20\u8d35\u65cf\uff0c\u70b9\u51fb\u9ad8\u4eae\u7684\u90a3\u5f20\u83b7\u5f97\u5b83" : "\u7b49\u5f85\u73a9\u5bb6".concat(e.waitFor + 1, "\u9009\u62e9\u8d35\u65cf\u5361")
        }), d && (0, o.jsx)(u, {
          lastOp: e.lastOp,
          gameVersion: c
        })]
      });
    },
    f = t(2982),
    h = t(4942),
    p = t(7698);
  var m = function (n) {
      var e = n.id,
        t = n.eid,
        r = n.className,
        a = n.small,
        i = n.children;
      if (e < 0) return (0, o.jsx)("div", {
        id: t,
        className: "ccbs-card-wrapper".concat(a ? " ccbs-small" : ""),
        children: (0, o.jsx)("div", {
          className: "ccbs-card ccbs-type-5 ccbs-img-".concat(-e - 1, " ").concat(r || ""),
          children: i
        }),
        "data-guide-target": "ccbs.market",
        "data-guide-id": e,
        "data-guide-small": !!a
      });
      if (!e) return (0, o.jsx)("div", {
        id: t,
        className: "ccbs-card-wrapper".concat(a ? " ccbs-small" : ""),
        children: (0, o.jsx)("div", {
          className: "ccbs-card ccbs-empty ".concat(r || "")
        }),
        "data-guide-target": "ccbs.market",
        "data-guide-id": e,
        "data-guide-small": !!a
      });
      var l = e - 1,
        s = c.KI[l],
        u = c.dS[l],
        d = c.s2[l];
      return (0, o.jsx)("div", {
        id: t,
        className: "ccbs-card-wrapper".concat(a ? " ccbs-small" : ""),
        children: (0, o.jsxs)("div", {
          className: "ccbs-card ccbs-img-".concat(c.FL[l], " ccbs-type-").concat(u, " ").concat(r || ""),
          children: [(0, o.jsx)("div", {
            className: "ccbs-card-top"
          }), s > 0 && (0, o.jsx)("div", {
            className: "ccbs-score left-0.5",
            children: s
          }), (0, o.jsx)("div", {
            className: "absolute top-1 right-1 ccbs-rect ccbs-color-".concat(u)
          }), (0, o.jsx)("div", {
            className: "bottom-0.5 left-0.5 absolute flex flex-col-reverse flex-wrap max-h-[80px]",
            children: d.map(function (n, e) {
              return n > 0 && (0, o.jsx)("div", {
                className: "ccbs-circle m-0.5 basis-1/2 ccbs-color-".concat(e),
                children: n
              }, e);
            })
          }), i]
        }),
        "data-guide-target": "ccbs.market",
        "data-guide-id": e,
        "data-guide-small": !!a
      });
    },
    v = t(3366),
    b = a.memo(function (n) {
      return companionFeedbackBridge.feedback ? (0, o.jsx)(companionFeedbackBridge.feedback, {
        event: n.lastOp,
        version: n.gameVersion,
        target: "ccbs.market"
      }) : null;
    }, function (n, e) {
      return n.gameVersion === e.gameVersion;
    });
  function y(n) {
    var e = n.op,
      t = n.pos,
      r = n.id,
      a = n.eid,
      c = n.booked,
      l = n.view,
      u = n.onAction,
      d = n.setPaying,
      h = n.canAct,
      p = r - 1,
      b = (0, i.fU)(l, p, l.waitFor),
      y = b.spend,
      w = b.need,
      g = b.needGold,
      x = b.enough,
      k = b.hasChoice,
      j = y.reduce(function (n, e) {
        return n + e;
      });
    return (0, o.jsx)(m, {
      id: r,
      eid: a,
      children: (0, o.jsxs)("div", {
        className: "absolute mt-10 w-full text-center",
        children: [h && !c && 3 === e && (0, o.jsx)(s.Z, {
          disabled: !(0, i.EL)(l),
          onClick: function () {
            h && (0, i.EL)(l) && u({
              kind: "book",
              cardId: p,
              pos: t
            });
          },
          children: "\u9884\u5b9a"
        }), h && 2 === e && (x ? (0, o.jsxs)(o.Fragment, {
          children: [(0, o.jsx)("div", {
            className: "bg-gray-600 text-white",
            children: j || g ? "\u82b1\u8d39".concat((0, i.RJ)([].concat((0, f.Z)(y), [g]))).concat(k ? "?" : "") : "\u514d\u8d39"
          }), (0, o.jsx)("div", {
            children: (0, o.jsx)(s.Z, {
              disabled: !(0, i.Wq)(l, p),
              onClick: function () {
                h && (0, i.Wq)(l, p) && (k ? ((0, v.Z)("\u8fd9\u5f20\u724c\u6709\u591a\u79cd\u652f\u4ed8\u65b9\u5f0f\uff0c\u8bf7\u5728\u4e0b\u65b9\u9009\u62e9\u4e00\u79cd"), d({
                  cardId: p,
                  pos: t,
                  booked: !!c
                })) : u({
                  kind: "buy",
                  cardId: p,
                  pos: t,
                  booked: !!c,
                  payment: {
                    spend: y,
                    gold: g
                  }
                }));
              },
              children: k ? "\u8d2d\u4e70?" : "\u8d2d\u4e70"
            })
          })]
        }) : (0, o.jsx)("div", {
          className: "bg-gray-600 text-white",
          children: "\u7f3a".concat((0, i.RJ)(w))
        }))]
      })
    });
  }
  var w = function (n) {
      var e = n.view,
        t = n.op,
        r = n.onAction,
        a = n.setPaying,
        c = n.playerId,
        l = n.canAct,
        u = n.gameVersion,
        d = n.knownDecks,
        f = n.revealBooked,
        h = n.animate,
        p = e.bankCard,
        v = [p[2], p[1], p[0]],
        w = null !== c ? e.playerBooked[c] : [];
      return (0, o.jsxs)("div", {
        children: [v.map(function (n, c) {
          var u = 2 - c,
            f = e.bankLeftCardCount[u];
          return (0, o.jsxs)("div", {
            className: "flex justify-center origin-top space-x-2 mt-2",
            children: [(0, o.jsxs)(m, {
              id: c - 3,
              eid: "ccbs-card-".concat(u),
              className: f ? "" : " opacity-50",
              children: [(0, o.jsx)("div", {
                className: "absolute ccbs-left-count top-4 right-4",
                children: f
              }), !(null === d || void 0 === d || !d[u].length) && (0, o.jsx)("div", {
                className: "absolute bottom-2 w-full text-center bg-white text-black text-lg",
                children: "\u5df2\u77e5 ".concat(d[u].length, " \u5f20")
              }), l && 3 === t && f > 0 && (0, o.jsx)("div", {
                className: "absolute mt-10 w-full",
                children: (0, o.jsx)(s.Z, {
                  disabled: !(0, i.EL)(e),
                  onClick: function () {
                    l && (0, i.EL)(e) && f > 0 && r({
                      kind: "deck",
                      level: u
                    });
                  },
                  children: "\u9884\u5b9a"
                })
              })]
            }), n.map(function (n, i) {
              return n ? (0, o.jsx)(y, {
                id: n,
                eid: "ccbs-card-".concat(u, "-").concat(i),
                pos: i,
                view: e,
                op: t,
                canAct: l,
                onAction: r,
                setPaying: a
              }, n) : (0, o.jsx)(m, {
                id: 0,
                eid: "ccbs-card-".concat(u, "-").concat(i)
              }, -i);
            })]
          }, c);
        }), w.length > 0 && (0, o.jsx)("div", {
          className: "flex justify-center origin-top bg-gray-400 bg-opacity-50 space-x-2 py-2 mt-2",
          children: w.map(function (n, i) {
            return (0, o.jsx)(y, {
              id: n + 1,
              pos: i,
              booked: !0,
              view: e,
              op: t,
              canAct: l,
              onAction: r,
              setPaying: a
            }, n);
          })
        }), h && (0, o.jsx)(b, {
          gameVersion: u,
          lastOp: e.lastOp,
          revealBooked: f
        })]
      });
    },
    g = [],
    x = a.memo(function (n) {
      return companionFeedbackBridge.feedback ? (0, o.jsx)(companionFeedbackBridge.feedback, {
        event: n.lastOp,
        version: n.gameVersion,
        target: "ccbs.bank"
      }) : null;
    }, function (n, e) {
      return n.gameVersion === e.gameVersion;
    });
  var k = function (n) {
    var e = n.view,
      t = n.op,
      c = n.setOp,
      l = n.onAction,
      u = n.canAct,
      d = n.gameVersion,
      h = n.animate,
      p = (0, a.useState)(g),
      m = (0, r.Z)(p, 2),
      b = m[0],
      y = m[1];
    return (0, a.useEffect)(function () {
      y(g);
    }, [t, d]), (0, o.jsxs)(o.Fragment, {
      children: [(0, o.jsx)("div", {
        className: "mt-4 flex items-center justify-center space-x-6",
        children: e.bankGem.map(function (n, r) {
          if (!u || 1 !== t) return (0, o.jsx)("div", {
            className: "ccbs-circle ccbs-color-".concat(r, " scale-125").concat(n ? "" : " opacity-50"),
            children: n,
            "data-guide-target": "ccbs.bank",
            "data-guide-id": r
          }, r);
          var a = n - b.filter(function (n) {
            return n === r;
          }).length;
          return (0, o.jsx)("div", {
            children: (0, o.jsx)(s.Z, {
              noStyle: !0,
              className: "ccbs-circle ccbs-color-".concat(r, " scale-125").concat(n ? "" : " opacity-50"),
              disabled: !!(0, i.th)(e, b, r),
              onClick: function () {
                if (u) {
                  var n = (0, i.th)(e, b, r);
                  return n ? (0, v.Z)(n) : y([].concat((0, f.Z)(b), [r]));
                }
              },
              children: a,
              "data-guide-target": "ccbs.bank",
              "data-guide-id": r
            })
          }, r);
        })
      }), h && (0, o.jsx)(x, {
        lastOp: e.lastOp,
        gameVersion: d
      }), u && 1 === t && (0, o.jsxs)("div", {
        className: "mt-2 p-2 bg-gray-400 bg-opacity-50 flex items-center justify-center",
        children: [(0, o.jsx)("div", {
          className: "flex items-center space-x-6 h-8 w-40",
          children: b.map(function (n, e) {
            return (0, o.jsx)(s.Z, {
              noStyle: !0,
              className: "ccbs-circle ccbs-color-".concat(n),
              onClick: function () {
                y(function (n) {
                  var t = (0, f.Z)(n);
                  return t.splice(e, 1), t;
                });
              }
            }, e);
          })
        }), (0, o.jsxs)("div", {
          children: [(0, o.jsx)(s.Z, {
            small: !0,
            disabled: !(0, i.Cs)(e, b),
            primary: 3 === b.length || 2 === b.length && b[0] === b[1],
            onClick: function () {
              u && (0, i.Cs)(e, b) && l({
                kind: "take",
                selected: b
              });
            },
            children: "\u786e\u8ba4\u62ff\u8fd9\u4e9b",
            "data-guide-target": "ccbs.confirm"
          }), (0, o.jsx)(s.Z, {
            className: "ml-4",
            small: !0,
            onClick: function () {
              return c(0);
            },
            children: "\u53d6\u6d88"
          })]
        })]
      })]
    });
  };
  var j = function (n) {
    var e = n.view,
      t = n.revealBooked,
      r = n.renderSeat,
      a = !!e.winner.length;
    return (0, o.jsx)("div", {
      className: "mt-4 px-2",
      children: e.playerGem.map(function (n, i) {
        var s = n[5];
        return (0, o.jsxs)("div", {
          className: "my-3",
          children: [(0, o.jsxs)("div", {
            className: "flex flex-wrap items-center justify-center",
            children: [(0, o.jsx)("div", {
              className: "mr-1 flex flex-col items-center",
              children: r ? r(i) : (0, o.jsx)("div", {
                className: a || e.waitFor !== i ? "" : "font-bold underline",
                children: "\u73a9\u5bb6".concat(i + 1)
              })
            }), (0, o.jsx)("div", {
              className: "w-10",
              children: "".concat(e.playerScore[i], "\u5206"),
              "data-guide-target": "ccbs.score",
              "data-guide-player": i
            }), new Array(5).fill(0).map(function (t, r) {
              var a = e.playerCardCount[i][r],
                c = n[r];
              return (0, o.jsxs)("div", {
                className: "w-8",
                children: [(0, o.jsx)("div", {
                  className: "ccbs-rect ccbs-color-".concat(r, " mx-auto").concat(a ? "" : " opacity-50"),
                  children: a
                }), (0, o.jsx)("div", {
                  className: "h-[22.5px]",
                  children: (0, o.jsx)("div", {
                    className: "ccbs-circle ccbs-color-".concat(r, " scale-75 mx-auto").concat(c ? "" : " opacity-50"),
                    children: c
                  })
                })]
              }, r);
            }), (0, o.jsx)("div", {
              className: "w-8",
              children: (0, o.jsx)("div", {
                className: "h-[22.5px]",
                children: (0, o.jsx)("div", {
                  className: "ccbs-circle ccbs-color-5 scale-75 mt-7".concat(s ? "" : " opacity-50"),
                  children: s
                })
              })
            }), !t && (0, o.jsx)("div", {
              style: {
                width: 76
              },
              className: "flex",
              children: e.playerBooked[i].map(function (n, reservedIndex) {
                return (0, o.jsx)("div", {
                  style: {
                    width: 19
                  },
                  children: (0, o.jsx)(m, {
                    id: n < 0 ? n : -1 - c.XO[n],
                    small: !0
                  })
                }, n >= 0 ? n : "hidden-" + reservedIndex);
              })
            }), (0, o.jsx)("div", {
              style: {
                width: 72
              },
              className: "flex",
              children: e.playerNoble[i].map(function (n) {
                return (0, o.jsx)("div", {
                  style: {
                    width: 18
                  },
                  children: (0, o.jsx)(l, {
                    id: n + 1,
                    small: !0
                  })
                }, n);
              })
            })]
          }), t && e.playerBooked[i].length > 0 && (0, o.jsx)("div", {
            className: "flex flex-wrap items-center justify-center gap-2 mt-2",
            children: e.playerBooked[i].map(function (n, reservedIndex) {
              return (0, o.jsx)(m, {
                id: n + 1,
                small: !0
              }, n >= 0 ? n : "hidden-" + reservedIndex);
            })
          })]
        }, i);
      })
    });
  };
  var N = function (n) {
    var e = n.view,
      t = n.onAction,
      c = e.playerGem[e.waitFor],
      l = (0, a.useState)([]),
      u = (0, r.Z)(l, 2),
      d = u[0],
      h = u[1],
      p = (0, i.QU)(e, e.waitFor),
      m = new Array(6).fill(0).map(function (n, e) {
        return d.filter(function (n) {
          return Number(n.split("-")[0]) === e;
        }).length;
      });
    return (0, o.jsxs)("div", {
      className: "mt-2",
      children: [(0, o.jsx)("div", {
        children: "\u8bf7\u4e22\u5f03 ".concat(p, " \u4e2a\u5b9d\u77f3\uff0c\u5df2\u9009 ").concat(d.length, " \u4e2a")
      }), (0, o.jsx)("div", {
        className: "mt-2 space-x-2 p-2 bg-gray-400 bg-opacity-50",
        children: new Array(6).fill(0).map(function (n, e) {
          return new Array(c[e]).fill(0).map(function (n, t) {
            var r = "".concat(e, "-").concat(t);
            return (0, o.jsx)(s.Z, {
              noStyle: !0,
              className: "ccbs-circle ccbs-color-".concat(e).concat(d.includes(r) ? " -translate-y-4" : ""),
              onClick: function () {
                return h(function (n) {
                  var e = (0, f.Z)(n),
                    t = e.indexOf(r);
                  return t >= 0 ? e.splice(t, 1) : e.push(r), e;
                });
              }
            }, r);
          });
        })
      }), (0, o.jsx)("div", {
        className: "mt-4",
        children: (0, o.jsx)(s.Z, {
          small: !0,
          primary: !0,
          disabled: !(0, i.y5)(e, m),
          onClick: function () {
            (0, i.y5)(e, m) && t({
              kind: "throw",
              gemDelta: m
            });
          },
          children: "\u786e\u8ba4\u4e22\u5f03"
        })
      })]
    });
  };
  var C = function (n) {
      var e,
        t = n.view,
        r = n.playerId,
        a = n.readOnly,
        c = n.spectator,
        l = n.op,
        u = n.setOp,
        d = n.candidates,
        f = n.onAction,
        h = n.skipAfk,
        p = n.gameVersion,
        m = null !== r && !a,
        v = t.winner,
        b = t.waitFor + 1,
        y = t.waitThrowing,
        w = t.waitNoble,
        g = !!v.length,
        x = d.some(function (n) {
          return "take" === n.kind;
        }),
        k = m && r === t.waitFor && !g && !y && !w,
        j = d.some(function (n) {
          return "book" === n.kind || "deck" === n.kind;
        }),
        C = d.some(function (n) {
          return "pass" === n.kind;
        });
      return e = g ? "\u6e38\u620f\u7ed3\u675f\uff0c\u606d\u559c\u73a9\u5bb6".concat(v.join("\u548c\u73a9\u5bb6"), "\u80dc\u5229") : "\u7b49\u5f85\u73a9\u5bb6".concat(b, w ? "\u9009\u62e9\u8981\u83b7\u5f97\u7684\u8d35\u65cf\u5361" : y ? "\u4e22\u5f03\u591a\u4f59\u5b9d\u77f3\uff08\u6bcf\u4eba\u6700\u591a\u6301\u670910\u4e2a\uff09" : "\u64cd\u4f5c"), m && !g && (e = e.replace("\u73a9\u5bb6".concat(r + 1), "\u4f60")), t.lastTurn && !g && (e += "\u3010\u6700\u540e\u4e00\u56de\u5408\u3011"), (0, o.jsxs)(o.Fragment, {
        children: [(0, o.jsx)("div", {
          className: "mt-4",
          children: e
        }), m && (0, o.jsxs)(o.Fragment, {
          children: [!g && h && (0, o.jsx)("div", {
            className: "py-2",
            children: (0, o.jsx)(s.Z, {
              primary: !0,
              small: !0,
              onClick: function () {
                if (h && m && !g) {
                  var n = (0, i.Q$)(t);
                  n && h(n);
                }
              },
              children: "\u8be5\u73a9\u5bb6\u5df2\u6302\u673a\uff0c\u70b9\u6b64\u8df3\u8fc7\u4ed6\u7684\u56de\u5408"
            })
          }), !g && (0, o.jsxs)("div", {
            className: "flex justify-between max-w-[380px] mx-auto mt-2 px-2",
            children: [(0, o.jsx)(s.Z, {
              small: !0,
              disabled: !x || 1 === l,
              onClick: function () {
                return u(1);
              },
              children: "\ud83d\udc8e\u53d6\u5b9d\u77f3",
              "data-guide-target": "ccbs.take"
            }), (0, o.jsx)(s.Z, {
              small: !0,
              disabled: !k || 2 === l,
              onClick: function () {
                return u(2);
              },
              children: "\ud83d\udcb0\u8d2d\u4e70\u53d1\u5c55\u5361",
              "data-guide-target": "ccbs.buy"
            }), (0, o.jsx)(s.Z, {
              small: !0,
              disabled: !j || 3 === l,
              onClick: function () {
                return u(3);
              },
              children: "\ud83d\udcb3\u9884\u5b9a\u53d1\u5c55\u5361"
            }), (0, o.jsx)(s.Z, {
              small: !0,
              disabled: !C || 4 === l,
              onClick: function () {
                return u(4);
              },
              children: "\u274c\u653e\u5f03"
            })]
          }), !g && (0, o.jsxs)("div", {
            className: "flex items-center mt-4 justify-center space-x-4 text-sm px-2",
            children: [!l && (0, o.jsx)("div", {
              className: "h-6"
            }), 1 === l && (0, o.jsx)("div", {
              className: "h-6",
              children: "\u62ff2\u4e2a\u76f8\u540c\u62163\u4e2a\u4e0d\u540c\u5b9d\u77f3\u3002\u4f60\u5df2\u6709".concat(t.playerGem[r].reduce(function (n, e) {
                return n + e;
              }), "\u4e2a\uff0c\u6700\u591a\u670910\u4e2a")
            }), 2 === l && (0, o.jsxs)(o.Fragment, {
              children: [(0, o.jsx)("div", {
                children: "\u8bf7\u9009\u62e91\u4e2a\u53d1\u5c55\u5361\u8d2d\u4e70"
              }), (0, o.jsx)(s.Z, {
                small: !0,
                className: "flex-shrink-0",
                onClick: function () {
                  return u(0);
                },
                children: "\u53d6\u6d88"
              })]
            }), 3 === l && (0, o.jsxs)(o.Fragment, {
              children: [(0, o.jsx)("div", {
                children: "\u8bf7\u4ece\u94f6\u884c\u9009\u62e91\u4e2a\u53d1\u5c55\u5361\u9884\u5b9a"
              }), (0, o.jsx)(s.Z, {
                small: !0,
                onClick: function () {
                  return u(0);
                },
                children: "\u53d6\u6d88"
              })]
            }), 4 === l && (0, o.jsxs)(o.Fragment, {
              children: [(0, o.jsx)("div", {
                children: "\u786e\u8ba4\u653e\u5f03\u672c\u56de\u5408\u64cd\u4f5c\u5417?"
              }), (0, o.jsx)(s.Z, {
                small: !0,
                disabled: !C,
                onClick: function () {
                  C && f({
                    kind: "pass"
                  });
                },
                children: "\u786e\u8ba4\u653e\u5f03"
              }), (0, o.jsx)(s.Z, {
                small: !0,
                onClick: function () {
                  return u(0);
                },
                children: "\u53d6\u6d88"
              })]
            })]
          }), y && r === t.waitFor && (0, o.jsx)(N, {
            view: t,
            onAction: f
          }, p)]
        }), c && (0, o.jsx)("div", {
          className: "text-2xl mt-2",
          children: "\u89c2\u6218\u4e2d"
        })]
      });
    },
    O = t(1413);
  var Z = function (n) {
    var e = n.view,
      t = n.paying,
      r = n.setPaying,
      a = n.onAction,
      c = n.canAct;
    if (!t || !c) return null;
    var l = (0, i.h)(e, t.cardId, e.waitFor);
    return (0, o.jsxs)("div", {
      className: "mt-2 p-2 bg-gray-400 bg-opacity-50",
      children: [(0, o.jsx)("div", {
        className: "text-sm",
        children: "\u8bf7\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f"
      }), (0, o.jsx)("div", {
        className: "flex flex-wrap items-center justify-center mt-1",
        children: l.map(function (n, r) {
          return (0, o.jsx)(s.Z, {
            small: r > 0,
            primary: 0 === r,
            className: "m-1",
            disabled: !(0, i.Wq)(e, t.cardId),
            onClick: function () {
              c && (0, i.Wq)(e, t.cardId) && a((0, O.Z)((0, O.Z)({
                kind: "buy"
              }, t), {}, {
                payment: n
              }));
            },
            children: (0, i.RJ)([].concat((0, f.Z)(n.spend), [n.gold]))
          }, "".concat(n.spend.join(), "-").concat(n.gold));
        })
      }), (0, o.jsx)(s.Z, {
        small: !0,
        className: "mt-1",
        onClick: function () {
          return r(null);
        },
        children: "\u53d6\u6d88"
      })]
    });
  };
  var E = function (n) {
    var e = n.view,
      t = n.playerId,
      c = n.readOnly,
      l = void 0 !== c && c,
      s = n.revealBooked,
      u = void 0 !== s && s,
      f = n.knownDecks,
      h = n.onAction,
      p = n.version,
      m = n.renderSeat,
      v = n.afkPlayerId,
      b = void 0 === v ? null : v,
      y = (0, a.useState)(0),
      g = (0, r.Z)(y, 2),
      x = g[0],
      N = g[1],
      O = (0, a.useState)(null),
      E = (0, r.Z)(O, 2),
      L = E[0],
      A = E[1];
    (0, a.useEffect)(function () {
      N(0);
    }, [p]), (0, a.useEffect)(function () {
      A(null);
    }, [x, p]);
    var I = !l && t === e.waitFor && !e.winner.length,
      B = I && !e.waitNoble && !e.waitThrowing,
      S = (0, a.useMemo)(function () {
        return I && null !== t ? (0, i.t2)(e, t) : [];
      }, [e, t, I]),
      F = B ? x : 0,
      P = !(l && u),
      G = function (n) {
        I && null !== t && (0, i.Us)(e, n, t) && h(n);
      };
    return (0, o.jsxs)("div", {
      className: "text-center splendor-table",
      children: [(0, o.jsxs)("div", {
        className: "table-public",
        children: [(0, o.jsx)(d, {
          view: e,
          canAct: I,
          onAction: G,
          gameVersion: p,
          animate: P
        }), (0, o.jsx)(w, {
          view: e,
          op: F,
          playerId: t,
          canAct: B,
          onAction: G,
          setPaying: A,
          gameVersion: p,
          knownDecks: f,
          revealBooked: u,
          animate: P
        })]
      }), (0, o.jsxs)("div", {
        className: "table-actions",
        children: [(0, o.jsx)(Z, {
          view: e,
          paying: 2 === F ? L : null,
          setPaying: A,
          onAction: G,
          canAct: B
        }), (0, o.jsx)(k, {
          view: e,
          op: F,
          setOp: N,
          onAction: G,
          canAct: B,
          gameVersion: p,
          animate: P
        }, p), (0, o.jsx)(C, {
          view: e,
          playerId: t,
          readOnly: l,
          spectator: null === t && !u,
          op: F,
          setOp: N,
          candidates: S,
          onAction: G,
          skipAfk: b !== e.waitFor || l || null === t || t === e.waitFor ? void 0 : h,
          gameVersion: p
        })]
      }), (0, o.jsxs)("details", {
        className: "table-collection",
        open: true,
        children: [(0, o.jsx)("summary", {
          children: "玩家与收藏"
        }), (0, o.jsx)(j, {
          view: e,
          revealBooked: u,
          renderSeat: m
        })]
      })]
    });
  };
},
2078: function (e, a, t) {
  var companionMapBridge = t.bridge;
  var companionBridge = t.bridge;
  t.r(a), t.d(a, {
    default: function () {
      return _;
    }
  });
  var r = t(1413),
    n = t(2982),
    s = t(885),
    o = t(7313),
    c = t(3366),
    i = t(4595),
    l = t(3953),
    u = t(5982),
    d = t(738),
    p = t(3299),
    f = t(6634),
    h = ["\ud83c\udf32", (0, p.Vo)("\ud83e\uddf1", "\ud83d\udd36"), "\ud83d\udc11", "\ud83c\udf3e", (0, p.Vo)("\ud83e\udea8", "\ud83d\uddfb")],
    y = ["\ud83d\ude08", (0, p.Vo)("\ud83d\udee3", "\ud83d\udccf"), "\ud83c\udfe6", "\ud83d\udc6e", "\ud83c\udfc6"],
    m = t(4929),
    x = t(6417);
  function v(e) {
    var a = e.count,
      t = [[0, "#105020", "#8ddb56", "#1d5728", "#1f9d34", "#0d913d", "\ud83c\udf32"], [1, "#be1622", "#ed8233", "#be1920", "#ea772f", "#dc5623", h[1]], [2, "#4e7200", "#b1c100", "#4e7200", "#a2b801", "#86b412", "\ud83d\udc11"], [3, "#936300", "#ffd25d", "#956401", "#fec53e", "#eab10b", "\ud83c\udf3e"], [4, "#666666", "#b9bcbb", "#686868", "#b5bbb7", "#989e9a", h[4]], [7, "#877d52", "#d7cb9a", "#887c50", "#d9d295", "#c5bc7c", "\ud83c\udf35"]];
    return (0, x.jsxs)("defs", {
      children: [(0, x.jsx)("path", {
        id: "tile-bg0",
        d: "M0,-202L174.937,-101V101L0,202L-174.937,101V-101Z",
        fill: "#e0b568"
      }), (0, x.jsx)("path", {
        id: "tile-bg1",
        d: "M0,-184L159.349,-92V92L0,184L-159.349,92V-92Z"
      }), (0, x.jsx)("path", {
        id: "tile-bg2",
        d: "M0,-182L157.617,-91V91L0,182L-157.617,91V-91Z"
      }), (0, x.jsx)("path", {
        id: "tile-bg3",
        d: "M0,-170L147.224,-85V85L0,170L-147.224,85V-85Z"
      }), (0, x.jsx)("path", {
        id: "tile-bg4",
        d: "M0,-166L143.760,-83V83L0,166L-143.760,83V-83Z"
      }), t.map(function (e) {
        return (0, x.jsxs)("g", {
          id: "tr".concat(e[0]),
          children: [(0, x.jsx)("use", {
            xlinkHref: "#tile-bg0"
          }), (0, x.jsx)("use", {
            xlinkHref: "#tile-bg1",
            fill: e[1]
          }), (0, x.jsx)("use", {
            xlinkHref: "#tile-bg2",
            fill: e[2]
          }), (0, x.jsx)("use", {
            xlinkHref: "#tile-bg3",
            fill: e[3]
          }), (0, x.jsxs)("radialGradient", {
            id: "radial".concat(e[0]),
            r: "50%",
            children: [(0, x.jsx)("stop", {
              offset: "0%",
              stopColor: e[4]
            }), (0, x.jsx)("stop", {
              offset: "100%",
              stopColor: e[5]
            })]
          }), (0, x.jsx)("use", {
            xlinkHref: "#tile-bg4",
            fill: "url(#radial".concat(e[0], ")")
          }), (0, x.jsx)("text", {
            alignmentBaseline: "central",
            dominantBaseline: "central",
            textAnchor: "middle",
            fontSize: "88",
            y: "-80",
            className: "ktd-emoji-shadow",
            children: e[6]
          })]
        }, e[0]);
      }), (0, x.jsxs)("linearGradient", {
        id: "sea1",
        gradientUnits: "userSpaceOnUse",
        x1: "79.76",
        y1: "-138.45",
        x2: "60",
        y2: "-104.23",
        children: [(0, x.jsx)("stop", {
          offset: ".4",
          stopColor: "#57afd6"
        }), (0, x.jsx)("stop", {
          offset: "1",
          stopColor: "#064f80"
        })]
      }), (0, x.jsxs)("linearGradient", {
        id: "sea2",
        gradientUnits: "userSpaceOnUse",
        x1: "79.76",
        y1: "-138.45",
        x2: "60",
        y2: "-104.23",
        gradientTransform: "rotate(60)",
        children: [(0, x.jsx)("stop", {
          offset: ".4",
          stopColor: "#57afd6"
        }), (0, x.jsx)("stop", {
          offset: "1",
          stopColor: "#064f80"
        })]
      }), (0, x.jsxs)("g", {
        id: "ts1",
        children: [(0, x.jsx)("path", {
          d: "M0,-200.76L173.86,-100.38v60L-51.96,-170.76Z",
          fill: "url(#sea1)"
        }), (0, x.jsx)("path", {
          d: "M0,-200.76L173.86,-100.38v16.08L-13.93,-192.72Z",
          fill: "#e0b568"
        })]
      }), (0, x.jsxs)("g", {
        id: "ts2",
        children: [(0, x.jsx)("path", {
          d: "M0,-200.76L173.86,-100.38L121.9,-70.38L-51.96,-170.76Z",
          fill: "url(#sea1)"
        }), (0, x.jsx)("path", {
          d: "M173.86,-100.38L121.9,-70.38V130.38L173.86,100.38Z",
          fill: "url(#sea2)"
        }), (0, x.jsx)("path", {
          d: "M0,-200.76L173.86,-100.38V100.38L160.11,108.32v-200.76L-13.75,-192.82Z",
          fill: "#e0b568"
        })]
      }), (0, x.jsxs)("g", {
        id: "n",
        children: [(0, x.jsx)("path", {
          d: "M117.2 133.4H24A17 17 0 017 116.5V23.2A17 17 0 0123.9 6.3h93.3a17 17 0 0116.9 16.9v93.3a17 17 0 01-16.9 17z",
          opacity: ".5"
        }), (0, x.jsx)("path", {
          d: "M112.3 129.3H19a17 17 0 01-16.9-17V19A17 17 0 0119 2.2h93.3a17 17 0 0117 16.8v93.4a17 17 0 01-17 16.9z",
          fill: "#eae9e4"
        })]
      }), [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(function (e) {
        var a = 6 === e || 8 === e ? "#cc0000" : "#004405";
        return (0, x.jsxs)("g", {
          id: "n".concat(e),
          children: [(0, x.jsx)("use", {
            xlinkHref: "#n",
            x: "-64.8",
            y: "-15"
          }), (0, x.jsx)("text", {
            className: "font-mono font-bold",
            alignmentBaseline: "central",
            dominantBaseline: "central",
            textAnchor: "middle",
            fill: a,
            fontSize: "90",
            y: "45",
            children: e
          }), new Array(6 - Math.abs(7 - e)).fill(0).map(function (e, t, r) {
            return (0, x.jsx)("circle", {
              r: "5",
              fill: a,
              cx: 20 * (t - r.length / 2 + .5),
              cy: "95"
            }, t);
          })]
        }, e);
      }), (0, x.jsx)("text", {
        id: "rob",
        className: "ktd-emoji-shadow",
        fontSize: "110",
        x: "-130",
        y: "45",
        children: "\ud83d\ude08"
      }), (0, x.jsxs)("g", {
        id: "pier",
        children: [(0, x.jsx)("rect", {
          width: "66",
          height: "240",
          stroke: "#603a10",
          strokeWidth: "5",
          x: "7",
          fill: "#dc9020"
        }), (0, x.jsx)("path", {
          stroke: "#925e1e",
          strokeWidth: "6",
          fill: "none",
          d: "M9,40H71M9,80H71M9,120H71M9,160H71M9,200H71"
        })]
      }), (0, x.jsxs)("g", {
        id: "tp",
        children: [(0, x.jsx)("use", {
          xlinkHref: "#pier",
          x: "-40",
          y: "-380",
          transform: "scale(0.5),rotate(60,0,0)"
        }), (0, x.jsx)("use", {
          xlinkHref: "#pier",
          x: "-40",
          y: "-380",
          transform: "scale(0.5)"
        })]
      }), (0, x.jsxs)("g", {
        id: "tp7",
        children: [(0, x.jsx)("circle", {
          r: "50",
          fill: "#eae9e4"
        }), (0, x.jsx)(m.Z, {
          fontSize: "46",
          fontWeight: "700",
          y: "-19",
          children: "?"
        }), (0, x.jsx)(m.Z, {
          fontSize: "36",
          fontWeight: "700",
          y: "22",
          children: "3:1"
        })]
      }), h.map(function (e, a) {
        return (0, x.jsxs)("g", {
          id: "tp".concat(a),
          children: [(0, x.jsx)("circle", {
            r: "50",
            fill: "#eae9e4"
          }), (0, x.jsx)(m.Z, {
            fontSize: "46",
            y: "-19",
            children: e
          }), (0, x.jsx)(m.Z, {
            fontSize: "36",
            fontWeight: "700",
            y: "22",
            children: "2:1"
          })]
        }, a);
      }), f.DM.slice(0, a).map(function (e, a) {
        return (0, x.jsxs)(o.Fragment, {
          children: [(0, x.jsxs)("radialGradient", {
            id: "vr".concat(a),
            r: "100%",
            children: [(0, x.jsx)("stop", {
              offset: "10%",
              stopColor: f.SR[a][0]
            }), (0, x.jsx)("stop", {
              offset: "100%",
              stopColor: f.SR[a][1]
            })]
          }), (0, x.jsxs)("linearGradient", {
            id: "cr".concat(a),
            gradientUnits: "userSpaceOnUse",
            x1: "0",
            y1: "59",
            x2: "0",
            y2: "96",
            children: [(0, x.jsx)("stop", {
              offset: ".26",
              stopColor: f.SR[a][1]
            }), (0, x.jsx)("stop", {
              offset: ".4",
              stopColor: f.SR[a][0]
            })]
          }), (0, x.jsxs)("g", {
            id: "city".concat(a),
            transform: "translate(-64, -64)",
            children: [(0, x.jsx)("path", {
              fill: "url(#cr".concat(a, ")"),
              stroke: "none",
              d: "M122,96L121,69L112,59H82L69,96Z"
            }), (0, x.jsx)("path", {
              fill: "url(#vr".concat(a, ")"),
              stroke: "none",
              d: "M43,10L8,29L2,80L9,76L23.4,112H109L116,96,H69L77,76L84,80L78,29Z"
            }), (0, x.jsx)("path", {
              stroke: f.SR[a][2],
              strokeWidth: "3.6",
              strokeLinejoin: "round",
              fill: "none",
              d: "M77,76L69,96H122L121,69L112,59H82M116,96L109,112H23.4L9,76M43,57L84,79.9L78,29L43,10L8,29L2,80L43,57L43,10"
            })]
          }), (0, x.jsxs)("g", {
            id: "vill".concat(a),
            transform: "translate(-64, -64)",
            children: [(0, x.jsx)("path", {
              fill: "url(#vr".concat(a, ")"),
              stroke: "none",
              d: "M99,91L89,111H39L29,91L23,95L30,48L64,19L98,48L105,95Z"
            }), (0, x.jsx)("path", {
              stroke: f.SR[a][2],
              strokeWidth: "3.6",
              strokeLinejoin: "round",
              fill: "none",
              d: "M99,91L87,111H39L31,91M64,19V65L23,95L30,48L64,19L98,48L105,95L64,65"
            })]
          }), (0, x.jsxs)("linearGradient", {
            id: "lg".concat(a),
            gradientUnits: "userSpaceOnUse",
            x1: "-23",
            y1: "0",
            x2: "23",
            y2: "0",
            children: [(0, x.jsx)("stop", {
              offset: "0",
              stopColor: f.SR[a][1]
            }), (0, x.jsx)("stop", {
              offset: ".4",
              stopColor: f.SR[a][0]
            }), (0, x.jsx)("stop", {
              offset: ".5",
              stopColor: f.SR[a][0]
            }), (0, x.jsx)("stop", {
              offset: "1",
              stopColor: f.SR[a][1]
            })]
          }), (0, x.jsx)("g", {
            id: "road".concat(a),
            children: (0, x.jsx)("path", {
              fill: "url(#lg".concat(a, ")"),
              strokeLinejoin: "round",
              d: "M-20,85V-85L0,-96L20,-85V85L0,96Z",
              strokeWidth: "3.6",
              stroke: f.SR[a][2]
            })
          })]
        }, a);
      })]
    });
  }
  var b = o.memo(v),
    D = t(4942),
    j = t(552),
    g = t(9796),
    C = t(6912);
  function k(e) {
    var a = e.r,
      t = e.className,
      r = e.onClick;
    return (0, x.jsxs)("div", {
      className: "ktd-card",
      children: [(0, x.jsx)("div", {
        className: "ktd-card-r".concat(a, " ").concat(t || ""),
        children: h[a]
      }), r && (0, x.jsx)(i.Z, {
        className: "absolute block w-full h-full top-0",
        noStyle: !0,
        onClick: r
      })]
    });
  }
  var Z = o.memo(k),
    R = t(4420),
    w = t(7992),
    O = t(6805);
  var P = function (e) {
      var a,
        t,
        o = e.room,
        l = e.game,
        p = e.updateGameData,
        h = e.send,
        m = e.gameMapProp,
        v = e.gameState,
        b = e.setAction,
        k = e.action,
        P = e.putRoad,
        N = e.putHouse,
        H = v.isOver,
        K = o.position - 1,
        I = !!o.position && o.position === o.owner,
        L = v.waitFor === K,
        E = !L || v.allowOps.length < 2,
        B = [],
        M = l.playerData.length,
        V = k[0];
      E || (V === f.Hx.PutRoad ? f.Vf[f.Wj.Road] : V === f.Hx.PutHouse ? f.Vf[f.Wj.Village] : V === f.Hx.PutCity ? f.Vf[f.Wj.City] : V === f.Hx.BuyDevCard ? f.Vf[f.Wj.DevCard] : []).forEach(function (e, a) {
        for (var t = 0; t < e; t++) B.push((0, x.jsx)(Z, {
          r: a,
          className: l.playerData[K].resources[a] <= t ? "opacity-50" : ""
        }, "".concat(a, "-").concat(t)));
      });
      var q = (0, j.bb)(l),
        W = -1;
      return !H && q && (0, O.H0)(l.actionRequest, M).map(function (e, a) {
        return {
          b: e,
          i: a
        };
      }).filter(function (e) {
        return e.b;
      }).map(function (e) {
        return e.i;
      }).forEach(function (e) {
        K !== e && (0, w.Yw)(o, e) && (W = e);
      }), (0, x.jsxs)(x.Fragment, {
        children: [W >= 0 && (0, x.jsx)("div", {
          className: "text-center",
          children: (0, x.jsx)(i.Z, {
            small: !0,
            primary: !0,
            onClick: function () {
              var e = W,
                a = [];
              l.playerData[W].resources.forEach(function (e, t) {
                for (var r = 0; r < e; r++) a.push(t);
              });
              var t = [0, 0, 0, 0, 0];
              (0, R.T)(a).slice(0, a.length >> 1).forEach(function (e) {
                t[e] += 1;
              });
              var s = {
                state: l.state,
                devCard: l.devCard,
                robber: l.robber,
                lastDice: l.lastDice,
                newCards: l.newCards,
                bankData: (0, r.Z)((0, r.Z)({}, l.bankData), {}, {
                  resources: l.bankData.resources.map(function (e, a) {
                    return e + t[a];
                  })
                }),
                playerData: (0, n.Z)(l.playerData),
                actionRequest: l.actionRequest & (0, O.Vi)(e, o.playerList.length)
              };
              s.playerData[e] = (0, r.Z)((0, r.Z)({}, s.playerData[e]), {}, {
                resources: s.playerData[e].resources.map(function (e, a) {
                  return e - t[a];
                })
              }), s.lastOp = {
                type: f.K8.RollDice,
                playerId: l.lastOp.playerId
              }, p(s);
            },
            children: "\u8be5\u73a9\u5bb6\u5df2\u6302\u673a\uff0c\u70b9\u6b64\u8ba9\u4ed6\u968f\u673a\u4e22\u5f03\u8d44\u6e90"
          })
        }), W < 0 && !H && !L && (0, w.Yw)(o, v.waitFor) && !q && (0, x.jsx)("div", {
          className: "text-center",
          children: (0, x.jsx)(i.Z, {
            small: !0,
            primary: !0,
            onClick: function () {
              if (!(0, j.bb)(l)) {
                var e,
                  a = (0, j.my)(o, l),
                  t = g.ZP[l.mapId],
                  i = a.waitFor;
                if (a.allowOps[0] === f.K8.PutHouse) {
                  var u = (0, C.q9)(l);
                  if (u.length) {
                    var d = u[(0, R.M)(u.length)],
                      h = (0, s.Z)(d, 2),
                      y = h[0],
                      x = h[1],
                      v = (0, s.Z)(y, 2),
                      b = v[0],
                      D = v[1];
                    (e = f.Vf[f.Wj.Free], function (a) {
                      var o = {
                          state: l.state,
                          devCard: l.devCard,
                          lastOp: {
                            type: f.K8.PutHouse,
                            playerId: i,
                            house: a,
                            costs: e
                          },
                          robber: l.robber,
                          lastDice: l.lastDice,
                          newCards: l.newCards,
                          bankData: l.bankData,
                          playerData: (0, n.Z)(l.playerData),
                          actionRequest: l.actionRequest
                        },
                        c = o.playerData[i];
                      if (o.playerData[i] = (0, r.Z)((0, r.Z)({}, c), {}, {
                        houses: [].concat((0, n.Z)(c.houses), [a])
                      }), 1 === c.houses.length) {
                        var u = (2 & a) >> 1,
                          d = t.tiles[a >> 2],
                          h = (0, s.Z)(d, 2),
                          y = h[0],
                          x = h[1],
                          v = [0, 0, 0, 0, 0],
                          b = function (e, a) {
                            var r = t.xyToId.get("".concat(e, ",").concat(a));
                            if (r < t.tileCount) {
                              var n = m.tileTypes[r];
                              n < f.j5.None && (v[n] += 1);
                            }
                          };
                        b(y, x), b(y - 1, x - 1), u ? b(y, x - 1) : b(y - 1, x), o.playerData[i].resources = v, o.bankData.resources = o.bankData.resources.map(function (e, a) {
                          return e - v[a];
                        });
                      }
                      p(o, !(1 & a));
                    })(t.xyToId.get("".concat(b, ",").concat(D)) << 2 | x << 1);
                  }
                } else if (a.allowOps[0] === f.K8.PutRoad) {
                  var k = !(16 & l.devCard) && 2 & l.devCard ? (0, C.jc)(l, i) : (0, C.Z7)(l);
                  if (k.length) {
                    var Z = k[(0, R.M)(k.length)],
                      w = (0, s.Z)(Z, 2),
                      O = w[0],
                      P = w[1],
                      N = (0, s.Z)(O, 2),
                      H = N[0],
                      K = N[1];
                    !function (e) {
                      return function (a) {
                        if (l.playerData[i].roads.length > 14) return (0, c.Z)("\u9053\u8def\u6700\u591a\u4fee15\u6761");
                        var t = {
                            state: l.state,
                            devCard: 16 & l.devCard ? l.devCard : 2 & l.devCard ? 125 & l.devCard : l.devCard,
                            lastOp: {
                              type: f.K8.PutRoad,
                              playerId: i,
                              road: a,
                              costs: e
                            },
                            robber: l.robber,
                            lastDice: l.lastDice,
                            newCards: l.newCards,
                            bankData: l.bankData,
                            playerData: (0, n.Z)(l.playerData),
                            actionRequest: l.actionRequest
                          },
                          s = t.playerData[i];
                        t.playerData[i] = (0, r.Z)((0, r.Z)({}, s), {}, {
                          roads: [].concat((0, n.Z)(s.roads), [a])
                        }), s.roads.length ? s.roads.length < 2 && (t.state = t.state ? t.state - 1 : 0) : t.state = t.state === l.playerData.length - 1 ? t.state : t.state + 1, p(t, !0);
                      };
                    }(f.Vf[f.Wj.Free])(t.xyToId.get("".concat(H, ",").concat(K)) << 2 | P);
                  }
                } else a.allowOps.includes(f.K8.RollDice) ? p((0, j.HU)(l, m, a)) : p((0, j.d7)(l));
              }
            },
            children: "\u8be5\u73a9\u5bb6\u5df2\u6302\u673a\uff0c\u70b9\u6b64\u8df3\u8fc7\u4ed6\u7684\u56de\u5408"
          })
        }), !H && (0, x.jsxs)("div", {
          children: [(0, x.jsx)(i.Z, {
            className: "m-1",
            primary: !0,
            small: !0,
            disabled: !v.allowOps.includes(f.K8.RollDice),
            onClick: function () {
              p((0, j.HU)(l, m, v));
            },
            children: "\ud83c\udfb2\u63b7\u9ab0\u5b50",
            "data-guide-target": "ktd.roll"
          }), (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: E || !v.allowOps.includes(f.K8.BuyDevCard) || V === f.Hx.BuyDevCard,
            onClick: function () {
              return l.bankData.cards.reduce(function (e, a) {
                return e + a;
              }) ? b([f.Hx.BuyDevCard, function () {
                var e = f.Vf[f.Wj.DevCard];
                if (!e.every(function (e, a) {
                  return l.playerData[K].resources[a] >= e;
                })) return (0, c.Z)("\u8d44\u6e90\u4e0d\u8db3");
                var a = {
                    state: l.state,
                    devCard: l.devCard,
                    lastOp: {
                      type: f.K8.BuyDevCard,
                      playerId: K,
                      costs: e
                    },
                    robber: l.robber,
                    lastDice: l.lastDice,
                    newCards: (0, n.Z)(l.newCards),
                    bankData: (0, r.Z)((0, r.Z)({}, l.bankData), {}, {
                      resources: (0, n.Z)(l.bankData.resources),
                      cards: (0, n.Z)(l.bankData.cards)
                    }),
                    playerData: (0, n.Z)(l.playerData),
                    actionRequest: l.actionRequest
                  },
                  t = [];
                l.bankData.cards.forEach(function (e, a) {
                  for (var r = 0; r < e; r++) t.push(a);
                });
                var s = t[(0, R.M)(t.length)];
                a.bankData.cards[s] -= 1, a.newCards[s] += 1, a.playerData[K] = (0, r.Z)((0, r.Z)({}, a.playerData[K]), {}, {
                  cards: (0, n.Z)(a.playerData[K].cards),
                  resources: (0, n.Z)(a.playerData[K].resources)
                }), a.playerData[K].cards[s] += 1, e.forEach(function (e, t) {
                  a.bankData.resources[t] += e, a.playerData[K].resources[t] -= e;
                }), p(a);
              }]) : (0, c.Z)("\u53d1\u5c55\u5361\u5df2\u7ecf\u5356\u5b8c\u4e86");
            },
            children: "\ud83d\ude4f\u4e70\u53d1\u5c55\u5361"
          }), (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: E || !v.allowOps.includes(f.K8.BuyRoad) || V === f.Hx.PutRoad,
            onClick: function () {
              return b([f.Hx.PutRoad, P(f.Vf[f.Wj.Road])]);
            },
            children: "".concat(y[1], "\u4fee\u9053\u8def")
          }), (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: E || !v.allowOps.includes(f.K8.BuyHouse) || V === f.Hx.PutHouse,
            onClick: function () {
              return b([f.Hx.PutHouse, N(f.Vf[f.Wj.Village])]);
            },
            children: "\ud83c\udfe0\u4fee\u6751\u5e84"
          }), (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: E || !v.allowOps.includes(f.K8.BuyCity) || V === f.Hx.PutCity,
            onClick: function () {
              return b([f.Hx.PutCity, N(f.Vf[f.Wj.City])]);
            },
            children: "\ud83c\udfd8\ufe0f\u4fee\u57ce\u5e02"
          }), (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: E || !v.allowOps.includes(f.K8.ExchangeWithPlayer) || V === f.Hx.Exchange,
            onClick: function () {
              return b([f.Hx.Exchange, null]);
            },
            children: "\ud83d\udcb0\u4ea4\u6613",
            "data-guide-target": "ktd.trade"
          }), (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: !L || v.allowOps.includes(f.K8.RollDice) || l.exchangeData && l.exchangeData.responses.indexOf(1) >= 0 || v.allowOps.length <= 1 || V === f.Hx.End,
            onClick: function () {
              b([f.Hx.End, null]);
            },
            children: "\u23e9\u7ed3\u675f",
            "data-guide-target": "ktd.end"
          }), M > 4 && (0, x.jsx)(i.Z, {
            className: "m-1",
            small: !0,
            disabled: l.state === K || !!(16 & l.devCard) || !l.lastDice || 7 === (0, j.bg)(l.lastDice) && (null === (a = l.lastOp) || void 0 === a ? void 0 : a.type) === f.K8.RollDice || !!((l.actionRequest || 0) >> K & 1),
            onClick: function () {
              var e = {
                state: l.state,
                devCard: l.devCard,
                robber: l.robber,
                lastDice: l.lastDice,
                newCards: l.newCards,
                bankData: l.bankData,
                playerData: l.playerData,
                actionRequest: (l.actionRequest || 0) | 1 << K
              };
              l.exchangeData && (e.exchangeData = l.exchangeData), p(e);
            },
            children: "\ud83d\udea9\u8bf7\u6c42\u5efa\u9020"
          })]
        }), B.length > 0 && (0, x.jsxs)("div", {
          className: "flex items-center justify-center",
          children: [(t = {}, (0, D.Z)(t, f.Hx.PutRoad, "\u4fee\u9053\u8def"), (0, D.Z)(t, f.Hx.PutHouse, "\u4fee\u6751\u5e84"), (0, D.Z)(t, f.Hx.PutCity, "\u4fee\u57ce\u5e02"), (0, D.Z)(t, f.Hx.BuyDevCard, "\u4e70\u53d1\u5c55\u5361"), t)[V], "\u9700\u8981", B, V === f.Hx.BuyDevCard && (0, x.jsx)(i.Z, {
            className: "ml-2",
            small: !0,
            primary: !0,
            onClick: k[1],
            children: "\u786e\u8ba4"
          }), (0, x.jsx)(i.Z, {
            className: "ml-4",
            small: !0,
            onClick: function () {
              return b([f.Hx.None, null]);
            },
            children: "\u53d6\u6d88"
          })]
        }), V === f.Hx.BuyDevCard && (0, x.jsx)("div", {
          className: "text-sm mt-2",
          children: "(\u4e70\u7684\u53d1\u5c55\u5361\u4e0b\u56de\u5408\u624d\u80fd\u7528\uff0c\u6bcf\u56de\u5408\u53ea\u80fd\u75281\u5f20)"
        }), V === f.Hx.End && (0, x.jsxs)("div", {
          className: "text-center",
          children: [(0, x.jsx)("div", {
            className: "m-1",
            children: "\u786e\u8ba4\u7ed3\u675f\u81ea\u5df1\u7684\u56de\u5408\u5417\uff1f"
          }), (0, x.jsxs)("div", {
            className: "flex items-center justify-center",
            children: [(0, x.jsx)(i.Z, {
              small: !0,
              primary: !0,
              onClick: function () {
                p((0, j.d7)(l));
              },
              children: "\u786e\u8ba4"
            }), (0, x.jsx)(i.Z, {
              className: "ml-4",
              small: !0,
              onClick: function () {
                return b([f.Hx.None, null]);
              },
              children: "\u53d6\u6d88"
            })]
          })]
        }), I && H && (0, x.jsx)("div", {
          className: "mt-1",
          children: (0, x.jsx)(i.Z, {
            small: !0,
            onClick: function () {
              return h(u.Z.OwnerExitGame, {
                data: d.AD.encode({
                  mapId: l.mapId
                }).finish()
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })]
      });
    },
    N = {
      1: [1, 0],
      2: [1, -60],
      4: [1, -120],
      8: [1, -180],
      16: [1, -240],
      32: [1, -300],
      33: [2, 0],
      3: [2, -60],
      6: [2, -120],
      12: [2, -180],
      24: [2, -240],
      48: [2, -300]
    };
  function H(e) {
    var a = e.game,
      t = e.mapProp,
      r = g.ZP[a.mapId];
    return (0, x.jsxs)(x.Fragment, {
      children: [t.tileTypes.map(function (e, a) {
        var t = (0, C.d3)(r.tiles[a]),
          n = (0, s.Z)(t, 2),
          o = n[0],
          c = n[1];
        return (0, x.jsx)("use", {
          xlinkHref: "#tr".concat(e),
          x: o,
          y: c
        }, a);
      }), r.tiles.slice(r.tileCount).map(function (e, a) {
        var t = (0, C.d3)(e),
          r = (0, s.Z)(t, 2),
          n = r[0],
          o = r[1],
          c = N[e[2]];
        return (0, x.jsx)("use", {
          xlinkHref: "#ts".concat(c[0]),
          transform: "translate(".concat(n, ",").concat(o, "),rotate(").concat(c[1], ")")
        }, a);
      }), t.tileNums.map(function (e, a) {
        if (7 !== e) {
          var t = (0, C.d3)(r.tiles[a]),
            n = (0, s.Z)(t, 2),
            o = n[0],
            c = n[1];
          return (0, x.jsx)("use", {
            xlinkHref: "#n".concat(e),
            x: o,
            y: c
          }, a);
        }
      }), t.portTypes.map(function (e, a) {
        var t = r.ports[a],
          n = (0, C.d3)(r.tiles[t[0]]),
          o = (0, s.Z)(n, 2),
          i = o[0],
          l = o[1];
        return (0, x.jsxs)("g", {
          children: [(0, x.jsx)("use", {
            xlinkHref: "#tp",
            transform: "translate(".concat(i, ",").concat(l, "),rotate(").concat(60 * t[1] + 240, ")")
          }), (0, x.jsx)("use", {
            xlinkHref: "#tp".concat(e),
            x: i,
            y: l,
            className: "cursor-pointer",
            onClick: function () {
              return (0, c.Z)("\u76f4\u63a5\u70b9\u201c\ud83d\udcb0\u4ea4\u6613\u201d\u6309\u94ae\uff0c\u8f93\u5165\u6e2f\u53e3\u5bf9\u5e94\u6bd4\u4f8b\u7684\u8d44\u6e90\uff0c\u5c31\u4f1a\u548c\u94f6\u884c\u6309\u7167\u4f18\u60e0\u6bd4\u4f8b\u4ea4\u6613");
            }
          })]
        }, a);
      })]
    });
  }
  var K = o.memo(H, function (e, a) {
    return e.mapProp === a.mapProp;
  });
  var I = function (e) {
    var a = e.n,
      t = e.w,
      r = e.className,
      n = (0, o.useRef)(a),
      s = n.current,
      c = s !== a;
    return n.current = a, (0, x.jsxs)("div", {
      className: "relative font-mono text-center ".concat(r || ""),
      children: [(0, x.jsxs)("div", {
        className: "relative overflow-hidden",
        children: [c && (0, x.jsx)("div", {
          className: "ktd-last-".concat(s > a ? "top" : "bottom", " absolute"),
          children: s
        }), (0, x.jsx)("div", {
          className: c ? s < a ? "text-red-500" : "text-green-500" : void 0,
          children: a
        }), s.toString().length - a.toString().length > 0 && (0, x.jsx)("div", {
          "aria-hidden": "true",
          className: "h-0 opacity-0",
          children: s
        }), !!t && (0, x.jsx)("div", {
          "aria-hidden": "true",
          className: "h-0 opacity-0",
          children: new Array(t).fill(0).join("")
        })]
      }), c && (0, x.jsxs)("div", {
        className: "absolute text-xs z-10 animate-pulse ".concat(s < a ? "text-red-500 bottom-3.5" : "text-green-500 top-3.5"),
        children: [a > s && "+", a - s]
      })]
    });
  };
  function L(e) {
    var a = e.hasPort,
      t = e.map,
      r = e.playerCount,
      n = (0, o.useState)(!1),
      c = (0, s.Z)(n, 2),
      l = c[0],
      u = c[1];
    return (0, x.jsxs)("div", {
      className: "text-center my-2",
      children: [(0, x.jsx)(i.Z, {
        small: !0,
        onClick: function () {
          return u(function (e) {
            return !e;
          });
        },
        children: l ? "\u9690\u85cf\u5e2e\u52a9" : "\u67e5\u770b\u5e2e\u52a9"
      }), l && (0, x.jsx)("div", {
        className: "mt-2 text-sm whitespace-pre-line",
        children: "\u4e70\u53d1\u5c55\u5361\uff1a\ud83d\udc11\ud83c\udf3e".concat(h[4], "\n\u4fee\u9053\u8def\uff1a\ud83c\udf32").concat(h[1], "\n\u4fee\u6751\u5e84\uff1a\ud83c\udf32").concat(h[1], "\ud83d\udc11\ud83c\udf3e\n\u4fee\u57ce\u5e02\uff1a\ud83c\udf3e\ud83c\udf3e").concat(h[4] + h[4] + h[4], "\n\u94f6\u884c\u4ea4\u6613\u6bd4\u4f8b\n").concat(a[f.j5.Lumber] ? 2 : a[f.j5.None] ? 3 : 4, "\ud83c\udf32=1\u3001").concat(a[f.j5.Brick] ? 2 : a[f.j5.None] ? 3 : 4).concat(h[1], "=1\u3001").concat(a[f.j5.Wool] ? 2 : a[f.j5.None] ? 3 : 4, "\ud83d\udc11=1\u3001").concat(a[f.j5.Grain] ? 2 : a[f.j5.None] ? 3 : 4, "\ud83c\udf3e=1\u3001").concat(a[f.j5.Ore] ? 2 : a[f.j5.None] ? 3 : 4).concat(h[4], "=1\n\u82e5\u8981\u8ddf\u94f6\u884c\u4ea4\u6613\uff0c\u70b9\u51fb\ud83d\udcb0\u4ea4\u6613\u5e76\u6309\u94f6\u884c\u4ea4\u6613\u6bd4\u4f8b\u9009\u62e9\u8d44\u6e90\n\u4e94\u79cd\u8d44\u6e90\u5404\u6709").concat(t.resCount, "\u5f20\n\u53d1\u5c55\u5361\u5171").concat(t.devCount.reduce(function (e, a) {
          return e + a;
        }), "\u5f20\n").concat(t.devCount[0], "\u9a91\u58eb\ud83d\ude08\u3001").concat(t.devCount[1], "\u9053\u8def").concat(y[1], "\u3001").concat(t.devCount[2], "\u4e30\u6536\ud83c\udfe6\u3001").concat(t.devCount[3], "\u5784\u65ad\ud83d\udc6e\u3001").concat(t.devCount[4], "\u5206\u6570\ud83c\udfc6").concat(r > 4 ? "\n\ud83d\udea9\u5efa\u9020\u56de\u5408\u53ef\u4ee5\u4e70\u53d1\u5c55\u5361\u3001\u4fee\u9053\u8def\u3001\u4fee\u6751\u5e84\u3001\u4fee\u57ce\u5e02\uff0c\u4f46\u4e0d\u53ef\u4ee5\u63b7\u9ab0\u5b50\u3001\u4ea4\u6613\u3001\u7528\u53d1\u5c55\u5361\uff0c\u4e5f\u65e0\u6cd5\u5ba3\u544a\u80dc\u5229\u3002" : "", "\n\u83b7\u80dc\u6761\u4ef6\uff1a\u7387\u5148\u5f97\u523010\u5206\uff08\u82e5\u4e3a2\u4eba\u5bf9\u6218\uff0c\u9700\u5f97\u523015\u5206\uff09")
      })]
    });
  }
  var E = o.memo(L, function (e, a) {
      return e.gameVersion === a.gameVersion;
    }),
    B = f.SR.map(function (e) {
      return {
        background: "radial-gradient(".concat(e[0], ", ").concat(e[1], ")")
      };
    }),
    M = o.memo(function (e) {
      var a = e.room,
        t = e.game,
        r = e.playerData,
        n = e.i,
        s = e.isOver,
        o = r.cards,
        l = r.resources,
        u = t.bankData,
        d = n + 1,
        p = l.reduce(function (e, a) {
          return e + a;
        }),
        h = u.maxRobberCountPos,
        m = u.longestRoadPos;
      return (0, x.jsxs)(x.Fragment, {
        children: [(0, x.jsx)("div", {
          className: "w-4 h-4 rounded-full border",
          style: B[n]
        }), (0, x.jsxs)("div", {
          children: [(0, x.jsxs)("div", {
            className: "flex items-center justify-center",
            children: [(0, x.jsx)(I, {
              w: 2,
              n: r.houses.length + r.houses.filter(function (e) {
                return 1 & e;
              }).length + (u.longestRoadPos === d ? 2 : 0) + (u.maxRobberCountPos === d ? 2 : 0)
            }), "\u5206"]
          }), (s || a.position === d) && r.cards[f.pI.VP] > 0 && (0, x.jsxs)("div", {
            className: "font-mono text-xs",
            children: ["+", r.cards[f.pI.VP]]
          })]
        }), (0, x.jsx)("div", {
          className: "ktd-card",
          children: (0, x.jsx)("div", {
            className: "ktd-card-r7",
            children: p >= g.ZP[t.mapId].settings[t.playerData.length][1] ? "!" : "?"
          })
        }), (0, x.jsx)(I, {
          n: p,
          w: 2
        }), (0, x.jsx)("div", {
          className: "ktd-card",
          children: (0, x.jsx)("div", {
            className: "ktd-card-d",
            children: "\ud83d\udd28"
          })
        }), (0, x.jsx)(I, {
          n: o.reduce(function (e, a) {
            return e + a;
          })
        }), (0, x.jsx)(i.Z, {
          noStyle: !0,
          onClick: function () {
            return (0, c.Z)("\u6700\u5927\u519b\u961f\u5361\uff0c\u4f7f\u7528\u5f3a\u76d7\u5361\u6b21\u6570\u6700\u591a\u4e14\u8fbe\u52303\u6b21\u7684\u73a9\u5bb6\u83b7\u5f97\uff0c\u53ef\u52a02\u5206");
          },
          className: "text-xl".concat(h === d ? "" : " opacity-50"),
          children: "\ud83d\ude08"
        }), (0, x.jsx)(I, {
          n: r.robberCount,
          className: h === d ? "" : "opacity-50"
        }), (0, x.jsx)(i.Z, {
          noStyle: !0,
          onClick: function () {
            return (0, c.Z)("\u6700\u957f\u9053\u8def\u5361\uff0c\u4fee\u5efa\u6700\u957f\u8fde\u7eed\u9053\u8def\u4e14\u8fbe\u52305\u6761\u7684\u73a9\u5bb6\u83b7\u5f97\uff0c\u53ef\u52a02\u5206");
          },
          className: "text-xl".concat(m === d ? "" : " opacity-50"),
          children: y[1]
        }), (0, x.jsx)(I, {
          n: r.longestRoad,
          className: m === d ? "" : "opacity-50"
        })]
      });
    }, function (e, a) {
      return e.gameVersion === a.gameVersion;
    });
  function V(e) {
    var a = e.room,
      t = e.game,
      r = e.hasPort,
      n = e.gameVersion,
      s = e.isOver,
      c = e.send;
    return (0, x.jsxs)(x.Fragment, {
      children: [t.playerData.map(function (e, r) {
        var o;
        return (0, x.jsxs)("div", {
          className: "flex items-center justify-center space-x-1 mb-1",
          children: [(0, x.jsx)(w.ZP, {
            room: a,
            index: r,
            send: c,
            isTurn: t.state === r,
            children: (16 & t.devCard || !!t.lastDice && (7 !== (0, j.bg)(t.lastDice) || (null === (o = t.lastOp) || void 0 === o ? void 0 : o.type) !== f.K8.RollDice)) && !!((t.actionRequest || 0) >> r & 1) && (0, x.jsx)("div", {
              className: "absolute translate-x-[-50%] text-shadow text-xs top-0 left-[46px] scale-150",
              children: "\ud83d\udea9"
            })
          }), (0, x.jsx)(M, {
            room: a,
            game: t,
            playerData: e,
            i: r,
            gameVersion: n,
            isOver: s
          })]
        }, r);
      }), (0, x.jsxs)("div", {
        className: "flex items-center justify-center mb-1",
        children: [(0, x.jsx)("div", {
          className: "mr-1 text-2xl",
          children: "\ud83c\udfe6"
        }), [0, 1, 2, 3, 4].map(function (e, a) {
          return (0, x.jsxs)(o.Fragment, {
            children: [(0, x.jsx)(Z, {
              r: a
            }), (0, x.jsx)(I, {
              n: t.bankData.resources[a],
              w: 2
            })]
          }, a);
        }), (0, x.jsx)("div", {
          className: "ktd-card",
          children: (0, x.jsx)("div", {
            className: "ktd-card-d",
            children: "\ud83d\udd28"
          })
        }), (0, x.jsx)(I, {
          n: t.bankData.cards.reduce(function (e, a) {
            return e + a;
          })
        })]
      }), (0, x.jsx)(E, {
        hasPort: r,
        gameVersion: n,
        map: g.ZP[t.mapId],
        playerCount: t.playerData.length
      })]
    });
  }
  var q = o.memo(V, function (e, a) {
    return e.gameVersion === a.gameVersion && e.room.time === a.room.time;
  });
  function W(e) {
    var a = e.d,
      t = e.onClick;
    return (0, x.jsxs)("div", {
      className: "ktd-card",
      children: [(0, x.jsx)("div", {
        className: "ktd-card-d",
        children: y[a]
      }), t && (0, x.jsx)(i.Z, {
        className: "absolute block w-full h-full top-0",
        noStyle: !0,
        onClick: t
      })]
    });
  }
  var S = o.memo(W);
  var A = function (e) {
    var a,
      t = e.room,
      l = e.game,
      u = e.discardResource,
      d = e.action0,
      p = e.gameVersion,
      y = e.gameMapProp,
      m = e.setAction,
      v = e.updateGameData,
      b = e.gameState,
      g = e.isOver,
      C = e.send,
      k = !!t.position,
      w = (0, o.useState)([]),
      O = (0, s.Z)(w, 2),
      P = O[0],
      N = O[1],
      H = (0, o.useState)([]),
      K = (0, s.Z)(H, 2),
      I = K[0],
      L = K[1],
      E = (0, o.useState)([]),
      B = (0, s.Z)(E, 2),
      M = B[0],
      V = B[1];
    (0, o.useEffect)(function () {
      N(function (e) {
        return e.length ? [] : e;
      }), L(function (e) {
        return e.length ? [] : e;
      }), V(function (e) {
        return e.length ? [] : e;
      });
    }, [typeof u, d]);
    var W = t.position - 1,
      A = k && u ? l.playerData[W].resources.reduce(function (e, a) {
        return e + a;
      }) >> 1 : 0,
      T = d === f.Hx.Exchange || A > 0,
      G = k ? (0, j.tY)(l, y, W) : [],
      F = k && d === f.Hx.Exchange && P.length && I.length < 2;
    if (F) {
      var U = P[0][0];
      F = P.every(function (e) {
        return e[0] === U;
      }) && P.length === (G[Number(U)] ? 2 : G[f.j5.None] ? 3 : 4);
    }
    return (0, x.jsxs)(x.Fragment, {
      children: [l.exchangeData && !d && (0, x.jsxs)(x.Fragment, {
        children: [(0, x.jsxs)("div", {
          className: "flex flex-wrap items-center justify-center",
          children: ["\u73a9\u5bb6".concat(l.state + 1, "\u60f3\u8981"), l.exchangeData.needs.map(function (e, a) {
            return new Array(e).fill(0).map(function (e, t) {
              return (0, x.jsx)(Z, {
                r: a
              }, "".concat(a, "-").concat(t));
            });
          }), "\uff0c\u613f\u610f\u7ed9", l.exchangeData.costs.map(function (e, a) {
            return new Array(e).fill(0).map(function (e, t) {
              return (0, x.jsx)(Z, {
                r: a
              }, "".concat(a, "-").concat(t));
            });
          }), W === l.state && (0, x.jsx)(i.Z, {
            small: !0,
            className: "ml-2",
            onClick: function () {
              var e = {
                state: l.state,
                devCard: l.devCard,
                robber: l.robber,
                lastDice: l.lastDice,
                newCards: l.newCards,
                bankData: l.bankData,
                playerData: l.playerData,
                actionRequest: l.actionRequest
              };
              v(e);
            },
            children: "\u64a4\u56de"
          })]
        }), (0, x.jsx)("div", {
          children: l.exchangeData.responses.map(function (e, a) {
            if (!e) return null;
            var t = l.exchangeData.needs,
              s = l.exchangeData.costs,
              o = k && t.every(function (e, a) {
                return l.playerData[W].resources[a] >= e;
              });
            return (0, x.jsxs)("div", {
              className: "flex items-center justify-center",
              children: [(0, x.jsx)("span", {
                className: "py-1",
                children: "\u73a9\u5bb6".concat(a + 1, "\uff1a").concat(e < 2 ? "\ud83e\udd14" : "\u274c")
              }), a === W && e < 2 && (0, x.jsxs)(x.Fragment, {
                children: [(0, x.jsx)(i.Z, {
                  small: !0,
                  className: "ml-2",
                  disabled: !o,
                  onClick: function () {
                    var e = {
                      state: l.state,
                      devCard: l.devCard,
                      lastOp: {
                        type: f.K8.ExchangeWithPlayer,
                        playerId: l.state,
                        withPlayerId: W,
                        needs: t,
                        costs: s
                      },
                      robber: l.robber,
                      lastDice: l.lastDice,
                      newCards: l.newCards,
                      bankData: l.bankData,
                      playerData: (0, n.Z)(l.playerData),
                      actionRequest: l.actionRequest
                    };
                    e.playerData[W] = (0, r.Z)((0, r.Z)({}, e.playerData[W]), {}, {
                      resources: e.playerData[W].resources.map(function (e, a) {
                        return e - t[a] + s[a];
                      })
                    });
                    var a = l.state;
                    e.playerData[a] = (0, r.Z)((0, r.Z)({}, e.playerData[a]), {}, {
                      resources: e.playerData[a].resources.map(function (e, a) {
                        return e + t[a] - s[a];
                      })
                    }), v(e);
                  },
                  children: "\u2705\u540c\u610f"
                }), (0, x.jsx)(i.Z, {
                  small: !0,
                  className: "ml-4",
                  primary: !o,
                  onClick: function () {
                    var e = l.exchangeData.responses.map(function (e, a) {
                        return a === W ? 2 : e;
                      }),
                      a = {
                        state: l.state,
                        devCard: l.devCard,
                        robber: l.robber,
                        lastDice: l.lastDice,
                        newCards: l.newCards,
                        exchangeData: (0, r.Z)((0, r.Z)({}, l.exchangeData), {}, {
                          responses: e
                        }),
                        bankData: l.bankData,
                        playerData: l.playerData,
                        actionRequest: l.actionRequest
                      };
                    v(a);
                  },
                  children: "\u274c\u62d2\u7edd"
                })]
              })]
            }, a);
          })
        })]
      }), k && [f.Hx.Exchange, f.Hx.CardResource, f.Hx.CardMonopoly].includes(d) && (0, x.jsxs)(x.Fragment, {
        children: [(0, x.jsxs)("div", {
          className: "flex justify-center items-center flex-wrap",
          children: [(0, x.jsx)("div", {
            className: "h-10 leading-10",
            children: d === f.Hx.CardResource ? "\u4e30\u6536\u5361\uff0c\u90092\u4e2a\u8d44\u6e90\u4ece\u94f6\u884c\u83b7\u5f97\uff1a" : d === f.Hx.CardMonopoly ? "\u5784\u65ad\u5361\uff0c\u6240\u6709\u4eba\u7ed9\u4f60\u8be5\u8d44\u6e90\uff1a" : "\u4f60\u60f3\u83b7\u5f97\uff1a"
          }), I.map(function (e, a) {
            return (0, x.jsx)(Z, {
              r: e,
              onClick: function () {
                L(function (e) {
                  return [].concat((0, n.Z)(e.slice(0, a)), (0, n.Z)(e.slice(a + 1)));
                });
              }
            }, a);
          }), [f.Hx.CardResource, f.Hx.CardMonopoly].includes(d) && (0, x.jsx)(i.Z, {
            small: !0,
            primary: !0,
            className: "ml-4",
            disabled: I.length !== (d === f.Hx.CardMonopoly ? 1 : 2),
            onClick: d === f.Hx.CardMonopoly ? function () {
              var e = I[0],
                a = 0;
              l.playerData.forEach(function (t, r) {
                r !== W && (a += t.resources[e]);
              });
              var t = {
                state: l.state,
                devCard: 1 | l.devCard,
                lastOp: {
                  type: f.K8.UseCardMonopoly,
                  playerId: W,
                  needs: [0, 0, 0, 0, 0]
                },
                robber: l.robber,
                lastDice: l.lastDice,
                newCards: l.newCards,
                bankData: l.bankData,
                playerData: (0, n.Z)(l.playerData),
                actionRequest: l.actionRequest
              };
              t.lastOp.needs[e] = a;
              t.lastOp.resource = e;
              for (var s = 0; s < t.playerData.length; s++) {
                var o = t.playerData[s];
                t.playerData[s] = (0, r.Z)((0, r.Z)({}, o), {}, {
                  resources: (0, n.Z)(o.resources),
                  cards: (0, n.Z)(o.cards)
                }), s === W ? (t.playerData[s].resources[e] += a, t.playerData[s].cards[f.pI.Monopoly] -= 1) : t.playerData[s].resources[e] = 0;
              }
              v(t);
            } : function () {
              var e = (0, s.Z)(I, 2),
                a = e[0],
                t = e[1],
                o = [0, 0, 0, 0, 0];
              if (o[a] += 1, o[t] += 1, l.bankData.resources.findIndex(function (e, a) {
                return e < o[a];
              }) >= 0) return (0, c.Z)("\u94f6\u884c\u8d44\u6e90\u4e0d\u8db3");
              var i = {
                state: l.state,
                devCard: 1 | l.devCard,
                lastOp: {
                  type: f.K8.UseCardResources,
                  playerId: W,
                  needs: o
                },
                robber: l.robber,
                lastDice: l.lastDice,
                newCards: l.newCards,
                bankData: (0, r.Z)((0, r.Z)({}, l.bankData), {}, {
                  resources: (0, n.Z)(l.bankData.resources)
                }),
                playerData: (0, n.Z)(l.playerData),
                actionRequest: l.actionRequest
              };
              i.playerData[W] = (0, r.Z)((0, r.Z)({}, i.playerData[W]), {}, {
                resources: (0, n.Z)(i.playerData[W].resources),
                cards: (0, n.Z)(i.playerData[W].cards)
              }), i.playerData[W].resources[a] += 1, i.playerData[W].resources[t] += 1, i.bankData.resources[a] -= 1, i.bankData.resources[t] -= 1, i.playerData[W].cards[f.pI.YearOfPlenty] -= 1, v(i);
            },
            children: "\u786e\u8ba4"
          })]
        }), (0, x.jsxs)("div", {
          className: "flex items-center justify-center mt-2",
          children: [[0, 1, 2, 3, 4].map(function (e, a) {
            return (0, x.jsx)(Z, {
              className: "opacity-50",
              r: a,
              onClick: function () {
                return d === f.Hx.CardMonopoly ? L(function (e) {
                  return [a];
                }) : d === f.Hx.CardResource && I.length > 1 ? (0, c.Z)("\u53ea\u80fd\u90092\u4e2a\u8d44\u6e90") : void L(function (e) {
                  return [].concat((0, n.Z)(e), [a]);
                });
              }
            }, a);
          }), (0, x.jsx)(i.Z, {
            small: !0,
            className: "ml-4",
            onClick: function () {
              return m([f.Hx.None, null]);
            },
            children: "\u53d6\u6d88"
          })]
        })]
      }), k && [f.Hx.CardKnight, f.Hx.CardRoad].includes(d) && (0, x.jsxs)("div", {
        className: "flex items-center justify-center m-1",
        children: [(a = {}, (0, D.Z)(a, f.Hx.CardKnight, "\u9a91\u58eb\u5361\uff0c\u53ef\u5728\u5730\u56fe\u4e0a\u79fb\u52a8\u5f3a\u76d7"), (0, D.Z)(a, f.Hx.CardRoad, "\u9053\u8def\u5361\uff0c\u53ef\u5728\u5730\u56fe\u4e0a\u4fee2\u6761\u9053\u8def"), a)[d], (0, x.jsx)(i.Z, {
          small: !0,
          className: "ml-2",
          onClick: function () {
            return m([f.Hx.None, null]);
          },
          children: "\u53d6\u6d88"
        })]
      }), (0, x.jsxs)("div", {
        className: "mt-2 text-center catan-hand-panel pt-1 text-sm",
        children: [k && (0, x.jsxs)(x.Fragment, {
          children: [u && (0, x.jsxs)("div", {
            className: "mt-1 mb-2",
            children: ["\u8bf7\u9009\u62e9\u4e22\u5f03\u7684\u8d44\u6e90\u5361\uff1a".concat(P.length, "/").concat(A), (0, x.jsx)(i.Z, {
              className: "ml-2",
              small: !0,
              primary: !0,
              disabled: P.length !== A,
              onClick: function () {
                var e = [0, 0, 0, 0, 0];
                P.forEach(function (a) {
                  var t = Number(a[0]);
                  e[t] += 1;
                }), u(e);
              },
              children: "\u786e\u8ba4"
            })]
          }), d === f.Hx.Exchange && (0, x.jsxs)(x.Fragment, {
            children: [(0, x.jsxs)("div", {
              className: "flex flex-wrap items-center justify-center",
              children: [(0, x.jsx)("div", {
                className: "m-1",
                children: "\u4f60\u8981\u8ddf\u8c01\u4ea4\u6613\uff1f"
              }), F ? "\ud83c\udfe6\u94f6\u884c" : t.playerList.map(function (e, a) {
                return a === W ? null : (0, x.jsxs)("div", {
                  className: "flex items-center m-1",
                  children: [(0, x.jsx)("input", {
                    type: "checkbox",
                    className: "cursor-pointer",
                    id: "box".concat(a),
                    checked: !M.includes(a),
                    onChange: function () {
                      return V(function (e) {
                        return e.includes(a) ? e.filter(function (e) {
                          return e !== a;
                        }) : [].concat((0, n.Z)(e), [a]);
                      });
                    }
                  }), (0, x.jsxs)("label", {
                    htmlFor: "box".concat(a),
                    className: "cursor-pointer",
                    children: ["\u73a9\u5bb6", a + 1]
                  })]
                }, a);
              })]
            }), (0, x.jsx)("div", {
              className: "flex items-center justify-center pb-1",
              children: "\u4f60\u8981\u7ed9\u51fa\u54ea\u4e9b\uff1f\u5df2\u9009".concat(P.length)
            })]
          }), (0, x.jsxs)("div", {
            className: "mb-1 flex flex-wrap justify-center",
            children: [l.playerData[t.position - 1].resources.map(function (e, a) {
              return new Array(e).fill(0).map(function (e, t) {
                var r = P.includes("".concat(a, "-").concat(t));
                return (0, x.jsx)("div", {
                  className: "my-1",
                  children: (0, x.jsx)(Z, {
                    r: a,
                    className: r ? "-translate-y-2" : "",
                    onClick: T ? function () {
                      P.includes("".concat(a, "-").concat(t)) ? N(function (e) {
                        return e.filter(function (e) {
                          return e !== "".concat(a, "-").concat(t);
                        });
                      }) : N(function (e) {
                        return [].concat((0, n.Z)(e), ["".concat(a, "-").concat(t)]);
                      });
                    } : void 0
                  })
                }, "".concat(a, "-").concat(t));
              });
            }), !l.playerData[t.position - 1].resources.reduce(function (e, a) {
              return e + a;
            }) && (0, x.jsx)("div", {
              className: "catan-empty-hand",
              children: "\u4f60\u6682\u65e0\u8d44\u6e90\u5361"
            })]
          }), d === f.Hx.Exchange && (0, x.jsx)("div", {
            className: "py-4",
            children: (0, x.jsx)(i.Z, {
              small: !0,
              primary: !0,
              disabled: !P.length || !I.length,
              onClick: function () {
                if (P.findIndex(function (e) {
                  return I.includes(Number(e[0]));
                }) >= 0) return (0, c.Z)("\u7ed9\u51fa\u548c\u83b7\u5f97\u7684\u8d44\u6e90\u4e0d\u80fd\u6709\u76f8\u540c\u7684");
                var e = [0, 0, 0, 0, 0],
                  a = [0, 0, 0, 0, 0];
                if (I.forEach(function (a) {
                  e[a] += 1;
                }), P.forEach(function (e) {
                  a[Number(e[0])] += 1;
                }), F) {
                  if (l.bankData.resources.findIndex(function (a, t) {
                    return a < e[t];
                  }) >= 0) return (0, c.Z)("\u94f6\u884c\u8d44\u6e90\u4e0d\u8db3");
                  var t = {
                    state: l.state,
                    devCard: l.devCard,
                    lastOp: {
                      type: f.K8.ExchangeWithBank,
                      playerId: W,
                      needs: e,
                      costs: a
                    },
                    robber: l.robber,
                    lastDice: l.lastDice,
                    newCards: l.newCards,
                    bankData: (0, r.Z)((0, r.Z)({}, l.bankData), {}, {
                      resources: l.bankData.resources.map(function (t, r) {
                        return t - e[r] + a[r];
                      })
                    }),
                    playerData: (0, n.Z)(l.playerData),
                    actionRequest: l.actionRequest
                  };
                  t.playerData[W] = (0, r.Z)((0, r.Z)({}, t.playerData[W]), {}, {
                    resources: t.playerData[W].resources.map(function (t, r) {
                      return t + e[r] - a[r];
                    })
                  }), v(t);
                } else {
                  var s = (0, j.Gq)(l, W),
                    o = e.findIndex(function (e, a) {
                      return e > s[a];
                    });
                  if (o >= 0) return (0, c.Z)("\u6839\u636e\u94f6\u884c\u8d44\u6e90\u63a8\u7b97\uff0c\u6ca1\u4eba\u6709\u8fd9\u4e48\u591a".concat(h[o]));
                  var i = e.reduce(function (e, a) {
                      return e + a;
                    }),
                    u = new Set([W].concat((0, n.Z)(M))),
                    d = [];
                  if (l.playerData.forEach(function (e, a) {
                    !u.has(a) && e.resources.reduce(function (e, a) {
                      return e + a;
                    }) >= i && d.push(a);
                  }), !d.length) return (0, c.Z)("\u6ca1\u4eba\u6709\u8fd9\u4e48\u591a\u8d44\u6e90");
                  var p = {
                    state: l.state,
                    devCard: l.devCard,
                    robber: l.robber,
                    lastDice: l.lastDice,
                    newCards: l.newCards,
                    exchangeData: {
                      needs: e,
                      costs: a,
                      responses: new Array(l.playerData.length).fill(0).map(function (e, a) {
                        return d.includes(a) ? 1 : 0;
                      })
                    },
                    bankData: l.bankData,
                    playerData: l.playerData,
                    actionRequest: l.actionRequest
                  };
                  v(p);
                }
              },
              children: "\u7533\u8bf7\u4ea4\u6613"
            })
          }), (0, x.jsxs)("div", {
            className: "mb-1 flex flex-wrap justify-center",
            children: [l.playerData[t.position - 1].cards.map(function (e, a) {
              return new Array(e).fill(0).map(function (e, t) {
                return (0, x.jsx)(S, {
                  d: a,
                  onClick: a === f.pI.Knight ? b.allowOps.includes(f.K8.UseCardKnight) ? function () {
                    return m([f.Hx.CardKnight, function (e, a) {
                      var t = {
                        state: l.state,
                        devCard: 1 | l.devCard,
                        lastOp: {
                          type: f.K8.UseCardKnight,
                          playerId: W,
                          from: l.robber,
                          to: e
                        },
                        robber: e,
                        lastDice: l.lastDice,
                        newCards: l.newCards,
                        bankData: (0, r.Z)({}, l.bankData),
                        playerData: (0, n.Z)(l.playerData),
                        actionRequest: l.actionRequest
                      };
                      if (t.playerData[W] = (0, r.Z)((0, r.Z)({}, t.playerData[W]), {}, {
                        robberCount: t.playerData[W].robberCount + 1,
                        cards: (0, n.Z)(t.playerData[W].cards),
                        resources: (0, n.Z)(t.playerData[W].resources)
                      }), t.playerData[W].robberCount > 2 && t.playerData[W].robberCount > l.bankData.maxRobberCount && (t.bankData.maxRobberCount = t.playerData[W].robberCount, t.bankData.maxRobberCountPos = W + 1), t.playerData[W].cards[f.pI.Knight] -= 1, a > -1) {
                        var s = [];
                        if (t.playerData[a].resources.forEach(function (e, a) {
                          for (var t = 0; t < e; t++) s.push(a);
                        }), s.length) {
                          var o = (0, R.M)(s.length),
                            c = s[o];
                          t.playerData[a] = (0, r.Z)((0, r.Z)({}, t.playerData[a]), {}, {
                            resources: (0, n.Z)(t.playerData[a].resources)
                          }), t.playerData[a].resources[c] -= 1, t.playerData[W].resources[c] += 1, t.lastOp.withPlayerId = a, t.lastOp.needs = [0, 0, 0, 0, 0], t.lastOp.needs[c] = 1;
                        }
                      }
                      v(t);
                    }]);
                  } : function () {
                    return (0, c.Z)("\u9a91\u58eb\u5361\uff0c\u53ef\u4ee5\u79fb\u52a8\u5f3a\u76d7\uff0c\u76ee\u524d\u65e0\u6cd5\u4f7f\u7528");
                  } : a === f.pI.RoadBuilding ? b.allowOps.includes(f.K8.UseCardRoads) ? function () {
                    return m([f.Hx.CardRoad, function (e) {
                      var a = l.playerData[W].roads.length;
                      if (a > 14) return (0, c.Z)("\u65e0\u6cd5\u4f7f\u7528\u4fee\u8def\u5361\uff0c\u9053\u8def\u6700\u591a\u4fee15\u6761");
                      a > 13 && (0, c.Z)("\u9053\u8def\u6700\u591a\u4fee15\u6761\uff0c\u4f60\u53ea\u80fd\u7528\u4fee\u8def\u5361\u4fee1\u6761\u9053\u8def");
                      var t = {
                          state: l.state,
                          devCard: a > 13 ? 1 | l.devCard : 3 | l.devCard,
                          lastOp: {
                            type: f.K8.PutRoad,
                            playerId: W,
                            road: e
                          },
                          robber: l.robber,
                          lastDice: l.lastDice,
                          newCards: l.newCards,
                          bankData: l.bankData,
                          playerData: (0, n.Z)(l.playerData),
                          actionRequest: l.actionRequest
                        },
                        s = t.playerData[W];
                      t.playerData[W] = (0, r.Z)((0, r.Z)({}, s), {}, {
                        cards: (0, n.Z)(t.playerData[W].cards),
                        roads: [].concat((0, n.Z)(s.roads), [e])
                      }), t.playerData[W].cards[f.pI.RoadBuilding] -= 1, v(t, !0);
                    }]);
                  } : function () {
                    return (0, c.Z)("\u9053\u8def\u5361\uff0c\u53ef\u4ee5\u4fee2\u6761\u9053\u8def\uff0c\u76ee\u524d\u65e0\u6cd5\u4f7f\u7528");
                  } : a === f.pI.YearOfPlenty ? b.allowOps.includes(f.K8.UseCardResources) ? function () {
                    return m([f.Hx.CardResource, null]);
                  } : function () {
                    return (0, c.Z)("\u4e30\u6536\u5361\uff0c\u53ef\u4ee5\u6307\u5b9a2\u4e2a\u8d44\u6e90\u4ece\u94f6\u884c\u83b7\u5f97\uff0c\u76ee\u524d\u65e0\u6cd5\u4f7f\u7528");
                  } : a === f.pI.Monopoly ? b.allowOps.includes(f.K8.UseCardMonopoly) ? function () {
                    return m([f.Hx.CardMonopoly, null]);
                  } : function () {
                    return (0, c.Z)("\u5784\u65ad\u5361\uff0c\u53ef\u4ee5\u6307\u5b9a1\u79cd\u8d44\u6e90\uff0c\u5176\u4ed6\u6240\u6709\u73a9\u5bb6\u7ed9\u4f60\u8be5\u8d44\u6e90\uff0c\u76ee\u524d\u65e0\u6cd5\u4f7f\u7528");
                  } : a === f.pI.VP ? function () {
                    return (0, c.Z)("\u5206\u6570\u5361\uff0c\u65e0\u9700\u4f7f\u7528\uff0c\u4f60\u6084\u6084\u52a0\u4e86\u4e00\u5206\uff0c\u7b49\u4f60\u80dc\u5229\u65f6\u518d\u544a\u8bc9\u5927\u5bb6");
                  } : void 0
                }, "".concat(a, "-").concat(t));
              });
            }), !l.playerData[t.position - 1].cards.reduce(function (e, a) {
              return e + a;
            }) && (0, x.jsx)("div", {
              className: "catan-empty-hand",
              children: "\u4f60\u6682\u65e0\u53d1\u5c55\u5361"
            })]
          })]
        }), (0, x.jsx)("div", {
          className: "catan-player-strip",
          children: (0, x.jsx)(q, {
            hasPort: G,
            isOver: g,
            room: t,
            game: l,
            gameVersion: p,
            send: C
          })
        })],
        "data-guide-target": "ktd.hand"
      })]
    });
  };
  function T(e) {
    var a = e.game,
      t = g.ZP[a.mapId].tiles;
    return (0, x.jsxs)(x.Fragment, {
      children: [a.playerData.map(function (e, r) {
        return e.roads.map(function (e, n) {
          var o,
            c,
            i = (0, C.cu)(e, t),
            l = (0, s.Z)(i, 2),
            u = l[0],
            d = l[1],
            p = (0, C.$v)(e);
          return [f.K8.PutRoad, f.K8.BuyRoad].includes(null === (o = a.lastOp) || void 0 === o ? void 0 : o.type) && a.lastOp.road === e && (c = (0, x.jsxs)(x.Fragment, {
            children: [(0, x.jsx)("animateTransform", {
              attributeName: "transform",
              type: "translate",
              calcMode: "linear",
              from: "".concat(u, ",").concat(d - 100),
              to: "".concat(u, ",").concat(d),
              dur: "0.3s",
              additive: "sum",
              begin: "indefinite",
              fill: "freeze"
            }), (0, x.jsx)("animateTransform", {
              attributeName: "transform",
              type: "rotate",
              calcMode: "linear",
              from: p,
              to: p,
              dur: "0.3s",
              additive: "sum",
              begin: "indefinite",
              fill: "freeze"
            }), (0, x.jsx)("animateTransform", {
              attributeName: "transform",
              type: "scale",
              calcMode: "linear",
              from: "1.7",
              to: "1",
              dur: "0.3s",
              additive: "sum",
              begin: "indefinite",
              fill: "freeze"
            })]
          })), (0, x.jsx)("use", {
            xlinkHref: "#road".concat(r),
            transform: c ? void 0 : "translate(".concat(u, ",").concat(d, "),rotate(").concat(p, ")"),
            children: c
          }, "r".concat(n));
        });
      }), a.playerData.map(function (e, r) {
        return e.houses.map(function (e, n) {
          var o,
            c,
            i = (0, C.sw)(e, t),
            l = (0, s.Z)(i, 2),
            u = l[0],
            d = l[1];
          return [f.K8.PutHouse, f.K8.BuyHouse, f.K8.BuyCity].includes(null === (o = a.lastOp) || void 0 === o ? void 0 : o.type) && a.lastOp.house === e && (c = (0, x.jsxs)(x.Fragment, {
            children: [(0, x.jsx)("animate", {
              attributeName: "y",
              calcMode: "linear",
              from: -100,
              to: 0,
              dur: "0.3s",
              begin: "indefinite",
              fill: "freeze"
            }), (0, x.jsx)("animateTransform", {
              attributeName: "transform",
              type: "scale",
              calcMode: "linear",
              from: "1.7",
              to: "1",
              dur: "0.3s",
              additive: "sum",
              begin: "indefinite",
              fill: "freeze"
            })]
          })), (0, x.jsx)("use", {
            xlinkHref: "#".concat(1 & e ? "city" : "vill").concat(r),
            transform: "translate(".concat(u, ",").concat(d, ")"),
            children: c
          }, "h".concat(n));
        });
      })]
    });
  }
  var G = o.memo(T, function (e, a) {
    return e.gameVersion === a.gameVersion;
  });
  var F = function (e) {
      var a = e.room,
        t = e.game,
        r = e.putAnyHouse,
        n = e.putHouse,
        i = e.putRoad,
        l = e.putCity,
        u = e.putRoadByHouse,
        d = e.putRobber,
        p = (0, o.useState)([-1, null]),
        f = (0, s.Z)(p, 2),
        h = f[0],
        y = f[1];
      (0, o.useEffect)(function () {
        y([-1, null]);
      }, [d]);
      var m = g.ZP[t.mapId],
        v = a.position - 1,
        b = r ? (0, C.q9)(t) : l ? (0, C.fH)(t, v) : n ? (0, C.xG)(t, v) : [],
        D = i ? (0, C.jc)(t, v) : u ? (0, C.Z7)(t) : [],
        j = d ? (0, C.v5)(t) : [],
        k = h[0] > -1 ? (0, C.d3)(m.tiles[h[0]]) : [0, 0];
      return (0, x.jsxs)(x.Fragment, {
        children: [b.map(function (e, a) {
          var t = (0, s.Z)(e, 2),
            o = t[0],
            c = t[1],
            i = (0, s.Z)(o, 2),
            u = i[0],
            d = i[1],
            p = (0, C.US)(o, c),
            f = (0, s.Z)(p, 2),
            h = f[0],
            y = f[1];
          return (0, x.jsx)("circle", {
            className: "cursor-pointer",
            r: 50,
            cx: h,
            cy: y,
            opacity: "0.5",
            onClick: function () {
              var e = r || l || n;
              e && e(m.xyToId.get("".concat(u, ",").concat(d)) << 2 | c << 1 | (l ? 1 : 0));
            },
            "data-guide-target": "ktd.build",
            "data-guide-id": "road-" + a
          }, a);
        }), D.map(function (e, a) {
          var t = (0, s.Z)(e, 2),
            r = t[0],
            n = t[1],
            o = (0, s.Z)(r, 2),
            c = o[0],
            l = o[1],
            d = (0, C.gK)(r, n),
            p = (0, s.Z)(d, 2),
            f = p[0],
            h = p[1];
          return (0, x.jsx)("circle", {
            className: "cursor-pointer",
            r: 50,
            cx: f,
            cy: h,
            opacity: "0.5",
            onClick: function () {
              var e = i || u;
              e && e(m.xyToId.get("".concat(c, ",").concat(l)) << 2 | n);
            },
            "data-guide-target": "ktd.build",
            "data-guide-id": "vertex-" + a
          }, a);
        }), h[0] < 0 ? j.map(function (e, a) {
          var r = (0, s.Z)(e, 2),
            n = r[0],
            o = r[1],
            i = m.xyToId.get("".concat(n, ",").concat(o)),
            l = (0, C.d3)(e),
            u = (0, s.Z)(l, 2),
            p = u[0],
            f = u[1];
          return (0, x.jsx)("circle", {
            className: "cursor-pointer",
            r: 50,
            cx: p,
            cy: f,
            opacity: "0.5",
            onClick: function () {
              var a = d;
              if (a) {
                var r = new Map();
                if (t.playerData.forEach(function (a, t) {
                  t !== v && a.houses.forEach(function (a) {
                    var n = a >> 2,
                      s = (2 & a) >> 1,
                      o = m.tiles[n];
                    (0, C.Qp)(o, s, m).forEach(function (a) {
                      e[0] === a[0] && e[1] === a[1] && r.set(t, [o, s]);
                    });
                  });
                }), !r.size) return a(i, -1);
                if (r.size < 2) {
                  var n = Array.from(r.keys())[0];
                  if (2 === t.playerData.length) {
                    var s = t.playerData[n],
                      o = t.bankData,
                      l = n + 1;
                    if (s.houses.length + s.houses.filter(function (e) {
                      return 1 & e;
                    }).length + (o.longestRoadPos === l ? 2 : 0) + (o.maxRobberCountPos === l ? 2 : 0) === 2) return (0, c.Z)("\u4e24\u4eba\u5bf9\u6218\u65f6\uff0c\u82e5\u5bf9\u65b9\u4e3a2\u5206\uff0c\u4f60\u4e0d\u53ef\u4ee5\u628a\ud83d\ude08\u653e\u5728\u4ed6\u7684\u623f\u5b50\u8fb9\u4e0a");
                  }
                  return a(i, n);
                }
                y([i, r]);
              }
            }
          }, a);
        }) : (0, x.jsxs)(x.Fragment, {
          children: [(0, x.jsx)("rect", {
            width: "400",
            height: "64",
            fill: "black",
            opacity: "0.7",
            x: k[0] - 200,
            y: k[1] - 32
          }), (0, x.jsx)("text", {
            alignmentBaseline: "central",
            dominantBaseline: "central",
            textAnchor: "middle",
            fill: "#fff",
            fontSize: "46",
            x: k[0],
            y: k[1],
            children: "\u62a2\u593a\u8c01\u7684\u8d44\u6e90\u5361\uff1f"
          }), Array.from(h[1].entries()).map(function (e) {
            var a = (0, s.Z)(e, 2),
              t = a[0],
              r = a[1],
              n = (0, s.Z)(r, 2),
              o = n[0],
              c = n[1],
              i = (0, C.US)(o, c),
              l = (0, s.Z)(i, 2),
              u = l[0],
              p = l[1];
            return (0, x.jsx)("circle", {
              className: "cursor-pointer",
              r: 50,
              cx: u,
              cy: p,
              opacity: "0.5",
              onClick: function () {
                d && d(h[0], t);
              }
            }, t);
          })]
        })]
      });
    },
    U = t(4591);
  function z(e) {
    var a = e.n,
      t = e.a;
    if (!a) return null;
    var r = a - 1,
      n = r % 6,
      s = (r - n) / 6;
    return (0, x.jsxs)("div", {
      className: "absolute right-4 bottom-0".concat(t ? " animate-bounce" : ""),
      children: [(0, x.jsx)(U.Z, {
        n: n
      }), (0, x.jsx)(U.Z, {
        n: s
      })]
    });
  }
  var Y = o.memo(z);
  function Q(e) {
    var a,
      t,
      r,
      n = e.game,
      c = e.gameVersion,
      i = e.gameMapProp;
    (0, o.useEffect)(function () {
      Array.from(document.getElementsByTagName("animate")).forEach(function (e) {
        e.beginElement();
      }), Array.from(document.getElementsByTagName("animateTransform")).forEach(function (e) {
        e.beginElement();
      });
    }, [c]);
    var l = g.ZP[n.mapId],
      u = (0, C.d3)(l.tiles[n.robber]),
      d = (0, s.Z)(u, 2),
      p = d[0],
      h = d[1];
    if ((null === (a = n.lastOp) || void 0 === a ? void 0 : a.type) === f.K8.MoveRobber || (null === (t = n.lastOp) || void 0 === t ? void 0 : t.type) === f.K8.UseCardKnight) {
      var y = (0, C.d3)(l.tiles[n.lastOp.from]),
        m = (0, s.Z)(y, 2),
        v = m[0],
        b = m[1],
        D = "".concat(Math.sqrt((v - p) * (v - p) + (b - h) * (b - h)) / 1024, "s");
      return (0, x.jsxs)("use", {
        xlinkHref: "#rob",
        x: v,
        y: b,
        children: [(0, x.jsx)("animate", {
          attributeName: "x",
          calcMode: "linear",
          from: v,
          to: p,
          dur: D,
          begin: "indefinite",
          fill: "freeze"
        }), (0, x.jsx)("animate", {
          attributeName: "y",
          calcMode: "linear",
          from: b,
          to: h,
          dur: D,
          begin: "indefinite",
          fill: "freeze"
        })]
      });
    }
    var k = (0, x.jsx)("use", {
        xlinkHref: "#rob",
        x: p,
        y: h
      }),
      Z = (0, j.bg)(n.lastDice);
    if ((null === (r = n.lastOp) || void 0 === r ? void 0 : r.type) !== f.K8.RollDice || 7 === Z) return k;
    var R = (0, j.iG)(n, i, Z),
      w = [];
    return R.forEach(function (e, a) {
      var t = a.split(",").map(function (e) {
          return Number(e);
        }),
        r = (0, s.Z)(t, 2),
        n = r[0],
        o = r[1],
        c = (0, C.d3)([n, o]),
        i = (0, s.Z)(c, 2),
        l = i[0],
        u = i[1];
      w.push((0, x.jsx)("use", {
        xlinkHref: "#tile-bg1",
        className: "animate-pulse",
        fill: "#000",
        opacity: "0",
        x: l,
        y: u
      }, a));
    }), (0, x.jsxs)(x.Fragment, {
      children: [w, k]
    });
  }
  var $ = o.memo(Q, function (e, a) {
    return e.gameVersion === a.gameVersion;
  });
  var _ = function (e) {
    var a,
      t = e.room,
      p = e.game,
      h = e.send,
      y = (0, o.useState)([f.Hx.None, null]),
      m = (0, s.Z)(y, 2),
      v = m[0],
      D = m[1],
      C = e.view,
      k = (0, o.useMemo)(function () {
        try {
          return (0, g.sI)(C.mapId, C.mapProp);
        } catch (e) {
          return null;
        }
      }, []),
      Z = !!t.position,
      w = Z && t.position === t.owner,
      N = (0, j.ky)(t, C),
      H = N.isOver,
      I = function (next) {
        companionBridge.sink(companionBridge.catanIntent(C, next, t.position - 1));
      },
      L = function (e) {
        return function (a) {
          var o = t.position - 1;
          if (1 & a) {
            if (C.playerData[o].houses.filter(function (e) {
              return 1 & e;
            }).length > 4) return (0, c.Z)("\u57ce\u5e02\u6700\u591a\u4fee5\u5ea7");
          } else if (C.playerData[o].houses.filter(function (e) {
            return !(1 & e);
          }).length > 4) return (0, c.Z)("\u6751\u5e84\u6700\u591a\u4fee5\u5ea7");
          if (!e.every(function (e, a) {
            return C.playerData[o].resources[a] >= e;
          })) return (0, c.Z)("\u8d44\u6e90\u4e0d\u8db3");
          var i = {
              state: C.state,
              devCard: C.devCard,
              lastOp: {
                type: f.K8.PutHouse,
                playerId: o,
                house: a,
                costs: e
              },
              robber: C.robber,
              lastDice: C.lastDice,
              newCards: C.newCards,
              bankData: C.bankData,
              playerData: (0, n.Z)(C.playerData),
              actionRequest: C.actionRequest
            },
            l = i.playerData[o];
          if (i.playerData[o] = (0, r.Z)((0, r.Z)({}, l), {}, {
            houses: [].concat((0, n.Z)(l.houses), [a]),
            resources: e.map(function (e, a) {
              return l.resources[a] - e;
            })
          }), i.bankData.resources = i.bankData.resources.map(function (a, t) {
            return a + e[t];
          }), 1 & a) i.playerData[o].houses.splice(l.houses.indexOf(a >> 1 << 1), 1);else if (1 === l.houses.length) {
            var u = (2 & a) >> 1,
              d = g.ZP[C.mapId],
              p = d.tiles[a >> 2],
              h = (0, s.Z)(p, 2),
              y = h[0],
              m = h[1],
              x = [0, 0, 0, 0, 0],
              v = function (e, a) {
                var t = d.xyToId.get("".concat(e, ",").concat(a));
                if (t < d.tileCount) {
                  var r = k.tileTypes[t];
                  r < f.j5.None && (x[r] += 1);
                }
              };
            v(y, m), v(y - 1, m - 1), u ? v(y, m - 1) : v(y - 1, m), i.playerData[o].resources = x, i.bankData.resources = i.bankData.resources.map(function (e, a) {
              return e - x[a];
            });
          }
          I(i, !(1 & a));
        };
      },
      E = function (e) {
        return function (a) {
          var s = t.position - 1;
          if (C.playerData[s].roads.length > 14) return (0, c.Z)("\u9053\u8def\u6700\u591a\u4fee15\u6761");
          if (!e.every(function (e, a) {
            return C.playerData[s].resources[a] >= e;
          })) return (0, c.Z)("\u8d44\u6e90\u4e0d\u8db3");
          var o = {
              state: C.state,
              devCard: 16 & C.devCard ? C.devCard : 2 & C.devCard ? 125 & C.devCard : C.devCard,
              lastOp: {
                type: f.K8.PutRoad,
                playerId: s,
                road: a,
                costs: e
              },
              robber: C.robber,
              lastDice: C.lastDice,
              newCards: C.newCards,
              bankData: C.bankData,
              playerData: (0, n.Z)(C.playerData),
              actionRequest: C.actionRequest
            },
            i = o.playerData[s];
          o.playerData[s] = (0, r.Z)((0, r.Z)({}, i), {}, {
            roads: [].concat((0, n.Z)(i.roads), [a]),
            resources: e.map(function (e, a) {
              return i.resources[a] - e;
            })
          }), o.bankData.resources = o.bankData.resources.map(function (a, t) {
            return a + e[t];
          }), i.roads.length ? i.roads.length < 2 && (o.state = o.state ? o.state - 1 : 0) : o.state = o.state === C.playerData.length - 1 ? o.state : o.state + 1, I(o, !0);
        };
      };
    return (0, o.useEffect)(function () {
      var e = N.allowOps;
      if (1 === e.length) {
        var a = e[0];
        if (a === f.K8.PutHouse) D([f.Hx.PutAnyHouse, L(f.Vf[f.Wj.Free])]);else if (a === f.K8.PutRoad) {
          var s = E(f.Vf[f.Wj.Free]);
          !(16 & C.devCard) && 2 & C.devCard ? D([f.Hx.PutRoad, s]) : D([f.Hx.PutRoadByHouse, s]);
        } else a === f.K8.DiscardResource ? D([f.Hx.DiscardResource, function (e) {
          var a = t.position - 1,
            s = {
              state: C.state,
              devCard: C.devCard,
              robber: C.robber,
              lastDice: C.lastDice,
              newCards: C.newCards,
              bankData: (0, r.Z)((0, r.Z)({}, C.bankData), {}, {
                resources: C.bankData.resources.map(function (a, t) {
                  return a + e[t];
                })
              }),
              playerData: (0, n.Z)(C.playerData),
              actionRequest: C.actionRequest & (0, O.Vi)(a, t.playerList.length)
            };
          s.playerData[a] = (0, r.Z)((0, r.Z)({}, s.playerData[a]), {}, {
            resources: s.playerData[a].resources.map(function (a, t) {
              return a - e[t];
            })
          }), s.lastOp = {
            type: f.K8.RollDice,
            playerId: C.lastOp.playerId
          }, I(s);
        }]) : a === f.K8.MoveRobber ? D([f.Hx.MoveRobber, function (e, a) {
          var s = t.position - 1,
            o = {
              state: C.state,
              devCard: C.devCard,
              lastOp: {
                type: f.K8.MoveRobber,
                playerId: s,
                from: C.robber,
                to: e
              },
              robber: e,
              lastDice: C.lastDice,
              newCards: C.newCards,
              bankData: C.bankData,
              playerData: (0, n.Z)(C.playerData),
              actionRequest: C.actionRequest
            };
          if (a > -1) {
            var c = [];
            if (o.playerData[a].resources.forEach(function (e, a) {
              for (var t = 0; t < e; t++) c.push(a);
            }), c.length) {
              var i = (0, R.M)(c.length),
                l = c[i];
              o.playerData[a] = (0, r.Z)((0, r.Z)({}, o.playerData[a]), {}, {
                resources: (0, n.Z)(o.playerData[a].resources)
              }), o.playerData[a].resources[l] -= 1, o.playerData[s] = (0, r.Z)((0, r.Z)({}, o.playerData[s]), {}, {
                resources: (0, n.Z)(o.playerData[s].resources)
              }), o.playerData[s].resources[l] += 1, o.lastOp.withPlayerId = a, o.lastOp.needs = [0, 0, 0, 0, 0], o.lastOp.needs[l] = 1;
            }
          }
          I(o);
        }]) : D([f.Hx.None, null]);
      } else D([f.Hx.None, null]);
    }, [p.version]), (0, l.N)([]), k ? (0, x.jsxs)(x.Fragment, {
      children: [w && !H && (0, x.jsx)("div", {
        className: "button-container",
        children: (0, x.jsx)("div", {
          className: "button-right",
          children: (0, x.jsx)(i.Z, {
            small: !0,
            onClick: function () {
              return (0, l.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return h(u.Z.OwnerExitGame, {
                  data: d.AD.encode({
                    mapId: C.mapId
                  }).finish()
                });
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, x.jsx)(companionMapBridge.mapViewport, {
        children: (0, x.jsxs)("div", {
          className: "max-w-3xl mx-auto w-full relative",
          children: [(0, x.jsxs)("svg", {
            id: "svg",
            viewBox: g.ZP[C.mapId].box.join(" "),
            xmlns: "http://www.w3.org/2000/svg",
            children: [(0, x.jsx)(b, {
              count: t.playerList.length
            }), (0, x.jsx)(K, {
              game: C,
              mapProp: k
            }), (0, x.jsx)(G, {
              game: C,
              gameVersion: p.version
            }), (0, x.jsx)($, {
              game: C,
              gameVersion: p.version,
              gameMapProp: k
            }), Z && (0, x.jsx)(F, {
              putAnyHouse: v[0] === f.Hx.PutAnyHouse && v[1],
              putRoadByHouse: v[0] === f.Hx.PutRoadByHouse && v[1],
              putRoad: (v[0] === f.Hx.PutRoad || v[0] === f.Hx.CardRoad) && v[1],
              putHouse: v[0] === f.Hx.PutHouse && v[1],
              putCity: v[0] === f.Hx.PutCity && v[1],
              putRobber: (v[0] === f.Hx.MoveRobber || v[0] === f.Hx.CardKnight) && v[1],
              room: t,
              game: C
            })]
          }), (0, x.jsx)(Y, {
            n: C.lastDice,
            a: (null === (a = C.lastOp) || void 0 === a ? void 0 : a.type) === f.K8.RollDice
          })]
        })
      }), (0, x.jsxs)("div", {
        className: "text-center catan-actions",
        children: [(0, x.jsx)("div", {
          className: "mt-2".concat(H ? " text-2xl" : ""),
          children: N.hint
        }), Z ? (0, x.jsx)(P, {
          room: t,
          game: C,
          gameState: N,
          gameMapProp: k,
          updateGameData: I,
          send: h,
          action: v,
          setAction: D,
          putRoad: E,
          putHouse: L
        }) : (0, x.jsx)("div", {
          className: "text-2xl mt-2",
          children: "\u89c2\u6218\u4e2d"
        })]
      }), (0, x.jsx)(A, {
        room: t,
        game: C,
        gameMapProp: k,
        gameState: N,
        gameVersion: p.version,
        action0: v[0],
        setAction: D,
        discardResource: v[0] === f.Hx.DiscardResource && v[1],
        updateGameData: I,
        isOver: H,
        send: h
      })]
    }) : (0, x.jsxs)(x.Fragment, {
      children: [w && !H && (0, x.jsx)("div", {
        className: "button-container",
        children: (0, x.jsx)("div", {
          className: "button-right",
          children: (0, x.jsx)(i.Z, {
            small: !0,
            onClick: function () {
              return h(u.Z.OwnerExitGame, {
                data: d.AD.encode({
                  mapId: 0
                }).finish()
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, x.jsx)("div", {
        className: "text-center",
        children: "\u6570\u636e\u5f02\u5e38\uff0c\u8bf7\u6362\u522b\u7684\u623f\u95f4"
      })]
    });
  };
},
738: function (e, a, t) {
  t.d(a, {
    AD: function () {
      return i;
    }
  });
  var r = t(7710),
    n = r.Reader,
    s = r.Writer,
    o = r.util,
    c = r.roots.default || (r.roots.default = {}),
    i = (c.BankData = function () {
      function e(e) {
        if (this.resources = [], this.cards = [], e) for (var a = Object.keys(e), t = 0; t < a.length; ++t) null != e[a[t]] && (this[a[t]] = e[a[t]]);
      }
      return e.prototype.resources = o.emptyArray, e.prototype.cards = o.emptyArray, e.prototype.longestRoad = 0, e.prototype.longestRoadPos = 0, e.prototype.maxRobberCount = 0, e.prototype.maxRobberCountPos = 0, e.encode = function (e, a) {
        if (a || (a = s.create()), null != e.resources && e.resources.length) {
          a.uint32(10).fork();
          for (var t = 0; t < e.resources.length; ++t) a.uint32(e.resources[t]);
          a.ldelim();
        }
        if (null != e.cards && e.cards.length) {
          a.uint32(18).fork();
          for (t = 0; t < e.cards.length; ++t) a.uint32(e.cards[t]);
          a.ldelim();
        }
        return null != e.longestRoad && Object.hasOwnProperty.call(e, "longestRoad") && a.uint32(24).uint32(e.longestRoad), null != e.longestRoadPos && Object.hasOwnProperty.call(e, "longestRoadPos") && a.uint32(32).uint32(e.longestRoadPos), null != e.maxRobberCount && Object.hasOwnProperty.call(e, "maxRobberCount") && a.uint32(40).uint32(e.maxRobberCount), null != e.maxRobberCountPos && Object.hasOwnProperty.call(e, "maxRobberCountPos") && a.uint32(48).uint32(e.maxRobberCountPos), a;
      }, e.decode = function (e, a) {
        e instanceof n || (e = n.create(e));
        for (var t = void 0 === a ? e.len : e.pos + a, r = new c.BankData(); e.pos < t;) {
          var s = e.uint32();
          switch (s >>> 3) {
            case 1:
              if (r.resources && r.resources.length || (r.resources = []), 2 === (7 & s)) for (var o = e.uint32() + e.pos; e.pos < o;) r.resources.push(e.uint32());else r.resources.push(e.uint32());
              break;
            case 2:
              if (r.cards && r.cards.length || (r.cards = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.cards.push(e.uint32());else r.cards.push(e.uint32());
              break;
            case 3:
              r.longestRoad = e.uint32();
              break;
            case 4:
              r.longestRoadPos = e.uint32();
              break;
            case 5:
              r.maxRobberCount = e.uint32();
              break;
            case 6:
              r.maxRobberCountPos = e.uint32();
              break;
            default:
              e.skipType(7 & s);
          }
        }
        return r;
      }, e;
    }(), c.PlayerData = function () {
      function e(e) {
        if (this.resources = [], this.cards = [], this.houses = [], this.roads = [], e) for (var a = Object.keys(e), t = 0; t < a.length; ++t) null != e[a[t]] && (this[a[t]] = e[a[t]]);
      }
      return e.prototype.resources = o.emptyArray, e.prototype.cards = o.emptyArray, e.prototype.longestRoad = 0, e.prototype.robberCount = 0, e.prototype.houses = o.emptyArray, e.prototype.roads = o.emptyArray, e.encode = function (e, a) {
        if (a || (a = s.create()), null != e.resources && e.resources.length) {
          a.uint32(10).fork();
          for (var t = 0; t < e.resources.length; ++t) a.uint32(e.resources[t]);
          a.ldelim();
        }
        if (null != e.cards && e.cards.length) {
          a.uint32(18).fork();
          for (t = 0; t < e.cards.length; ++t) a.uint32(e.cards[t]);
          a.ldelim();
        }
        if (null != e.longestRoad && Object.hasOwnProperty.call(e, "longestRoad") && a.uint32(24).uint32(e.longestRoad), null != e.robberCount && Object.hasOwnProperty.call(e, "robberCount") && a.uint32(32).uint32(e.robberCount), null != e.houses && e.houses.length) {
          a.uint32(42).fork();
          for (t = 0; t < e.houses.length; ++t) a.uint32(e.houses[t]);
          a.ldelim();
        }
        if (null != e.roads && e.roads.length) {
          a.uint32(50).fork();
          for (t = 0; t < e.roads.length; ++t) a.uint32(e.roads[t]);
          a.ldelim();
        }
        return a;
      }, e.decode = function (e, a) {
        e instanceof n || (e = n.create(e));
        for (var t = void 0 === a ? e.len : e.pos + a, r = new c.PlayerData(); e.pos < t;) {
          var s = e.uint32();
          switch (s >>> 3) {
            case 1:
              if (r.resources && r.resources.length || (r.resources = []), 2 === (7 & s)) for (var o = e.uint32() + e.pos; e.pos < o;) r.resources.push(e.uint32());else r.resources.push(e.uint32());
              break;
            case 2:
              if (r.cards && r.cards.length || (r.cards = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.cards.push(e.uint32());else r.cards.push(e.uint32());
              break;
            case 3:
              r.longestRoad = e.uint32();
              break;
            case 4:
              r.robberCount = e.uint32();
              break;
            case 5:
              if (r.houses && r.houses.length || (r.houses = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.houses.push(e.uint32());else r.houses.push(e.uint32());
              break;
            case 6:
              if (r.roads && r.roads.length || (r.roads = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.roads.push(e.uint32());else r.roads.push(e.uint32());
              break;
            default:
              e.skipType(7 & s);
          }
        }
        return r;
      }, e;
    }(), c.ExchangeData = function () {
      function e(e) {
        if (this.needs = [], this.costs = [], this.responses = [], e) for (var a = Object.keys(e), t = 0; t < a.length; ++t) null != e[a[t]] && (this[a[t]] = e[a[t]]);
      }
      return e.prototype.needs = o.emptyArray, e.prototype.costs = o.emptyArray, e.prototype.responses = o.emptyArray, e.encode = function (e, a) {
        if (a || (a = s.create()), null != e.needs && e.needs.length) {
          a.uint32(10).fork();
          for (var t = 0; t < e.needs.length; ++t) a.uint32(e.needs[t]);
          a.ldelim();
        }
        if (null != e.costs && e.costs.length) {
          a.uint32(18).fork();
          for (t = 0; t < e.costs.length; ++t) a.uint32(e.costs[t]);
          a.ldelim();
        }
        if (null != e.responses && e.responses.length) {
          a.uint32(26).fork();
          for (t = 0; t < e.responses.length; ++t) a.uint32(e.responses[t]);
          a.ldelim();
        }
        return a;
      }, e.decode = function (e, a) {
        e instanceof n || (e = n.create(e));
        for (var t = void 0 === a ? e.len : e.pos + a, r = new c.ExchangeData(); e.pos < t;) {
          var s = e.uint32();
          switch (s >>> 3) {
            case 1:
              if (r.needs && r.needs.length || (r.needs = []), 2 === (7 & s)) for (var o = e.uint32() + e.pos; e.pos < o;) r.needs.push(e.uint32());else r.needs.push(e.uint32());
              break;
            case 2:
              if (r.costs && r.costs.length || (r.costs = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.costs.push(e.uint32());else r.costs.push(e.uint32());
              break;
            case 3:
              if (r.responses && r.responses.length || (r.responses = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.responses.push(e.uint32());else r.responses.push(e.uint32());
              break;
            default:
              e.skipType(7 & s);
          }
        }
        return r;
      }, e;
    }(), c.KTDOperation = function () {
      function e(e) {
        if (this.needs = [], this.costs = [], e) for (var a = Object.keys(e), t = 0; t < a.length; ++t) null != e[a[t]] && (this[a[t]] = e[a[t]]);
      }
      return e.prototype.type = 0, e.prototype.playerId = 0, e.prototype.dice = 0, e.prototype.from = 0, e.prototype.to = 0, e.prototype.road = 0, e.prototype.house = 0, e.prototype.withPlayerId = 0, e.prototype.needs = o.emptyArray, e.prototype.costs = o.emptyArray, e.encode = function (e, a) {
        if (a || (a = s.create()), null != e.type && Object.hasOwnProperty.call(e, "type") && a.uint32(8).uint32(e.type), null != e.playerId && Object.hasOwnProperty.call(e, "playerId") && a.uint32(16).uint32(e.playerId), null != e.dice && Object.hasOwnProperty.call(e, "dice") && a.uint32(24).uint32(e.dice), null != e.from && Object.hasOwnProperty.call(e, "from") && a.uint32(32).uint32(e.from), null != e.to && Object.hasOwnProperty.call(e, "to") && a.uint32(40).uint32(e.to), null != e.road && Object.hasOwnProperty.call(e, "road") && a.uint32(48).uint32(e.road), null != e.house && Object.hasOwnProperty.call(e, "house") && a.uint32(56).uint32(e.house), null != e.withPlayerId && Object.hasOwnProperty.call(e, "withPlayerId") && a.uint32(64).uint32(e.withPlayerId), null != e.needs && e.needs.length) {
          a.uint32(74).fork();
          for (var t = 0; t < e.needs.length; ++t) a.uint32(e.needs[t]);
          a.ldelim();
        }
        if (null != e.costs && e.costs.length) {
          a.uint32(82).fork();
          for (t = 0; t < e.costs.length; ++t) a.uint32(e.costs[t]);
          a.ldelim();
        }
        return a;
      }, e.decode = function (e, a) {
        e instanceof n || (e = n.create(e));
        for (var t = void 0 === a ? e.len : e.pos + a, r = new c.KTDOperation(); e.pos < t;) {
          var s = e.uint32();
          switch (s >>> 3) {
            case 1:
              r.type = e.uint32();
              break;
            case 2:
              r.playerId = e.uint32();
              break;
            case 3:
              r.dice = e.uint32();
              break;
            case 4:
              r.from = e.uint32();
              break;
            case 5:
              r.to = e.uint32();
              break;
            case 6:
              r.road = e.uint32();
              break;
            case 7:
              r.house = e.uint32();
              break;
            case 8:
              r.withPlayerId = e.uint32();
              break;
            case 9:
              if (r.needs && r.needs.length || (r.needs = []), 2 === (7 & s)) for (var o = e.uint32() + e.pos; e.pos < o;) r.needs.push(e.uint32());else r.needs.push(e.uint32());
              break;
            case 10:
              if (r.costs && r.costs.length || (r.costs = []), 2 === (7 & s)) for (o = e.uint32() + e.pos; e.pos < o;) r.costs.push(e.uint32());else r.costs.push(e.uint32());
              break;
            default:
              e.skipType(7 & s);
          }
        }
        return r;
      }, e;
    }(), c.KTDGameData = function () {
      function e(e) {
        if (this.newCards = [], this.playerData = [], e) for (var a = Object.keys(e), t = 0; t < a.length; ++t) null != e[a[t]] && (this[a[t]] = e[a[t]]);
      }
      return e.prototype.mapId = 0, e.prototype.mapProp = o.newBuffer([]), e.prototype.state = 0, e.prototype.devCard = 0, e.prototype.lastOp = null, e.prototype.robber = 0, e.prototype.lastDice = 0, e.prototype.newCards = o.emptyArray, e.prototype.exchangeData = null, e.prototype.bankData = null, e.prototype.playerData = o.emptyArray, e.prototype.actionRequest = 0, e.encode = function (e, a) {
        if (a || (a = s.create()), null != e.mapId && Object.hasOwnProperty.call(e, "mapId") && a.uint32(8).uint32(e.mapId), null != e.mapProp && Object.hasOwnProperty.call(e, "mapProp") && a.uint32(18).bytes(e.mapProp), null != e.state && Object.hasOwnProperty.call(e, "state") && a.uint32(24).uint32(e.state), null != e.devCard && Object.hasOwnProperty.call(e, "devCard") && a.uint32(32).uint32(e.devCard), null != e.lastOp && Object.hasOwnProperty.call(e, "lastOp") && c.KTDOperation.encode(e.lastOp, a.uint32(42).fork()).ldelim(), null != e.robber && Object.hasOwnProperty.call(e, "robber") && a.uint32(48).uint32(e.robber), null != e.lastDice && Object.hasOwnProperty.call(e, "lastDice") && a.uint32(56).uint32(e.lastDice), null != e.newCards && e.newCards.length) {
          a.uint32(66).fork();
          for (var t = 0; t < e.newCards.length; ++t) a.uint32(e.newCards[t]);
          a.ldelim();
        }
        if (null != e.exchangeData && Object.hasOwnProperty.call(e, "exchangeData") && c.ExchangeData.encode(e.exchangeData, a.uint32(74).fork()).ldelim(), null != e.bankData && Object.hasOwnProperty.call(e, "bankData") && c.BankData.encode(e.bankData, a.uint32(82).fork()).ldelim(), null != e.playerData && e.playerData.length) for (t = 0; t < e.playerData.length; ++t) c.PlayerData.encode(e.playerData[t], a.uint32(90).fork()).ldelim();
        return null != e.actionRequest && Object.hasOwnProperty.call(e, "actionRequest") && a.uint32(96).uint32(e.actionRequest), a;
      }, e.decode = function (e, a) {
        e instanceof n || (e = n.create(e));
        for (var t = void 0 === a ? e.len : e.pos + a, r = new c.KTDGameData(); e.pos < t;) {
          var s = e.uint32();
          switch (s >>> 3) {
            case 1:
              r.mapId = e.uint32();
              break;
            case 2:
              r.mapProp = e.bytes();
              break;
            case 3:
              r.state = e.uint32();
              break;
            case 4:
              r.devCard = e.uint32();
              break;
            case 5:
              r.lastOp = c.KTDOperation.decode(e, e.uint32());
              break;
            case 6:
              r.robber = e.uint32();
              break;
            case 7:
              r.lastDice = e.uint32();
              break;
            case 8:
              if (r.newCards && r.newCards.length || (r.newCards = []), 2 === (7 & s)) for (var o = e.uint32() + e.pos; e.pos < o;) r.newCards.push(e.uint32());else r.newCards.push(e.uint32());
              break;
            case 9:
              r.exchangeData = c.ExchangeData.decode(e, e.uint32());
              break;
            case 10:
              r.bankData = c.BankData.decode(e, e.uint32());
              break;
            case 11:
              r.playerData && r.playerData.length || (r.playerData = []), r.playerData.push(c.PlayerData.decode(e, e.uint32()));
              break;
            case 12:
              r.actionRequest = e.uint32();
              break;
            default:
              e.skipType(7 & s);
          }
        }
        return r;
      }, e;
    }());
},
6634: function (e, a, t) {
  var r, n, s, o;
  t.d(a, {
    DM: function () {
      return l;
    },
    Hx: function () {
      return o;
    },
    K8: function () {
      return s;
    },
    SR: function () {
      return u;
    },
    Vf: function () {
      return i;
    },
    Wj: function () {
      return c;
    },
    j5: function () {
      return r;
    },
    pI: function () {
      return n;
    }
  }), function (e) {
    e[e.Lumber = 0] = "Lumber", e[e.Brick = 1] = "Brick", e[e.Wool = 2] = "Wool", e[e.Grain = 3] = "Grain", e[e.Ore = 4] = "Ore", e[e.None = 7] = "None";
  }(r || (r = {})), function (e) {
    e[e.Knight = 0] = "Knight", e[e.RoadBuilding = 1] = "RoadBuilding", e[e.YearOfPlenty = 2] = "YearOfPlenty", e[e.Monopoly = 3] = "Monopoly", e[e.VP = 4] = "VP";
  }(n || (n = {})), function (e) {
    e[e.None = 0] = "None", e[e.PutHouse = 1] = "PutHouse", e[e.PutRoad = 2] = "PutRoad", e[e.RollDice = 3] = "RollDice", e[e.UseCardKnight = 4] = "UseCardKnight", e[e.UseCardRoads = 5] = "UseCardRoads", e[e.UseCardResources = 6] = "UseCardResources", e[e.UseCardMonopoly = 7] = "UseCardMonopoly", e[e.MoveRobber = 8] = "MoveRobber", e[e.DiscardResource = 9] = "DiscardResource", e[e.BuyHouse = 10] = "BuyHouse", e[e.BuyRoad = 11] = "BuyRoad", e[e.BuyDevCard = 12] = "BuyDevCard", e[e.BuyCity = 13] = "BuyCity", e[e.ExchangeWithBank = 14] = "ExchangeWithBank", e[e.ExchangeWithPlayer = 15] = "ExchangeWithPlayer";
  }(s || (s = {})), function (e) {
    e[e.None = 0] = "None", e[e.PutAnyHouse = 1] = "PutAnyHouse", e[e.PutRoadByHouse = 2] = "PutRoadByHouse", e[e.PutHouse = 3] = "PutHouse", e[e.PutRoad = 4] = "PutRoad", e[e.PutCity = 5] = "PutCity", e[e.Exchange = 6] = "Exchange", e[e.MoveRobber = 7] = "MoveRobber", e[e.CardKnight = 8] = "CardKnight", e[e.CardRoad = 9] = "CardRoad", e[e.CardResource = 10] = "CardResource", e[e.CardMonopoly = 11] = "CardMonopoly", e[e.DiscardResource = 12] = "DiscardResource", e[e.BuyDevCard = 13] = "BuyDevCard", e[e.End = 14] = "End";
  }(o || (o = {}));
  var c,
    i = [[0, 0, 0, 0, 0], [1, 1, 0, 0, 0], [1, 1, 1, 1, 0], [0, 0, 0, 2, 3], [0, 0, 1, 1, 1]];
  !function (e) {
    e[e.Free = 0] = "Free", e[e.Road = 1] = "Road", e[e.Village = 2] = "Village", e[e.City = 3] = "City", e[e.DevCard = 4] = "DevCard";
  }(c || (c = {}));
  var l = ["red", "blue", "green", "orange", "white", "black", "purple", "pink"],
    u = [["#ff3636", "#b41010", "#710f39"], ["#10abef", "#4f4fef", "#1010c0"], ["#06ff1b", "#4ea85f", "#096a08"], ["#fe993e", "#f47507", "#763903"], ["#fefcf3", "#cee2e2", "#8eafaf"], ["#7d7c7f", "#424242", "#231F21"], ["#d14ef8", "#6f06a4", "#550870"], ["#fecdda", "#fe8ead", "#d8466e"]];
},
4929: function (e, t, n) {
  "use strict";

  var i = n(1413),
    a = n(7313),
    r = n(6417);
  function o(e) {
    return (0, r.jsx)("text", (0, i.Z)({
      alignmentBaseline: "central",
      dominantBaseline: "central",
      textAnchor: "middle"
    }, e));
  }
  t.Z = a.memo(o);
},
552: function (e, a, t) {
  t.d(a, {
    Bx: function () {
      return p;
    },
    Gq: function () {
      return x;
    },
    HU: function () {
      return g;
    },
    bb: function () {
      return h;
    },
    bg: function () {
      return f;
    },
    d7: function () {
      return C;
    },
    iG: function () {
      return y;
    },
    ky: function () {
      return b;
    },
    my: function () {
      return D;
    },
    tY: function () {
      return m;
    }
  });
  var r = t(1413),
    n = t(2982),
    s = t(885),
    o = t(738),
    c = t(9796),
    i = t(6634),
    l = t(6805),
    u = t(4420),
    d = t(6912),
    p = function (e, a) {
      var t,
        r,
        n,
        s = o.AD.decode(a).mapId,
        l = c.ZP[s];
      s ? s < 2 ? (t = (0, u.T)([i.j5.None, i.j5.None, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Ore, i.j5.Ore, i.j5.Ore, i.j5.Ore, i.j5.Ore]), r = (0, u.T)([i.j5.None, i.j5.None, i.j5.None, i.j5.None, i.j5.None, i.j5.Lumber, i.j5.Brick, i.j5.Wool, i.j5.Wool, i.j5.Grain, i.j5.Ore]), n = [2, 5, 4, 6, 3, 9, 8, 11, 11, 10, 6, 3, 8, 4, 8, 10, 11, 12, 10, 5, 4, 9, 5, 9, 12, 3, 2, 6]) : (t = (0, u.T)([i.j5.None, i.j5.None, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Ore, i.j5.Ore, i.j5.Ore, i.j5.Ore, i.j5.Ore, i.j5.Ore]), r = (0, u.T)([i.j5.None, i.j5.None, i.j5.None, i.j5.None, i.j5.None, i.j5.None, i.j5.Lumber, i.j5.Brick, i.j5.Wool, i.j5.Wool, i.j5.Grain, i.j5.Ore]), n = [6, 4, 5, 6, 12, 11, 10, 8, 4, 6, 3, 10, 8, 11, 11, 8, 9, 3, 5, 10, 3, 5, 2, 3, 12, 9, 5, 9, 4, 6, 2, 8, 9, 4, 10]) : (t = (0, u.T)([i.j5.None, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Lumber, i.j5.Brick, i.j5.Brick, i.j5.Brick, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Wool, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Grain, i.j5.Ore, i.j5.Ore, i.j5.Ore]), r = (0, u.T)([i.j5.None, i.j5.None, i.j5.None, i.j5.None, i.j5.Lumber, i.j5.Brick, i.j5.Wool, i.j5.Grain, i.j5.Ore]), n = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11]), t.forEach(function (e, a) {
        e === i.j5.None && n.splice(a, 0, 7);
      });
      return {
        mapId: s,
        mapProp: (0, c.jj)(s, t, n, r),
        state: 0,
        devCard: 0,
        robber: n.indexOf(7),
        lastDice: 0,
        newCards: [0, 0, 0, 0, 0],
        bankData: {
          resources: new Array(5).fill(l.resCount),
          cards: l.devCount,
          longestRoad: 0,
          longestRoadPos: 0,
          maxRobberCount: 0,
          maxRobberCountPos: 0
        },
        playerData: new Array(e.playerList.length).fill({
          resources: [0, 0, 0, 0, 0],
          cards: [0, 0, 0, 0, 0],
          longestRoad: 0,
          robberCount: 0,
          houses: [],
          roads: []
        })
      };
    },
    f = function (e) {
      var a = e - 1;
      return a % 6 + Math.floor(a / 6) + 2;
    },
    h = function (e) {
      var a;
      return !(16 & e.devCard) && (null === (a = e.lastOp) || void 0 === a ? void 0 : a.type) === i.K8.RollDice && 7 === f(e.lastDice) && !!e.actionRequest;
    },
    y = function (e, a, t) {
      var r = new Map(),
        n = c.ZP[e.mapId];
      return a.tileNums.forEach(function (o, c) {
        if (o === t && e.robber !== c) {
          var i = a.tileTypes[c],
            l = (0, s.Z)(n.tiles[c], 2),
            u = l[0],
            d = l[1];
          r.set("".concat(u, ",").concat(d), i);
        }
      }), r;
    },
    m = function (e, a, t) {
      if (t < 0) return new Array(i.j5.None + 1).fill(!1);
      var r = c.ZP[e.mapId],
        n = new Map();
      r.ports.forEach(function (e, a) {
        var t = (0, s.Z)(e, 2),
          o = t[0],
          c = t[1],
          i = (0, s.Z)(r.tiles[o], 2),
          l = i[0],
          u = i[1];
        c ? c < 2 ? (n.set("".concat(l, ",").concat(u, ",0"), a), n.set("".concat(l, ",").concat(u, ",1"), a)) : c < 3 ? (n.set("".concat(l, ",").concat(u, ",1"), a), n.set("".concat(l + 1, ",").concat(u, ",0"), a)) : c < 4 ? (n.set("".concat(l + 1, ",").concat(u, ",0"), a), n.set("".concat(l + 1, ",").concat(u + 1, ",1"), a)) : c < 5 ? (n.set("".concat(l + 1, ",").concat(u + 1, ",0"), a), n.set("".concat(l + 1, ",").concat(u + 1, ",1"), a)) : (n.set("".concat(l + 1, ",").concat(u + 1, ",0"), a), n.set("".concat(l, ",").concat(u + 1, ",1"), a)) : (n.set("".concat(l, ",").concat(u, ",0"), a), n.set("".concat(l, ",").concat(u + 1, ",1"), a));
      });
      var o = new Array(i.j5.None + 1).fill(!1);
      return e.playerData[t].houses.forEach(function (e) {
        var t = (2 & e) >> 1,
          c = e >> 2,
          i = (0, s.Z)(r.tiles[c], 2),
          l = i[0],
          u = i[1],
          d = n.get("".concat(l, ",").concat(u, ",").concat(t));
        void 0 !== d && (o[a.portTypes[d]] = !0);
      }), o;
    },
    x = function (e, a) {
      var t = c.ZP[e.mapId].resCount;
      return e.bankData.resources.map(function (r, n) {
        return t - r - e.playerData[a].resources[n];
      });
    },
    v = function (e) {
      var a = [],
        t = e.bankData;
      return e.playerData.forEach(function (e, r) {
        var n = r + 1;
        a.push(e.houses.length + e.houses.filter(function (e) {
          return 1 & e;
        }).length + (t.longestRoadPos === n ? 2 : 0) + (t.maxRobberCountPos === n ? 2 : 0) + e.cards[i.pI.VP]);
      }), a;
    },
    b = function (e, a) {
      var t,
        r,
        n = a.state,
        s = e.position - 1,
        o = e.position && n === s ? "\u4f60" : "\u73a9\u5bb6".concat(n + 1),
        u = [],
        d = a.playerData[n],
        p = d.houses.length,
        h = d.roads.length,
        y = v(a);
      if (!(16 & a.devCard) && y[a.state] >= c.ZP[a.mapId].settings[e.playerList.length][0]) return r = "\u606d\u559c".concat(o, "\u80dc\u5229"), {
        isOver: !0,
        waitFor: n,
        allowOps: u,
        hint: r
      };
      if (h < 2 && h < p) u.push(i.K8.PutRoad), r = "\u7b49\u5f85".concat(o, "\u4fee\u5efa\u9053\u8def");else if (p < 2) u.push(i.K8.PutHouse), r = "\u7b49\u5f85".concat(o, "\u4fee\u5efa\u6751\u5e84");else if (16 & a.devCard) u.push(i.K8.BuyHouse, i.K8.BuyRoad, i.K8.BuyDevCard, i.K8.BuyCity), r = "\ud83d\udea9\u7b49\u5f85".concat(o, "\u5efa\u9020");else if (2 & a.devCard) u.push(i.K8.PutRoad), r = "\u7b49\u5f85".concat(o, "\u4fee\u5efa\u9053\u8def");else if (a.lastDice) {
        if ((null === (t = a.lastOp) || void 0 === t ? void 0 : t.type) === i.K8.RollDice && 7 === f(a.lastDice)) {
          if (a.actionRequest) {
            var m = (0, l.H0)(a.actionRequest, a.playerData.length),
              x = !1;
            m[s] && (x = !0, m[s] = !1, u.push(i.K8.DiscardResource));
            var b = m.map(function (e, a) {
              return e ? a + 1 : 0;
            }).filter(function (e) {
              return e > 0;
            });
            return r = b.length ? "\u7b49\u5f85".concat(x ? "\u4f60\u548c" : "", "\u73a9\u5bb6").concat(b.join("\u3001"), "\u4e22\u5f03\u8d44\u6e90\u5361") : "\u7b49\u5f85\u4f60\u4e22\u5f03\u8d44\u6e90\u5361", {
              waitFor: n,
              isOver: !1,
              allowOps: u,
              hint: r
            };
          }
          u.push(i.K8.MoveRobber), r = "\u7b49\u5f85".concat(o, "\u79fb\u52a8\u5f3a\u76d7");
        } else a.exchangeData && a.exchangeData.responses.indexOf(1) >= 0 ? r = "\u7b49\u5f85".concat(o, "\u534f\u5546\u4ea4\u6362\u8d44\u6e90") : (1 & a.devCard || [0, 1, 2, 3].forEach(function (e) {
          d.cards[e] > a.newCards[e] && u.push(i.K8.UseCardKnight + e);
        }), u.push(i.K8.BuyRoad), u.push(i.K8.BuyHouse), u.push(i.K8.BuyCity), u.push(i.K8.BuyDevCard, i.K8.ExchangeWithPlayer, i.K8.ExchangeWithBank), r = "\u7b49\u5f85".concat(o, "\u884c\u52a8"));
      } else u.push(i.K8.RollDice), r = "\u7b49\u5f85".concat(o, "\u6447\u9ab0\u5b50\uff08\u6b64\u65f6\u53ef\u7528\u9a91\u58eb\u5361\uff09"), 1 & a.devCard || u.push(i.K8.UseCardKnight);
      return "\u4f60" !== o && (u.length = 0), {
        waitFor: n,
        isOver: !1,
        allowOps: u,
        hint: r
      };
    },
    D = function (e, a) {
      var t,
        r = a.state,
        n = r,
        s = [],
        o = a.playerData[r],
        u = o.houses.length,
        d = o.roads.length,
        p = v(a);
      if (!(16 & a.devCard) && p[a.state] >= c.ZP[a.mapId].settings[e.playerList.length][0]) return {
        isOver: !0,
        waitFor: r,
        allowOps: s,
        hint: ""
      };
      if (d < 2 && d < u) s.push(i.K8.PutRoad);else if (u < 2) s.push(i.K8.PutHouse);else if (16 & a.devCard) s.push(i.K8.BuyHouse, i.K8.BuyRoad, i.K8.BuyDevCard, i.K8.BuyCity);else if (2 & a.devCard) s.push(i.K8.PutRoad);else if (a.lastDice) {
        if ((null === (t = a.lastOp) || void 0 === t ? void 0 : t.type) === i.K8.RollDice && 7 === f(a.lastDice)) {
          if (a.actionRequest) {
            var h = (0, l.H0)(a.actionRequest, a.playerData.length);
            h[n] && (h[n] = !1, s.push(i.K8.DiscardResource));
            h.map(function (e, a) {
              return e ? a + 1 : 0;
            }).filter(function (e) {
              return e > 0;
            });
            return {
              waitFor: r,
              isOver: !1,
              allowOps: s,
              hint: ""
            };
          }
          s.push(i.K8.MoveRobber);
        } else a.exchangeData && a.exchangeData.responses.indexOf(1) >= 0 || (1 & a.devCard || [0, 1, 2, 3].forEach(function (e) {
          o.cards[e] > a.newCards[e] && s.push(i.K8.UseCardKnight + e);
        }), s.push(i.K8.BuyRoad), s.push(i.K8.BuyHouse), s.push(i.K8.BuyCity), s.push(i.K8.BuyDevCard, i.K8.ExchangeWithPlayer, i.K8.ExchangeWithBank));
      } else s.push(i.K8.RollDice), 1 & a.devCard || s.push(i.K8.UseCardKnight);
      return {
        waitFor: r,
        isOver: !1,
        allowOps: s,
        hint: ""
      };
    },
    j = function (e, a, t) {
      for (var r = e, n = 0; n < t; n++) if (1 << (r = (r + 1) % t) & a) return r;
      return r;
    },
    g = function (e, a, t, o) {
      var l = t.waitFor,
        p = e.playerData.length,
        h = null !== o && void 0 !== o ? o : (0, u.M)(36) + 1,
        m = {
          state: e.state,
          devCard: e.devCard,
          lastOp: {
            type: i.K8.RollDice,
            playerId: l
          },
          robber: e.robber,
          lastDice: h,
          newCards: [0, 0, 0, 0, 0],
          bankData: e.bankData,
          playerData: (0, n.Z)(e.playerData),
          actionRequest: 0
        },
        x = f(h);
      if (7 !== x) !function () {
        var t = c.ZP[e.mapId],
          o = y(e, a, x),
          i = new Array(p).fill(0).map(function () {
            return [0, 0, 0, 0, 0];
          }),
          l = [0, 0, 0, 0, 0];
        e.playerData.forEach(function (e, a) {
          e.houses.forEach(function (e) {
            var r = e >> 2,
              n = (2 & e) >> 1;
            (0, d.Qp)(t.tiles[r], n, t).forEach(function (t) {
              var r = (0, s.Z)(t, 2),
                n = r[0],
                c = r[1],
                u = o.get("".concat(n, ",").concat(c));
              if (void 0 !== u) {
                var d = 1 + (1 & e);
                i[a][u] += d, l[u] += d;
              }
            });
          });
        });
        for (var u = function (a) {
            if (l[a] > e.bankData.resources[a]) {
              var t = i.findIndex(function (e) {
                return e[a] === l[a];
              });
              if (t >= 0) {
                var r = e.bankData.resources[a];
                i[t][a] = r, l[a] = r;
              } else i.forEach(function (e) {
                e[a] = 0;
              }), l[a] = 0;
            }
          }, f = 0; f < 5; f++) u(f);
        i.forEach(function (e, a) {
          m.playerData[a] = (0, r.Z)((0, r.Z)({}, m.playerData[a]), {}, {
            resources: (0, n.Z)(m.playerData[a].resources)
          }), e.forEach(function (e, t) {
            m.playerData[a].resources[t] += e;
          });
        }), m.bankData = (0, r.Z)((0, r.Z)({}, m.bankData), {}, {
          resources: (0, n.Z)(m.bankData.resources)
        }), l.forEach(function (e, a) {
          m.bankData.resources[a] -= e;
        });
      }();else {
        var v = 0;
        m.playerData.forEach(function (a, t) {
          a.resources.reduce(function (e, a) {
            return e + a;
          }) >= c.ZP[e.mapId].settings[p][1] && (v |= 1 << t);
        }), m.actionRequest = v;
      }
      return m;
    },
    C = function (e) {
      if (h(e)) return e;
      var a = e.playerData.length;
      if (a > 4) {
        if (16 & e.devCard) {
          var t = e.actionRequest || 0;
          if (t) {
            var r = j(e.state, t, a);
            return {
              state: r,
              devCard: e.devCard,
              robber: e.robber,
              newCards: [0, 0, 0, 0, 0],
              bankData: e.bankData,
              playerData: e.playerData,
              actionRequest: t & (0, l.Vi)(r, a)
            };
          }
          return {
            state: 15 & e.devCard,
            robber: e.robber,
            newCards: [0, 0, 0, 0, 0],
            bankData: e.bankData,
            playerData: e.playerData
          };
        }
        var n = e.actionRequest;
        if (n) {
          var s = j(e.state, n, a);
          return {
            state: s,
            devCard: 16 | (e.state + 1) % a,
            robber: e.robber,
            newCards: [0, 0, 0, 0, 0],
            bankData: e.bankData,
            playerData: e.playerData,
            actionRequest: n & (0, l.Vi)(s, a)
          };
        }
      }
      return {
        state: (e.state + 1) % a,
        robber: e.robber,
        newCards: [0, 0, 0, 0, 0],
        bankData: e.bankData,
        playerData: e.playerData,
        actionRequest: e.actionRequest
      };
    };
  var J = function e(a, t, r, o, c) {
      for (var i = function (e, a, t, r) {
          var n = (0, s.Z)(e, 2),
            o = (0, s.Z)(n[0], 2),
            c = o[0],
            i = o[1],
            l = n[1],
            u = r || [[0, 0], 0],
            d = (0, s.Z)(u, 2),
            p = (0, s.Z)(d[0], 2),
            f = p[0],
            h = p[1],
            y = d[1],
            m = [];
          return l ? l < 2 ? a.forEach(function (e) {
            var a = (0, s.Z)(e, 2),
              n = (0, s.Z)(a[0], 2),
              o = n[0],
              l = n[1],
              u = a[1];
            !t.has("".concat(c, ",").concat(i, ",0")) && (!r || !y && h < i || y && f === c) && (o !== c || l !== i || u || m.push(e), o === c - 1 && l === i && 2 === u && m.push(e)), !t.has("".concat(c, ",").concat(i, ",1")) && (!r || !y && h === i || y && f < c) && (o === c && l === i && 2 === u && m.push(e), o === c && l === i - 1 && 0 === u && m.push(e));
          }) : a.forEach(function (e) {
            var a = (0, s.Z)(e, 2),
              n = (0, s.Z)(a[0], 2),
              o = n[0],
              l = n[1],
              u = a[1];
            t.has("".concat(c, ",").concat(i, ",1")) || r && !(f > c) || (o === c && l === i && 1 === u && m.push(e), o !== c || l !== i - 1 || u || m.push(e)), !t.has("".concat(c + 1, ",").concat(i, ",0")) && (!r || f <= c) && o === c + 1 && l === i && u < 2 && m.push(e);
          }) : a.forEach(function (e) {
            var a = (0, s.Z)(e, 2),
              n = (0, s.Z)(a[0], 2),
              o = n[0],
              l = n[1],
              u = a[1];
            t.has("".concat(c, ",").concat(i, ",0")) || r && !(h > i) || (o === c && l === i && 1 === u && m.push(e), o === c - 1 && l === i && 2 === u && m.push(e)), !t.has("".concat(c, ",").concat(i + 1, ",1")) && (!r || h <= i) && o === c && l === i + 1 && u && m.push(e);
          }), m;
        }(t, r, o, c), l = a, u = 0; u < i.length; u++) {
        var d = i[u],
          p = r.indexOf(d),
          f = e(a + 1, d, [].concat((0, n.Z)(r.slice(0, p)), (0, n.Z)(r.slice(p + 1))), o, t);
        f > l && (l = f);
      }
      return l;
    },
    X = function (e, a) {
      for (var t = 0, r = 0; r < e.length; r++) {
        var s = e[r],
          o = [].concat((0, n.Z)(e.slice(0, r)), (0, n.Z)(e.slice(r + 1))),
          c = J(1, s, o, a, null);
        c > t && (t = c);
      }
      return t;
    };
  a.longestRoad = X;
},
9796: function (e, a, t) {
  t.d(a, {
    jj: function () {
      return l;
    },
    sI: function () {
      return i;
    }
  });
  var r = t(2982),
    n = t(885),
    s = t(6805),
    o = [{
      box: [-988, -980, 2080, 1942],
      tiles: [[0, -2], [-1, -2], [-2, -2], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [0, 1], [1, 1], [1, 0], [0, 0]],
      tileCount: 19,
      ports: [[21, 5], [23, 4], [25, 3], [26, 3], [29, 2], [31, 1], [33, 1], [35, 0], [19, 5]],
      settings: {
        2: [15, 9],
        3: [10, 8],
        4: [10, 8],
        5: [10, 8],
        6: [10, 8],
        7: [10, 8],
        8: [10, 8]
      },
      xyToId: new Map(),
      resCount: 19,
      devCount: [14, 2, 2, 2, 5]
    }, {
      box: [-988, -1280, 2427, 2542],
      tiles: [[-2, 0], [-1, 1], [0, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, -1], [1, -2], [0, -3], [-1, -3], [-2, -3], [-2, -2], [-2, -1], [-1, 0], [0, 1], [1, 2], [2, 2], [2, 1], [2, 0], [1, -1], [0, -2], [-1, -2], [-1, -1], [0, 0], [1, 1], [1, 0], [0, -1]],
      tileCount: 30,
      ports: [[30, 3], [33, 3], [35, 2], [37, 1], [39, 0], [40, 1], [42, 0], [45, 5], [47, 5], [49, 4], [31, 3]],
      settings: {
        2: [15, 9],
        3: [10, 8],
        4: [10, 8],
        5: [10, 8],
        6: [10, 8],
        7: [10, 8],
        8: [10, 8]
      },
      xyToId: new Map(),
      resCount: 24,
      devCount: [20, 3, 3, 3, 5]
    }, {
      box: [-1334, -1280, 2772, 2542],
      tiles: [[-3, 0], [-2, 1], [-1, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, -1], [1, -2], [0, -3], [-1, -3], [-2, -3], [-3, -3], [-3, -2], [-3, -1], [-2, 0], [-1, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, -1], [0, -2], [-1, -2], [-2, -2], [-2, -1], [-1, 0], [0, 1], [1, 1], [1, 0], [0, -1], [-1, -1], [0, 0]],
      tileCount: 37,
      ports: [[37, 3], [41, 2], [43, 2], [45, 1], [47, 0], [48, 1], [50, 0], [53, 5], [55, 5], [57, 4], [59, 4], [38, 3]],
      settings: {
        2: [15, 9],
        3: [10, 8],
        4: [10, 8],
        5: [10, 8],
        6: [10, 8],
        7: [10, 8],
        8: [10, 8]
      },
      xyToId: new Map(),
      resCount: 29,
      devCount: [26, 4, 4, 4, 5]
    }],
    c = function (e, a) {
      return (e << 5) + a;
    };
  o.forEach(function (e) {
    var a = e.tiles.length;
    e.tileCount = a;
    var t = new Set(),
      r = new Set(),
      s = new Map();
    e.tiles.forEach(function (e) {
      var a = c(e[0], e[1]);
      t.add(a), r.add(a);
    });
    for (var o = function (a) {
        var o = e.tiles[a];
        [[0, 1], [1, 1], [1, 0], [0, -1], [-1, -1], [-1, 0]].forEach(function (a, i) {
          var l = (0, n.Z)(a, 2),
            u = l[0],
            d = l[1];
          !function (e, a, t, r, n, s, o) {
            var i = c(a, t);
            r.has(i) || (r.add(i), s.set(i, o.tiles.length), o.tiles.push([a, t, 0])), n.has(i) || (o.tiles[s.get(i)][2] |= 1 << e);
          }(i, o[0] + u, o[1] + d, t, r, s, e);
        });
      }, i = 0; i < a; i++) o(i);
    e.tiles.forEach(function (a, t) {
      e.xyToId.set("".concat(a[0], ",").concat(a[1]), t);
    });
  });
  var i = function (e, a) {
      for (var t, r = [], c = [], i = [], l = o[e], u = 0, d = 0; d < l.tileCount; d++) {
        var p = (0, s.lS)(a, u, 3),
          f = (0, n.Z)(p, 2);
        t = f[0], u = f[1], r.push(t);
      }
      for (var h = 0; h < l.tileCount; h++) {
        var y = (0, s.lS)(a, u, 4),
          m = (0, n.Z)(y, 2);
        t = m[0], u = m[1], c.push(t);
      }
      for (var x = 0; x < l.ports.length; x++) {
        var v = (0, s.lS)(a, u, 3),
          b = (0, n.Z)(v, 2);
        t = b[0], u = b[1], i.push(t);
      }
      return {
        tileTypes: r,
        tileNums: c,
        portTypes: i
      };
    },
    l = function (e, a, t, c) {
      for (var i, l = [], u = o[e], d = 0, p = 0, f = 0; f < u.tileCount; f++) {
        var h = (0, s.F)(p, d, a[f], 3),
          y = (0, n.Z)(h, 3);
        p = y[0], d = y[1], i = y[2], l.push.apply(l, (0, r.Z)(i));
      }
      for (var m = 0; m < u.tileCount; m++) {
        var x = (0, s.F)(p, d, t[m], 4),
          v = (0, n.Z)(x, 3);
        p = v[0], d = v[1], i = v[2], l.push.apply(l, (0, r.Z)(i));
      }
      for (var b = 0; b < u.ports.length; b++) {
        var D = (0, s.F)(p, d, c[b], 3),
          j = (0, n.Z)(D, 3);
        p = j[0], d = j[1], i = j[2], l.push.apply(l, (0, r.Z)(i));
      }
      return d && (p |= Math.pow(2, 8 - d) - 1, l.push(p)), Uint8Array.from(l);
    };
  a.ZP = o;
},
6805: function (e, a, t) {
  function r(e, a, t, r) {
    var n = e,
      s = a,
      o = [];
    return a + r < 8 ? (n |= t << 8 - r - a, s += r) : a + r === 8 ? (o.push(e | t), n = 0, s = 0) : (n |= t >> a - 8 + r, o.push(n), n = t << 16 - a - r & 255, s = a - 8 + r), [n, s, o];
  }
  function n(e, a, t) {
    var r = a % 8,
      n = Math.floor(a / 8);
    if (r + t > 8 && n + 1 >= e.length || r + t <= 8 && n >= e.length) throw new Error("readBitsError");
    var s = r + t <= 8 ? e[n] : e[n] << 8 | e[n + 1];
    return s >>= (r + t <= 8 ? 8 : 16) - t - r, [s &= [0, 1, 3, 7, 15, 31, 63, 127][t], a + t];
  }
  function s(e, a) {
    for (var t = [], r = 0; r < a; r++) t.push(!!(e >> r & 1));
    return t;
  }
  function o(e, a) {
    for (var t = 0, r = 0; r < a; r++) r !== e && (t |= 1 << r);
    return t;
  }
  t.d(a, {
    F: function () {
      return r;
    },
    H0: function () {
      return s;
    },
    Vi: function () {
      return o;
    },
    lS: function () {
      return n;
    }
  });
},
6912: function (e, a, t) {
  t.d(a, {
    $v: function () {
      return d;
    },
    Qp: function () {
      return v;
    },
    US: function () {
      return c;
    },
    Z7: function () {
      return x;
    },
    cu: function () {
      return u;
    },
    d3: function () {
      return o;
    },
    fH: function () {
      return y;
    },
    gK: function () {
      return l;
    },
    jc: function () {
      return m;
    },
    q9: function () {
      return f;
    },
    sw: function () {
      return i;
    },
    v5: function () {
      return b;
    },
    xG: function () {
      return h;
    }
  });
  var r = t(885),
    n = t(9796),
    s = 200,
    o = function (e) {
      var a = e[0],
        t = e[1];
      return [346.41 * (a - t / 2), 1.5 * t * s];
    },
    c = function (e, a) {
      var t = o(e),
        n = (0, r.Z)(t, 2),
        c = n[0],
        i = n[1];
      return a ? [c, i - s] : [c - 173.205, i - 100];
    },
    i = function (e, a) {
      var t = (2 & e) >> 1,
        r = a[e >> 2];
      return c(r, t);
    },
    l = function (e, a) {
      var t = o(e),
        n = (0, r.Z)(t, 2),
        s = n[0],
        c = n[1];
      return a ? a < 2 ? [s - 86.6025, c - 150] : [s + 86.6025, c - 150] : [s - 173.205, c];
    },
    u = function (e, a) {
      var t = 3 & e,
        r = a[e >> 2];
      return l(r, t);
    },
    d = function (e) {
      var a = 3 & e;
      return a ? a < 2 ? 60 : 120 : 0;
    },
    p = function (e) {
      var a = e.mapId,
        t = n.ZP[a],
        s = new Set();
      return e.playerData.forEach(function (e) {
        e.houses.forEach(function (e) {
          var a = e >> 2,
            n = (0, r.Z)(t.tiles[a], 2),
            o = n[0],
            c = n[1],
            i = e >> 1 & 1;
          s.add("".concat(o, ",").concat(c, ",0")), s.add("".concat(o, ",").concat(c, ",1")), i ? (s.add("".concat(o, ",").concat(c - 1, ",0")), s.add("".concat(o + 1, ",").concat(c, ",0"))) : (s.add("".concat(o, ",").concat(c + 1, ",1")), s.add("".concat(o - 1, ",").concat(c, ",1")));
        });
      }), s;
    },
    f = function (e) {
      var a = e.mapId,
        t = n.ZP[a],
        r = p(e),
        s = [],
        o = t.tileCount,
        c = function (e, a) {
          r.has("".concat(e[0], ",").concat(e[1], ",").concat(a)) || s.push([e, a]);
        };
      return t.tiles.forEach(function (e, a) {
        if (a < o) c(e, 0), c(e, 1);else {
          var t = e[2];
          2 & t ? (c(e, 0), c(e, 1)) : (1 & t && c(e, 1), 4 & t && c(e, 0));
        }
      }), s;
    },
    h = function (e, a) {
      var t = e.mapId,
        s = n.ZP[t],
        o = p(e),
        c = [],
        i = new Set(),
        l = function (e, a) {
          if (!o.has("".concat(e[0], ",").concat(e[1], ",").concat(a))) {
            var t = "".concat(e[0], ",").concat(e[1], ",").concat(a);
            i.has(t) || (i.add(t), c.push([e, a]));
          }
        };
      return e.playerData[a].roads.forEach(function (e) {
        var a = s.tiles[e >> 2],
          t = (0, r.Z)(a, 2),
          n = t[0],
          o = t[1],
          c = 3 & e;
        c ? c < 2 ? (l([n, o], 0), l([n, o], 1)) : (l([n, o], 1), l([n + 1, o], 0)) : (l([n, o], 0), l([n, o + 1], 1));
      }), c;
    },
    y = function (e, a) {
      var t = e.mapId,
        r = n.ZP[t],
        s = [];
      return e.playerData[a].houses.forEach(function (e) {
        1 & e || s.push([r.tiles[e >> 2], (2 & e) >> 1]);
      }), s;
    },
    m = function (e, a) {
      var t = e.mapId,
        s = n.ZP[t],
        o = new Set();
      e.playerData.forEach(function (e) {
        e.roads.forEach(function (e) {
          var a = s.tiles[e >> 2],
            t = 3 & e;
          o.add("".concat(a[0], ",").concat(a[1], ",").concat(t));
        });
      });
      var c = [],
        i = new Set(),
        l = function (e, a) {
          var t = (0, r.Z)(e, 2),
            n = t[0],
            l = t[1];
          if (!o.has("".concat(n, ",").concat(l, ",").concat(a))) {
            var u = s.xyToId.get("".concat(n, ",").concat(l));
            if (u >= s.tileCount) {
              var d = s.tiles[u][2];
              if (0 === a && !(4 & d)) return;
              if (1 === a && !(2 & d)) return;
              if (2 === a && !(1 & d)) return;
            }
            var p = "".concat(e[0], ",").concat(e[1], ",").concat(a);
            i.has(p) || (i.add(p), c.push([e, a]));
          }
        },
        u = new Set();
      return e.playerData.forEach(function (e, t) {
        t !== a && e.houses.forEach(function (e) {
          var a = (0, r.Z)(s.tiles[e >> 2], 2),
            t = a[0],
            n = a[1],
            o = (2 & e) >> 1;
          u.add("".concat(t, ",").concat(n, ",").concat(o));
        });
      }), e.playerData[a].roads.forEach(function (e) {
        var a = s.tiles[e >> 2],
          t = (0, r.Z)(a, 2),
          n = t[0],
          o = t[1],
          c = 3 & e;
        c ? c < 2 ? (u.has("".concat(n, ",").concat(o, ",1")) || (l([n, o - 1], 0), l([n, o], 2)), u.has("".concat(n, ",").concat(o, ",0")) || (l([n, o], 0), l([n - 1, o], 2))) : (u.has("".concat(n, ",").concat(o, ",1")) || (l([n, o], 1), l([n, o - 1], 0)), u.has("".concat(n + 1, ",").concat(o, ",0")) || (l([n + 1, o], 0), l([n + 1, o], 1))) : (u.has("".concat(n, ",").concat(o, ",0")) || (l([n, o], 1), l([n - 1, o], 2)), u.has("".concat(n, ",").concat(o + 1, ",1")) || (l([n, o + 1], 1), l([n, o + 1], 2)));
      }), c;
    },
    x = function (e) {
      var a = e.mapId,
        t = n.ZP[a],
        s = [],
        o = function (e, a) {
          var n = (0, r.Z)(e, 2),
            o = n[0],
            c = n[1],
            i = t.xyToId.get("".concat(o, ",").concat(c));
          if (i >= t.tileCount) {
            var l = t.tiles[i][2];
            if (!a && !(4 & l)) return;
            if (1 === a && !(2 & l)) return;
            if (2 === a && !(1 & l)) return;
          }
          s.push([e, a]);
        },
        c = e.lastOp.house,
        i = t.tiles[c >> 2],
        l = (0, r.Z)(i, 2),
        u = l[0],
        d = l[1];
      return (2 & c) >> 1 ? (o([u, d - 1], 0), o([u, d], 1), o([u, d], 2)) : (o([u, d], 0), o([u, d], 1), o([u - 1, d], 2)), s;
    },
    v = function (e, a, t) {
      var n = (0, r.Z)(e, 2),
        s = n[0],
        o = n[1],
        c = [],
        i = function (e, a) {
          t.xyToId.get("".concat(e, ",").concat(a)) < t.tileCount && c.push([e, a]);
        };
      return i(s, o), i(s - 1, o - 1), a ? i(s, o - 1) : i(s - 1, o), c;
    },
    b = function (e) {
      var a = e.mapId,
        t = e.robber,
        r = n.ZP[a];
      return r.tiles.slice(0, r.tileCount).filter(function (e, a) {
        return a !== t;
      });
    };
},
4591: function (e, t, n) {
  "use strict";

  var i = n(7313),
    a = n(6417);
  t.Z = i.memo(function (e) {
    var t = e.n,
      n = e.className;
    return (0, a.jsx)("div", {
      className: "game-dice ".concat(n || ""),
      children: t % 2 ? new Array((t + 1) / 2).fill(0).map(function (e, n) {
        return (0, a.jsxs)(i.Fragment, {
          children: [(0, a.jsx)("div", {
            style: {
              left: t < 2 ? 1 : -1,
              top: (n - t / 4 + .25) * [0, 16, 8][(t - 1) / 2] + 7
            }
          }), (0, a.jsx)("div", {
            style: {
              right: t < 2 ? 1 : -1,
              top: (n - t / 4 + .25) * [0, 16, 8][(t - 1) / 2] + 7
            }
          })]
        }, n);
      }) : (0, a.jsxs)(a.Fragment, {
        children: [(0, a.jsx)("div", {
          className: "m-auto inset-0"
        }), t > 1 && (0, a.jsxs)(a.Fragment, {
          children: [(0, a.jsx)("div", {
            style: {
              right: -1,
              top: -1
            }
          }), (0, a.jsx)("div", {
            style: {
              left: -1,
              bottom: -1
            }
          })]
        }), t > 3 && (0, a.jsxs)(a.Fragment, {
          children: [(0, a.jsx)("div", {
            style: {
              left: -1,
              top: -1
            }
          }), (0, a.jsx)("div", {
            style: {
              right: -1,
              bottom: -1
            }
          })]
        })]
      })
    });
  });
},
3405: function (t, e, n) {
  var companionBridge = n.bridge;
  n.r(e), n.d(e, {
    default: function () {
      return O;
    }
  });
  var a = n(7313),
    r = n(5982),
    s = n(4595),
    i = n(4473),
    o = n(2437),
    c = n(1413),
    l = n(2982),
    u = n(885),
    d = n(6417);
  var p = function (t) {
    var e = t.id,
      n = t.style,
      a = t.isNew,
      r = t.onClick,
      s = (0, o.nX)(e),
      i = (0, u.Z)(s, 2),
      c = i[0],
      l = i[1];
    return (0, d.jsxs)("div", {
      className: "dy-card dy-card-".concat(c, " border ").concat(a ? "border-red-500 border-2" : ""),
      style: n,
      onClick: r,
      children: [(0, d.jsx)("div", {
        className: "text-2xl font-bold text-black",
        children: l
      }), (0, d.jsx)("div", {
        children: o.DM[c]
      })],
      role: "button",
      tabIndex: 0,
      onKeyDown: function (event) {
        if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.click();
        }
      },
      "data-guide-target": "dy.card",
      "data-guide-id": e
    });
  };
  var f = function (t) {
    var e = t.ids,
      n = t.className,
      r = t.selected,
      s = t.setSelected;
    return (0, a.useEffect)(function () {
      s(null);
    }, [e.length]), (0, d.jsx)("div", {
      className: "relative w-fit mx-auto overflow-x-auto ".concat(n),
      style: {
        height: 106,
        maxWidth: "100%",
        width: Math.ceil(30 * e.length + 22)
      },
      children: e.map(function (t, e) {
        return (0, d.jsx)(p, {
          id: t,
          style: {
            left: 30 * e,
            top: r === t ? 0 : 20
          },
          onClick: function () {
            s(function (e) {
              return e === t ? null : t;
            });
          }
        }, t);
      })
    });
  };
  var h = function (t) {
      var e = t.ids,
        n = t.op && t.op.playerId ? t.op : {};
      return (0, d.jsx)("div", {
        className: "relative w-fit mx-auto overflow-x-auto",
        style: {
          height: 86,
          maxWidth: "100%",
          width: Math.ceil(30 * e.length + 22)
        },
        children: e.map(function (t, e) {
          return (0, d.jsx)(p, {
            id: t,
            isNew: n.putCard === t,
            style: {
              left: 30 * e
            }
          }, t);
        })
      });
    },
    m = n(7992),
    v = n(4420);
  var x = function (t) {
    var e = t.view,
      n = t.room,
      r = t.updateGameData,
      i = n.position - 1,
      c = (0, a.useState)(null),
      p = (0, u.Z)(c, 2),
      x = p[0],
      y = p[1],
      j = null !== x ? (0, o.nX)(x)[0] : 1,
      O = n.playerList.length;
    return (0, d.jsxs)("div", {
      className: "mt-auto",
      children: [e.eats[i].length > 0 && (0, d.jsxs)("div", {
        children: [(0, d.jsx)("div", {
          className: "text-center my-2",
          children: "\u4f60\u5df2\u7ecf\u559d\u4e0b\u7684\u836f\uff1a"
        }), (0, d.jsx)(h, {
          ids: e.eats[i]
        })]
      }), !e.finish && e.state !== i && (0, m.Yw)(n, e.state) && (0, d.jsx)("div", {
        className: "text-center mt-4",
        children: (0, d.jsx)(s.Z, {
          small: !0,
          primary: !0,
          onClick: function () {
            var t = e.players[e.state],
              n = t[(0, v.M)(t.length)],
              a = (0, o.nX)(n)[0],
              s = (0, l.Z)(e.pots),
              i = (e.state + 1) % O,
              c = {
                playerId: e.state + 1,
                putCard: n,
                eatCardList: []
              },
              u = e.eats.map(function (t) {
                return (0, l.Z)(t);
              });
            if (a) s[a - 1] = [].concat((0, l.Z)(s[a - 1]), [n]), r({
              state: i,
              lastOp: c,
              pots: s,
              eats: u
            });else {
              var d = (0, v.M)(3);
              s[d] = [].concat((0, l.Z)(s[d]), [n]), r({
                state: i,
                lastOp: c,
                pots: s,
                eats: u
              });
            }
          },
          children: "\u8be5\u73a9\u5bb6\u5df2\u6302\u673a\uff0c\u70b9\u6b64\u8df3\u8fc7\u4ed6\u7684\u56de\u5408"
        })
      }), (0, d.jsx)("div", {
        className: "flex items-center justify-center space-x-6 mt-4".concat(e.finish || e.state !== i ? " invisible" : ""),
        children: j ? (0, d.jsx)(s.Z, {
          primary: !0,
          disabled: null === x,
          onClick: function () {
            var t = (0, l.Z)(e.pots);
            t[j - 1] = [].concat((0, l.Z)(t[j - 1]), [x]), r({
              state: (e.state + 1) % O,
              lastOp: {
                playerId: i + 1,
                putCard: x,
                eatCardList: []
              },
              pots: t,
              eats: e.eats.map(function (t) {
                return (0, l.Z)(t);
              })
            });
          },
          children: "\u51fa\u724c"
        }) : (0, d.jsx)(d.Fragment, {
          children: [0, 1, 2].map(function (t) {
            return (0, d.jsx)(s.Z, {
              onClick: function () {
                var n = (0, l.Z)(e.pots);
                n[t] = [].concat((0, l.Z)(n[t]), [x]), r({
                  state: (e.state + 1) % O,
                  lastOp: {
                    playerId: i + 1,
                    putCard: x,
                    eatCardList: []
                  },
                  pots: n,
                  eats: e.eats.map(function (t) {
                    return (0, l.Z)(t);
                  })
                });
              },
              children: "\u9009".concat(["\u7ea2", "\u84dd", "\u7d2b"][t]).concat(o.DM[t + 1])
            }, t);
          })
        })
      }), (0, d.jsx)(f, {
        ids: e.players[i],
        selected: x,
        setSelected: y,
        className: "mt-4"
      })],
      "data-guide-target": "dy.hand",
      "data-room-region": "dy.hand"
    });
  };
  var y = function (t) {
      var e,
        n = t.view,
        a = t.room,
        s = t.send,
        l = !!a.position;
      if (n.finish) {
        var u = function (t) {
          for (var e = 999, n = [], a = 0; a < t.length; a++) t[a] < e && (e = t[a]);
          for (var r = 0; r < t.length; r++) t[r] === e && n.push(r);
          return n;
        }(n.scores);
        e = "\u606d\u559c\u73a9\u5bb6".concat(u.map(function (t) {
          return t + 1;
        }).join("\u3001\u73a9\u5bb6"), "\u80dc\u5229\ud83c\udf89");
      } else e = "\u7b49\u5f85\u73a9\u5bb6".concat(n.state + 1, "\u884c\u52a8");
      return l && (e = e.replaceAll("\u73a9\u5bb6".concat(a.position), "\u4f60")), (0, d.jsxs)(d.Fragment, {
        children: [(0, d.jsx)("div", {
          className: "text-center text-xl mt-4",
          children: e
        }), n.lastOp.playerId > 0 && n.lastOp.eatCardList.length > 0 && (0, d.jsxs)("div", {
          className: "mt-2 flex items-center justify-center",
          children: [(0, d.jsx)("div", {
            className: "text-center mr-2",
            children: "\u73a9\u5bb6".concat(n.lastOp.playerId, "\u521a\u521a\u559d\u6389\u4e86").replace("\u73a9\u5bb6".concat(a.position), "\u4f60")
          }), (0, d.jsx)("div", {
            style: {
              height: 43
            },
            children: (0, d.jsx)("div", {
              className: "scale-50 origin-top-left",
              children: (0, d.jsx)(h, {
                ids: n.lastOp.eatCardList
              })
            })
          })]
        }), (0, d.jsxs)("div", {
          className: "poison-pots",
          children: [(0, d.jsx)("div", {
            className: "bg-red-100 bg-opacity-75 mt-4",
            children: (0, d.jsx)(h, {
              ids: n.pots[0],
              op: n.lastOp
            }),
            "data-guide-target": "dy.pot",
            "data-guide-id": 0
          }), (0, d.jsx)("div", {
            className: "bg-blue-100 bg-opacity-75 mt-4",
            children: (0, d.jsx)(h, {
              ids: n.pots[1],
              op: n.lastOp
            }),
            "data-guide-target": "dy.pot",
            "data-guide-id": 1
          }), (0, d.jsx)("div", {
            className: "bg-purple-100 bg-opacity-75 mt-4 mb-4",
            children: (0, d.jsx)(h, {
              ids: n.pots[2],
              op: n.lastOp
            }),
            "data-guide-target": "dy.pot",
            "data-guide-id": 2
          })]
        }), !!n.finish && n.eats.map(function (t, e) {
          return (0, d.jsxs)("div", {
            className: "mb-2",
            children: [(0, d.jsx)("div", {
              className: "text-center my-2",
              children: "".concat(a.position === e + 1 ? "\u4f60" : "\u73a9\u5bb6".concat(e + 1), "\u7684\u5206\u6570\uff1a").concat(-n.scores[e]),
              "data-guide-target": "dy.score",
              "data-guide-player": e
            }), (0, d.jsx)(h, {
              ids: t
            })]
          }, e);
        }), l && !n.finish && (0, d.jsx)(x, {
          view: n,
          room: a,
          updateGameData: function (t) {
            companionBridge.sink({
              type: "dy-play",
              card: t.lastOp.putCard,
              pot: t.pots.findIndex(function (pot) {
                return pot.includes(t.lastOp.putCard);
              })
            });
          }
        }), !l && (0, d.jsx)("div", {
          className: "text-2xl mt-2 text-center",
          children: "\u89c2\u6218\u4e2d"
        })]
      });
    },
    j = n(3953);
  var O = function (t) {
    var e = t.room,
      n = t.game,
      a = t.send,
      c = undefined,
      l = t.view,
      u = !!e.position && e.owner === e.position;
    return (0, j.N)([]), (0, d.jsxs)(d.Fragment, {
      children: [u && (0, d.jsx)("div", {
        className: "button-container",
        children: (0, d.jsx)("div", {
          className: "button-right",
          children: (0, d.jsx)(s.Z, {
            small: !0,
            onClick: function () {
              return (0, j.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return a(r.Z.OwnerExitGame);
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, d.jsx)("div", {
        className: "flex justify-evenly mt-4",
        children: e.playerList.map(function (t, n) {
          return (0, d.jsxs)("div", {
            children: [(0, d.jsx)(m.ZP, {
              room: e,
              index: n,
              send: a,
              isTurn: !l.finish && l.state === n
            }), !l.finish && (0, d.jsx)("div", {
              className: "text-center mt-2",
              children: "\u5269 ".concat(l.players[n].length, " \u5f20")
            })]
          }, n);
        })
      }), (0, d.jsx)(y, {
        view: l,
        version: n.version,
        room: e,
        send: a
      })]
    });
  };
},
4473: function (t, e, n) {
  n.d(e, {
    UG: function () {
      return c;
    }
  });
  var a = n(7710),
    r = a.Reader,
    s = a.Writer,
    i = a.util,
    o = a.roots.default || (a.roots.default = {}),
    c = (o.DYOperation = function () {
      function t(t) {
        if (this.eatCardList = [], t) for (var e = Object.keys(t), n = 0; n < e.length; ++n) null != t[e[n]] && (this[e[n]] = t[e[n]]);
      }
      return t.prototype.playerId = 0, t.prototype.putCard = 0, t.prototype.eatCardList = i.emptyArray, t.encode = function (t, e) {
        if (e || (e = s.create()), null != t.playerId && Object.hasOwnProperty.call(t, "playerId") && e.uint32(8).uint32(t.playerId), null != t.putCard && Object.hasOwnProperty.call(t, "putCard") && e.uint32(16).uint32(t.putCard), null != t.eatCardList && t.eatCardList.length) {
          e.uint32(42).fork();
          for (var n = 0; n < t.eatCardList.length; ++n) e.uint32(t.eatCardList[n]);
          e.ldelim();
        }
        return e;
      }, t.decode = function (t, e) {
        t instanceof r || (t = r.create(t));
        for (var n = void 0 === e ? t.len : t.pos + e, a = new o.DYOperation(); t.pos < n;) {
          var s = t.uint32();
          switch (s >>> 3) {
            case 1:
              a.playerId = t.uint32();
              break;
            case 2:
              a.putCard = t.uint32();
              break;
            case 5:
              if (a.eatCardList && a.eatCardList.length || (a.eatCardList = []), 2 === (7 & s)) for (var i = t.uint32() + t.pos; t.pos < i;) a.eatCardList.push(t.uint32());else a.eatCardList.push(t.uint32());
              break;
            default:
              t.skipType(7 & s);
          }
        }
        return a;
      }, t;
    }(), o.DYGameData = function () {
      function t(t) {
        if (this.cardPositionList = [], t) for (var e = Object.keys(t), n = 0; n < e.length; ++n) null != t[e[n]] && (this[e[n]] = t[e[n]]);
      }
      return t.prototype.rule = 0, t.prototype.state = 0, t.prototype.cardPositionList = i.emptyArray, t.prototype.lastOp = null, t.encode = function (t, e) {
        if (e || (e = s.create()), null != t.rule && Object.hasOwnProperty.call(t, "rule") && e.uint32(8).uint32(t.rule), null != t.state && Object.hasOwnProperty.call(t, "state") && e.uint32(16).uint32(t.state), null != t.cardPositionList && t.cardPositionList.length) {
          e.uint32(26).fork();
          for (var n = 0; n < t.cardPositionList.length; ++n) e.uint32(t.cardPositionList[n]);
          e.ldelim();
        }
        return null != t.lastOp && Object.hasOwnProperty.call(t, "lastOp") && o.DYOperation.encode(t.lastOp, e.uint32(34).fork()).ldelim(), e;
      }, t.decode = function (t, e) {
        t instanceof r || (t = r.create(t));
        for (var n = void 0 === e ? t.len : t.pos + e, a = new o.DYGameData(); t.pos < n;) {
          var s = t.uint32();
          switch (s >>> 3) {
            case 1:
              a.rule = t.uint32();
              break;
            case 2:
              a.state = t.uint32();
              break;
            case 3:
              if (a.cardPositionList && a.cardPositionList.length || (a.cardPositionList = []), 2 === (7 & s)) for (var i = t.uint32() + t.pos; t.pos < i;) a.cardPositionList.push(t.uint32());else a.cardPositionList.push(t.uint32());
              break;
            case 4:
              a.lastOp = o.DYOperation.decode(t, t.uint32());
              break;
            default:
              t.skipType(7 & s);
          }
        }
        return a;
      }, t;
    }());
},
2437: function (t, e, n) {
  n.d(e, {
    Bx: function () {
      return u;
    },
    DM: function () {
      return i;
    },
    my: function () {
      return c;
    },
    nX: function () {
      return o;
    },
    qA: function () {
      return l;
    }
  });
  var a = n(2982),
    r = n(885),
    s = n(4420),
    i = ["\u26ab\ufe0f", "\ud83d\udd34", "\ud83d\udd35", "\ud83d\udfe3"];
  function o(t) {
    if (t >= 42) return [0, 4];
    var e = [1, 1, 1, 2, 2, 2, 4, 4, 5, 5, 5, 7, 7, 7][t % 14];
    return [Math.floor(t / 14) + 1, e];
  }
  function c(t, e) {
    var n = [[], [], []],
      a = [0, 0, 0],
      s = new Array(e).fill(0).map(function () {
        return [];
      }),
      i = new Array(e).fill(0).map(function () {
        return [];
      }),
      c = new Array(e).fill(0),
      l = 1;
    t.cardPositionList.forEach(function (t, e) {
      var c = o(e),
        u = (0, r.Z)(c, 2),
        d = (u[0], u[1]);
      if (t) if (t < 4) n[t - 1].push(e), a[t - 1] += d;else {
        var p = t - 4,
          f = p >> 1;
        1 & p ? i[f].push(e) : (s[f].push(e), l = 0);
      }
    });
    var u = [[], [], []],
      d = [0, 0, 0];
    return i.forEach(function (t, e) {
      var n = [0, 0, 0];
      t.forEach(function (t) {
        var e = o(t)[0];
        e && (n[e - 1] += 1);
      });
      for (var a = 0; a < 3; a++) n[a] > d[a] ? (d[a] = n[a], u[a] = [e]) : n[a] === d[a] && u[a].push(e);
    }), i.forEach(function (t, e) {
      t.forEach(function (t) {
        var n = o(t),
          a = (0, r.Z)(n, 1)[0];
        a ? 1 === u[a - 1].length && u[a - 1][0] === e || (c[e] += 1) : c[e] += 2;
      });
    }), {
      rule: t.rule,
      state: t.state,
      lastOp: t.lastOp,
      pots: n,
      potValues: a,
      players: s,
      eats: i,
      scores: c,
      finish: l
    };
  }
  function l(t) {
    var e = new Array(50).fill(0);
    return t.players.forEach(function (t, n) {
      t.forEach(function (t) {
        e[t] = 4 + (n << 1);
      });
    }), t.pots.forEach(function (e, n) {
      var a = 0;
      e.forEach(function (t) {
        a += o(t)[1];
      }), a > 13 && (e.forEach(function (e) {
        e !== t.lastOp.putCard && (t.eats[t.lastOp.playerId - 1].push(e), t.lastOp.eatCardList.push(e));
      }), t.pots[n] = [t.lastOp.putCard]);
    }), t.pots.forEach(function (t, n) {
      t.forEach(function (t) {
        e[t] = n + 1;
      });
    }), t.eats.forEach(function (t, n) {
      t.forEach(function (t) {
        e[t] = 5 + (n << 1);
      });
    }), {
      rule: t.rule,
      state: t.state,
      cardPositionList: e,
      lastOp: t.lastOp
    };
  }
  function u(t, e) {
    for (var n = t.playerList.length, r = new Array(n).fill(0).map(function () {
        return [];
      }), i = (0, s.T)(new Array(50).fill(0).map(function (t, e) {
        return e;
      })), o = [12, 12, 12, 10, 8, 7, 6][n - 2], c = 0; c < n; c++) {
      var u;
      (u = r[c]).push.apply(u, (0, a.Z)(i.slice(c * o, (c + 1) * o)));
    }
    return l({
      rule: 0,
      state: (0, s.M)(n),
      lastOp: {
        playerId: 0
      },
      pots: [[], [], []],
      players: r,
      eats: new Array(n).fill([])
    });
  }
},
6544: function (e, t, r) {
  r.r(t), r.d(t, {
    default: function () {
      return B;
    }
  });
  var n = r(7313),
    i = r(5982),
    a = r(3953),
    s = r(9474),
    l = r(6139),
    u = r(1413),
    o = r(6417);
  var c = function (e) {
    var t = e.id,
      r = e.className,
      n = e.style,
      i = e.onClick,
      a = e.onDragStart,
      s = e.onDragOver,
      c = e.onTouchStart,
      d = e.onTouchMove,
      h = (0, l.ZG)(t);
    return (0, o.jsx)("div", {
      id: t ? "".concat(t) : void 0,
      draggable: !!a || void 0,
      className: "ddz-poker ddz-poker-".concat(h, " ").concat(r || ""),
      style: (0, u.Z)((0, u.Z)({}, n), {}, {
        touchAction: a ? "pinch-zoom" : void 0
      }),
      onClick: i,
      onDragStart: a,
      onDragOver: s,
      onTouchStart: c,
      onTouchMove: d,
      role: "button",
      tabIndex: 0,
      onKeyDown: function (event) {
        if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.click();
        }
      }
    });
  };
  function d(e) {
    var t = e.ids,
      r = e.sort,
      n = e.sortById,
      i = e.overlap,
      a = e.height,
      s = void 0 === a ? 159 : a,
      d = e.className,
      h = e.style,
      f = e.sortIds,
      v = (i ? 48 : 116) * s / 159,
      m = r ? n ? (0, l.H0)(t) : f ? f(t) : (0, l.zN)(t) : t;
    return (0, o.jsx)("div", {
      className: "ddz-poker-list".concat(d ? " ".concat(d) : ""),
      style: (0, u.Z)({
        height: s
      }, h),
      children: m.map(function (e, t) {
        return (0, o.jsx)(c, {
          id: e,
          style: {
            left: t * v,
            transform: "scale(".concat(s / 159, ")")
          }
        }, t);
      })
    });
  }
  d.defaultProps = {
    height: 159,
    sort: !1,
    sortById: !1,
    overlap: !1
  };
  var h = n.memo(d, function (e, t) {
    var r = e.ids,
      n = t.ids;
    return r.join(",") === n.join(",");
  });
  function f(e) {
    var t = e.length,
      r = e.overlap,
      n = e.height,
      i = void 0 === n ? 159 : n,
      a = e.className,
      s = e.style,
      l = (r ? 48 : 116) * i / 159;
    return (0, o.jsx)("div", {
      className: "ddz-poker-list".concat(a ? " ".concat(a) : ""),
      style: (0, u.Z)({
        height: i
      }, s),
      children: new Array(t).fill(0).map(function (e, t) {
        return (0, o.jsx)(c, {
          id: 0,
          style: {
            left: t * l,
            transform: "scale(".concat(i / 159, ")")
          }
        }, t);
      })
    });
  }
  f.defaultProps = {
    height: 159,
    overlap: !1
  };
  var v = n.memo(f, function (e, t) {
    return e.length === t.length;
  });
  var m = function (e) {
      var t = e.view,
        r = e.room,
        n = e.className,
        i = e.height,
        a = {
          width: Math.ceil(116 * [0, 0, 1, 3, 8][r.playerList.length] * i / 159)
        };
      return 0 === t.state ? (0, o.jsx)(v, {
        length: t.holeCardList.length,
        className: n,
        height: i,
        style: a
      }) : 4 === r.playerList.length ? null : (0, o.jsx)(h, {
        ids: t.holeCardList,
        className: n,
        height: i,
        style: a
      });
    },
    p = r(7992);
  function y(e) {
    var t = e.count,
      r = e.position,
      n = e.room,
      i = e.headText,
      a = e.view,
      s = e.send;
    return (0, o.jsxs)("div", {
      className: "flex items-center h-20",
      children: [(0, o.jsx)(p.ZP, {
        room: n,
        index: r - 1,
        send: s,
        isTurn: a.state === r || 0 === a.state
      }), (0, o.jsxs)("div", {
        className: "ml-2 flex flex-col items-center",
        children: [(0, o.jsx)("div", {
          className: "h-0",
          style: {
            width: 25.5
          },
          children: (0, o.jsx)(c, {
            id: 0,
            style: {
              transform: "scale(0.22)"
            }
          })
        }), (0, o.jsx)("div", {
          className: "flex items-center justify-center",
          style: {
            height: 35
          },
          children: (0, o.jsx)("div", {
            className: "z-10 text-black",
            children: t
          })
        }), (0, o.jsx)("div", {
          className: "text-2xl text-center",
          children: i
        })]
      })]
    });
  }
  function x(e) {
    var t = e.cards,
      r = e.view,
      n = e.position,
      i = e.height;
    if (!r.state) return null;
    if (r.isFinish) {
      var a = r.playerCardLists[n];
      return (0, o.jsx)(h, {
        ids: a,
        sort: !0,
        sortById: r.winner === n,
        overlap: !0,
        height: i,
        className: "mx-auto",
        style: {
          width: Math.ceil((48 * a.length + 68) * i / 159),
          maxWidth: "100%"
        }
      });
    }
    return r.state === n ? (0, o.jsx)("div", {
      className: "text-4xl text-center",
      style: {
        lineHeight: "".concat(i, "px")
      },
      children: "\ud83e\udd14"
    }) : t ? 0 === t.length ? (0, o.jsx)("div", {
      className: "text-4xl text-center",
      style: {
        lineHeight: "".concat(i, "px")
      },
      children: "\ud83d\ude2d"
    }) : (0, o.jsx)(h, {
      ids: t,
      sort: !0,
      overlap: !0,
      height: i,
      className: "mx-auto",
      style: {
        width: Math.ceil((48 * t.length + 68) * i / 159),
        maxWidth: "100%"
      }
    }) : null;
  }
  var L = function (e) {
      var t = e.view,
        r = e.room,
        n = e.height,
        i = e.send,
        a = function (e, t) {
          for (var r = [[]], n = [], i = t.playedCardList.length - 1; i >= 0; i--) {
            var a = t.playedCardList[i];
            if (a) n.push(a);else {
              if (r.push(n), r.length >= e.playerList.length) break;
              n = [];
            }
          }
          return r;
        }(r, t),
        s = function (e) {
          var t = new Array(e.playerList.length).fill(0).map(function (e, t) {
            return t + 1;
          });
          if (e.position > 1) for (var r = 0; r < t.length; r++) t[r] = (e.position - 1 + r) % t.length + 1;
          return t;
        }(r),
        l = s.map(function (e) {
          return t.playerRestCardCounts[e];
        }),
        u = t.state ? t.isFinish ? s.map(function (e) {
          return t.landlordId === e === t.landlordWin ? "\ud83d\ude0e" : "\ud83d\ude2d";
        }) : s.map(function (e) {
          return t.landlordId === e ? "\ud83d\udc72" : "\ud83d\udc68\u200d\ud83c\udf3e";
        }) : new Array(s.length).fill(""),
        c = 7 & t.state,
        d = t.state ? s.map(function (e) {
          return (c - e + s.length) % s.length;
        }) : new Array(s.length).fill(0);
      return 3 === r.playerList.length ? (0, o.jsxs)("div", {
        children: [(0, o.jsxs)("div", {
          className: "flex justify-around",
          children: [(0, o.jsx)(y, {
            view: t,
            count: l[2],
            position: s[2],
            room: r,
            headText: u[2],
            send: i
          }), (0, o.jsx)(y, {
            view: t,
            count: l[1],
            position: s[1],
            room: r,
            headText: u[1],
            send: i
          })]
        }), (0, o.jsxs)("div", {
          className: "mt-2",
          children: [(0, o.jsxs)("div", {
            style: {
              height: n
            },
            children: [(0, o.jsx)("div", {
              className: "".concat(t.isFinish ? "w-1/2" : "w-3/5", " mr-auto"),
              style: {
                height: n
              },
              children: (0, o.jsx)(x, {
                position: s[2],
                view: t,
                cards: a[d[2]],
                height: n
              })
            }), (0, o.jsx)("div", {
              className: "".concat(t.isFinish ? "w-1/2" : "w-3/5", " ml-auto"),
              style: {
                height: n,
                marginTop: -n
              },
              children: (0, o.jsx)(x, {
                position: s[1],
                view: t,
                cards: a[d[1]],
                height: n
              })
            })]
          }), (0, o.jsx)("div", {
            className: "mt-2",
            style: {
              height: n
            },
            children: (0, o.jsx)(x, {
              position: s[0],
              view: t,
              cards: a[d[0]],
              height: n
            })
          })]
        }), (0, o.jsx)("div", {
          className: "mt-4 flex justify-center",
          children: (0, o.jsx)(y, {
            view: t,
            count: l[0],
            position: s[0],
            room: r,
            headText: u[0],
            send: i
          })
        })]
      }) : 4 === r.playerList.length ? (0, o.jsxs)("div", {
        children: [(0, o.jsxs)("div", {
          className: "flex justify-around",
          children: [(0, o.jsx)(y, {
            view: t,
            count: l[3],
            position: s[3],
            room: r,
            headText: u[3],
            send: i
          }), (0, o.jsx)(y, {
            view: t,
            count: l[2],
            position: s[2],
            room: r,
            headText: u[2],
            send: i
          }), (0, o.jsx)(y, {
            view: t,
            count: l[1],
            position: s[1],
            room: r,
            headText: u[1],
            send: i
          })]
        }), (0, o.jsxs)("div", {
          className: "mt-2",
          children: [(0, o.jsx)("div", {
            style: {
              height: n
            },
            children: (0, o.jsx)(x, {
              position: s[2],
              view: t,
              cards: a[d[2]],
              height: n
            })
          }), (0, o.jsxs)("div", {
            className: "mt-2",
            style: {
              height: n
            },
            children: [(0, o.jsx)("div", {
              className: "".concat(t.isFinish ? "w-1/2" : "w-3/5", " mr-auto"),
              style: {
                height: n
              },
              children: (0, o.jsx)(x, {
                position: s[3],
                view: t,
                cards: a[d[3]],
                height: n
              })
            }), (0, o.jsx)("div", {
              className: "".concat(t.isFinish ? "w-1/2" : "w-3/5", " ml-auto"),
              style: {
                height: n,
                marginTop: -n
              },
              children: (0, o.jsx)(x, {
                position: s[1],
                view: t,
                cards: a[d[1]],
                height: n
              })
            })]
          }), (0, o.jsx)("div", {
            className: "mt-2",
            style: {
              height: n
            },
            children: (0, o.jsx)(x, {
              position: s[0],
              view: t,
              cards: a[d[0]],
              height: n
            })
          })]
        }), (0, o.jsx)("div", {
          className: "mt-4 flex justify-center",
          children: (0, o.jsx)(y, {
            view: t,
            count: l[0],
            position: s[0],
            room: r,
            headText: u[0],
            send: i
          })
        })]
      }) : 2 === r.playerList.length ? (0, o.jsxs)("div", {
        children: [(0, o.jsx)("div", {
          className: "w-2/3 mr-auto flex justify-center",
          children: (0, o.jsx)(y, {
            view: t,
            count: l[1],
            position: s[1],
            room: r,
            headText: u[1],
            send: i
          })
        }), (0, o.jsx)("div", {
          className: "mt-2 w-2/3 mr-auto",
          style: {
            height: n
          },
          children: (0, o.jsx)(x, {
            position: s[1],
            view: t,
            cards: a[d[1]],
            height: n
          })
        }), (0, o.jsx)("div", {
          className: "mt-2 w-2/3 ml-auto",
          style: {
            height: n
          },
          children: (0, o.jsx)(x, {
            position: s[0],
            view: t,
            cards: a[d[0]],
            height: n
          })
        }), (0, o.jsx)("div", {
          className: "mt-4 w-2/3 ml-auto flex justify-center",
          children: (0, o.jsx)(y, {
            view: t,
            count: l[0],
            position: s[0],
            room: r,
            headText: u[0],
            send: i
          })
        })]
      }) : null;
    },
    g = r(885),
    j = r(3861),
    C = r(4595);
  var b = function (e) {
      var t = e.ids,
        r = e.height,
        i = e.className,
        a = e.selected,
        s = e.setSelected,
        d = e.style,
        h = e.sortIds,
        f = e.numberOf,
        v = e.keepSelected,
        m = (0, n.useMemo)(function () {
          return (h || l.zN)(t);
        }, [t, h]),
        p = (0, n.useRef)(!1);
      (0, n.useEffect)(function () {
        v || s([]);
      }, [m.length, v]);
      var y = 58 * r / 159,
        x = 48 * r / 159,
        L = function (e) {
          if (f) return f(e);
          var t = (0, l.Vz)(e);
          return t > 16 ? 16 : t;
        },
        g = 1,
        j = 0,
        C = 0;
      m.forEach(function (e) {
        var t = L(e);
        t === C ? (j += 1) > g && (g = j) : (C = t, j = 0);
      }), j = 0, C = 0;
      var b = m.map(function (e) {
        var t = L(e);
        t === C ? j += 1 : (C = t, j = 0);
        var n = function (e) {
            var t = L(e);
            return (f ? 17 - t : 16 - t) * x;
          }(e),
          i = function (e) {
            if (!(e.changedTouches.length > 1)) {
              var t = e.changedTouches[0],
                r = t.clientX,
                n = t.clientY,
                i = null,
                a = -999;
              if (Array.from(document.getElementsByClassName("ddz-my-poker")).forEach(function (e) {
                var t = e.getBoundingClientRect(),
                  s = t.x,
                  l = t.y,
                  u = t.width,
                  o = t.height;
                if (r >= s && r <= s + u && n >= l && n <= l + o) {
                  var c = Number(e.style.zIndex);
                  c > a && (a = c, i = e);
                }
              }), i) {
                var l = Number(i.getAttribute("id")) - 1;
                s(function (e) {
                  var t = e.indexOf(l);
                  -1 === t ? p.current || e.push(l) : p.current && e.splice(t, 1);
                });
              }
            }
          };
        return (0, o.jsx)(c, {
          id: e,
          className: "ddz-my-poker",
          style: {
            left: n,
            top: (g - j) * y,
            zIndex: (Math.round(n / x) + 1 << 5) - j + 8,
            filter: a.includes(e - 1) ? "brightness(0.8)" : "brightness(1)",
            transform: "scale(".concat(r / 159, ")")
          },
          onClick: function () {
            "ontouchstart" in window || s(function (t) {
              var r = t.indexOf(e - 1);
              -1 === r ? t.push(e - 1) : t.splice(r, 1);
            });
          },
          onDragStart: function (t) {
            if (t.dataTransfer) {
              var r = new Image();
              r.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", t.dataTransfer.setDragImage(r, 0, 0);
            }
            p.current = a.includes(e - 1), s(function (t) {
              var r = t.indexOf(e - 1);
              -1 === r ? p.current || t.push(e - 1) : p.current && t.splice(r, 1);
            });
          },
          onDragOver: function () {
            s(function (t) {
              var r = t.indexOf(e - 1);
              -1 === r ? p.current || t.push(e - 1) : p.current && t.splice(r, 1);
            });
          },
          onTouchStart: function (t) {
            p.current = a.includes(e - 1), i(t);
          },
          onTouchMove: function (e) {
            i(e);
          }
        }, e);
      });
      return (0, o.jsx)("div", {
        className: "ddz-poker-list".concat(i ? " ".concat(i) : ""),
        style: (0, u.Z)({
          height: r + y * g
        }, d),
        children: b
      });
    },
    w = r(5911);
  var k = function (e) {
    var t = e.view,
      r = e.room,
      i = e.className,
      a = e.updateGameData,
      s = r.playerList.length,
      u = t.playerCardLists[r.position] || [],
      c = (0, j.x)([]),
      d = (0, g.Z)(c, 2),
      h = d[0],
      f = d[1],
      v = h.map(function (e) {
        return e + 1;
      }),
      m = (0, n.useState)(3e3),
      p = (0, g.Z)(m, 2),
      y = p[0],
      x = p[1];
    return (0, n.useEffect)(function () {
      if (x(3e3), t.state === w.D.CallLandlord) {
        var e = +new Date(),
          r = window.setInterval(function () {
            var t = e + 3e3 - +new Date();
            x(t > 0 ? t : 0);
          }, 97);
        return function () {
          window.clearInterval(r);
        };
      }
    }, [t.state === w.D.CallLandlord]), (0, o.jsxs)("div", {
      className: i,
      children: [t.state === w.D.CallLandlord && (0, o.jsx)("div", {
        className: "mx-auto mb-2 -mt-4 relative h-2 bg-black rounded",
        style: {
          width: 300
        },
        children: (0, o.jsx)("div", {
          className: "absolute h-2 bg-purple-400 rounded transition-all duration-100",
          style: {
            width: y / 10
          }
        })
      }), (0, o.jsxs)("div", {
        className: "mx-4 flex justify-center space-x-8 h-10",
        children: [(0, l.vU)(t) && (0, o.jsx)(C.Z, {
          primary: !0,
          disabled: y > 0,
          onClick: function () {
            return a((0, l.JY)(t, r.position, s));
          },
          children: y > 0 ? "".concat(Math.ceil(y / 1e3), "\u79d2\u540e\u540e\u53ef\u62a2\u5730\u4e3b") : "\u62a2\u5730\u4e3b"
        }), t.state === r.position && (0, o.jsxs)(o.Fragment, {
          children: [(0, o.jsx)(C.Z, {
            disabled: !(0, l.GU)(t, r.position),
            onClick: function () {
              return a((0, l.Uj)(t, r.position, s));
            },
            children: "\ud83d\ude2d \u4e0d\u51fa"
          }), (0, o.jsx)(C.Z, {
            primary: !0,
            disabled: !(0, l.DB)(t, r.position, s, v),
            onClick: function () {
              return a((0, l.rG)(t, r.position, s, v));
            },
            children: "\ud83d\ude0e \u51fa\u724c"
          })]
        }), false && (0, o.jsx)(C.Z, {
          onClick: function () {
            return a((0, l.HU)(t, r.position, s));
          },
          children: "\u6211\u53cd\u6094\u4e86"
        })]
      }), (0, o.jsx)(b, {
        height: 70,
        ids: u,
        selected: h,
        setSelected: f,
        className: "mt-8 mx-auto",
        style: {
          maxWidth: "100%",
          width: Math.ceil(51800 / 159)
        }
      })]
    });
  };
  var P = function (e) {
      var t = e.room,
        r = e.view,
        n = e.className,
        a = e.updateGameData,
        u = e.send,
        c = !!t.position && t.owner === t.position;
      return (0, o.jsxs)("div", {
        className: n,
        children: [(0, o.jsxs)("div", {
          className: "text-center text-xl",
          children: ["\ud83c\udf89 \u606d\u559c", r.landlordWin ? "\u5730\u4e3b" : "\u519c\u6c11", "\u80dc\u5229\uff01"]
        }), c && (0, l.C6)(r) && (0, o.jsxs)("div", {
          className: "text-center mt-4",
          children: [(0, o.jsx)(C.Z, {
            primary: !0,
            onClick: function () {
              return a((0, l.G4)(r, t.playerList.length));
            },
            children: "\u91cd\u65b0\u53d1\u724c"
          }), (0, o.jsx)(C.Z, {
            className: "ml-4",
            onClick: function () {
              return u(i.Z.OwnerExitGame, {
                data: s.w.encode({
                  rule: r.rule
                }).finish()
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })]
        })]
      });
    },
    N = r(2982),
    Z = r(6135),
    R = function (e, t) {
      return function (e) {
        return e.isRoundFinish && e.roundResult ? e.roundResult.fullRankList : e.rankList;
      }(e).indexOf(t);
    };
  function T(e) {
    var t = e.view,
      r = e.position,
      n = e.height;
    if ("tribute" === t.phase || "return" === t.phase) {
      var i = function (e, t) {
          var r = e.tributers.indexOf(t);
          if (-1 === r) return null;
          var n = !!e.tributeCardList[r];
          return {
            role: "tributer",
            slot: r,
            tributeDone: n,
            tributeCardId: n ? e.tributeCardList[r] : 0,
            receiver: e.tributeReceivers[r] || 0
          };
        }(t, r),
        a = function (e, t) {
          var r = e.tributeReceivers.indexOf(t);
          if (-1 === r) return null;
          var n = !!e.tributeCardList[r];
          return {
            role: "receiver",
            slot: r,
            tributeDone: n,
            returnDone: !!e.returnCardList[r],
            tributer: e.tributers[r] || 0,
            tributeCardId: n ? e.tributeCardList[r] : 0
          };
        }(t, r);
      return i && i.tributeDone ? (0, o.jsx)(h, {
        ids: [i.tributeCardId],
        sort: !0,
        sortIds: function (e) {
          return (0, Z.wn)(e, t.level);
        },
        overlap: !0,
        height: n,
        className: "mx-auto",
        style: {
          width: (0, Z.dK)(1, n),
          maxWidth: "100%"
        }
      }) : i && !i.tributeDone || a && a.tributeDone && !a.returnDone ? (0, o.jsx)("div", {
        className: "text-4xl text-center",
        style: {
          lineHeight: "".concat(n, "px")
        },
        children: "\ud83e\udd14"
      }) : null;
    }
    var s = t.trickActions[r];
    if (s && s.cards) return (0, o.jsx)(h, {
      ids: s.cards,
      sort: !0,
      sortIds: function (e) {
        return (0, Z.wn)(e, t.level);
      },
      overlap: !0,
      height: n,
      className: "mx-auto",
      style: {
        width: (0, Z.dK)(s.cards.length, n),
        maxWidth: "100%"
      }
    });
    var l = R(t, r);
    if (l > -1) {
      if (0 === l) return (0, o.jsx)("div", {
        className: "text-4xl text-center",
        style: {
          lineHeight: "".concat(n, "px")
        },
        children: "\ud83e\udd47"
      });
      if (1 === l) return (0, o.jsx)("div", {
        className: "text-4xl text-center",
        style: {
          lineHeight: "".concat(n, "px")
        },
        children: "\ud83e\udd48"
      });
      if (t.isRoundFinish) {
        var u = t.playerCardLists[r];
        if (u.length) return (0, o.jsx)(h, {
          ids: u,
          sort: !0,
          sortIds: function (e) {
            return (0, Z.wn)(e, t.level);
          },
          overlap: !0,
          height: n,
          className: "mx-auto",
          style: {
            width: (0, Z.dK)(u.length, n),
            maxWidth: "100%"
          }
        });
      }
      return null;
    }
    return "play" === t.phase && t.state === r ? (0, o.jsx)("div", {
      className: "text-4xl text-center",
      style: {
        lineHeight: "".concat(n, "px")
      },
      children: "\ud83e\udd14"
    }) : s && s.passed ? (0, o.jsx)("div", {
      className: "text-4xl text-center",
      style: {
        lineHeight: "".concat(n, "px")
      },
      children: "\ud83d\ude2d"
    }) : null;
  }
  function A(e) {
    var t = e.count,
      r = e.position,
      n = e.room,
      i = e.view,
      a = e.isTurn,
      s = e.send,
      l = r % 2 === 1 ? 1 : 2,
      u = function (e, t) {
        var r = R(e, t);
        return -1 === r ? null : ["\u5934\u6e38", "\u4e8c\u6e38", "\u4e09\u6e38", "\u672b\u6e38"][r];
      }(i, r);
    return (0, o.jsxs)("div", {
      className: "flex items-center h-20",
      children: [(0, o.jsx)(p.ZP, {
        room: n,
        index: r - 1,
        send: s,
        isTurn: a
      }), (0, o.jsxs)("div", {
        className: "ml-2 flex flex-col items-center",
        children: [(0, o.jsx)("div", {
          className: "h-0",
          style: {
            width: 25.5
          },
          children: (0, o.jsx)(c, {
            id: 0,
            style: {
              transform: "scale(0.22)"
            }
          })
        }), (0, o.jsx)("div", {
          className: "flex items-center justify-center",
          style: {
            height: 35
          },
          children: (0, o.jsx)("div", {
            className: "z-10 text-black",
            children: t
          })
        }), (0, o.jsx)("div", {
          className: "text-xs text-center",
          children: "".concat(1 === l ? "\ud83d\udd34" : "\ud83d\udd35").concat(u ? " ".concat(u) : "")
        })]
      })]
    });
  }
  function O(e, t) {
    if (e.isRoundFinish) return !1;
    if ("play" === e.phase) return e.state === t;
    if ("tribute" === e.phase) {
      var r = e.tributers.indexOf(t);
      return -1 !== r && !e.tributeCardList[r];
    }
    if ("return" === e.phase) {
      var n = e.tributeReceivers.indexOf(t);
      return -1 !== n && !!e.tributeCardList[n] && !e.returnCardList[n];
    }
    return !1;
  }
  function I(e) {
    var t = (e - 1) % 54 + 1;
    if (53 === t) return "\u5927\u738b";
    if (54 === t) return "\u5c0f\u738b";
    var r = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"],
      n = t % 13;
    return ["\u2666\ufe0f", "\u2663\ufe0f", "\u2665\ufe0f", "\u2660\ufe0f"][Math.floor((t - 1) / 13)] + (1 === n ? r[0] : 0 === n ? r[12] : r[n - 1]);
  }
  function F(e) {
    for (var t = e.view, r = e.room.position, n = function (e) {
        return e === r ? "\u4f60" : "\u73a9\u5bb6".concat(e);
      }, i = [], a = 0; a < t.tributers.length; a++) {
      var s = t.tributeCardList[a],
        l = t.tributers[a],
        u = t.tributeReceivers[a] || 0;
      s && i.push((0, o.jsx)("div", {
        children: "".concat(n(l), " \u7ed9 ").concat(n(u), " \u8fdb\u8d21\u4e86 ").concat(I(s))
      }, "tribute-".concat(a)));
    }
    for (var c = 0; c < t.tributeReceivers.length; c++) {
      var d = t.returnCardList[c],
        h = t.tributeReceivers[c];
      if (d) {
        var f = r === h || r === t.tributers[c];
        i.push((0, o.jsx)("div", {
          children: f ? "".concat(n(h), " \u7ed9 ").concat(n(t.tributers[c]), " \u8fd8\u8d21\u4e86 ").concat(I(d)) : "".concat(n(h), " \u7ed9 ").concat(n(t.tributers[c]), " \u8fd8\u8d21\u4e86")
        }, "return-".concat(c)));
      }
    }
    return t.resistInfo.length > 0 && t.resistInfo.forEach(function (e, t) {
      i.push((0, o.jsx)("div", {
        children: "".concat(n(e.position), "\u6709").concat(e.bigJokerCount, "\u5f20\u5927\u738b\uff0c\u6297\u8d21")
      }, "resist-".concat(t)));
    }), i.length ? (0, o.jsx)("div", {
      className: "my-1 text-center text-sm space-y-0.5",
      children: i
    }) : null;
  }
  var W = function (e) {
      var t = e.view,
        r = e.room,
        n = e.height,
        i = e.send,
        a = function (e) {
          var t = [1, 2, 3, 4];
          return e.position > 1 && t.forEach(function (r, n) {
            t[n] = (e.position - 1 + n) % 4 + 1;
          }), t;
        }(r),
        s = a.map(function (e) {
          return t.playerRestCardCounts[e];
        }),
        l = (0, o.jsxs)("div", {
          className: "flex justify-around",
          children: [(0, o.jsx)(A, {
            view: t,
            count: s[3],
            position: a[3],
            room: r,
            isTurn: O(t, a[3]),
            send: i
          }), (0, o.jsx)(A, {
            view: t,
            count: s[2],
            position: a[2],
            room: r,
            isTurn: O(t, a[2]),
            send: i
          }), (0, o.jsx)(A, {
            view: t,
            count: s[1],
            position: a[1],
            room: r,
            isTurn: O(t, a[1]),
            send: i
          })]
        }),
        u = (0, o.jsx)("div", {
          className: "mt-4 flex justify-center",
          children: (0, o.jsx)(A, {
            view: t,
            count: s[0],
            position: a[0],
            room: r,
            isTurn: O(t, a[0]),
            send: i
          })
        }),
        c = !t.playedCardList.length && ("tribute" === t.phase || "return" === t.phase || t.resistInfo.length > 0 || t.tributeCardList.some(function (e) {
          return e;
        }));
      return (0, o.jsxs)("div", {
        children: [l, (0, o.jsxs)("div", {
          className: "mt-2",
          children: [(0, o.jsx)("div", {
            style: {
              height: n
            },
            children: (0, o.jsx)(T, {
              view: t,
              position: a[2],
              height: n
            })
          }), (0, o.jsxs)("div", {
            className: "mt-2",
            style: {
              height: n
            },
            children: [(0, o.jsx)("div", {
              className: "w-3/5 mr-auto",
              style: {
                height: n
              },
              children: (0, o.jsx)(T, {
                view: t,
                position: a[3],
                height: n
              })
            }), (0, o.jsx)("div", {
              className: "w-3/5 ml-auto",
              style: {
                height: n,
                marginTop: -n
              },
              children: (0, o.jsx)(T, {
                view: t,
                position: a[1],
                height: n
              })
            })]
          }), (0, o.jsx)("div", {
            className: "mt-2",
            style: {
              height: n
            },
            children: (0, o.jsx)(T, {
              view: t,
              position: a[0],
              height: n
            })
          })]
        }), c && (0, o.jsx)(F, {
          view: t,
          room: r
        }), u]
      });
    },
    S = ["\u2666\ufe0f", "\u2663\ufe0f", "\u2665\ufe0f", "\u2660\ufe0f"];
  var D = function (e) {
      var t = e.view,
        r = e.room,
        i = e.className,
        a = e.updateGameData,
        s = r.position,
        l = t.playerCardLists[s] || [],
        u = (0, j.x)([]),
        c = (0, g.Z)(u, 2),
        d = c[0],
        h = c[1],
        f = (0, n.useState)(0),
        v = (0, g.Z)(f, 2),
        m = v[0],
        p = v[1],
        y = (0, n.useMemo)(function () {
          return function (e) {
            return (0, Z.wn)(e, t.level, m);
          };
        }, [t.level, m]),
        x = (0, n.useMemo)(function () {
          return function (e) {
            var r = (0, Z.SX)(e, t.level);
            return r >= 16 ? 16 : r;
          };
        }, [t.level]),
        L = d.map(function (e) {
          return e + 1;
        }),
        w = "play" === t.phase && t.state === s,
        k = "tribute" === t.phase && (0, Z.W7)(t, s),
        P = "return" === t.phase && (0, Z.pE)(t, s),
        N = k ? (0, Z.b_)(t, s) : [],
        R = P ? (0, Z.a9)(t, s) : [],
        T = d.length ? d[d.length - 1] + 1 : -1,
        A = k && 1 === d.length && N.includes(T),
        O = P && 1 === d.length && R.includes(T),
        I = (0, n.useRef)(!1);
      (0, n.useEffect)(function () {
        h([]), I.current = !1;
      }, [t.phase, h]), (0, n.useEffect)(function () {
        k && N.length && !I.current && (h([N[0] - 1]), I.current = !0);
      }, [k, N, h]);
      var F = (0, n.useCallback)(function (e) {
        h(function (t) {
          e(t), t.length > 1 && t.splice(0, t.length - 1);
        });
      }, [h]);
      return (0, o.jsxs)("div", {
        className: i,
        children: [k && (0, o.jsxs)("div", {
          className: "text-center mb-2",
          children: [(0, o.jsxs)("span", {
            children: ["\u8bf7\u8fdb\u8d21\u7ed9", t.tributeReceivers.map(function (e, t) {
              return (0, o.jsxs)("span", {
                children: [t > 0 && " \u6216 ", "\u73a9\u5bb6", e]
              }, e);
            }), "\uff08\u9009\u62e9\u6700\u5927\u724c\uff0c\u6392\u9664\u7ea2\u6843\u7ea7\u724c\uff09"]
          }), !N.length && (0, o.jsx)("span", {
            className: "text-red-500 ml-2",
            children: "\u672a\u627e\u5230\u53ef\u8d21\u724c\uff0c\u8bf7\u9009\u62e9\u4efb\u610f\u4e00\u5f20"
          })]
        }), P && (0, o.jsxs)("div", {
          className: "text-center mb-2",
          children: [(0, o.jsxs)("span", {
            children: ["\u8bf7\u8fd8\u8d21\u7ed9 \u73a9\u5bb6", t.tributers[t.tributeReceivers.indexOf(s)], "\uff08\u9009\u62e9 \u226410 \u7684\u975e\u7ea7\u724c\uff09"]
          }), !R.length && (0, o.jsx)("span", {
            className: "text-red-500 ml-2",
            children: "\u6ca1\u6709\u226410\u7684\u975e\u7ea7\u724c\uff0c\u8bf7\u8fd8\u6700\u5c0f\u724c"
          })]
        }), "play" === t.phase && (0, o.jsxs)("div", {
          className: "mx-4 flex justify-center space-x-8 h-10",
          children: [w && (0, o.jsxs)(o.Fragment, {
            children: [(0, o.jsx)(C.Z, {
              disabled: !(0, Z.Km)(t, s),
              className: (0, Z.Km)(t, s) ? "" : "invisible",
              onClick: function () {
                return a((0, Z.l0)(t, s));
              },
              children: "\ud83d\ude2d \u4e0d\u51fa"
            }), (0, o.jsx)(C.Z, {
              primary: !0,
              disabled: !(0, Z.x$)(t, s, L),
              onClick: function () {
                return a((0, Z.Ps)(t, s, L));
              },
              children: "\ud83d\ude0e \u51fa\u724c"
            })]
          }), (0, Z.e9)(t, s) && (0, o.jsx)(C.Z, {
            onClick: function () {
              return a((0, Z.iV)(t, s));
            },
            children: "\u6211\u53cd\u6094\u4e86"
          })]
        }), k && (0, o.jsx)("div", {
          className: "flex justify-center mb-4",
          children: (0, o.jsx)(C.Z, {
            primary: !0,
            disabled: !A,
            onClick: function () {
              a((0, Z.g0)(t, s, T)), h([]);
            },
            children: "\u786e\u8ba4\u8fdb\u8d21"
          })
        }), P && (0, o.jsx)("div", {
          className: "flex justify-center mb-4",
          children: (0, o.jsx)(C.Z, {
            primary: !0,
            disabled: !O,
            onClick: function () {
              return a((0, Z.e2)(t, s, T));
            },
            children: "\u786e\u8ba4\u8fd8\u8d21"
          })
        }), (0, o.jsx)(b, {
          height: 70,
          ids: l,
          selected: d,
          setSelected: k || P ? F : h,
          sortIds: y,
          numberOf: x,
          keepSelected: k || P,
          className: "mt-2 mx-auto",
          style: {
            maxWidth: "100%",
            width: function (e) {
              var t = 0;
              return e.forEach(function (e) {
                t = Math.max(t, 17 - x(e));
              }), Math.ceil(70 * (48 * (t + 1) + 68) / 159);
            }(l)
          }
        }), l.length > 5 && (0, o.jsx)("div", {
          className: "mt-2 flex justify-center",
          children: (0, o.jsx)(C.Z, {
            small: !0,
            onClick: function () {
              return p(function (e) {
                return (e + 1) % 4;
              });
            },
            children: "\u6574\u7406\u624b\u724c\uff08".concat(S[m], "\u5728\u5e95\u90e8\uff09")
          })
        })]
      });
    },
    M = ["\ud83e\udd47", "\ud83e\udd48", "\ud83e\udd49", "\ud83d\ude2d"];
  var E = function (e) {
    var t = e.room,
      r = e.view,
      n = e.className,
      i = e.updateGameData,
      a = !!t.position && t.position === t.owner,
      s = r.roundResult,
      l = 1 === s.winTeam ? "\ud83d\udd34\u7ea2\u961f" : "\ud83d\udd35\u84dd\u961f",
      u = "\ud83c\udfc6 ".concat(l, " \u83b7\u80dc\uff0c\u6bd4\u8d5b\u7ed3\u675f"),
      c = s.fullRankList.map(function (e, t) {
        return (0, o.jsx)("span", {
          className: "mx-2",
          children: "".concat(M[t], " \u73a9\u5bb6").concat(e)
        }, e);
      });
    return (0, o.jsxs)("div", {
      className: n,
      children: [(0, o.jsx)("div", {
        className: "text-center text-xl",
        children: c
      }), (0, o.jsx)("div", {
        className: "text-center mt-2",
        children: "".concat(l, " +").concat(s.upLevels, " \uff5c \ud83d\udd34\u7ea2\u961f \u2192 \u6253 ").concat((0, Z.h1)(s.newTeam13Level), " \u7ea7 \uff5c \ud83d\udd35\u84dd\u961f \u2192 \u6253 ").concat((0, Z.h1)(s.newTeam24Level), " \u7ea7")
      }), s.isMatchOver && (0, o.jsx)("div", {
        className: "text-center text-xl mt-2",
        children: u
      }), a && (0, Z.QI)(r) && (0, o.jsx)("div", {
        className: "text-center mt-4",
        children: (0, o.jsx)(C.Z, {
          primary: !0,
          onClick: function () {
            return i((0, Z.ZO)(r));
          },
          children: "\u4e0b\u4e00\u5c40"
        })
      })]
    });
  };
  var G = function (e) {
    var t = e.room,
      r = e.game,
      n = e.send,
      u = (0, Z.dI)(s.w.decode(r.data)),
      c = 1 === u.playingTeam ? "\ud83d\udd34\u7ea2\u961f\u6253" : 2 === u.playingTeam ? "\ud83d\udd35\u84dd\u961f\u6253" : "\u672c\u5c40\u6253",
      d = !!t.position,
      h = d && t.position === t.owner;
    (0, a.N)([]);
    var f = function (e) {
      n(i.Z.PlayerUpdateGameData, {
        data: s.w.encode((0, Z.Fr)(e)).finish()
      });
    };
    return u.v !== l.dW ? (0, o.jsx)("div", {
      className: "m-2 text-center",
      children: "\u4f60\u7684\u7f51\u9875\u7248\u672c\u548c\u623f\u4e3b\u5f00\u5c40\u65f6\u6240\u7528\u7248\u672c\u4e0d\u4e00\u81f4\uff0c\u8bf7\u5237\u65b0\u9875\u9762"
    }) : (0, o.jsxs)(o.Fragment, {
      children: [h && (0, o.jsx)("div", {
        className: "button-container",
        children: (0, o.jsx)("div", {
          className: "button-right",
          children: (0, o.jsx)(C.Z, {
            small: !0,
            onClick: function () {
              return (0, a.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return n(i.Z.OwnerExitGame, {
                  data: s.w.encode(u.isRoundFinish ? {
                    rule: 2,
                    team13Level: 2,
                    team24Level: 2,
                    lastRankList: []
                  } : {
                    rule: 2,
                    team13Level: u.team13Level,
                    team24Level: u.team24Level,
                    lastRankList: (0, N.Z)(u.lastRankList)
                  }).finish()
                });
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, o.jsx)("div", {
        className: "text-center text-sm -mt-4 mb-4",
        children: (0, o.jsxs)("span", {
          children: ["\u3010\u63bc\u86cb\uff5c", c, " ", (0, Z.h1)(u.level), " ", "\u7ea7\uff5c\ud83d\udd34\u7ea2\u961f", (0, Z.h1)(u.team13Level), "\u7ea7\uff5c\ud83d\udd35\u84dd\u961f", (0, Z.h1)(u.team24Level), "\u7ea7\u3011"]
        })
      }), (0, o.jsx)(W, {
        view: u,
        room: t,
        height: 50,
        send: n
      }), d && !u.isRoundFinish && (0, o.jsx)(D, {
        view: u,
        room: t,
        updateGameData: f,
        className: "mt-4"
      }), u.isRoundFinish && (0, o.jsx)(E, {
        room: t,
        view: u,
        updateGameData: f,
        className: "mt-4"
      })]
    });
  };
  var B = function (e) {
    var t = e.room,
      r = e.game,
      n = e.send,
      u = t.playerList.length,
      c = s.w.decode(r.data);
    if (2 === c.rule) return (0, o.jsx)(G, {
      room: t,
      game: r,
      send: n
    });
    var d = e.view,
      h = !!t.position,
      f = h && t.position === t.owner,
      v = !d.rule;
    (0, a.N)([]);
    var p = function (e) {
      n(i.Z.PlayerUpdateGameData, {
        data: s.w.encode((0, l.qA)(e)).finish()
      });
    };
    return d.v > l.dW ? (0, o.jsx)("div", {
      className: "m-2 text-center",
      children: "\u4f60\u7684\u7f51\u9875\u7248\u672c\u548c\u623f\u4e3b\u5f00\u5c40\u65f6\u6240\u7528\u7248\u672c\u4e0d\u4e00\u81f4\uff0c\u8bf7\u5237\u65b0\u9875\u9762"
    }) : (0, o.jsxs)(o.Fragment, {
      children: [f && !d.isFinish && (0, o.jsx)("div", {
        className: "button-container",
        children: (0, o.jsx)("div", {
          className: "button-right",
          children: (0, o.jsx)(C.Z, {
            small: !0,
            onClick: function () {
              return (0, a.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return n(i.Z.OwnerExitGame, {
                  data: s.w.encode({
                    rule: d.rule
                  }).finish()
                });
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, o.jsxs)("div", {
        className: "text-center text-sm -mt-4 mb-4",
        children: [(0, o.jsxs)("span", {
          children: ["\u3010", v ? "\u6597\u5730\u4e3b" : "\u65e0", "\u51fa\u724c\u89c4\u5219\u3011"]
        }), f && false && (0, o.jsx)(C.Z, {
          small: !0,
          onClick: function () {
            return p((0, l.EE)(d, u));
          },
          children: "\u6539\u4e3a".concat(v ? "\u65e0" : "\u6597\u5730\u4e3b", "\u51fa\u724c\u89c4\u5219")
        })]
      }), (0, o.jsx)(m, {
        view: d,
        room: t,
        className: "mx-auto mb-4",
        height: 50
      }), (0, o.jsx)(L, {
        view: d,
        room: t,
        height: 50,
        send: n
      }), h && !d.isFinish && (0, o.jsx)(k, {
        view: d,
        room: t,
        updateGameData: p,
        className: "mt-4"
      }), d.isFinish && (0, o.jsx)(P, {
        room: t,
        view: d,
        updateGameData: p,
        send: n,
        className: "mt-4"
      })]
    });
  };
},
9474: function (e, t, r) {
  r.d(t, {
    w: function () {
      return u;
    }
  });
  var n = r(7710),
    i = n.Reader,
    a = n.Writer,
    s = n.util,
    l = n.roots.default || (n.roots.default = {}),
    u = l.DDZGameData = function () {
      function e(e) {
        if (this.cardPositionList = [], this.playedCardList = [], this.lastRankList = [], this.tributeCardList = [], this.returnCardList = [], this.playedTypeList = [], e) for (var t = Object.keys(e), r = 0; r < t.length; ++r) null != e[t[r]] && (this[t[r]] = e[t[r]]);
      }
      return e.prototype.rule = 0, e.prototype.state = 0, e.prototype.landlordId = 0, e.prototype.cardPositionList = s.emptyArray, e.prototype.playedCardList = s.emptyArray, e.prototype.v = 0, e.prototype.team13Level = 0, e.prototype.team24Level = 0, e.prototype.lastRankList = s.emptyArray, e.prototype.tributeCardList = s.emptyArray, e.prototype.returnCardList = s.emptyArray, e.prototype.firstPlayer = 0, e.prototype.playedTypeList = s.emptyArray, e.encode = function (e, t) {
        if (t || (t = a.create()), null != e.rule && Object.hasOwnProperty.call(e, "rule") && t.uint32(8).uint32(e.rule), null != e.state && Object.hasOwnProperty.call(e, "state") && t.uint32(16).uint32(e.state), null != e.landlordId && Object.hasOwnProperty.call(e, "landlordId") && t.uint32(24).uint32(e.landlordId), null != e.cardPositionList && e.cardPositionList.length) {
          t.uint32(34).fork();
          for (var r = 0; r < e.cardPositionList.length; ++r) t.uint32(e.cardPositionList[r]);
          t.ldelim();
        }
        if (null != e.playedCardList && e.playedCardList.length) {
          t.uint32(42).fork();
          for (r = 0; r < e.playedCardList.length; ++r) t.uint32(e.playedCardList[r]);
          t.ldelim();
        }
        if (null != e.v && Object.hasOwnProperty.call(e, "v") && t.uint32(48).uint32(e.v), null != e.team13Level && Object.hasOwnProperty.call(e, "team13Level") && t.uint32(56).uint32(e.team13Level), null != e.team24Level && Object.hasOwnProperty.call(e, "team24Level") && t.uint32(64).uint32(e.team24Level), null != e.lastRankList && e.lastRankList.length) {
          t.uint32(74).fork();
          for (r = 0; r < e.lastRankList.length; ++r) t.uint32(e.lastRankList[r]);
          t.ldelim();
        }
        if (null != e.tributeCardList && e.tributeCardList.length) {
          t.uint32(82).fork();
          for (r = 0; r < e.tributeCardList.length; ++r) t.uint32(e.tributeCardList[r]);
          t.ldelim();
        }
        if (null != e.returnCardList && e.returnCardList.length) {
          t.uint32(90).fork();
          for (r = 0; r < e.returnCardList.length; ++r) t.uint32(e.returnCardList[r]);
          t.ldelim();
        }
        if (null != e.firstPlayer && Object.hasOwnProperty.call(e, "firstPlayer") && t.uint32(96).uint32(e.firstPlayer), null != e.playedTypeList && e.playedTypeList.length) {
          t.uint32(106).fork();
          for (r = 0; r < e.playedTypeList.length; ++r) t.uint32(e.playedTypeList[r]);
          t.ldelim();
        }
        return t;
      }, e.decode = function (e, t) {
        e instanceof i || (e = i.create(e));
        for (var r = void 0 === t ? e.len : e.pos + t, n = new l.DDZGameData(); e.pos < r;) {
          var a = e.uint32();
          switch (a >>> 3) {
            case 1:
              n.rule = e.uint32();
              break;
            case 2:
              n.state = e.uint32();
              break;
            case 3:
              n.landlordId = e.uint32();
              break;
            case 4:
              if (n.cardPositionList && n.cardPositionList.length || (n.cardPositionList = []), 2 === (7 & a)) for (var s = e.uint32() + e.pos; e.pos < s;) n.cardPositionList.push(e.uint32());else n.cardPositionList.push(e.uint32());
              break;
            case 5:
              if (n.playedCardList && n.playedCardList.length || (n.playedCardList = []), 2 === (7 & a)) for (s = e.uint32() + e.pos; e.pos < s;) n.playedCardList.push(e.uint32());else n.playedCardList.push(e.uint32());
              break;
            case 6:
              n.v = e.uint32();
              break;
            case 7:
              n.team13Level = e.uint32();
              break;
            case 8:
              n.team24Level = e.uint32();
              break;
            case 9:
              if (n.lastRankList && n.lastRankList.length || (n.lastRankList = []), 2 === (7 & a)) for (s = e.uint32() + e.pos; e.pos < s;) n.lastRankList.push(e.uint32());else n.lastRankList.push(e.uint32());
              break;
            case 10:
              if (n.tributeCardList && n.tributeCardList.length || (n.tributeCardList = []), 2 === (7 & a)) for (s = e.uint32() + e.pos; e.pos < s;) n.tributeCardList.push(e.uint32());else n.tributeCardList.push(e.uint32());
              break;
            case 11:
              if (n.returnCardList && n.returnCardList.length || (n.returnCardList = []), 2 === (7 & a)) for (s = e.uint32() + e.pos; e.pos < s;) n.returnCardList.push(e.uint32());else n.returnCardList.push(e.uint32());
              break;
            case 12:
              n.firstPlayer = e.uint32();
              break;
            case 13:
              if (n.playedTypeList && n.playedTypeList.length || (n.playedTypeList = []), 2 === (7 & a)) for (s = e.uint32() + e.pos; e.pos < s;) n.playedTypeList.push(e.uint32());else n.playedTypeList.push(e.uint32());
              break;
            default:
              e.skipType(7 & a);
          }
        }
        return n;
      }, e;
    }();
},
6139: function (e, t, r) {
  r.d(t, {
    $9: function () {
      return O;
    },
    Bx: function () {
      return k;
    },
    C6: function () {
      return S;
    },
    DB: function () {
      return T;
    },
    EE: function () {
      return W;
    },
    G4: function () {
      return D;
    },
    GU: function () {
      return Z;
    },
    H0: function () {
      return x;
    },
    HU: function () {
      return I;
    },
    JY: function () {
      return N;
    },
    Uj: function () {
      return R;
    },
    Vz: function () {
      return p;
    },
    ZG: function () {
      return v;
    },
    dW: function () {
      return c;
    },
    h8: function () {
      return F;
    },
    my: function () {
      return b;
    },
    qA: function () {
      return C;
    },
    rG: function () {
      return A;
    },
    vU: function () {
      return P;
    },
    zN: function () {
      return m;
    }
  });
  var n,
    i = r(885),
    a = r(7762),
    s = r(2982),
    l = r(5911),
    u = r(9474),
    o = r(4420),
    c = 1,
    d = [0, 14.2, 15.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2, 11.2, 12.2, 13.2, 14.4, 15.4, 3.4, 4.4, 5.4, 6.4, 7.4, 8.4, 9.4, 10.4, 11.4, 12.4, 13.4, 14.6, 15.6, 3.6, 4.6, 5.6, 6.6, 7.6, 8.6, 9.6, 10.6, 11.6, 12.6, 13.6, 14.8, 15.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8, 10.8, 11.8, 12.8, 13.8, 54, 53],
    h = [0, 14.2, 15.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2, 11.2, 12.2, 13.2, 14.4, 15.4, 3.4, 4.4, 5.4, 6.4, 7.4, 8.4, 9.4, 10.4, 11.4, 12.4, 13.4, 14.6, 15.6, 3.6, 4.6, 5.6, 6.6, 7.6, 8.6, 9.6, 10.6, 11.6, 12.6, 13.6, 14.8, 15.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8, 10.8, 11.8, 12.8, 13.8, 53, 54],
    f = [0, 14, 15, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 54, 53],
    v = function (e) {
      return (e - 1) % 54 + 1;
    },
    m = function (e) {
      return (0, s.Z)(e).sort(function (e, t) {
        return d[v(t)] - d[v(e)];
      });
    },
    p = function (e) {
      return f[v(e)];
    },
    y = function (e) {
      var t,
        r = new Map(),
        n = (0, a.Z)(e);
      try {
        for (n.s(); !(t = n.n()).done;) {
          var i = t.value,
            s = p(i),
            l = r.get(s);
          r.set(s, l ? l + 1 : 1);
        }
      } catch (u) {
        n.e(u);
      } finally {
        n.f();
      }
      return r;
    },
    x = function (e) {
      var t = y(e);
      return (0, s.Z)(e).sort(function (e, r) {
        var n = v(e),
          i = v(r),
          a = t.get(f[n]),
          s = t.get(f[i]);
        return a === s ? h[n] - h[i] : s - a;
      });
    };
  !function (e) {
    e[e.Bad = 0] = "Bad", e[e.One = 1] = "One", e[e.Pair = 2] = "Pair", e[e.Three = 3] = "Three", e[e.ThreeWithOne = 4] = "ThreeWithOne", e[e.ThreeWithPair = 5] = "ThreeWithPair", e[e.FourWithOnes = 6] = "FourWithOnes", e[e.FourWithPairs = 7] = "FourWithPairs", e[e.Four = 100] = "Four", e[e.Jokers = 127] = "Jokers";
  }(n || (n = {}));
  var L = function (e, t) {
      var r = t.length,
        i = x(t),
        s = y(i),
        l = p(i[0]),
        u = p(i[r - 1]),
        o = s.get(l),
        c = s.get(u);
      if (o === r) return [r < 4 ? r : n.Four - 4 + r, l];
      if (1 === o) return e && 2 === r && l > 50 ? [n.Jokers] : r < 5 || i.findIndex(function (e) {
        return p(e) > 14;
      }) > -1 ? [n.Bad] : i.every(function (e, t) {
        return p(e) === l + t;
      }) ? [n.One | r - 4 << 3, l] : [n.Bad];
      if (2 === o) return !e && 4 === r && l > 50 && 2 === c ? [n.Jokers] : c < 2 || r < 6 || i.findIndex(function (e) {
        return p(e) > 14;
      }) > -1 ? [n.Bad] : i.every(function (e, t) {
        return t % 2 || p(e) === l + t / 2;
      }) ? [n.Pair | r - 2 << 2, l] : [n.Bad];
      if (3 === o) {
        if (3 === c && i.findIndex(function (e) {
          return p(e) > 14;
        }) < 0 && i.every(function (e, t) {
          return t % 3 || p(e) === l + t / 3;
        })) return [n.Three | r / 3 - 1 << 3, l];
        if (4 === r) return e ? [n.ThreeWithOne, l] : [n.Bad];
        if (5 === r && 2 === c) return [n.ThreeWithPair, l];
      }
      if (4 === o && e) {
        if (6 === r) return [n.FourWithOnes, l];
        if (8 === r) {
          if (2 === c) return [n.FourWithPairs, l];
          if (4 === c) return [n.FourWithPairs, u];
        }
      }
      if (c > 1 && r % 5 === 0 && r > 5) {
        var d = function () {
          var e = r / 5,
            t = new Set();
          if (s.forEach(function (e, r) {
            e > 2 && r < 15 && t.add(r);
          }), t.size < e) return {
            v: [n.Bad]
          };
          var i = [];
          if (t.forEach(function (r) {
            new Array(e).fill(0).every(function (e, n) {
              return t.has(r + n);
            }) && i.push(r);
          }), !i.length) return {
            v: [n.Bad]
          };
          i.sort(function (e, t) {
            return t - e;
          });
          for (var l = function () {
              var t = o[u],
                r = new Map();
              s.forEach(function (n, i) {
                i - t >= 0 && i - t < e ? r.set(i, n - 3) : r.set(i, n);
              });
              var i,
                l = !0,
                c = (0, a.Z)(r.values());
              try {
                for (c.s(); !(i = c.n()).done;) {
                  if (i.value % 2) {
                    l = !1;
                    break;
                  }
                }
              } catch (d) {
                c.e(d);
              } finally {
                c.f();
              }
              if (l) return {
                v: {
                  v: [n.ThreeWithPair | e - 1 << 3, t]
                }
              };
            }, u = 0, o = i; u < o.length; u++) {
            var c = l();
            if ("object" === typeof c) return c.v;
          }
        }();
        if ("object" === typeof d) return d.v;
      }
      if (e && r % 4 === 0 && r > 4) {
        var h = r / 4,
          f = new Set();
        if (s.forEach(function (e, t) {
          e > 2 && t < 15 && f.add(t);
        }), f.size < h) return [n.Bad];
        var v = [];
        return f.forEach(function (e) {
          new Array(h).fill(0).every(function (t, r) {
            return f.has(e + r);
          }) && v.push(e);
        }), v.length ? (v.sort(function (e, t) {
          return t - e;
        }), [n.ThreeWithOne | h - 1 << 3, v[0]]) : [n.Bad];
      }
      return [n.Bad];
    },
    g = function (e, t) {
      e.isFinish = e.state > 8, e.winner = e.isFinish ? 7 & e.state : 0, e.landlordWin = e.isFinish && e.winner === e.landlordId, e.holeCardList = e.cardPositionList.map(function (e, t) {
        return 8 & e ? t + 1 : -1;
      }).filter(function (e) {
        return e >= 0;
      });
      for (var r = [[]], n = [0], i = function (t) {
          var i = e.cardPositionList.map(function (e, r) {
            return (7 & e) === t ? r + 1 : -1;
          }).filter(function (e) {
            return e > -1;
          });
          r.push(i), n.push(e.winner === t ? 0 : i.length);
        }, a = 1; a <= t; a++) i(a);
      return e.playerCardLists = r, e.playerRestCardCounts = n, e.canPlayAnyCards = !e.playedCardList.length || new Array(t - 1).fill(0).every(function (t, r) {
        return 0 === e.playedCardList[e.playedCardList.length - 1 - r];
      }), e.lastCards = function () {
        if (e.rule || e.canPlayAnyCards) return [];
        for (var t = [], r = e.playedCardList.length - 1; r >= 0; r--) {
          var n = e.playedCardList[r];
          if (n) t.push(n);else if (t.length) break;
        }
        return t;
      }(), e;
    },
    j = function (e) {
      return JSON.parse(JSON.stringify(e));
    },
    C = function (e) {
      return {
        rule: e.rule,
        state: e.state,
        landlordId: e.landlordId,
        cardPositionList: (0, s.Z)(e.cardPositionList),
        playedCardList: (0, s.Z)(e.playedCardList),
        v: e.v
      };
    },
    b = function (e, t) {
      return g({
        rule: e.rule,
        state: e.state,
        landlordId: e.landlordId,
        cardPositionList: (0, s.Z)(e.cardPositionList),
        playedCardList: (0, s.Z)(e.playedCardList),
        v: e.v,
        isFinish: !1,
        winner: 0,
        landlordWin: !1,
        holeCardList: [],
        playerCardLists: [],
        playerRestCardCounts: [],
        canPlayAnyCards: !1,
        lastCards: []
      }, t);
    },
    w = function (e, t) {
      var r;
      if (3 === t) {
        r = new Array(54).fill(15);
        for (var n = (0, o.T)(new Array(54).fill(0).map(function (e, t) {
            return t;
          })), i = 0; i < 3; i++) for (var a = 0; a < 17; a++) r[n[17 * i + a]] = i + 1;
      } else if (4 === t) {
        r = new Array(108).fill(15);
        for (var s = (0, o.T)(new Array(108).fill(0).map(function (e, t) {
            return t;
          })), u = 0; u < 4; u++) for (var d = 0; d < 25; d++) r[s[25 * u + d]] = u + 1;
      } else if (2 === t) {
        r = new Array(54).fill(7);
        for (var h = (0, o.T)(new Array(54).fill(0).map(function (e, t) {
            return t;
          })), f = 0; f < 2; f++) for (var v = 0; v < 17; v++) r[h[17 * f + v]] = f + 1;
        r[h[53]] = 15;
      } else r = [];
      return g({
        rule: e,
        state: l.D.CallLandlord,
        landlordId: 0,
        cardPositionList: r,
        playedCardList: [],
        v: c,
        isFinish: !1,
        winner: 0,
        landlordWin: !1,
        holeCardList: [],
        playerCardLists: [],
        playerRestCardCounts: [],
        canPlayAnyCards: !1,
        lastCards: []
      }, t);
    },
    k = function (e, t) {
      var r = u.w.decode(t);
      return C(w(r.rule, e.playerList.length));
    },
    P = function (e) {
      return e.state === l.D.CallLandlord;
    },
    N = function (e, t, r) {
      var n = j(e);
      return n.state = t, n.landlordId = t, n.cardPositionList = n.cardPositionList.map(function (e) {
        return 15 === e ? 8 | t : e;
      }), g(n, r);
    },
    Z = function (e, t) {
      return e.state === t && !e.canPlayAnyCards;
    },
    R = function (e, t, r) {
      var n = j(e);
      return n.state = n.state % r + 1, n.playedCardList = n.playedCardList.concat([0]), g(n, r);
    },
    T = function (e, t, r, a) {
      return e.state === t && (e.rule ? a.length > 0 : function (e, t, r) {
        if (!t.length) return !1;
        var a = L(e, t),
          s = (0, i.Z)(a, 2),
          l = s[0],
          u = s[1];
        if (!l) return !1;
        if (!r.length) return !0;
        var o = L(e, r),
          c = (0, i.Z)(o, 2),
          d = c[0],
          h = c[1];
        return !d || (d === l ? u > h : l >= n.Four && l > d);
      }(r < 4, a, (0, s.Z)(e.lastCards)));
    },
    A = function (e, t, r, n) {
      var i = j(e);
      return n.length === i.playerCardLists[t].length ? (i.state |= 8, g(i, r)) : (n.forEach(function (e) {
        i.cardPositionList[e - 1] &= 8;
      }), i.state = i.state % r + 1, i.playedCardList = i.playedCardList.concat([0].concat((0, s.Z)(n))), g(i, r));
    },
    O = function (e, t, r) {
      return e.state === ((t + 1) % r || r) && e.playedCardList.length > 0;
    },
    I = function (e, t, r) {
      for (var n = j(e), i = [], a = n.playedCardList.length - 1; a >= 0; a--) {
        var s = n.playedCardList[a];
        if (!s) break;
        i.push(s);
      }
      return a < 0 && (a = 0), i.forEach(function (e) {
        n.cardPositionList[e - 1] = t | 8 & n.cardPositionList[e - 1];
      }), n.playedCardList = n.playedCardList.slice(0, a), n.state = t, g(n, r);
    },
    F = function (e) {
      return e.isFinish;
    },
    W = function (e, t) {
      var r = j(e);
      return r.rule = r.rule ? 0 : 1, g(r, t);
    },
    S = function (e) {
      return e.isFinish;
    },
    D = function (e, t) {
      return w(e.rule, t);
    };
},
5911: function (e, t, r) {
  var n;
  r.d(t, {
    D: function () {
      return n;
    }
  }), function (e) {
    e[e.CallLandlord = 0] = "CallLandlord", e[e.WaitPlayer1 = 1] = "WaitPlayer1", e[e.WaitPlayer2 = 2] = "WaitPlayer2", e[e.WaitPlayer3 = 3] = "WaitPlayer3", e[e.WaitPlayer4 = 4] = "WaitPlayer4", e[e.Player1Win = 9] = "Player1Win", e[e.Player2Win = 10] = "Player2Win", e[e.Player3Win = 11] = "Player3Win", e[e.Player4Win = 12] = "Player4Win";
  }(n || (n = {}));
},
3861: function (e, t, n) {
  "use strict";

  function r(e) {
    for (var t = arguments.length, n = Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) n[r - 1] = arguments[r];
    throw Error("[Immer] minified error nr: " + e + (n.length ? " " + n.map(function (e) {
      return "'" + e + "'";
    }).join(",") : "") + ". Find the full error at: https://bit.ly/3cXEKWf");
  }
  function a(e) {
    return !!e && !!e[H];
  }
  function l(e) {
    var t;
    return !!e && (function (e) {
      if (!e || "object" != typeof e) return !1;
      var t = Object.getPrototypeOf(e);
      if (null === t) return !0;
      var n = Object.hasOwnProperty.call(t, "constructor") && t.constructor;
      return n === Object || "function" == typeof n && Function.toString.call(n) === Q;
    }(e) || Array.isArray(e) || !!e[V] || !!(null === (t = e.constructor) || void 0 === t ? void 0 : t[V]) || d(e) || p(e));
  }
  function o(e, t, n) {
    void 0 === n && (n = !1), 0 === i(e) ? (n ? Object.keys : q)(e).forEach(function (r) {
      n && "symbol" == typeof r || t(r, e[r], e);
    }) : e.forEach(function (n, r) {
      return t(r, n, e);
    });
  }
  function i(e) {
    var t = e[H];
    return t ? t.i > 3 ? t.i - 4 : t.i : Array.isArray(e) ? 1 : d(e) ? 2 : p(e) ? 3 : 0;
  }
  function u(e, t) {
    return 2 === i(e) ? e.has(t) : Object.prototype.hasOwnProperty.call(e, t);
  }
  function s(e, t) {
    return 2 === i(e) ? e.get(t) : e[t];
  }
  function c(e, t, n) {
    var r = i(e);
    2 === r ? e.set(t, n) : 3 === r ? (e.delete(t), e.add(n)) : e[t] = n;
  }
  function f(e, t) {
    return e === t ? 0 !== e || 1 / e == 1 / t : e != e && t != t;
  }
  function d(e) {
    return U && e instanceof Map;
  }
  function p(e) {
    return B && e instanceof Set;
  }
  function h(e) {
    return e.o || e.t;
  }
  function m(e) {
    if (Array.isArray(e)) return Array.prototype.slice.call(e);
    var t = K(e);
    delete t[H];
    for (var n = q(t), r = 0; r < n.length; r++) {
      var a = n[r],
        l = t[a];
      !1 === l.writable && (l.writable = !0, l.configurable = !0), (l.get || l.set) && (t[a] = {
        configurable: !0,
        writable: !0,
        enumerable: l.enumerable,
        value: e[a]
      });
    }
    return Object.create(Object.getPrototypeOf(e), t);
  }
  function v(e, t) {
    return void 0 === t && (t = !1), g(e) || a(e) || !l(e) || (i(e) > 1 && (e.set = e.add = e.clear = e.delete = y), Object.freeze(e), t && o(e, function (e, t) {
      return v(t, !0);
    }, !0)), e;
  }
  function y() {
    r(2);
  }
  function g(e) {
    return null == e || "object" != typeof e || Object.isFrozen(e);
  }
  function b(e) {
    var t = Z[e];
    return t || r(18, e), t;
  }
  function w() {
    return I;
  }
  function k(e, t) {
    t && (b("Patches"), e.u = [], e.s = [], e.v = t);
  }
  function S(e) {
    x(e), e.p.forEach(_), e.p = null;
  }
  function x(e) {
    e === I && (I = e.l);
  }
  function E(e) {
    return I = {
      p: [],
      l: I,
      h: e,
      m: !0,
      _: 0
    };
  }
  function _(e) {
    var t = e[H];
    0 === t.i || 1 === t.i ? t.j() : t.O = !0;
  }
  function C(e, t) {
    t._ = t.p.length;
    var n = t.p[0],
      a = void 0 !== e && e !== n;
    return t.h.g || b("ES5").S(t, e, a), a ? (n[H].P && (S(t), r(4)), l(e) && (e = P(t, e), t.l || z(t, e)), t.u && b("Patches").M(n[H].t, e, t.u, t.s)) : e = P(t, n, []), S(t), t.u && t.v(t.u, t.s), e !== W ? e : void 0;
  }
  function P(e, t, n) {
    if (g(t)) return t;
    var r = t[H];
    if (!r) return o(t, function (a, l) {
      return N(e, r, t, a, l, n);
    }, !0), t;
    if (r.A !== e) return t;
    if (!r.P) return z(e, r.t, !0), r.t;
    if (!r.I) {
      r.I = !0, r.A._--;
      var a = 4 === r.i || 5 === r.i ? r.o = m(r.k) : r.o;
      o(3 === r.i ? new Set(a) : a, function (t, l) {
        return N(e, r, a, t, l, n);
      }), z(e, a, !1), n && e.u && b("Patches").R(r, n, e.u, e.s);
    }
    return r.o;
  }
  function N(e, t, n, r, o, i) {
    if (a(o)) {
      var s = P(e, o, i && t && 3 !== t.i && !u(t.D, r) ? i.concat(r) : void 0);
      if (c(n, r, s), !a(s)) return;
      e.m = !1;
    }
    if (l(o) && !g(o)) {
      if (!e.h.F && e._ < 1) return;
      P(e, o), t && t.A.l || z(e, o);
    }
  }
  function z(e, t, n) {
    void 0 === n && (n = !1), e.h.F && e.m && v(t, n);
  }
  function O(e, t) {
    var n = e[H];
    return (n ? h(n) : e)[t];
  }
  function L(e, t) {
    if (t in e) for (var n = Object.getPrototypeOf(e); n;) {
      var r = Object.getOwnPropertyDescriptor(n, t);
      if (r) return r;
      n = Object.getPrototypeOf(n);
    }
  }
  function T(e) {
    e.P || (e.P = !0, e.l && T(e.l));
  }
  function R(e) {
    e.o || (e.o = m(e.t));
  }
  function M(e, t, n) {
    var r = d(t) ? b("MapSet").N(t, n) : p(t) ? b("MapSet").T(t, n) : e.g ? function (e, t) {
      var n = Array.isArray(e),
        r = {
          i: n ? 1 : 0,
          A: t ? t.A : w(),
          P: !1,
          I: !1,
          D: {},
          l: t,
          t: e,
          k: null,
          o: null,
          j: null,
          C: !1
        },
        a = r,
        l = Y;
      n && (a = [r], l = X);
      var o = Proxy.revocable(a, l),
        i = o.revoke,
        u = o.proxy;
      return r.k = u, r.j = i, u;
    }(t, n) : b("ES5").J(t, n);
    return (n ? n.A : w()).p.push(r), r;
  }
  function F(e) {
    return a(e) || r(22, e), function e(t) {
      if (!l(t)) return t;
      var n,
        r = t[H],
        a = i(t);
      if (r) {
        if (!r.P && (r.i < 4 || !b("ES5").K(r))) return r.t;
        r.I = !0, n = D(t, a), r.I = !1;
      } else n = D(t, a);
      return o(n, function (t, a) {
        r && s(r.t, t) === a || c(n, t, e(a));
      }), 3 === a ? new Set(n) : n;
    }(e);
  }
  function D(e, t) {
    switch (t) {
      case 2:
        return new Map(e);
      case 3:
        return Array.from(e);
    }
    return m(e);
  }
  n.d(t, {
    x: function () {
      return re;
    }
  });
  var A,
    I,
    j = "undefined" != typeof Symbol && "symbol" == typeof Symbol("x"),
    U = "undefined" != typeof Map,
    B = "undefined" != typeof Set,
    $ = "undefined" != typeof Proxy && void 0 !== Proxy.revocable && "undefined" != typeof Reflect,
    W = j ? Symbol.for("immer-nothing") : ((A = {})["immer-nothing"] = !0, A),
    V = j ? Symbol.for("immer-draftable") : "__$immer_draftable",
    H = j ? Symbol.for("immer-state") : "__$immer_state",
    Q = ("undefined" != typeof Symbol && Symbol.iterator, "" + Object.prototype.constructor),
    q = "undefined" != typeof Reflect && Reflect.ownKeys ? Reflect.ownKeys : void 0 !== Object.getOwnPropertySymbols ? function (e) {
      return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
    } : Object.getOwnPropertyNames,
    K = Object.getOwnPropertyDescriptors || function (e) {
      var t = {};
      return q(e).forEach(function (n) {
        t[n] = Object.getOwnPropertyDescriptor(e, n);
      }), t;
    },
    Z = {},
    Y = {
      get: function (e, t) {
        if (t === H) return e;
        var n = h(e);
        if (!u(n, t)) return function (e, t, n) {
          var r,
            a = L(t, n);
          return a ? "value" in a ? a.value : null === (r = a.get) || void 0 === r ? void 0 : r.call(e.k) : void 0;
        }(e, n, t);
        var r = n[t];
        return e.I || !l(r) ? r : r === O(e.t, t) ? (R(e), e.o[t] = M(e.A.h, r, e)) : r;
      },
      has: function (e, t) {
        return t in h(e);
      },
      ownKeys: function (e) {
        return Reflect.ownKeys(h(e));
      },
      set: function (e, t, n) {
        var r = L(h(e), t);
        if (null == r ? void 0 : r.set) return r.set.call(e.k, n), !0;
        if (!e.P) {
          var a = O(h(e), t),
            l = null == a ? void 0 : a[H];
          if (l && l.t === n) return e.o[t] = n, e.D[t] = !1, !0;
          if (f(n, a) && (void 0 !== n || u(e.t, t))) return !0;
          R(e), T(e);
        }
        return e.o[t] === n && "number" != typeof n && (void 0 !== n || t in e.o) || (e.o[t] = n, e.D[t] = !0, !0);
      },
      deleteProperty: function (e, t) {
        return void 0 !== O(e.t, t) || t in e.t ? (e.D[t] = !1, R(e), T(e)) : delete e.D[t], e.o && delete e.o[t], !0;
      },
      getOwnPropertyDescriptor: function (e, t) {
        var n = h(e),
          r = Reflect.getOwnPropertyDescriptor(n, t);
        return r ? {
          writable: !0,
          configurable: 1 !== e.i || "length" !== t,
          enumerable: r.enumerable,
          value: n[t]
        } : r;
      },
      defineProperty: function () {
        r(11);
      },
      getPrototypeOf: function (e) {
        return Object.getPrototypeOf(e.t);
      },
      setPrototypeOf: function () {
        r(12);
      }
    },
    X = {};
  o(Y, function (e, t) {
    X[e] = function () {
      return arguments[0] = arguments[0][0], t.apply(this, arguments);
    };
  }), X.deleteProperty = function (e, t) {
    return X.set.call(this, e, t, void 0);
  }, X.set = function (e, t, n) {
    return Y.set.call(this, e[0], t, n, e[0]);
  };
  var G = function () {
      function e(e) {
        var t = this;
        this.g = $, this.F = !0, this.produce = function (e, n, a) {
          if ("function" == typeof e && "function" != typeof n) {
            var o = n;
            n = e;
            var i = t;
            return function (e) {
              var t = this;
              void 0 === e && (e = o);
              for (var r = arguments.length, a = Array(r > 1 ? r - 1 : 0), l = 1; l < r; l++) a[l - 1] = arguments[l];
              return i.produce(e, function (e) {
                var r;
                return (r = n).call.apply(r, [t, e].concat(a));
              });
            };
          }
          var u;
          if ("function" != typeof n && r(6), void 0 !== a && "function" != typeof a && r(7), l(e)) {
            var s = E(t),
              c = M(t, e, void 0),
              f = !0;
            try {
              u = n(c), f = !1;
            } finally {
              f ? S(s) : x(s);
            }
            return "undefined" != typeof Promise && u instanceof Promise ? u.then(function (e) {
              return k(s, a), C(e, s);
            }, function (e) {
              throw S(s), e;
            }) : (k(s, a), C(u, s));
          }
          if (!e || "object" != typeof e) {
            if (void 0 === (u = n(e)) && (u = e), u === W && (u = void 0), t.F && v(u, !0), a) {
              var d = [],
                p = [];
              b("Patches").M(e, u, d, p), a(d, p);
            }
            return u;
          }
          r(21, e);
        }, this.produceWithPatches = function (e, n) {
          if ("function" == typeof e) return function (n) {
            for (var r = arguments.length, a = Array(r > 1 ? r - 1 : 0), l = 1; l < r; l++) a[l - 1] = arguments[l];
            return t.produceWithPatches(n, function (t) {
              return e.apply(void 0, [t].concat(a));
            });
          };
          var r,
            a,
            l = t.produce(e, n, function (e, t) {
              r = e, a = t;
            });
          return "undefined" != typeof Promise && l instanceof Promise ? l.then(function (e) {
            return [e, r, a];
          }) : [l, r, a];
        }, "boolean" == typeof (null == e ? void 0 : e.useProxies) && this.setUseProxies(e.useProxies), "boolean" == typeof (null == e ? void 0 : e.autoFreeze) && this.setAutoFreeze(e.autoFreeze);
      }
      var t = e.prototype;
      return t.createDraft = function (e) {
        l(e) || r(8), a(e) && (e = F(e));
        var t = E(this),
          n = M(this, e, void 0);
        return n[H].C = !0, x(t), n;
      }, t.finishDraft = function (e, t) {
        var n = (e && e[H]).A;
        return k(n, t), C(void 0, n);
      }, t.setAutoFreeze = function (e) {
        this.F = e;
      }, t.setUseProxies = function (e) {
        e && !$ && r(20), this.g = e;
      }, t.applyPatches = function (e, t) {
        var n;
        for (n = t.length - 1; n >= 0; n--) {
          var r = t[n];
          if (0 === r.path.length && "replace" === r.op) {
            e = r.value;
            break;
          }
        }
        n > -1 && (t = t.slice(n + 1));
        var l = b("Patches").$;
        return a(e) ? l(e, t) : this.produce(e, function (e) {
          return l(e, t);
        });
      }, e;
    }(),
    J = new G(),
    ee = J.produce,
    te = (J.produceWithPatches.bind(J), J.setAutoFreeze.bind(J), J.setUseProxies.bind(J), J.applyPatches.bind(J), J.createDraft.bind(J), J.finishDraft.bind(J), ee),
    ne = n(7313);
  function re(e) {
    var t = (0, ne.useState)(function () {
        return v("function" == typeof e ? e() : e, !0);
      }),
      n = t[1];
    return [t[0], (0, ne.useCallback)(function (e) {
      n("function" == typeof e ? te(e) : v(e));
    }, [])];
  }
},
6135: function (e, t, r) {
  r.d(t, {
    Ar: function () {
      return N;
    },
    Fr: function () {
      return w;
    },
    H1: function () {
      return j;
    },
    Km: function () {
      return F;
    },
    Ps: function () {
      return D;
    },
    QI: function () {
      return G;
    },
    SX: function () {
      return f;
    },
    W7: function () {
      return T;
    },
    ZO: function () {
      return B;
    },
    a9: function () {
      return R;
    },
    b_: function () {
      return Z;
    },
    dI: function () {
      return k;
    },
    dK: function () {
      return p;
    },
    e2: function () {
      return I;
    },
    e9: function () {
      return M;
    },
    g0: function () {
      return A;
    },
    h1: function () {
      return m;
    },
    iV: function () {
      return E;
    },
    l0: function () {
      return W;
    },
    pE: function () {
      return O;
    },
    wn: function () {
      return y;
    },
    x$: function () {
      return S;
    }
  });
  var n,
    i = r(2982),
    a = r(7762),
    s = r(6139),
    l = r(9474),
    u = r(4420);
  !function (e) {
    e[e.Single = 1] = "Single", e[e.Pair = 2] = "Pair", e[e.Triple = 3] = "Triple", e[e.ThreeWithPair = 4] = "ThreeWithPair", e[e.Steel = 5] = "Steel", e[e.TriplePairs = 6] = "TriplePairs", e[e.Straight = 7] = "Straight", e[e.Four = 100] = "Four", e[e.Five = 101] = "Five", e[e.StraightFlush = 102] = "StraightFlush", e[e.Six = 103] = "Six", e[e.Seven = 104] = "Seven", e[e.Eight = 105] = "Eight", e[e.FourJokers = 127] = "FourJokers";
  }(n || (n = {}));
  var o = function (e, t) {
      return e % 2 === t % 2;
    },
    c = function (e) {
      return e <= 2 ? e + 2 : e - 2;
    },
    d = function (e) {
      var t = (0, s.ZG)(e);
      return t >= 53 ? -1 : Math.floor((t - 1) / 13);
    },
    h = function (e) {
      var t = (0, s.ZG)(e);
      if (53 === t) return 17;
      if (54 === t) return 16;
      var r = t % 13;
      return 1 === r ? 14 : r || 13;
    },
    f = function (e, t) {
      var r = h(e);
      return r === t ? 15 : r;
    },
    v = function (e, t) {
      var r = (0, s.ZG)(e);
      return r >= 27 && r <= 39 && h(e) === t;
    },
    m = function (e) {
      return e <= 10 ? "".concat(e) : "JQKA"[e - 11];
    },
    p = function (e, t) {
      return Math.ceil((48 * e + 68) * t / 159);
    },
    y = function (e, t) {
      var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : -1;
      return (0, i.Z)(e).sort(function (e, n) {
        var i = f(n, t) - f(e, t);
        if (0 !== i) return i;
        if (r >= 0) {
          var a = function (e) {
              var t = d(e);
              return -1 === t ? 4 : (t - r + 4) % 4;
            },
            s = a(e) - a(n);
          if (0 !== s) return s;
        }
        return e - n;
      });
    },
    x = function (e, t) {
      var r = [],
        s = e.length,
        l = e.filter(function (e) {
          return v(e, t);
        }),
        u = e.filter(function (e) {
          return !v(e, t);
        }),
        o = l.length,
        c = function (e, t) {
          var r,
            n = new Map(),
            i = (0, a.Z)(e);
          try {
            for (i.s(); !(r = i.n()).done;) {
              var s = r.value,
                l = f(s, t);
              n.set(l, (n.get(l) || 0) + 1);
            }
          } catch (u) {
            i.e(u);
          } finally {
            i.f();
          }
          return n;
        }(u, t),
        m = function (e) {
          var t,
            r = new Map(),
            n = (0, a.Z)(e);
          try {
            for (n.s(); !(t = n.n()).done;) {
              var i = t.value,
                s = h(i);
              r.set(s, (r.get(s) || 0) + 1);
            }
          } catch (l) {
            n.e(l);
          } finally {
            n.f();
          }
          return r;
        }(u),
        p = (0, i.Z)(c.keys());
      if (1 === s && r.push(n.Single << 8 | (o ? 15 : f(e[0], t))), 2 === s && (2 === o ? r.push(n.Pair << 8 | 15) : p.forEach(function (e) {
        o && e >= 16 || c.get(e) === 2 - o && r.push(n.Pair << 8 | e);
      })), 3 === s && p.forEach(function (e) {
        o && e >= 16 || c.get(e) === 3 - o && r.push(n.Triple << 8 | e);
      }), 4 === s && !o && u.every(function (e) {
        return -1 === d(e);
      }) && r.push(n.FourJokers << 8 | 0), c.size <= 1) {
        var y = u.length ? f(u[0], t) : 0;
        if (!o || y < 16) for (var x = 4; x <= 8; x++) if (x - o >= 1 && x - o === u.length) {
          var L = x <= 5 ? n.Four + x - 4 : x + 97;
          r.push(L << 8 | y);
        }
      }
      if (5 === s) for (var g = new Set(u.map(function (e) {
          return h(e);
        })), j = g.size === u.length, C = d(u[0]), b = j && u.every(function (e) {
          return d(e) === C;
        }), w = 5; w <= 14; w++) {
        for (var k = 0, P = w - 4; P <= w; P++) g.has(P) || 1 === P && 5 === w && g.has(14) || (k += 1);
        k === o && (j && r.push(n.Straight << 8 | w), b && r.push(n.StraightFlush << 8 | w));
      }
      if (5 === s && p.forEach(function (e) {
        if (!(o && e >= 16)) {
          var t = c.get(e);
          p.forEach(function (i) {
            i === e || t > 3 || c.get(i) > 2 || t + c.get(i) + o !== 5 || o && i >= 16 || r.push(n.ThreeWithPair << 8 | e);
          });
        }
      }), 6 === s) {
        for (var N = (0, i.Z)(m.keys()), Z = function (e) {
            var t = [e - 2, e - 1, e];
            if (!N.every(function (r) {
              return t.includes(r) || 14 === r && 3 === e;
            })) return "continue";
            for (var i = 0, a = 0, s = t; a < s.length; a++) {
              var l = s[a],
                u = m.get(l) || 1 === l && 3 === e && m.get(14) || 0;
              if (u > 2) {
                i = -1;
                break;
              }
              i += 2 - u;
            }
            i === o && r.push(n.TriplePairs << 8 | e);
          }, R = 3; R <= 14; R++) Z(R);
        for (var T = function (e) {
            var t = [e - 1, e];
            if (!N.every(function (r) {
              return t.includes(r) || 14 === r && 2 === e;
            })) return "continue";
            for (var i = 0, a = 0, s = t; a < s.length; a++) {
              var l = s[a],
                u = m.get(l) || 1 === l && 2 === e && m.get(14) || 0;
              if (u > 3) {
                i = -1;
                break;
              }
              i += 3 - u;
            }
            i === o && r.push(n.Steel << 8 | e);
          }, A = 2; A <= 14; A++) T(A);
      }
      return r;
    },
    L = function (e, t, r) {
      var a = x(e, r);
      if (!a.length) return 0;
      if (!t) return Math.max.apply(Math, (0, i.Z)(a));
      var s = a.filter(function (e) {
        return function (e, t) {
          var r = e >> 8,
            i = t >> 8;
          return r === i ? (255 & e) > (255 & t) : r >= n.Four && r > i;
        }(e, t);
      });
      return s.length ? Math.max.apply(Math, (0, i.Z)(s)) : 0;
    },
    g = function (e, t) {
      for (var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : [], n = new Array(108).fill(0), i = [0, 27, 27, 27, 27], a = new Array(5).fill(!1), s = [], l = new Set(), u = function (e) {
          return !a[e];
        }, o = function (e) {
          for (var t = e % 4 + 1, r = 0; r < 4 && !u(t); r++) t = t % 4 + 1;
          return t;
        }, d = t, h = 0, f = [], v = 0, m = 0, p = [null, null, null, null, null], y = [], x = 0; x < e.length; x++) e[x] || y.push(x);
      y.push(e.length);
      for (var L = function (t) {
          var u = e.slice(y[t] + 1, y[t + 1]),
            x = d;
          if (m = x, u.length) {
            u.forEach(function (e) {
              n[e - 1] = x;
            });
            i[x];
            i[x] -= u.length, i[x] || (a[x] = !0, s.push(x)), h = x, f = u, v = r[t] || 0, l.clear();
            for (var L = 1; L <= 4; L++) {
              var g = p[L];
              L !== x && a[L] && g && g.cards && (p[L] = null);
            }
            p[x] = {
              cards: u,
              passed: !1
            }, d = o(x);
          } else {
            l.add(x);
            var j = o(x);
            if (h && (j === h || l.has(j))) {
              var C = h;
              p[x] = {
                cards: null,
                passed: !0
              };
              for (var b = 1; b <= 4; b++) {
                var w = p[b];
                a[b] && w && w.cards && (p[b] = null);
              }
              h = 0, f = [], v = 0, l.clear(), d = a[C] ? c(C) : C;
            } else p[x] = {
              cards: null,
              passed: !0
            }, d = j;
          }
        }, g = 0; g < y.length - 1; g++) L(g);
      return {
        rankList: s,
        trickOwner: h,
        lastCards: f,
        lastInterp: v,
        lastSegmentPlayer: m,
        currentPlayer: d,
        initialHolders: n,
        restCounts: i,
        trickActions: p
      };
    },
    j = function (e) {
      if (4 !== e.length) return {
        tributers: [],
        receivers: []
      };
      var t = e[0],
        r = e[1],
        n = e[2],
        i = e[3];
      return o(t, r) ? {
        tributers: [n, i],
        receivers: [t, r]
      } : {
        tributers: [i],
        receivers: [t]
      };
    },
    C = function (e) {
      e.level = 4 === e.lastRankList.length ? e.lastRankList[0] % 2 === 1 ? e.team13Level : e.team24Level : 2, e.playingTeam = 4 === e.lastRankList.length ? e.lastRankList[0] % 2 === 1 ? 1 : 2 : 0, e.heartLevelCardId = 14 === e.level ? 27 : e.level + 26;
      var t = j(e.lastRankList),
        r = t.tributers,
        n = t.receivers;
      e.tributers = r, e.tributeReceivers = e.tributeCardList.length === r.length && r.length ? n : [], e.isRoundFinish = e.state > 8, e.phase = e.isRoundFinish ? "finish" : 0 === e.state ? e.tributeCardList.some(function (e) {
        return !e;
      }) ? "tribute" : "return" : "play";
      var a = g(e.playedCardList, e.firstPlayer || 1, e.playedTypeList);
      e.rankList = a.rankList, e.trickOwner = a.trickOwner, e.lastCards = a.lastCards, e.lastInterp = a.lastInterp, e.lastSegmentPlayer = a.lastSegmentPlayer, e.trickActions = a.trickActions, e.canPlayAnyCards = !a.trickOwner;
      var l = [[], [], [], [], []];
      return e.cardPositionList.forEach(function (e, t) {
        var r = 7 & e;
        r >= 1 && r <= 4 && l[r].push(t + 1);
      }), e.playerCardLists = l, e.playerRestCardCounts = [0, l[1].length, l[2].length, l[3].length, l[4].length], e.resistInfo = r.length && e.state > 0 && !e.tributeCardList.length ? r.map(function (t) {
        for (var r = 0, n = 0; n < 108; n++) {
          (a.initialHolders[n] || 7 & e.cardPositionList[n]) === t && 53 === (0, s.ZG)(n + 1) && (r += 1);
        }
        return {
          position: t,
          bigJokerCount: r
        };
      }) : [], e.roundResult = e.isRoundFinish ? function (e, t, r, n) {
        var a = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : 0,
          s = e[0] % 2 === 1 ? 1 : 2,
          l = [].concat((0, i.Z)(e), (0, i.Z)([1, 2, 3, 4].filter(function (t) {
            return !e.includes(t);
          }))),
          u = l.findIndex(function (e, t) {
            return t > 0 && o(e, l[0]);
          }),
          c = 1 === u ? 3 : 2 === u ? 2 : 1,
          d = 1 === s ? Math.min(14, t + c) : t,
          h = 2 === s ? Math.min(14, r + c) : r;
        return {
          winTeam: s,
          playingTeam: a,
          upLevels: c,
          newTeam13Level: d,
          newTeam24Level: h,
          isMatchOver: 14 === n && s === a && 3 !== u,
          fullRankList: l
        };
      }(a.rankList, e.team13Level, e.team24Level, e.level, e.playingTeam) : null, e;
    },
    b = function (e) {
      return JSON.parse(JSON.stringify(e));
    },
    w = function (e) {
      return {
        rule: e.rule,
        state: e.state,
        landlordId: 0,
        cardPositionList: (0, i.Z)(e.cardPositionList),
        playedCardList: (0, i.Z)(e.playedCardList),
        v: e.v,
        team13Level: e.team13Level,
        team24Level: e.team24Level,
        lastRankList: (0, i.Z)(e.lastRankList),
        tributeCardList: (0, i.Z)(e.tributeCardList),
        returnCardList: (0, i.Z)(e.returnCardList),
        firstPlayer: e.firstPlayer,
        playedTypeList: (0, i.Z)(e.playedTypeList)
      };
    },
    k = function (e) {
      return C({
        rule: e.rule,
        state: e.state,
        cardPositionList: (0, i.Z)(e.cardPositionList),
        playedCardList: (0, i.Z)(e.playedCardList),
        v: e.v,
        team13Level: e.team13Level || 2,
        team24Level: e.team24Level || 2,
        lastRankList: (0, i.Z)(e.lastRankList || []),
        tributeCardList: (0, i.Z)(e.tributeCardList || []),
        returnCardList: (0, i.Z)(e.returnCardList || []),
        firstPlayer: e.firstPlayer || 0,
        playedTypeList: (0, i.Z)(e.playedTypeList || []),
        level: 0,
        playingTeam: 0,
        heartLevelCardId: 0,
        phase: "play",
        tributers: [],
        tributeReceivers: [],
        resistInfo: [],
        rankList: [],
        playerCardLists: [],
        playerRestCardCounts: [],
        trickOwner: 0,
        lastCards: [],
        lastInterp: 0,
        lastSegmentPlayer: 0,
        trickActions: [],
        canPlayAnyCards: !1,
        isRoundFinish: !1,
        roundResult: null
      });
    },
    P = function (e) {
      for (var t = Math.max(2, Math.min(14, e.team13Level || 2)), r = Math.max(2, Math.min(14, e.team24Level || 2)), n = 4 === e.lastRankList.length ? (0, i.Z)(e.lastRankList) : [], a = new Array(108).fill(0), l = (0, u.T)(new Array(108).fill(0).map(function (e, t) {
          return t;
        })), o = 0; o < 4; o++) for (var c = 0; c < 27; c++) a[l[27 * o + c]] = o + 1;
      var d = j(n).tributers,
        h = {
          rule: 2,
          state: 0,
          cardPositionList: a,
          playedCardList: [],
          v: s.dW,
          team13Level: t,
          team24Level: r,
          lastRankList: n,
          tributeCardList: [],
          returnCardList: [],
          firstPlayer: 0,
          playedTypeList: [],
          level: 0,
          playingTeam: 0,
          heartLevelCardId: 0,
          phase: "play",
          tributers: [],
          tributeReceivers: [],
          resistInfo: [],
          rankList: [],
          playerCardLists: [],
          playerRestCardCounts: [],
          trickOwner: 0,
          lastCards: [],
          lastInterp: 0,
          lastSegmentPlayer: 0,
          trickActions: [],
          canPlayAnyCards: !1,
          isRoundFinish: !1,
          roundResult: null
        };
      if (d.length) {
        var f = d.map(function (e) {
          return t = h.cardPositionList.map(function (t, r) {
            return (7 & t) === e ? r + 1 : -1;
          }).filter(function (e) {
            return e > -1;
          }), t.filter(function (e) {
            return 53 === (0, s.ZG)(e);
          }).length;
          var t;
        });
        (1 === d.length ? f[0] >= 2 : f[0] + f[1] >= 2) ? (h.firstPlayer = n[0], h.state = h.firstPlayer) : (h.tributeCardList = new Array(d.length).fill(0), h.returnCardList = new Array(d.length).fill(0));
      } else h.firstPlayer = (0, u.M)(4) + 1, h.state = h.firstPlayer;
      return C(h);
    },
    N = function (e, t) {
      var r = l.w.decode(t);
      return w(P({
        team13Level: r.team13Level,
        team24Level: r.team24Level,
        lastRankList: (0, i.Z)(r.lastRankList)
      }));
    },
    Z = function (e, t) {
      var r = e.playerCardLists[t].filter(function (t) {
          return !v(t, e.level);
        }),
        n = Math.max.apply(Math, (0, i.Z)(r.map(function (t) {
          return f(t, e.level);
        }))),
        a = r.filter(function (t) {
          return f(t, e.level) === n;
        });
      return a.length ? a : (0, i.Z)(e.playerCardLists[t]);
    },
    R = function (e, t) {
      var r = e.playerCardLists[t].filter(function (t) {
        var r = h(t);
        return r <= 10 && r !== e.level;
      });
      if (r.length) return r;
      var n = e.playerCardLists[t].filter(function (t) {
          return h(t) !== e.level;
        }),
        i = y(n, e.level),
        a = i.length ? f(i[i.length - 1], e.level) : 0;
      return n.filter(function (t) {
        return f(t, e.level) === a;
      });
    },
    T = function (e, t) {
      var r = e.tributers.indexOf(t);
      return "tribute" === e.phase && r > -1 && !e.tributeCardList[r];
    },
    A = function (e, t, r) {
      var n = b(e),
        i = n.tributers.indexOf(t);
      n.tributeCardList[i] = r;
      var a = j(n.lastRankList).receivers;
      if (1 === a.length) n.cardPositionList[r - 1] = a[0];else {
        var s = f(r, n.level),
          l = 1 - i;
        if (n.tributeCardList[l]) {
          var u = n.cardPositionList.filter(function (e) {
            return (7 & e) === a[0];
          }).length;
          n.cardPositionList[r - 1] = u <= 27 ? a[0] : a[1];
        } else {
          var o = n.tributers[l],
            c = Z(n, o),
            d = c.length ? f(c[0], n.level) : 0,
            h = s !== d ? s > d : function (e) {
              return (e + 2) % 4 + 1;
            }(t) === a[0];
          n.cardPositionList[r - 1] = h ? a[0] : a[1];
        }
      }
      return C(n);
    },
    O = function (e, t) {
      var r = e.tributeReceivers.indexOf(t);
      return "return" === e.phase && r > -1 && !e.returnCardList[r];
    },
    I = function (e, t, r) {
      var n = b(e),
        i = n.tributeReceivers.indexOf(t);
      if (n.returnCardList[i] = r, n.cardPositionList[r - 1] = n.tributers[i], n.returnCardList.every(function (e) {
        return e;
      })) {
        if (1 === n.tributers.length) n.firstPlayer = n.tributers[0];else {
          var a = f(n.tributeCardList[0], n.level),
            s = f(n.tributeCardList[1], n.level);
          n.firstPlayer = a === s ? n.lastRankList[0] % 4 + 1 : n.tributers[a > s ? 0 : 1];
        }
        n.state = n.firstPlayer;
      }
      return C(n);
    },
    F = function (e, t) {
      return "play" === e.phase && e.state === t && !e.canPlayAnyCards;
    },
    W = function (e, t) {
      var r = b(e);
      return r.playedCardList = r.playedCardList.concat([0]), r.playedTypeList = r.playedTypeList.concat([0]), r.state = g(r.playedCardList, r.firstPlayer, r.playedTypeList).currentPlayer, C(r);
    },
    S = function (e, t, r) {
      return "play" === e.phase && e.state === t && function (e, t, r) {
        return !!L(e, t, r);
      }(r, e.lastInterp, e.level);
    },
    D = function (e, t, r, n) {
      var a = b(e),
        s = n || L(r, a.lastInterp, a.level);
      r.forEach(function (e) {
        a.cardPositionList[e - 1] = 0;
      }), a.playedCardList = a.playedCardList.concat([0].concat((0, i.Z)(r))), a.playedTypeList = a.playedTypeList.concat([s]);
      var l = g(a.playedCardList, a.firstPlayer, a.playedTypeList);
      return l.rankList.length >= 3 || l.rankList.length >= 2 && o(l.rankList[0], l.rankList[1]) ? a.state = 8 | l.rankList[0] : a.state = l.currentPlayer, C(a);
    },
    M = function (e, t) {
      return "play" === e.phase && e.lastSegmentPlayer === t && e.playerRestCardCounts[t] > 0;
    },
    E = function (e, t) {
      for (var r = b(e), n = -1, i = r.playedCardList.length - 1; i >= 0; i--) if (!r.playedCardList[i]) {
        n = i;
        break;
      }
      return r.playedCardList.slice(n + 1).forEach(function (e) {
        r.cardPositionList[e - 1] = t;
      }), r.playedCardList = r.playedCardList.slice(0, n), r.playedTypeList = r.playedTypeList.slice(0, -1), r.state = g(r.playedCardList, r.firstPlayer, r.playedTypeList).currentPlayer, C(r);
    },
    G = function (e) {
      return e.isRoundFinish && null !== e.roundResult && !e.roundResult.isMatchOver;
    },
    B = function (e) {
      var t = e.roundResult;
      return P({
        team13Level: t.newTeam13Level,
        team24Level: t.newTeam24Level,
        lastRankList: t.fullRankList
      });
    };
},
7707: function (r, t, e) {
  e.r(t), e.d(t, {
    default: function () {
      return S;
    }
  });
  var n = e(7313),
    s = e(5982),
    i = e(4595),
    a = e(3953),
    l = e(6435),
    o = e(8410),
    c = e(6417),
    u = {
      fontSize: 38
    },
    d = {
      fontSize: 20
    },
    f = {
      11: "\ud83d\udeab",
      12: "\ud83d\udd04",
      14: "\ud83c\udf08",
      13: "+2",
      15: "+4",
      16: "?"
    },
    h = n.memo(function (r) {
      var t = r.style;
      return (0, c.jsxs)("svg", {
        viewBox: "0 0 61 108",
        className: "uno-svg-bg",
        style: t,
        children: [(0, c.jsx)("rect", {
          x: "0",
          y: "0",
          width: "30.5",
          height: "54",
          fill: "#ffde00"
        }), (0, c.jsx)("rect", {
          x: "0",
          y: "54",
          width: "30.5",
          height: "54",
          fill: "#07c160"
        }), (0, c.jsx)("rect", {
          x: "30.5",
          y: "0",
          width: "30.5",
          height: "54",
          fill: "#fc5554"
        }), (0, c.jsx)("rect", {
          x: "30.5",
          y: "54",
          width: "30.5",
          height: "54",
          fill: "#4fb9fc"
        })]
      });
    }, function () {
      return !0;
    }),
    p = n.memo(function () {
      return (0, c.jsxs)("svg", {
        viewBox: "0 0 61 108",
        className: "uno-svg-plus4-bg",
        children: [(0, c.jsx)("rect", {
          x: "20",
          y: "52",
          width: "22",
          height: "40",
          strokeWidth: "1",
          stroke: "#000",
          fill: "#000"
        }), (0, c.jsx)("rect", {
          x: "20",
          y: "52",
          width: "20",
          height: "38",
          strokeWidth: "1",
          stroke: "#fff",
          fill: "#4fb9fc"
        }), (0, c.jsx)("rect", {
          x: "34",
          y: "30",
          width: "22",
          height: "40",
          strokeWidth: "1",
          stroke: "#000",
          fill: "#000"
        }), (0, c.jsx)("rect", {
          x: "34",
          y: "30",
          width: "20",
          height: "38",
          strokeWidth: "1",
          stroke: "#fff",
          fill: "#fc5554"
        }), (0, c.jsx)("rect", {
          x: "19",
          y: "18",
          width: "22",
          height: "40",
          strokeWidth: "1",
          stroke: "#000",
          fill: "#000"
        }), (0, c.jsx)("rect", {
          x: "19",
          y: "18",
          width: "20",
          height: "38",
          strokeWidth: "1",
          stroke: "#fff",
          fill: "#07c160"
        }), (0, c.jsx)("rect", {
          x: "8",
          y: "38",
          width: "22",
          height: "40",
          strokeWidth: "1",
          stroke: "#000",
          fill: "#000"
        }), (0, c.jsx)("rect", {
          x: "8",
          y: "38",
          width: "20",
          height: "38",
          strokeWidth: "1",
          stroke: "#fff",
          fill: "#ffde00"
        })]
      });
    }, function () {
      return !0;
    });
  var m = function (r) {
    var t = r.id,
      e = r.style,
      n = r.onClick,
      s = void 0 === t,
      i = s ? 5 : Math.floor(t / 25),
      a = s ? 16 : (0, l.Vz)(t),
      m = [o.LI.DRAW2, o.LI.WILD_DRAW4].indexOf(a) >= 0,
      x = [o.LI.SKIP, o.LI.REVERSE, o.LI.WILD].indexOf(a) >= 0,
      y = a < 10 ? a : f[a];
    return (0, c.jsx)("div", {
      className: "uno absolute p-1.5 bg-white rounded-xl",
      style: e,
      onClick: n,
      children: (0, c.jsxs)("div", {
        className: "uno-c".concat(i, " h-full rounded-md"),
        children: [a === o.LI.WILD ? (0, c.jsx)(h, {
          style: {
            transform: "rotate(30deg) scale(0.2)",
            left: -13,
            top: -32
          }
        }) : (0, c.jsx)("div", {
          className: x ? "uno-emoji" : "uno-number",
          style: m ? d : void 0,
          children: y
        }), (0, c.jsx)("div", {
          className: "uno-bg"
        }), a === o.LI.WILD ? (0, c.jsx)(h, {}) : a === o.LI.WILD_DRAW4 ? (0, c.jsx)(p, {}) : (0, c.jsx)("div", {
          className: x ? "uno-big-emoji" : "uno-big-number",
          style: m ? u : void 0,
          children: y
        })]
      }),
      role: "button",
      tabIndex: 0,
      onKeyDown: function (event) {
        if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.click();
        }
      }
    });
  };
  function x(r) {
    var t = r.id,
      e = r.large,
      n = r.className;
    return (0, c.jsx)("div", {
      className: n,
      style: {
        width: e ? 34 : 26,
        height: e ? 53 : 40
      },
      children: (0, c.jsx)(m, {
        id: t,
        style: {
          transform: e ? "scale(0.4)" : "scale(0.3)"
        }
      })
    });
  }
  var y = n.memo(x),
    v = e(885),
    I = e(1413);
  var L = function (r) {
      var t = r.ids,
        e = r.height,
        s = r.className,
        i = r.selected,
        a = r.setSelected,
        l = r.style;
      (0, n.useEffect)(function () {
        a(null);
      }, [t.length]);
      var o = 41 * e / 132,
        u = 58 * e / 132;
      return (0, c.jsx)("div", {
        className: "uno-list ".concat(s),
        style: (0, I.Z)({
          height: e + o
        }, l),
        children: t.map(function (r, t) {
          return (0, c.jsx)(m, {
            id: r,
            style: {
              left: t * u,
              top: i === r ? 0 : o,
              transform: "scale(".concat(e / 132, ")")
            },
            onClick: function () {
              a(function (t) {
                return t === r ? null : r;
              });
            }
          }, r);
        })
      });
    },
    j = e(6350);
  var C = function (r) {
      var t = r.disabledText,
        e = r.onClick,
        n = r.children,
        s = r.primary,
        a = r.className,
        l = !1 !== t,
        o = "string" === typeof t ? t : "";
      return (0, c.jsxs)("div", {
        className: "relative",
        children: [(0, c.jsx)("div", {
          className: "uno-disabled-reason absolute text-sm",
          children: o
        }, new Date().getTime()), (0, c.jsx)(i.Z, {
          disabled: l,
          onClick: e,
          primary: s,
          className: a,
          children: n
        })]
      });
    },
    D = e(3366);
  var N = function (r) {
      var t = r.room,
        e = r.view,
        a = r.version,
        u = r.send,
        d = e.currentColor,
        f = e.currentNumber,
        h = e.currentPlus,
        p = e.isLeadCard,
        m = e.topCard,
        x = (0, n.useState)(null),
        y = (0, v.Z)(x, 2),
        I = y[0],
        N = y[1],
        g = (0, n.useState)(0),
        w = (0, v.Z)(g, 2),
        W = w[0],
        A = w[1],
        R = t.position - 1,
        S = t.position === t.owner,
        E = e.playerCards[R],
        O = e.isStart && !e.isEnd && e.waitFor === R,
        k = (0, n.useMemo)(function () {
          if (!(e.isAllowJumpIn && !O) || !e.isStart) return -1;
          var r = (0, l.e3)(m),
            t = e.playerCards[R].findIndex(function (t) {
              return (0, l.e3)(t) === r;
            });
          return t >= 0 ? e.playerCards[R][t] : -1;
        }, [a]),
        P = function (r) {
          u(s.Z.PlayerUpdateGameData, {
            data: j.N.encode(r).finish()
          });
        };
      (0, n.useEffect)(function () {
        A(0), k >= 0 ? N(k) : e.isDrawThink && O && e.playerCards[R].includes(e.lastOpInfo.opCard) && N(e.lastOpInfo.opCard);
      }, [k, a]);
      var T = (0, n.useMemo)(function () {
          if (null === I) return !0;
          if (!O) return !0;
          var r = (0, l.Vz)(I);
          if (p) {
            if (f === o.LI.DRAW2) return "\u5f15\u724c\u662f+2\uff0c\u5fc5\u987b\u4e0d\u51fa(\u64782\u5f20)";
            if (f === o.LI.WILD_DRAW4) return "\u5f15\u724c\u662f+4\uff0c\u5fc5\u987b\u4e0d\u51fa(\u64784\u5f20)";
            if (f === o.LI.SKIP) return "\u5f15\u724c\u662f".concat(l.uj[o.LI.SKIP], "\uff0c\u5fc5\u987b\u4e0d\u51fa");
          }
          if (e.isDrawThink && I !== e.lastOpInfo.opCard) return "\u53ea\u80fd\u51fa\u521a\u6478\u7684\u724c";
          if (h) {
            if (f === o.LI.DRAW2) {
              if (r !== o.LI.DRAW2 && r !== o.LI.WILD_DRAW4) return "\u53ea\u80fd\u7528+2\u6216+4\u53e0\u52a0";
            } else if (r !== f) return "\u53ea\u80fd\u7528+4\u53e0\u52a0";
            return !1;
          }
          return !(r > o.LI.DRAW2) && d !== o.O1.ANY && Math.floor(I / 25) !== d && (f > o.LI.DRAW2 ? "\u53ea\u80fd\u51fa".concat(l.SV[d]) : r !== f && "\u53ea\u80fd\u51fa".concat(l.SV[d], "\u6216").concat(l.uj[f]));
        }, [a, I]),
        b = !!W || 2 !== E.length;
      return (0, c.jsxs)("div", {
        children: [(0, l.dY)(e) < 2 || e.playerFinish[R] ? (0, c.jsxs)("div", {
          className: "text-center text-xl px-2",
          children: [(0, c.jsx)("div", {
            children: e.playerFinish[R] ? "\ud83c\udf89 \u606d\u559c\u4f60\u80dc\u5229\uff0c\u7b2c".concat(e.playerFinish[R], "\u540d\uff01") : "\u8fd9\u5c40\u8fd0\u6c14\u4e0d\u592a\u597d\u5662\uff0c\u4e0b\u6b21\u52a0\u6cb9\uff01"
          }), (0, c.jsx)(i.Z, {
            className: "mt-2",
            small: !0,
            onClick: function () {
              return (0, D.Z)(S ? "\u5982\u679c\u5e0c\u671b\u91cd\u5f00\u4e00\u5c40\uff0c\u4f60\u4f5c\u4e3a\u623f\u4e3b\uff0c\u9700\u8981\u70b9\u53f3\u4e0a\u89d2\u7ed3\u675f\u6e38\u620f\uff0c\u518d\u91cd\u65b0\u5f00\u59cb\u3002" : "\u5982\u679c\u5e0c\u671b\u91cd\u5f00\u4e00\u5c40\uff0c\u8bf7\u8ba9\u623f\u4e3b\u64cd\u4f5c\uff0c\u5148\u7ed3\u675f\u6e38\u620f\uff0c\u518d\u91cd\u65b0\u5f00\u59cb\u3002");
            },
            children: "\u5982\u4f55\u91cd\u5f00"
          })]
        }) : (0, c.jsx)("div", {
          className: "flex flex-wrap justify-center items-center",
          style: {
            minHeight: 48
          },
          children: e.isStart ? O ? (0, c.jsxs)(c.Fragment, {
            children: [(0, c.jsx)(i.Z, {
              className: "mx-2 mt-2",
              onClick: function () {
                return P((0, l.qA)((0, l.Ih)(e)));
              },
              children: p && f === o.LI.SKIP || e.isDrawThink ? "\u4e0d\u51fa" : "\u4e0d\u51fa(\u6478".concat(h || 1, "\u5f20)")
            }), (0, c.jsx)(i.Z, {
              className: "mx-2 mt-2",
              disabled: b,
              onClick: function () {
                return A(1);
              },
              children: "UNO"
            }), !T && null !== I && (0, l.Vz)(I) > o.LI.DRAW2 ? (0, c.jsx)(c.Fragment, {
              children: l.SV.map(function (r, t) {
                return (0, c.jsx)(i.Z, {
                  small: !0,
                  className: "mx-2 mt-2",
                  onClick: function () {
                    return P((0, l.qA)((0, l.yS)(e, I, t, 0, W)));
                  },
                  children: "\u51fa".concat(r)
                }, t);
              })
            }) : (0, c.jsx)(C, {
              primary: !0,
              disabledText: T,
              className: "mx-2 mt-2",
              onClick: function () {
                return P((0, l.qA)((0, l.yS)(e, I, 0, 0, W)));
              },
              children: "\u51fa\u724c"
            })]
          }) : k >= 0 && (null !== I && (0, l.Vz)(I) > o.LI.DRAW2 && (0, l.e3)(I) === (0, l.e3)(k) ? (0, c.jsxs)(c.Fragment, {
            children: [(0, c.jsx)(i.Z, {
              className: "mx-2 mt-2",
              disabled: b,
              onClick: function () {
                return A(1);
              },
              children: "UNO"
            }), l.SV.map(function (r, t) {
              return (0, c.jsx)(i.Z, {
                small: !0,
                className: "mx-2 mt-2",
                onClick: function () {
                  return P((0, l.qA)((0, l.yS)(e, I, t, R + 1, W)));
                },
                children: "\u62a2\u51fa".concat(r)
              }, t);
            }), (0, l.Vz)(I) === o.LI.WILD_DRAW4 && (0, c.jsx)("div", {
              className: "text-sm mt-2",
              children: "\u4e4b\u524d\u7d2f\u52a0\u724c\u6570\u4f1a\u6e05\u96f6"
            })]
          }) : (0, c.jsxs)(c.Fragment, {
            children: [(0, c.jsx)(i.Z, {
              className: "mx-2 mt-2",
              disabled: b,
              onClick: function () {
                return A(1);
              },
              children: "UNO"
            }), (0, c.jsx)(i.Z, {
              primary: !0,
              disabled: null === I || (0, l.e3)(I) !== (0, l.e3)(k),
              className: "mx-2 mt-2",
              onClick: function () {
                return P((0, l.qA)((0, l.yS)(e, I, 0, R + 1, W)));
              },
              children: "\u62a2\u51fa\u76f8\u540c\u724c"
            }), null !== I && (0, l.Vz)(I) === o.LI.DRAW2 && (0, l.e3)(I) === (0, l.e3)(k) && (0, c.jsx)("div", {
              className: "text-sm mt-2",
              children: "\u4e4b\u524d\u7d2f\u52a0\u724c\u6570\u4f1a\u6e05\u96f6"
            })]
          })) : (0, c.jsx)(i.Z, {
            primary: !0,
            className: "mx-2 mt-2",
            onClick: function () {
              return P((0, l.qA)((0, l.Lk)(e, R)));
            },
            children: "\u6211\u5148\u51fa\u724c"
          })
        }), (0, c.jsx)(L, {
          height: 70,
          ids: E,
          selected: I,
          setSelected: N,
          className: "mt-3 mx-auto",
          style: {
            maxWidth: "100%",
            width: Math.ceil(70 * (58 * E.length + 40) / 132)
          }
        })]
      });
    },
    g = e(7992),
    w = e(5385),
    W = {
      height: 84
    };
  var A = function (r) {
      var t = r.room,
        e = r.view,
        n = r.position,
        a = r.opposite,
        u = r.send,
        d = n - 1,
        f = e.isStart && !e.isEnd && e.waitFor === d,
        h = e.playerCards[d].length,
        p = e.lastOpInfo.playerId === d && e.lastOpInfo.opType < o.VG.DRAW && 1 === h;
      return (0, c.jsxs)("div", {
        className: "flex mt-2",
        children: [(0, c.jsxs)("div", {
          className: a ? "order-2" : "",
          children: [(0, c.jsx)(g.ZP, {
            room: t,
            index: d,
            send: u,
            isTurn: f
          }), (0, c.jsxs)("div", {
            className: "text-center mt-1 text-xs",
            children: [p && !!e.lastOpInfo.isSaidUno && (0, c.jsx)("div", {
              children: "\ud83d\udce2UNO"
            }), !!t.position && t.position !== n && p && !e.lastOpInfo.isSaidUno && (0, c.jsx)(i.Z, {
              small: !0,
              primary: !0,
              onClick: function () {
                return u(s.Z.PlayerUpdateGameData, {
                  data: j.N.encode((0, l.qA)((0, l.o7)(e, t.position - 1))).finish()
                });
              },
              children: "\u4e3e\u62a5"
            }), e.lastOpInfo.opType === o.VG.REPORT && e.lastOpInfo.opCard === d && (0, c.jsx)("div", {
              children: "\ud83d\ude0e\u4e3e\u62a5!"
            })]
          })]
        }), (0, c.jsxs)("div", {
          className: "flex-grow flex items-center order-1 text-center",
          style: W,
          children: [(0, c.jsxs)("div", {
            className: "".concat(a ? "order-2" : "order-1").concat(e.playerFinish[d] ? " invisible" : ""),
            children: [(0, c.jsx)(y, {
              className: "mx-1.5 mt-4"
            }), (0, c.jsx)(w.Z, {
              n: h
            })]
          }), (0, c.jsx)("div", {
            className: "flex flex-col flex-grow ".concat(a ? "order-1" : "order-2"),
            children: (0, c.jsx)("div", {
              className: "text-3xl ".concat(a ? "ml-auto" : "mr-auto").concat(f ? " animate-bounce" : ""),
              children: f ? "\ud83e\udd14" : e.playerFinish[d] ? (0, c.jsxs)("div", {
                children: [(0, c.jsx)("div", {
                  children: "\ud83d\ude0e"
                }), e.playerFinish.filter(function (r) {
                  return r;
                }).length > 1 && (0, c.jsx)("div", {
                  className: "text-sm",
                  children: "\u7b2c".concat(e.playerFinish[d])
                })]
              }) : e.lastCard[n] === o.WT.Pass ? "\ud83d\ude2d" : e.lastCard[n] === o.WT.Empty ? null : (0, c.jsx)(y, {
                id: e.lastCard[n]
              })
            })
          })]
        })]
      });
    },
    R = {
      marginTop: 42
    };
  var S = function (r) {
    var t = r.room,
      e = r.game,
      n = r.send,
      u = undefined,
      d = r.view,
      f = !!t.position,
      h = d.currentD,
      p = d.topCard,
      x = d.currentColor,
      v = d.currentNumber,
      I = d.currentPlus;
    return (0, a.N)([]), (0, c.jsxs)(c.Fragment, {
      children: [t.owner === t.position && (0, c.jsx)("div", {
        className: "button-container",
        children: (0, c.jsx)("div", {
          className: "button-right",
          children: (0, c.jsx)(i.Z, {
            small: !0,
            onClick: function () {
              return (0, a.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return n(s.Z.OwnerExitGame);
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, c.jsxs)("div", {
        className: "flex justify-center items-center",
        children: [(0, c.jsxs)("div", {
          className: "flex items-center justify-center",
          children: ["\u8fd8\u5269", (0, c.jsx)(w.Z, {
            n: d.drawCards.length
          }), "\u5f20"]
        }), (0, c.jsx)(y, {
          className: "ml-2 mr-4"
        }), d.isStart ? (0, c.jsx)(y, {
          id: p,
          className: "mr-2"
        }) : (0, c.jsx)(y, {
          className: "mr-2 invisible"
        }), (0, c.jsxs)("div", {
          className: "flex items-center justify-center",
          children: ["\u5df2\u51fa", (0, c.jsx)(w.Z, {
            n: d.playedCards.length
          }), "\u5f20"]
        })]
      }), (0, c.jsxs)("div", {
        className: "flex justify-evenly items-center pt-2",
        children: [!!I && (0, c.jsxs)("div", {
          className: "flex items-center justify-center",
          children: ["\u5df2\u7d2f\u52a0", (0, c.jsx)(w.Z, {
            n: I
          }), "\u5f20"]
        }), (0, c.jsxs)("div", {
          children: ["\u5f53\u524d", !d.isStart || x === o.O1.ANY && v >= o.LI.WILD ? ":\u4efb\u610f" : x === o.O1.ANY ? l.uj[v] : v >= o.LI.WILD ? l.SV[x] : "".concat(l.SV[x], " ").concat(l.uj[v])]
        }), (0, c.jsxs)("div", {
          children: ["\u65b9\u5411", h ? "\u21aa\ufe0f" : "\u21a9\ufe0f"]
        })]
      }), (0, c.jsxs)("div", {
        className: "flex-grow flex justify-around mt-2 relative",
        children: [(0, c.jsx)("div", {
          className: "w-36 flex flex-col",
          children: new Array(Math.floor((t.playerList.length + 1) / 2)).fill(0).map(function (r, e) {
            return (0, c.jsx)(A, {
              position: e + 1,
              room: t,
              view: d,
              send: n
            }, e);
          })
        }), (0, c.jsx)("div", {
          className: "w-36 flex flex-col",
          style: t.playerList.length % 2 ? R : void 0,
          children: new Array(Math.floor(t.playerList.length / 2)).fill(0).map(function (r, e) {
            return (0, c.jsx)(A, {
              position: t.playerList.length - e,
              room: t,
              view: d,
              opposite: !0,
              send: n
            }, e);
          })
        }), d.isStart && (0, c.jsx)("div", {
          className: "absolute uno-last-card".concat(h ? " uno-reverse" : "", " uno-color-").concat(x),
          children: (0, c.jsx)(m, {
            id: p,
            style: {
              transform: "scale(0.6)",
              filter: "drop-shadow(0px 0px 2px gray)"
            }
          })
        })]
      }), f && (0, c.jsx)(N, {
        send: n,
        room: t,
        view: d,
        version: e.version
      }), !f && (0, c.jsx)("div", {
        className: "text-center text-2xl mt-12",
        children: "\u89c2\u6218\u4e2d"
      })]
    });
  };
},
6435: function (r, t, e) {
  e.d(t, {
    Ih: function () {
      return L;
    },
    Lk: function () {
      return v;
    },
    Lq: function () {
      return c;
    },
    SV: function () {
      return a;
    },
    Vz: function () {
      return h;
    },
    dY: function () {
      return o;
    },
    e3: function () {
      return d;
    },
    my: function () {
      return p;
    },
    o7: function () {
      return C;
    },
    qA: function () {
      return m;
    },
    uj: function () {
      return l;
    },
    yS: function () {
      return j;
    }
  });
  var n = e(2982),
    s = e(8410),
    i = e(4420),
    a = ["\ud83d\udd34\u7ea2", "\ud83d\udfe1\u9ec4", "\ud83d\udfe2\u7eff", "\ud83d\udd35\u84dd"],
    l = ["0\ufe0f\u20e3", "1\ufe0f\u20e3", "2\ufe0f\u20e3", "3\ufe0f\u20e3", "4\ufe0f\u20e3", "5\ufe0f\u20e3", "6\ufe0f\u20e3", "7\ufe0f\u20e3", "8\ufe0f\u20e3", "9\ufe0f\u20e3", "\u4efb\u610f\u6570", "\ud83d\udeab", "\ud83d\udd04", "+2"];
  function o(r) {
    return r.playerFinish.filter(function (r) {
      return !r;
    }).length;
  }
  function c(r) {
    var t = new Array(r.playerList.length + 1).fill(s.WT.Empty);
    t[0] = 0;
    for (var e = new Array(108).fill(s.nX.TO_BE_DRAW), n = (0, i.T)(new Array(108).fill(0).map(function (r, t) {
        return t;
      })), a = 0; a < r.playerList.length; a++) for (var l = 0; l < 7; l++) e[n[7 * a + l]] = a + 1;
    return {
      state: 0,
      lastCard: t,
      cardList: e
    };
  }
  var u = [10, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 11, 11, 12, 12, 13, 13, 23, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 24, 24, 25, 25, 26, 26, 36, 27, 27, 28, 28, 29, 29, 30, 30, 31, 31, 32, 32, 33, 33, 34, 34, 35, 35, 37, 37, 38, 38, 39, 39, 49, 40, 40, 41, 41, 42, 42, 43, 43, 44, 44, 45, 45, 46, 46, 47, 47, 48, 48, 50, 50, 51, 51, 52, 52, 53, 53, 53, 53, 54, 54, 54, 54];
  function d(r) {
    return u[r];
  }
  var f = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, s.LI.SKIP, s.LI.REVERSE, s.LI.DRAW2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, s.LI.SKIP, s.LI.REVERSE, s.LI.DRAW2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, s.LI.SKIP, s.LI.REVERSE, s.LI.DRAW2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, s.LI.SKIP, s.LI.REVERSE, s.LI.DRAW2, s.LI.WILD, s.LI.WILD_DRAW4];
  function h(r) {
    var t = d(r);
    return f[t];
  }
  function p(r) {
    var t = r.state,
      e = r.lastCard,
      n = r.cardList,
      i = r.plus,
      a = r.lastOp,
      l = e.length - 1,
      o = 15 & t,
      c = o ? o - 1 : 0,
      u = e[0],
      d = e.slice(1),
      f = t >> 11 & 1,
      p = t >> 4 & 3,
      m = !!o,
      x = h(u),
      y = {
        lastCard: e,
        cardList: n,
        isStart: m,
        waitFor: c,
        stateColor: p,
        currentColor: m ? u < 100 ? Math.floor(u / 25) : f ? s.O1.ANY : p : s.O1.ANY,
        currentNumber: x,
        currentD: !(t >> 6 & 1),
        currentPlus: [s.LI.DRAW2, s.LI.WILD_DRAW4].includes(x) ? 2 * (i || t >> 7 & 15) : 0,
        isLeadCard: f,
        isAllowJumpIn: 1 - (t >> 12 & 1),
        isDrawThink: t >> 13 & 1,
        topCard: u,
        playerTopCard: d.map(function (r) {
          return r > s.WT.Empty ? s.WT.Empty : r;
        }),
        playerFinish: d.map(function (r) {
          return r > s.WT.Empty ? 128 - r : 0;
        }),
        isEnd: d.filter(function (r) {
          return r <= s.WT.Empty;
        }).length < 2,
        playerCards: new Array(l).fill(0).map(function () {
          return [];
        }),
        drawCards: [],
        playedCards: [],
        lastOpInfo: {
          playerId: 15 & a,
          opType: a >> 4 & 7,
          isSaidUno: a >> 7 & 1,
          opCard: a >> 8 & 127,
          isShuffle: a >> 15 & 1
        }
      };
    return n.forEach(function (r, t) {
      r ? r <= l ? y.playerCards[r - 1].push(t) : y.drawCards.push(t) : y.playedCards.push(t);
    }), y;
  }
  function m(r) {
    var t = r.lastCard,
      e = r.cardList,
      n = r.isStart,
      s = r.waitFor,
      i = r.stateColor,
      a = r.currentD,
      l = r.isLeadCard,
      o = r.isAllowJumpIn,
      c = r.isDrawThink,
      u = r.currentPlus,
      d = r.lastOpInfo,
      f = 0;
    return n && (f = s + 1, f |= i << 4, f |= a ? 0 : 64, f |= (u >> 1 & 15) << 7, f |= l ? 2048 : 0, f |= o ? 0 : 4096, f |= c ? 8192 : 0), {
      state: f,
      lastCard: t,
      cardList: e,
      plus: u >> 1,
      lastOp: d.playerId | (7 & d.opType) << 4 | (1 & d.isSaidUno) << 7 | (127 & d.opCard) << 8 | (1 & d.isShuffle) << 15
    };
  }
  function x(r, t, e) {
    var n = e ? e - 1 : r.waitFor,
      s = r.playerCards.length,
      i = 0,
      a = n;
    if (!t) return a;
    for (var l = s * t + 2, o = 1; o <= l && (a = (r.currentD ? n + o : n + s - o) % s, r.playerFinish[a] || (i += 1) !== t); o++);
    return a;
  }
  function y(r) {
    return JSON.parse(JSON.stringify(r));
  }
  function v(r, t) {
    var e = y(r);
    e.isStart = !0;
    var n = e.drawCards,
      a = n[(0, i.M)(n.length)];
    e.lastCard[0] = void 0 === a ? 101 : a, void 0 !== a && (e.cardList[a] = s.nX.PLAYED), e.waitFor = t, e.isLeadCard = 1, e.isAllowJumpIn = 0, e.isDrawThink = 0, e.currentPlus = 0;
    var l = void 0 === a ? s.LI.WILD : h(a);
    return l === s.LI.REVERSE ? e.currentD = !e.currentD : l === s.LI.DRAW2 ? e.currentPlus = 2 : l === s.LI.WILD_DRAW4 && (e.currentPlus = 4), e;
  }
  function I(r, t, e) {
    var a = e + 1,
      l = r.drawCards.length,
      o = t,
      c = [];
    l < o && (c.push.apply(c, (0, n.Z)(r.drawCards)), r.cardList = r.cardList.map(function (r) {
      return r === s.nX.TO_BE_DRAW ? a : r === s.nX.PLAYED ? s.nX.TO_BE_DRAW : r;
    }), o -= l, r.lastOpInfo.isShuffle = 1);
    for (var u = (0, i.T)(r.cardList.map(function (r, t) {
        return r === s.nX.TO_BE_DRAW ? t : -1;
      }).filter(function (r) {
        return r >= 0;
      })), d = 0; d < o && d < u.length; d++) r.cardList[u[d]] = a, c.push(u[d]);
    return c.length || (r.lastOpInfo.isShuffle = 0), c;
  }
  function L(r) {
    var t = y(r),
      e = r.waitFor,
      n = e + 1;
    t.lastCard[n] = s.WT.Pass;
    var i = r.isLeadCard && r.currentNumber === s.LI.SKIP ? 0 : r.currentPlus || 1;
    1 === i && r.isDrawThink && (i = 0), t.lastOpInfo = {
      playerId: e,
      opType: s.VG.DRAW,
      isSaidUno: 0,
      opCard: 0,
      isShuffle: 0
    }, t.waitFor = x(r, 1, 0), t.isLeadCard = 0, t.isAllowJumpIn = 0, t.isDrawThink = 0, t.currentPlus = 0;
    var a = I(t, i, e);
    return 1 === i && 1 === a.length && 1 === r.playerCards[e].length && (t.lastOpInfo.opCard = a[0], t.isDrawThink = 1, t.waitFor = e), t;
  }
  function j(r, t, e, n, i) {
    var a = y(r),
      l = n ? n - 1 : r.waitFor,
      o = l + 1,
      c = r.playerCards.length,
      u = r.playerFinish.filter(function (r) {
        return r;
      }).length,
      d = c - u;
    if (!r.playerCards[l].includes(t)) return r;
    a.lastCard[0] = t;
    var f = 0;
    1 === r.playerCards[l].length ? (a.lastCard[o] = 127 - u, u > c - 3 && (f = 1)) : a.lastCard[o] = t, a.cardList[t] = s.nX.PLAYED;
    var p = h(t);
    if (f || p === s.LI.REVERSE || p === s.LI.SKIP || (a.waitFor = x(r, 1, n)), a.stateColor = e, a.isLeadCard = 0, a.isAllowJumpIn = 1, a.isDrawThink = 0, p === s.LI.DRAW2) a.currentPlus = n ? 2 : a.currentPlus + 2;else if (p === s.LI.WILD_DRAW4) a.currentPlus = n ? 4 : a.currentPlus + 4;else if (p === s.LI.REVERSE) {
      if (a.currentD = !a.currentD, !f) if (2 === d) {
        a.waitFor = l;
        var m = x(a, 1, n);
        m !== l && (a.lastCard[1 + m] = s.WT.Pass);
      } else a.waitFor = x(a, 1, n);
    } else if (p === s.LI.SKIP && !f) {
      a.waitFor = x(r, 2, n);
      var v = x(r, 1, n);
      v !== l && (a.lastCard[1 + v] = s.WT.Pass);
    }
    if (n && !f) for (var I = 0; I < c; I++) {
      var L = x(r, I, 0);
      if (L === l) break;
      a.lastCard[1 + L] = s.WT.Pass;
    }
    return a.lastOpInfo = {
      playerId: l,
      opType: n ? s.VG.JUMP_IN : s.VG.PLAY,
      isSaidUno: i,
      opCard: r.topCard,
      isShuffle: 0
    }, a;
  }
  function C(r, t) {
    var e = y(r),
      n = e.lastOpInfo.playerId;
    return e.lastOpInfo.opType = s.VG.REPORT, e.lastOpInfo.opCard = t, I(e, 2, n), e.lastCard[1 + n] = s.WT.Pass, e;
  }
},
8410: function (r, t, e) {
  var n, s, i, a, l;
  e.d(t, {
    LI: function () {
      return n;
    },
    O1: function () {
      return i;
    },
    VG: function () {
      return a;
    },
    WT: function () {
      return l;
    },
    nX: function () {
      return s;
    }
  }), function (r) {
    r[r.SKIP = 11] = "SKIP", r[r.REVERSE = 12] = "REVERSE", r[r.DRAW2 = 13] = "DRAW2", r[r.WILD = 14] = "WILD", r[r.WILD_DRAW4 = 15] = "WILD_DRAW4";
  }(n || (n = {})), function (r) {
    r[r.PLAYED = 0] = "PLAYED", r[r.TO_BE_DRAW = 15] = "TO_BE_DRAW";
  }(s || (s = {})), function (r) {
    r[r.ANY = 4] = "ANY";
  }(i || (i = {})), function (r) {
    r[r.NONE = 0] = "NONE", r[r.PLAY = 1] = "PLAY", r[r.JUMP_IN = 2] = "JUMP_IN", r[r.DRAW = 3] = "DRAW", r[r.REPORT = 4] = "REPORT";
  }(a || (a = {})), function (r) {
    r[r.Empty = 114] = "Empty", r[r.Pass = 113] = "Pass";
  }(l || (l = {}));
},
6350: function (r, t, e) {
  e.d(t, {
    N: function () {
      return o;
    }
  });
  var n = e(7710),
    s = n.Reader,
    i = n.Writer,
    a = n.util,
    l = n.roots.default || (n.roots.default = {}),
    o = l.UNOGameData = function () {
      function r(r) {
        if (this.lastCard = [], this.cardList = [], r) for (var t = Object.keys(r), e = 0; e < t.length; ++e) null != r[t[e]] && (this[t[e]] = r[t[e]]);
      }
      return r.prototype.state = 0, r.prototype.lastCard = a.emptyArray, r.prototype.cardList = a.emptyArray, r.prototype.plus = 0, r.prototype.lastOp = 0, r.encode = function (r, t) {
        if (t || (t = i.create()), null != r.state && Object.hasOwnProperty.call(r, "state") && t.uint32(8).uint32(r.state), null != r.lastCard && r.lastCard.length) {
          t.uint32(18).fork();
          for (var e = 0; e < r.lastCard.length; ++e) t.uint32(r.lastCard[e]);
          t.ldelim();
        }
        if (null != r.cardList && r.cardList.length) {
          t.uint32(26).fork();
          for (e = 0; e < r.cardList.length; ++e) t.uint32(r.cardList[e]);
          t.ldelim();
        }
        return null != r.plus && Object.hasOwnProperty.call(r, "plus") && t.uint32(32).uint32(r.plus), null != r.lastOp && Object.hasOwnProperty.call(r, "lastOp") && t.uint32(40).uint32(r.lastOp), t;
      }, r.decode = function (r, t) {
        r instanceof s || (r = s.create(r));
        for (var e = void 0 === t ? r.len : r.pos + t, n = new l.UNOGameData(); r.pos < e;) {
          var i = r.uint32();
          switch (i >>> 3) {
            case 1:
              n.state = r.uint32();
              break;
            case 2:
              if (n.lastCard && n.lastCard.length || (n.lastCard = []), 2 === (7 & i)) for (var a = r.uint32() + r.pos; r.pos < a;) n.lastCard.push(r.uint32());else n.lastCard.push(r.uint32());
              break;
            case 3:
              if (n.cardList && n.cardList.length || (n.cardList = []), 2 === (7 & i)) for (a = r.uint32() + r.pos; r.pos < a;) n.cardList.push(r.uint32());else n.cardList.push(r.uint32());
              break;
            case 4:
              n.plus = r.uint32();
              break;
            case 5:
              n.lastOp = r.uint32();
              break;
            default:
              r.skipType(7 & i);
          }
        }
        return n;
      }, r;
    }();
},
5385: function (e, t, n) {
  "use strict";

  var i = n(7313),
    a = n(6417);
  t.Z = function (e) {
    var t = e.n,
      n = e.className,
      r = (0, i.useRef)(t),
      o = r.current,
      s = o !== t;
    return r.current = t, (0, a.jsxs)("div", {
      className: "relative font-mono text-sm text-center my-2 ".concat(n || ""),
      children: [(0, a.jsxs)("div", {
        className: "relative overflow-hidden",
        children: [s && (0, a.jsx)("div", {
          className: "game-last-".concat(o > t ? "top" : "bottom", " absolute w-full"),
          children: o
        }), (0, a.jsx)("div", {
          className: "min-w-[18px]",
          children: t
        }), o.toString().length - t.toString().length > 0 && (0, a.jsx)("div", {
          "aria-hidden": "true",
          className: "h-0 opacity-0",
          children: o
        })]
      }), s && (0, a.jsxs)("div", {
        className: "absolute text-xs z-10 w-full animate-pulse ".concat(o < t ? "text-red-500 bottom-3.5" : "text-green-500 top-3.5"),
        children: [t > o && "+", t - o]
      })]
    }, t);
  };
},
6749: function (e, r, n) {
  n.r(r), n.d(r, {
    default: function () {
      return be;
    }
  });
  var t = n(7313),
    a = n(5982),
    l = n(4595),
    s = n(3953),
    i = n(885),
    o = n(2982),
    c = n(8655),
    _ = n(7992),
    u = n(8467),
    d = n(8280),
    E = n(1983),
    S = n(6417),
    f = {
      minWidth: "20px"
    };
  var N = function (e) {
      var r,
        n = e.id,
        a = e.pid,
        l = e.className,
        s = e.onClick,
        _ = e.style,
        N = e.color,
        I = e.roleName,
        A = e.count,
        p = e.blood,
        P = e.equip,
        y = e.judge,
        L = e.isConn,
        v = e.isBack,
        h = e.isDrunk,
        O = (0, t.useState)(0),
        D = (0, i.Z)(O, 2),
        T = D[0],
        U = D[1],
        C = "?" === I,
        H = (0, i.Z)(u.V6[n], 6),
        g = H[0],
        R = H[1],
        k = (H[2], H[3]),
        G = H[4],
        m = H[5],
        x = "\u4E3B" === I || "\u5927\u5FE0" === I,
        M = x ? k + 1 : k,
        w = x && m ? [].concat((0, o.Z)(G), [m]) : G;
      if (p <= 0) r = "#000000";else if (p >= M) r = "#ff0000";else {
        var Z = p / M * 100;
        r = "linear-gradient(to bottom, #000000 ".concat(100 - Z, "%, #ff0000 ").concat(100 - Z, "%)");
      }
      return (0, S.jsxs)("div", {
        id: "sgs-hero-".concat(a),
        className: l,
        style: _,
        children: [(0, S.jsxs)("div", {
          className: "sgs-hero relative flex flex-col text-center border border-gray-300 bg-white rounded text-black cursor-pointer",
          onClick: s,
          children: [(0, S.jsx)("div", {
            className: "sgs-hero-head pointer-events-none",
            children: g
          }), (0, S.jsxs)("div", {
            className: "flex text-left text-sm",
            children: [(0, S.jsxs)("div", {
              className: "flex items-center",
              children: [(0, S.jsx)("div", {
                className: "rounded-full leading-5 text-center text-xs ".concat(["bg-blue-300", "bg-red-300", "bg-purple-300", "bg-orange-300"][N]),
                style: f,
                onClick: C ? function (e) {
                  e.stopPropagation(), U(T + 1 & 3);
                } : void 0,
                children: C ? "?\u53CD\u5FE0\u5185"[T] : I,
                role: "button",
                tabIndex: 0,
                onKeyDown: function (event) {
                  if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.click();
                  }
                }
              }), (0, S.jsx)("div", {
                children: g
              })]
            }), (0, S.jsx)("div", {
              className: "ml-auto",
              children: R ? "\u2640" : "\u2642"
            })]
          }), (0, S.jsx)("div", {
            children: w.map(function (e, r) {
              return (0, S.jsx)("div", {
                className: "text-xs border mt-0.5 opacity-60 bg-white",
                children: E.H[e][0]
              }, r);
            })
          }), (0, S.jsxs)("div", {
            className: "mt-auto flex justify-between text-xs",
            children: [(0, S.jsx)("div", {
              className: "border bg-blue-300 rounded w-5 leading-6",
              children: A
            }), (0, S.jsx)("div", {
              className: "border box-content rounded-full w-6 leading-6 text-white border-black font-bold",
              style: {
                background: r
              },
              children: p
            })]
          }), (0, S.jsx)("div", {
            className: "sgs-hero-equip font-bold",
            children: !!P && [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].map(function (e) {
              return P[e] && (0, S.jsxs)("div", {
                className: "flex justify-between",
                children: [(0, S.jsx)("div", {
                  children: "".concat(d.If[(0, d.fE)(P[e][0])]).concat(d.uR[(0, d.dg)(P[e][0])])
                }), (0, S.jsx)("div", {
                  children: e ? (0, d.s2)(P[e][1]) : (0, d.zd)(P[e][1])
                })]
              }, e);
            })
          })],
          role: "button",
          tabIndex: 0,
          onKeyDown: function (event) {
            if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.click();
            }
          }
        }), (0, S.jsxs)("div", {
          className: "flex text-xl flex-wrap",
          children: [L && (0, S.jsx)("div", {
            children: "\u94C1\u7D22\u8FDE\u73AF"
          }), h && (0, S.jsx)("div", {
            children: "\u9152"
          }), v && (0, S.jsx)("div", {
            className: "text-xs",
            children: "\u4E0B\u8F6E\u8DF3\u8FC7"
          }), y && y.map(function (e, r) {
            var n = (0, i.Z)(e, 2),
              t = (n[0], n[1]);
            return (0, S.jsx)("div", {
              children: (0, d.s2)(t)
            }, r);
          })]
        })]
      });
    },
    I = n(5051);
  var A = function (e) {
    var r = e.room,
      n = e.view,
      t = e.send,
      a = e.hisId,
      l = e.isHisTurn,
      s = e.selectedPlayerIds,
      i = e.onClick,
      o = e.hp,
      u = (0, I.eg)(n, r.position, a),
      d = (0, I.v0)(n, r.position, a),
      E = (0, S.jsxs)("div", {
        className: 0 === o ? "flex flex-col items-center" : "flex flex-col items-center justify-center",
        children: [(0, S.jsx)("div", {
          className: "m-2",
          children: (0, S.jsx)(_.ZP, {
            room: r,
            index: a,
            send: t,
            isTurn: l
          })
        }), n.whoseTurn === a && n.stage === c.PR.PLAY && (0, S.jsx)("div", {
          className: "text-sm animate-bounce",
          children: "\u6211\u7684\u56DE\u5408"
        })]
      }),
      f = companionBridge.heroCard ? (0, S.jsx)(companionBridge.heroCard, {
        ...{
          id: n.hero[a] || 0,
          pid: a,
          className: s.includes(a) ? "sgs-select" : "",
          color: d,
          roleName: u,
          count: n.playerHandCard[a].length,
          blood: n.playerBlood[a],
          equip: n.playerEquip[a],
          judge: n.playerJudge[a],
          isConn: !!n.playerConn[a],
          isBack: !!n.playerBack[a],
          isDrunk: n.isDrunk === c.Sd.DRUNK,
          onClick: i,
          style: n.alivePlayerIds.includes(a) ? void 0 : {
            filter: "grayscale(100%)"
          }
        },
        children: (0, S.jsx)(N, {
          id: n.hero[a] || 0,
          pid: a,
          className: s.includes(a) ? "sgs-select" : "",
          color: d,
          roleName: u,
          count: n.playerHandCard[a].length,
          blood: n.playerBlood[a],
          equip: n.playerEquip[a],
          judge: n.playerJudge[a],
          isConn: !!n.playerConn[a],
          isBack: !!n.playerBack[a],
          isDrunk: n.isDrunk === c.Sd.DRUNK,
          onClick: i,
          style: n.alivePlayerIds.includes(a) ? void 0 : {
            filter: "grayscale(100%)"
          }
        })
      }) : (0, S.jsx)(N, {
        id: n.hero[a] || 0,
        pid: a,
        className: s.includes(a) ? "sgs-select" : "",
        color: d,
        roleName: u,
        count: n.playerHandCard[a].length,
        blood: n.playerBlood[a],
        equip: n.playerEquip[a],
        judge: n.playerJudge[a],
        isConn: !!n.playerConn[a],
        isBack: !!n.playerBack[a],
        isDrunk: n.isDrunk === c.Sd.DRUNK,
        onClick: i,
        style: n.alivePlayerIds.includes(a) ? void 0 : {
          filter: "grayscale(100%)"
        }
      });
    return 0 === o ? (0, S.jsxs)("div", {
      className: "flex flex-col items-center justify-center",
      children: [E, f]
    }) : 1 === o ? (0, S.jsxs)("div", {
      className: "flex flex-row items-center justify-center",
      children: [E, f]
    }) : (0, S.jsxs)("div", {
      className: "flex flex-row items-center justify-center",
      children: [f, E]
    });
  };
  var p = function (e) {
    var r = e.id,
      n = e.className,
      t = e.onClick,
      a = e.style,
      l = e.alignLeft,
      s = e.isJudge,
      i = e.skills,
      o = (0, d.fE)(r),
      c = (0, d.dg)(r),
      _ = (0, d.e3)(r),
      u = (0, d.mc)(_),
      f = (0, d.s2)(_),
      N = (0, d.zd)(_),
      I = (0, d.vr)(_),
      A = f.length;
    return companionBridge.trickCard ? (0, S.jsx)(companionBridge.trickCard, {
      id: r,
      children: (0, S.jsx)("div", {
        className: "sgs-card-container ".concat(n || ""),
        style: a,
        children: (0, S.jsxs)("div", {
          className: "sgs-card flex flex-col text-center border border-gray-300 bg-white rounded text-black cursor-pointer",
          onClick: t,
          children: [(0, S.jsxs)("div", {
            className: "flex",
            children: [(0, S.jsxs)("div", {
              className: "w-6".concat(o < 2 ? " text-red-600" : ""),
              children: [(0, S.jsx)("div", {
                className: "font-bold leading-none text-xl",
                children: d.uR[c]
              }), (0, S.jsx)("div", {
                className: "leading-none",
                children: d.If[o]
              })]
            }), (0, S.jsxs)("div", {
              className: "text-xs ml-auto mt-0.5 mr-1",
              children: [(0, S.jsx)("div", {
                children: ["", "\u9526\u56CA", "\u5EF6\u65F6", "\u6B66\u5668", "\u9632\u5177", "\u9A6C", "\u9A6C"][u]
              }), !!I && (0, S.jsx)("div", {
                className: "text-sm italic leading-none",
                children: I > 8 ? "\u221E" : _ > 36 ? "+1" : I
              })]
            })]
          }), (0, S.jsx)("div", {
            className: "".concat(A < 3 ? "text-2xl " : "text-xl ").concat(l ? "text-left " : "", "whitespace-nowrap overflow-hidden leading-7 mx-1 mt-1 border rounded border-gray-300"),
            children: f
          }), (0, S.jsxs)("div", {
            className: "".concat(l ? "text-left " : "", "mt-auto text-xs leading-none"),
            children: [i && i.length ? (0, S.jsx)("div", {
              children: i.map(function (e) {
                return "[".concat(E.H[e][0], "] ");
              }).join("")
            }) : null, s ? "[\u5224]" : i && i.length ? null : N]
          })],
          role: "button",
          tabIndex: 0,
          onKeyDown: function (event) {
            if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.click();
            }
          }
        })
      })
    }) : (0, S.jsx)("div", {
      className: "sgs-card-container ".concat(n || ""),
      style: a,
      children: (0, S.jsxs)("div", {
        className: "sgs-card flex flex-col text-center border border-gray-300 bg-white rounded text-black cursor-pointer",
        onClick: t,
        children: [(0, S.jsxs)("div", {
          className: "flex",
          children: [(0, S.jsxs)("div", {
            className: "w-6".concat(o < 2 ? " text-red-600" : ""),
            children: [(0, S.jsx)("div", {
              className: "font-bold leading-none text-xl",
              children: d.uR[c]
            }), (0, S.jsx)("div", {
              className: "leading-none",
              children: d.If[o]
            })]
          }), (0, S.jsxs)("div", {
            className: "text-xs ml-auto mt-0.5 mr-1",
            children: [(0, S.jsx)("div", {
              children: ["", "\u9526\u56CA", "\u5EF6\u65F6", "\u6B66\u5668", "\u9632\u5177", "\u9A6C", "\u9A6C"][u]
            }), !!I && (0, S.jsx)("div", {
              className: "text-sm italic leading-none",
              children: I > 8 ? "\u221E" : _ > 36 ? "+1" : I
            })]
          })]
        }), (0, S.jsx)("div", {
          className: "".concat(A < 3 ? "text-2xl " : "text-xl ").concat(l ? "text-left " : "", "whitespace-nowrap overflow-hidden leading-7 mx-1 mt-1 border rounded border-gray-300"),
          children: f
        }), (0, S.jsxs)("div", {
          className: "".concat(l ? "text-left " : "", "mt-auto text-xs leading-none"),
          children: [i && i.length ? (0, S.jsx)("div", {
            children: i.map(function (e) {
              return "[".concat(E.H[e][0], "] ");
            }).join("")
          }) : null, s ? "[\u5224]" : i && i.length ? null : N]
        })],
        role: "button",
        tabIndex: 0,
        onKeyDown: function (event) {
          if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.click();
          }
        }
      })
    });
  };
  function P(e, r) {
    var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 73,
      a = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 73,
      l = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : 35,
      s = (0, t.useState)(a),
      o = (0, i.Z)(s, 2),
      c = o[0],
      _ = o[1];
    return (0, t.useEffect)(function () {
      requestAnimationFrame(function () {
        if (e.current && r > 0) {
          var t = e.current.getBoundingClientRect().width;
          if (r <= 1) return void _(a);
          if (t >= (r - 1) * a + n) _(a);else {
            var s = (t - n) / (r - 1);
            _(Math.max(l, s));
          }
        }
      });
    }, [r]), c;
  }
  var y = function (e) {
      var r = e.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2
      };
    },
    L = function (e, r) {
      var n = y(e),
        t = y(r),
        a = window.pageXOffset || document.documentElement.scrollLeft,
        l = window.pageYOffset || document.documentElement.scrollTop,
        s = {
          x: n.x + a,
          y: n.y + l
        },
        i = {
          x: t.x + a,
          y: t.y + l
        },
        o = function () {
          var e = document.getElementById("sgs-svg");
          if (!e) {
            var r = document.createElement("div");
            r.style.position = "absolute", r.style.top = "0", r.style.left = "0", r.style.pointerEvents = "none", r.style.zIndex = "800", (e = document.createElementNS("http://www.w3.org/2000/svg", "svg")).id = "sgs-svg", e.style.position = "absolute", e.style.width = "100%", e.style.height = "100%", r.appendChild(e), document.body.appendChild(r);
          }
          var n = e.parentElement;
          return n.style.width = "".concat(document.documentElement.scrollWidth, "px"), n.style.height = "".concat(document.documentElement.scrollHeight, "px"), e;
        }(),
        c = document.createElementNS("http://www.w3.org/2000/svg", "path"),
        _ = "M ".concat(s.x, " ").concat(s.y, " L ").concat(i.x, " ").concat(i.y);
      c.setAttribute("d", _), c.setAttribute("stroke", "#ff6b35"), c.setAttribute("stroke-width", "3"), c.setAttribute("fill", "none"), c.setAttribute("stroke-linecap", "round");
      var u = Math.sqrt(Math.pow(i.x - s.x, 2) + Math.pow(i.y - s.y, 2));
      c.setAttribute("stroke-dasharray", u.toString()), c.setAttribute("stroke-dashoffset", u.toString()), o.appendChild(c), c.style.transition = "stroke-dashoffset 0.5s ease-out", requestAnimationFrame(function () {
        c.setAttribute("stroke-dashoffset", "0");
      }), setTimeout(function () {
        c.remove();
      }, 800);
    },
    v = n(7002);
  var h = function (e) {
      var r = e.className,
        n = e.style,
        t = e.onClick;
      return (0, S.jsx)("div", {
        className: "sgs-card-container ".concat(r || ""),
        style: n,
        children: (0, S.jsx)("div", {
          className: "sgs-card flex flex-col text-center border border-gray-300 rounded cursor-pointer",
          onClick: t,
          children: (0, S.jsx)("div", {
            className: "rounded flex items-center justify-center",
            style: {
              padding: 0,
              background: "radial-gradient(circle at 50% 50%, #ca8a04 0, #854d0e 50px)",
              height: "100%",
              width: "100%"
            },
            children: (0, S.jsx)(v.Z, {
              className: "h-8 w-8"
            })
          }),
          role: "button",
          tabIndex: 0,
          onKeyDown: function (event) {
            if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.click();
            }
          }
        })
      });
    },
    O = function (e) {
      return new Promise(function (r) {
        return setTimeout(r, e);
      });
    };
  function D(e) {
    var r = e.showCard,
      n = e.index,
      a = e.spacing,
      l = e.version,
      s = e.myPos,
      i = (0, t.useRef)(null),
      o = r.fromPlayerPos,
      c = r.toPlayerPos,
      _ = r.cardId,
      u = r.isJudge,
      d = r.skills;
    return (0, t.useLayoutEffect)(function () {
      var e = i.current;
      if (e) {
        var r = function (e) {
          var r = e.getBoundingClientRect();
          return {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2
          };
        };
        !function () {
          var n = e.getBoundingClientRect(),
            t = n.left + n.width / 2,
            a = n.top + n.height / 2;
          e.style.transition = "none", e.style.opacity = "1", e.style.transform = "translate(0, 0)";
          var l = Promise.resolve();
          if (o > 0) {
            var s = document.getElementById("sgs-hero-".concat(o - 1));
            if (s) {
              var i = r(s),
                _ = i.x - t,
                u = i.y - a;
              e.style.transform = "translate(".concat(_, "px, ").concat(u, "px)"), e.offsetHeight, e.style.transition = "transform 0.5s ease-out", e.style.transform = "translate(0, 0)", l = l.then(function () {
                return O(500);
              });
            }
          }
          c > 0 && (l = (l = o > 0 ? l.then(function () {
            return O(400);
          }) : l.then(function () {
            return O(50);
          })).then(function () {
            var n = document.getElementById("sgs-hero-".concat(c - 1));
            if (n) {
              var l = r(n),
                s = l.x - t,
                i = l.y - a;
              return e.style.transition = "transform 0.5s ease-in", e.style.transform = "translate(".concat(s, "px, ").concat(i, "px)"), O(500).then(function () {
                e.style.opacity = "0";
              });
            }
          })), l.then(function () {
            e.style.pointerEvents = "none";
          });
        }();
      }
    }, [l]), _ > 200 ? null : (0, S.jsx)("div", {
      ref: i,
      className: "absolute z-50",
      style: {
        left: a * n
      },
      children: r.isBack && (!s || s !== c && s !== o) ? (0, S.jsx)(h, {}) : (0, S.jsx)(p, {
        id: _,
        style: {
          pointerEvents: "none"
        },
        isJudge: u,
        skills: d
      })
    });
  }
  function T(e) {
    var r = e.view,
      n = e.version,
      a = e.myPos,
      l = (0, t.useRef)(null),
      s = P(l, r.showCards.length);
    return (0, t.useLayoutEffect)(function () {
      var e = r.showLine.fromPlayerPos;
      if (r.showLine.fromPlayerPos) {
        var n = e - 1,
          t = document.getElementById("sgs-hero-".concat(n));
        r.showLine.toPlayerIds.forEach(function (e) {
          var r = document.getElementById("sgs-hero-".concat(e));
          t && r && L(t, r);
        });
      }
    }, [n]), (0, S.jsx)("div", {
      className: "flex-grow flex items-center justify-center",
      children: (0, S.jsx)("div", {
        className: "flex-grow relative",
        style: {
          height: 100,
          maxWidth: 73 * r.showCards.length
        },
        ref: l,
        children: r.showCards.map(function (e, r) {
          return (0, S.jsx)(D, {
            showCard: e,
            index: r,
            version: n,
            spacing: s,
            myPos: a
          }, "".concat(n, "-").concat(r));
        })
      })
    });
  }
  var U = t.memo(T, function (e, r) {
      return e.version === r.version;
    }),
    C = n(4942),
    H = n(7762),
    g = n(4420);
  function R(e) {
    e.showLine = {};
    for (var r = 0; r < e.showCards.length; r++) e.showCards[r].fromPlayerPos = 0, (e.showCards[r].toPlayerPos || e.showCards[r].isTemp) && (e.showCards.splice(r, 1), r--);
  }
  function k(e) {
    e.showLine = {}, e.showCards = [];
  }
  function G(e, r, n, t, a) {
    r.forEach(function (r) {
      e.showCards.push({
        cardId: r,
        realType: void 0 === a ? (0, d.e3)(r) : a,
        fromPlayerPos: n + 1
      });
    }), e.showLine = {
      fromPlayerPos: n + 1,
      toPlayerIds: [t]
    };
  }
  function m(e, r, n, t, a) {
    var l = (0, d.e3)(r);
    e.showCards.push({
      cardId: r,
      realType: void 0 === a ? l : a,
      fromPlayerPos: n + 1
    }), t && (e.showLine = {
      fromPlayerPos: n + 1,
      toPlayerIds: [t - 1]
    }), [c.BY.NAN_MAN, c.BY.WAN_JIAN, c.BY.TAO_YUAN, c.BY.WU_GU].includes(l) && (e.showLine = {
      fromPlayerPos: n + 1,
      toPlayerIds: e.alivePlayerIds.filter(function (e) {
        return e !== n;
      })
    });
  }
  function x(e, r, n, t) {
    e.showCards.push({
      cardId: r,
      realType: void 0 === t ? (0, d.e3)(r) : t,
      fromPlayerPos: n + 1,
      isTemp: 1
    });
  }
  function M(e, r, n) {
    e.showCards.push({
      cardId: r,
      realType: (0, d.e3)(r),
      fromPlayerPos: n + 1,
      toPlayerPos: n + 1
    });
  }
  function w(e, r, n, t) {
    e.showCards.push({
      cardId: r,
      realType: (0, d.e3)(r),
      fromPlayerPos: n + 1,
      toPlayerPos: t + 1
    });
  }
  function Z(e, r, n) {
    e.showCards.push({
      cardId: r,
      toPlayerPos: n + 1,
      isBack: 1
    });
  }
  var Y = "\u786E\u5B9A",
    J = "\u53D6\u6D88";
  function B(e) {
    var r = e.whoseTurn;
    if (!e.shaTimes) return 1;
    var n = e.heroSkills[r];
    return [E.x.PAO_XIAO, E.x.WEAPON_ZHU_GE].some(function (e) {
      return n.includes(e);
    }) ? 1 : 0;
  }
  var K = function () {
      return ["", Y, J];
    },
    X = function (e, r) {
      return 1 === e.length ? ["\u4F7F\u7528\u8BE5\u724C", Y, J] : ["", "", J];
    };
  function b(e) {
    if (!e.drawCards.length) {
      for (var r = 0; r < e.cardPos.length; r++) e.cardPos[r] === c.Yp.PLAYED && (e.cardPos[r] = c.Yp.TO_DRAW, e.drawCards.push(r));
      e.playedCards.length = 0, e.drawCardPos.length = 0;
    }
    var n,
      t = e.drawCardPos.findIndex(function (e) {
        return !e.pos;
      }),
      a = e.drawCardPos[t];
    if (a) n = a.cardId, e.drawCardPos.splice(t, 1);else {
      var l = (0, o.Z)(e.drawCards);
      e.drawCardPos.forEach(function (e) {
        l.splice(l.indexOf(e.cardId), 1);
      }), n = l[(0, g.M)(l.length)];
    }
    e.drawCardPos.forEach(function (e) {
      e.pos -= 1;
    }), e.cardPos[n] = c.Yp.USING;
    var s = e.drawCards.indexOf(n);
    return s >= 0 && e.drawCards.splice(s, 1), n;
  }
  function j(e, r) {
    for (var n = [], t = 0; t < r; t++) {
      var a = b(e);
      n.push(a);
    }
    return n;
  }
  function W(e, r, n) {
    var t,
      a = j(e, r);
    return (t = e.playerHandCard[n]).push.apply(t, (0, o.Z)(a)), a;
  }
  function q(e, r) {
    (0, I.hE)(e, r, E.x.JI_ZHI) && W(e, 1, r).forEach(function (n) {
      Z(e, n, r);
    });
  }
  function F(e, r, n) {
    e.playerBlood[r] += n, e.playerBlood[r] > e.playerMaxBlood[r] && (e.playerBlood[r] = e.playerMaxBlood[r]);
  }
  function Q(e, r, n, t, a, l) {
    return (0, I.hE)(e, r, E.x.TIAN_XIANG) ? (e.dcdType = c.qy.DCD_SKILL_TIAN_XIANG, e.dcdPlayerId = r, e.eventStack.push({
      eventType: c.MZ.BEFORE_HURT,
      sourceCardIds: n,
      sourcePlayerPos: t,
      damagedPlayerPos: r + 1,
      attribute: a,
      damageValue: l
    }), 1) : 0;
  }
  function V(e, r, n) {
    var t = (0, I.qE)(e.alivePlayerIds, e.whoseTurn, e.hero.length).map(function (e) {
      return e + 1;
    });
    e.eventStack.push({
      eventType: c.MZ.DEATH,
      playerPos: r + 1,
      targetPlayerPos: t[0],
      targetPlayerPosList: t.slice(1),
      sourcePlayerPos: n
    }), e.dcdType = c.qy.RESPOND_TO_DEATH, e.dcdPlayerId = t[0] - 1;
  }
  function $(e, r, n, t, a, l, s) {
    var i = n;
    if (ue(e, r, c.M1.BAI_YIN) && (i = Math.min(n, 1)), e.playerBlood[r] -= i, s !== c.BY.SHA && e.playerConn[r]) {
      var o = e.eventStack.findIndex(function (e) {
        return e.eventType === c.MZ.TIE_SUO_HURT;
      });
      if (o >= 0) {
        e.playerConn[r] = 0;
        var _ = e.eventStack[o].targetPlayerPosList.findIndex(function (e) {
          return e === r + 1;
        });
        _ >= 0 && e.eventStack[o].targetPlayerPosList.splice(_, 1);
      } else {
        var u = (0, I.qE)(e.alivePlayerIds.filter(function (n) {
          return e.playerConn[n] && n !== r;
        }), r, e.hero.length).map(function (e) {
          return e + 1;
        });
        e.eventStack.push({
          eventType: c.MZ.TIE_SUO_HURT,
          sourceCardIds: t,
          sourcePlayerPos: a,
          damagedPlayerPos: r + 1,
          attribute: s,
          damageValue: i,
          targetPlayerPos: r + 1,
          targetPlayerPosList: u
        });
      }
    }
    return (0, I.hE)(e, r, E.x.JIAN_XIONG) && t.length && !l && e.eventStack.push({
      eventType: c.MZ.NOT_USE_SKILL_HURT,
      skillId: E.x.JIAN_XIONG,
      skillOwnerPos: r + 1,
      sourceCardIds: t
    }), (0, I.hE)(e, r, E.x.FAN_KUI) && a && !l && e.alivePlayerIds.includes(a - 1) && a - 1 !== r && e.eventStack.push({
      eventType: c.MZ.NOT_USE_SKILL_HURT,
      skillId: E.x.FAN_KUI,
      skillOwnerPos: r + 1,
      sourcePlayerPos: a
    }), (0, I.hE)(e, r, E.x.GANG_LIE) && a && !l && e.alivePlayerIds.includes(a - 1) && a - 1 !== r && e.eventStack.push({
      eventType: c.MZ.NOT_USE_SKILL_HURT,
      skillId: E.x.GANG_LIE,
      skillOwnerPos: r + 1,
      sourcePlayerPos: a
    }), (0, I.hE)(e, r, E.x.YI_JI) && !l && e.eventStack.push({
      eventType: c.MZ.NOT_USE_SKILL_HURT,
      skillId: E.x.YI_JI,
      skillOwnerPos: r + 1,
      damageValue: i
    }), e.playerBlood[r] <= 0 ? 1 : 0;
  }
  function z(e) {
    var r = e.eventStack[e.eventStack.length - 1],
      n = r.cardIds,
      t = r.playerPos,
      a = r.targetPlayerPos,
      l = r.attribute,
      s = pe(e);
    if (!Q(e, a - 1, n, t, l || c.BY.SHA, s)) {
      var i = $(e, a - 1, s, n, t, 0, l || c.BY.SHA);
      e.eventStack.splice(e.eventStack.findIndex(function (e) {
        return e === r;
      }), 1), i ? V(e, a - 1, t) : fe(e);
    }
  }
  function ee(e, r) {
    (0, I.hE)(e, r, E.x.LIAN_YING) && 0 === e.playerHandCard[r].length && W(e, 1, r).forEach(function (n) {
      Z(e, n, r);
    });
  }
  function re(e, r, n) {
    var t = 0;
    return e.playerHandCard[n] = e.playerHandCard[n].filter(function (e) {
      return e === r ? (t = 1, 0) : 1;
    }), e.cardPos[r] = c.Yp.PLAYED, ee(e, n), t;
  }
  function ne(e, r, n, t) {
    e.playerHandCard[n] = e.playerHandCard[n].filter(function (e) {
      return e !== r;
    }), e.playerJudge[t].push([r, (0, d.e3)(r)]), e.cardPos[r] = c.Yp.USING, ee(e, n);
  }
  function te(e, r, n) {
    var t = 0;
    return e.cardPos[r] = c.Yp.PLAYED, [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].forEach(function (a) {
      var l = e.playerEquip[n][a];
      l && l[c.ao.CARD_ID] === r && (t = 2, function (e, r, n) {
        var t = e.playerEquip[r][n];
        if (t) {
          var a = t[c.ao.REAL_TYPE];
          delete e.playerEquip[r][n], a === c.M1.BAI_YIN && e.alivePlayerIds.includes(r) && F(e, r, 1), (0, I.hE)(e, r, E.x.XIAO_JI) && W(e, 2, r).forEach(function (n) {
            Z(e, n, r);
          });
        }
      }(e, n, a));
    }), t;
  }
  function ae(e, r, n) {
    var t = 0;
    return e.cardPos[r] = c.Yp.PLAYED, e.playerJudge[n] = e.playerJudge[n].filter(function (e) {
      return (0, i.Z)(e, 1)[0] === r ? (t = 3, 0) : 1;
    }), t;
  }
  function le(e, r, n) {
    var t = re(e, r, n);
    return t || te(e, r, n);
  }
  function se(e, r, n) {
    var t = re(e, r, n);
    return t || (t = te(e, r, n)) || ae(e, r, n);
  }
  function ie(e, r, n) {
    e.playerHandCard[n].push(r), e.cardPos[r] = c.Yp.USING;
  }
  function oe(e, r, n) {
    var t = r.filter(function (e) {
        return e < 0;
      }).length,
      a = [];
    if (t > 0) {
      var l = e.playerHandCard[n];
      a = (0, g.T)((0, o.Z)(l)).slice(0, t);
    }
    var s,
      i = [],
      c = 0,
      _ = (0, H.Z)(r);
    try {
      for (_.s(); !(s = _.n()).done;) {
        var u = s.value;
        u < 0 ? void 0 !== a[c] && (i.push(a[c]), c++) : i.push(u);
      }
    } catch (d) {
      _.e(d);
    } finally {
      _.f();
    }
    return i;
  }
  function ce(e, r, n, t, a, l) {
    var s = 0;
    (0, I.hE)(e, n, E.x.WU_SHUANG) && (s = 1), e.eventStack.push({
      eventType: c.MZ.SHA,
      cardIds: r,
      playerPos: n + 1,
      targetPlayerPos: t + 1,
      attribute: a || c.BY.SHA,
      isDrunk: l,
      skillWuShuang: s
    });
  }
  function _e(e) {
    e.dcdType = c.qy.RESPOND_TO_JIN_NANG, e.dcdWuXiePlayers = new Array(e.hero.length).fill(1).map(function (r, n) {
      return e.alivePlayerIds.includes(n) && e.playerHandCard[n].some(function (e) {
        return (0, d.e3)(e) === c.BY.WU_XIE;
      }) ? 1 : 0;
    });
  }
  function ue(e, r, n) {
    var t = (0, I.nu)(e, r);
    if (!t || t[c.ao.REAL_TYPE] !== n) return !1;
    var a = Se(e, c.MZ.SHA);
    if (!a) return !0;
    if (!(0, I.hE)(e, a.playerPos - 1, E.x.WEAPON_QING_GANG)) return !0;
    if (a.targetPlayerPos === r + 1) return !1;
    var l = Se(e, c.MZ.SHA_MULTI);
    return !l || !l.targetPlayerPosList.includes(r + 1);
  }
  function de(e, r) {
    return ue(e, r, c.M1.BA_GUA);
  }
  function Ee(e, r) {
    var n = e.eventStack[e.eventStack.length - 1];
    if (n) {
      if (n.isCanShan === c.r8.CANNOT_SHAN) return e.dcdType = c.qy.RESPOND_TO_SHA, void (e.dcdPlayerId = r);
      if (n.eventType === c.MZ.SHA) {
        if (ue(e, r, c.M1.REN_WANG) && n.cardIds.every(function (n) {
          return (0, I.u$)(e, n, r) === d.l5.BLACK;
        })) return e.eventStack.pop(), void fe(e);
        if (ue(e, r, c.M1.TENG_JIA) && n.attribute === c.BY.SHA) return e.eventStack.pop(), void fe(e);
      }
    }
    if ((0, I.hE)(e, r, E.x.HU_JIA) && (0, I.IN)(e, r).filter(function (e) {
      return u.V6[e][u.$.COUNTRY] === u.Ld.WEI;
    }).length) return e.dcdType = c.qy.DCD_SKILL_HU_JIA, void (e.dcdPlayerId = r);
    if (de(e, r)) return e.dcdType = c.qy.RESPOND_TO_SHA_DCD_BA_GUA, void (e.dcdPlayerId = r);
    e.dcdType = c.qy.RESPOND_TO_SHA, e.dcdPlayerId = r;
  }
  function Se(e, r) {
    return (0, o.Z)(e.eventStack).reverse().find(function (e) {
      return e.eventType === r;
    });
  }
  function fe(e) {
    var r = e.eventStack[e.eventStack.length - 1];
    if (r) {
      var n = r.eventType;
      if ([c.MZ.USE_NAN_MAN, c.MZ.USE_WAN_JIAN, c.MZ.USE_TAO_YUAN, c.MZ.USE_WU_GU, c.MZ.USE_TIE_SUO].includes(n)) {
        if (r.targetPlayerPos) {
          if ([c.MZ.USE_WAN_JIAN, c.MZ.USE_NAN_MAN].includes(n) && ue(e, r.targetPlayerPos - 1, c.M1.TENG_JIA)) {
            var t = r.targetPlayerPosList;
            t.length ? (r.targetPlayerPos = t[0], r.targetPlayerPosList = t.slice(1)) : e.eventStack.pop(), fe(e);
          } else _e(e);
        } else e.eventStack.pop(), fe(e);
      } else if (n === c.MZ.SHA_MULTI) {
        var a = r.targetPlayerPosList;
        r.targetPlayerPos = a[0], r.targetPlayerPosList = a.slice(1), r.targetPlayerPosList.length || e.eventStack.pop(), ce(e, r.cardIds, r.playerPos - 1, r.targetPlayerPos - 1, r.attribute, r.isDrunk), e.showLine = {
          fromPlayerPos: r.playerPos,
          toPlayerIds: r.targetPlayerPos ? [r.targetPlayerPos - 1] : []
        }, Ne(e);
      } else if (n === c.MZ.NOT_USE_SKILL_AFTER_SHAN) e.dcdPlayerId = r.skillOwnerPos - 1, r.skillId === E.x.WEAPON_QING_LONG && ((0, I.HW)(e, r.playerPos - 1).includes(r.targetPlayerPos - 1) ? e.dcdType = c.qy.DCD_QING_LONG : (e.eventStack.pop(), fe(e))), r.skillId === E.x.WEAPON_GUAN_SHI && (e.dcdType = c.qy.DCD_GUAN_SHI);else if (n === c.MZ.NOT_USE_SKILL_SHA_AIM) e.dcdPlayerId = r.skillOwnerPos - 1, r.skillId === E.x.LIU_LI ? e.dcdType = c.qy.DCD_SKILL_LIU_LI : r.skillId === E.x.TIE_JI ? e.dcdType = c.qy.DCD_SKILL_TIE_JI : r.skillId === E.x.WEAPON_CI_XIONG && (e.dcdType = c.qy.DCD_CI_XIONG), e.eventStack.pop();else if (n === c.MZ.NOT_USE_SKILL_HURT) e.dcdPlayerId = r.skillOwnerPos - 1, r.skillId === E.x.KU_ROU && function (e) {
        var r = e.eventStack[e.eventStack.length - 1];
        if (r && r.eventType === c.MZ.NOT_USE_SKILL_HURT && r.skillId === E.x.KU_ROU) {
          e.eventStack.pop();
          var n = r.skillOwnerPos - 1;
          W(e, 2, n).forEach(function (r) {
            Z(e, r, n);
          }), fe(e);
        }
      }(e), r.skillId === E.x.TIAN_XIANG && function (e) {
        var r = e.eventStack[e.eventStack.length - 1];
        if (r && r.eventType === c.MZ.NOT_USE_SKILL_HURT && r.skillId === E.x.TIAN_XIANG) {
          e.eventStack.pop();
          var n = r.targetPlayerPos - 1;
          W(e, 1, n).forEach(function (r) {
            Z(e, r, n);
          });
        }
      }(e), r.skillId === E.x.JIAN_XIONG && (e.dcdType = c.qy.DCD_SKILL_JIAN_XIONG), r.skillId === E.x.FAN_KUI && ((0, I.zR)(e, r.sourcePlayerPos - 1) ? e.dcdType = c.qy.DCD_SKILL_FAN_KUI : (e.eventStack.pop(), fe(e))), r.skillId === E.x.GANG_LIE && (e.dcdType = c.qy.DCD_SKILL_GANG_LIE), r.skillId === E.x.YI_JI && (e.dcdType = c.qy.DCD_SKILL_YI_JI);else if (n === c.MZ.NOT_FINISH_SKILL_FAN_JIAN) {
        var l = r.cardIds[0];
        re(e, l, r.playerPos - 1), e.playerHandCard[r.targetPlayerPos - 1].push(l), e.cardPos[l] = c.Yp.USING, e.showCards.push({
          cardId: l,
          fromPlayerPos: r.playerPos,
          toPlayerPos: r.targetPlayerPos,
          isDirectMove: 1
        }), e.eventStack.pop(), fe(e);
      } else if (n === c.MZ.TIE_SUO_HURT) {
        var s = r.targetPlayerPos,
          i = r.targetPlayerPosList;
        if (e.playerConn[s - 1] = 0, i.length) {
          r.targetPlayerPos = i[0], r.targetPlayerPosList = i.slice(1);
          var o = i[0] - 1;
          if (Q(e, o, r.sourceCardIds, r.sourcePlayerPos, r.attribute, r.damageValue)) return;
          var _ = 0;
          ue(e, o, c.M1.TENG_JIA) && r.attribute === c.BY.HUO_SHA && _++, $(e, o, r.damageValue + _, r.sourceCardIds, r.sourcePlayerPos, 0, r.attribute) ? V(e, o, r.sourcePlayerPos) : fe(e);
        } else e.eventStack.pop(), fe(e);
      } else if (n === c.MZ.SHA) Ee(e, r.targetPlayerPos - 1);else if (n === c.MZ.JUDGE_BA_GUA) {
        var u = r.judgeCardId,
          S = r.playerPos;
        if (Ce(e)) return;
        var f = e.eventStack[e.eventStack.length - 1];
        if (f) {
          var N = f.eventType;
          if ((0, I.u$)(e, u, S - 1) === d.l5.RED) {
            if (N === c.MZ.SHA) return void Pe(e, [], e.dcdPlayerId, pe(e));
            if (N === c.MZ.USE_WAN_JIAN) return void Pe(e, [], e.dcdPlayerId, 1);
            N === c.MZ.SKILL_HU_JIA && (e.eventStack.pop(), Pe(e, [], f.playerPos - 1, 1));
          } else e.dcdPlayerId = S - 1, N === c.MZ.SHA ? e.dcdType = c.qy.RESPOND_TO_SHA : N === c.MZ.USE_WAN_JIAN ? e.dcdType = c.qy.RESPOND_TO_WAN_JIAN : N === c.MZ.SKILL_HU_JIA && (e.dcdType = c.qy.DCD_SKILL_HU_JIA_SHAN);
        }
      } else if (n === c.MZ.JUDGE_SHAN_DIAN) {
        if (Ce(e)) return;
        var A = e.whoseTurn,
          p = r.judgeCardId,
          P = (0, d.dg)(p),
          y = e.playerJudge[A].pop();
        if ((0, I.f)(e, p, A) === d.Af.SPADE && P && P < 9) {
          if (e.cardPos[y[c.K_.CARD_ID]] = c.Yp.PLAYED, Q(e, A, [y[c.K_.CARD_ID]], 0, c.BY.LEI_SHA, 3)) return;
          $(e, A, 3, [y[c.K_.CARD_ID]], 0, 0, c.BY.LEI_SHA) ? V(e, A, 0) : fe(e);
        } else {
          var L = (0, I.XM)(e, A);
          e.playerJudge[L].some(function (e) {
            return e[c.K_.REAL_TYPE] === c.BY.SHAN_DIAN;
          }) && (L = (0, I.XM)(e, L)) === A ? (e.playerJudge[L].splice(0, 0, y), e.skipShanDian = c.aG.SKIP) : e.playerJudge[L].push(y), e.showCards.push({
            cardId: y[c.K_.CARD_ID],
            realType: y[c.K_.REAL_TYPE],
            fromPlayerPos: A + 1,
            toPlayerPos: L + 1,
            isDirectMove: A === L ? 0 : 1
          }), fe(e);
        }
      } else if (n === c.MZ.JUDGE_LE_BU) {
        if (Ce(e)) return;
        var v = e.whoseTurn,
          h = r.judgeCardId,
          O = e.playerJudge[v].pop();
        e.cardPos[O[c.K_.CARD_ID]] = c.Yp.PLAYED, (0, I.f)(e, h, v) !== d.Af.HEART && (e.skipPlay = c.DZ.SKIP), fe(e);
      } else if (n === c.MZ.JUDGE_BING_LIANG) {
        if (Ce(e)) return;
        var D = e.whoseTurn,
          T = r.judgeCardId,
          U = e.playerJudge[D].pop();
        e.cardPos[U[c.K_.CARD_ID]] = c.Yp.PLAYED, (0, I.f)(e, T, D) !== d.Af.CLUB && (e.skipDraw = c.MP.SKIP), fe(e);
      } else if (n === c.MZ.JUDGE_SKILL_GANG_LIE) {
        if (Ce(e)) return;
        var C = r.judgeCardId,
          H = r.playerPos;
        (0, I.f)(e, C, H - 1) !== d.Af.HEART ? (e.dcdType = c.qy.DCD_SKILL_GANG_LIE2, e.dcdPlayerId = H - 1) : fe(e);
      } else if (n === c.MZ.JUDGE_SKILL_LUO_SHEN) {
        if (Ce(e)) return;
        var g = r.judgeCardId,
          R = r.playerPos;
        (0, I.u$)(e, g, R - 1) === d.l5.RED ? e.skillAskLuoShen = c.yE.NOT_CONTINUE : (e.skillLuoShenCardIds.push(g), e.cardPos[g] = c.Yp.USING), fe(e);
      } else if (n === c.MZ.JUDGE_SKILL_TIE_JI) {
        if (Ce(e)) return;
        var k = r.judgeCardId,
          G = r.playerPos;
        if ((0, I.u$)(e, k, G - 1) === d.l5.RED) {
          var m = Se(e, c.MZ.SHA);
          m && (m.isCanShan = c.r8.CANNOT_SHAN);
        }
        fe(e);
      }
    } else if (e.whichStep === c.p6.PLAY_CARD) e.dcdPlayerId = e.whoseTurn, e.dcdType = c.qy.PLAY_CARD;else if (e.whichStep === c.p6.BEFORE_JUDGE) {
      var x,
        M = e.whoseTurn;
      if (e.playerBack[M]) return e.playerBack[M] = 0, e.whoseTurn = (0, I.XM)(e, M), void fe(e);
      if ((0, I.hE)(e, M, E.x.GUAN_XING) && e.skillAskGuanXing === c.Gb.NOT_ASK) return e.dcdType = c.qy.DCD_SKILL_GUAN_XING, void (e.dcdPlayerId = M);
      if ((0, I.hE)(e, M, E.x.LUO_SHEN)) {
        if (e.skillAskLuoShen === c.yE.CAN_ASK) return e.dcdType = c.qy.DCD_SKILL_LUO_SHEN, void (e.dcdPlayerId = M);
        e.skillLuoShenCardIds.forEach(function (r) {
          e.playerHandCard[M].push(r), e.showCards.push({
            cardId: r,
            toPlayerPos: M + 1,
            skills: [E.x.LUO_SHEN]
          });
        }), e.skillLuoShenCardIds = [];
      }
      if (null !== (x = e.playerJudge[M]) && void 0 !== x && x.length) return e.whichStep = c.p6.JUDGING, void fe(e);
      e.whichStep = c.p6.BEFORE_DRAW, fe(e);
    } else if (e.whichStep === c.p6.JUDGING) {
      var w = e.whoseTurn,
        Y = e.playerJudge[w] || [],
        J = Y.length;
      if (!J) return e.whichStep = c.p6.BEFORE_DRAW, void fe(e);
      if (Y[J - 1][c.K_.REAL_TYPE] === c.BY.SHAN_DIAN && e.skipShanDian === c.aG.SKIP) return e.skipShanDian = c.aG.NOT_SKIP, e.whichStep = c.p6.BEFORE_DRAW, void fe(e);
      _e(e);
    } else if (e.whichStep === c.p6.BEFORE_DRAW) {
      var B = e.whoseTurn;
      if (e.skipDraw === c.MP.SKIP) return e.whichStep = c.p6.BEFORE_PLAY, e.skipDraw = c.MP.NOT_SKIP, void fe(e);
      if ((0, I.hE)(e, B, E.x.LUO_YI) && e.skillAskLuoYi === c.Lm.NOT_ASK) return e.dcdType = c.qy.DCD_SKILL_LUO_YI, void (e.dcdPlayerId = B);
      if ((0, I.hE)(e, B, E.x.TU_XI) && e.skillAskTuXi === c.ym.NOT_ASK) return e.dcdType = c.qy.DCD_SKILL_TU_XI, void (e.dcdPlayerId = B);
      e.whichStep = c.p6.DRAWING, fe(e);
    } else if (e.whichStep === c.p6.DRAWING) {
      var K = e.whoseTurn,
        X = (0, I.hE)(e, K, E.x.YING_ZI) ? 3 : 2;
      e.skillLuoYi === c.Z$.USED && X--, W(e, X, K).forEach(function (r) {
        Z(e, r, K);
      }), e.whichStep = c.p6.BEFORE_PLAY, e.skillAskLuoYi = c.Lm.NOT_ASK, e.skillAskTuXi = c.ym.NOT_ASK, fe(e);
    } else if (e.whichStep === c.p6.BEFORE_PLAY) {
      if (e.skipPlay === c.DZ.SKIP) return e.whichStep = c.p6.BEFORE_DISCARD, e.skipPlay = c.DZ.NOT_SKIP, void fe(e);
      e.whichStep = c.p6.PLAY_CARD, e.dcdType = c.qy.PLAY_CARD, e.dcdPlayerId = e.whoseTurn;
    } else if (e.whichStep === c.p6.BEFORE_DISCARD) {
      var b = e.whoseTurn;
      if (!((0, I.hE)(e, b, E.x.KE_JI) && e.isEverSha === c.Uy.NEVER_SHA && e.playerHandCard[b].length <= 20) && e.playerHandCard[b].length > e.playerBlood[b]) return e.whichStep = c.p6.DISCARDING, e.dcdType = c.qy.DISCARD_CARD, void (e.dcdPlayerId = e.whoseTurn);
      e.whichStep = c.p6.AFTER_DISCARD, fe(e);
    } else if (e.whichStep === c.p6.AFTER_DISCARD) {
      if ((0, I.hE)(e, e.whoseTurn, E.x.BI_YUE)) W(e, 1, e.whoseTurn).forEach(function (r) {
        Z(e, r, e.whoseTurn);
      });
      e.whichStep = c.p6.BEFORE_JUDGE, e.whoseTurn = (0, I.XM)(e, e.whoseTurn), e.skillLuoShenCardIds = [], e.shaTimes = c.RW.NEVER_SHA, e.isDrunk = c.Sd.NEVER_DRUNK, e.skipShanDian = c.aG.NOT_SKIP, e.skipPlay = c.DZ.NOT_SKIP, e.skipDraw = c.MP.NOT_SKIP, e.isEverSha = c.Uy.NEVER_SHA, e.skillAskGuanXing = c.Gb.NOT_ASK, e.skillAskLuoShen = c.yE.CAN_ASK, e.skillLuoYi = c.Z$.NOT_USED, e.skillAskLuoYi = c.Lm.NOT_ASK, e.skillAskTuXi = c.ym.NOT_ASK, e.skillRenDe = c.V8.NONE, e.skillZhiHeng = c.qI.NOT_USED, e.skillQingNang = c.Jk.NOT_USED, e.skillLiJian = c.XE.NOT_USED, e.skillFanJian = c.d6.NOT_USED, e.skillJieYin = c.TY.NOT_USED, fe(e);
    }
  }
  function Ne(e) {
    var r = e.eventStack,
      n = Se(e, c.MZ.SHA);
    n && ((0, I.hE)(e, n.playerPos - 1, E.x.WEAPON_CI_XIONG) && u.V6[e.hero[n.playerPos - 1]][u.$.SEX] !== u.V6[e.hero[n.targetPlayerPos - 1]][u.$.SEX] && r.push({
      eventType: c.MZ.NOT_USE_SKILL_SHA_AIM,
      skillId: E.x.WEAPON_CI_XIONG,
      skillOwnerPos: n.playerPos
    }), (0, I.hE)(e, n.playerPos - 1, E.x.TIE_JI) && r.push({
      eventType: c.MZ.NOT_USE_SKILL_SHA_AIM,
      skillId: E.x.TIE_JI,
      skillOwnerPos: n.playerPos
    }), (0, I.hE)(e, n.targetPlayerPos - 1, E.x.LIU_LI) && r.push({
      eventType: c.MZ.NOT_USE_SKILL_SHA_AIM,
      skillId: E.x.LIU_LI,
      skillOwnerPos: n.targetPlayerPos
    }), fe(e));
  }
  function Ie(e) {
    var r = e.whoseTurn;
    (0, I.hE)(e, r, E.x.KE_JI) && (e.isEverSha = c.Uy.SHA), e.shaTimes += 1, e.shaTimes > c.RW.SHA_ONCE && (e.shaTimes = c.RW.SHA_TWICE_OR_MORE);
  }
  function Ae(e, r, n, t, a, l) {
    var s = e.hero.length,
      i = e.isDrunk === c.Sd.DRUNK && n === e.whoseTurn ? 1 : 0;
    if (i && (e.isDrunk = c.Sd.EVER_DRUNK_SHA), t.length > 1) {
      var o = (0, I.qE)(t, n, s).map(function (e) {
          return e + 1;
        }),
        _ = o[0],
        u = _ - 1;
      e.eventStack.push({
        eventType: c.MZ.SHA_MULTI,
        cardIds: r,
        playerPos: n + 1,
        targetPlayerPos: _,
        targetPlayerPosList: o.slice(1),
        attribute: a,
        isDrunk: i
      }), r.forEach(function (r) {
        re(e, r, n);
      }), ce(e, r, n, u, a, i), Ne(e), l || G(e, r, n, u, a);
    } else if (t.length) {
      var d = t[0];
      r.forEach(function (r) {
        re(e, r, n);
      }), ce(e, r, n, d, a, i), Ne(e), l || G(e, r, n, d, a);
    }
  }
  function pe(e) {
    var r = e.eventStack[e.eventStack.length - 1];
    if (!r) return 1;
    var n = 1,
      t = r.playerPos,
      a = r.targetPlayerPos,
      l = e.whoseTurn,
      s = (0, I.M8)(e, t - 1);
    if ([c.MZ.SHA].includes(r.eventType) && (t === l + 1 && (r.isDrunk && n++, e.skillLuoYi === c.Z$.USED && n++), e.playerHandCard[a - 1].length || s && s[c.ao.REAL_TYPE] === c.M1.GU_DING && n++, r.attribute === c.BY.HUO_SHA)) {
      var i = (0, I.nu)(e, a - 1);
      i && i[c.ao.REAL_TYPE] === c.M1.TENG_JIA && n++;
    }
    return n;
  }
  function Pe(e, r, n, t, a) {
    var l = e.eventStack[e.eventStack.length - 1];
    if (l) {
      var s = l.cardIds,
        i = l.playerPos,
        o = l.targetPlayerPos;
      r.forEach(function (r) {
        re(e, r, void 0 === a ? n : a), x(e, r, void 0 === a ? n : a, c.BY.SHAN);
      });
      var _ = (0, I.hE)(e, n, E.x.LEI_JI);
      l.skillWuShuang ? (l.skillWuShuang = 0, _ ? (e.dcdType = c.qy.DCD_SKILL_LEI_JI, e.dcdPlayerId = n) : Ee(e, n)) : l.eventType === c.MZ.USE_WAN_JIAN ? l.targetPlayerPosList.length ? (l.targetPlayerPos = l.targetPlayerPosList[0], l.targetPlayerPosList = l.targetPlayerPosList.slice(1), _ ? (e.dcdType = c.qy.DCD_SKILL_LEI_JI, e.dcdPlayerId = n) : fe(e)) : (e.eventStack.pop(), _ ? (e.dcdType = c.qy.DCD_SKILL_LEI_JI, e.dcdPlayerId = n) : fe(e)) : (e.eventStack.pop(), (0, I.hE)(e, i - 1, E.x.WEAPON_QING_LONG) && e.eventStack.push({
        eventType: c.MZ.NOT_USE_SKILL_AFTER_SHAN,
        skillId: E.x.WEAPON_QING_LONG,
        skillOwnerPos: i,
        playerPos: i,
        targetPlayerPos: o
      }), (0, I.hE)(e, i - 1, E.x.WEAPON_GUAN_SHI) && e.eventStack.push({
        eventType: c.MZ.NOT_USE_SKILL_AFTER_SHAN,
        skillId: E.x.WEAPON_GUAN_SHI,
        skillOwnerPos: i,
        playerPos: i,
        cardIds: s,
        targetPlayerPos: o,
        attribute: l.attribute,
        damageValue: t
      }), _ ? (e.dcdType = c.qy.DCD_SKILL_LEI_JI, e.dcdPlayerId = n) : fe(e));
    }
  }
  function ye(e) {
    var r = e.dcdPlayerId,
      n = e.playerHandCard[r].filter(function (e) {
        return ![c.BY.SHAN, c.BY.WU_XIE].includes((0, d.e3)(e));
      });
    return B(e) || (n = n.filter(function (e) {
      return ![c.BY.SHA, c.BY.LEI_SHA, c.BY.HUO_SHA].includes((0, d.e3)(e));
    })), e.isDrunk !== c.Sd.NEVER_DRUNK && (n = n.filter(function (e) {
      return (0, d.e3)(e) !== c.BY.JIU;
    })), e.playerBlood[r] >= e.playerMaxBlood[r] && (n = n.filter(function (e) {
      return (0, d.e3)(e) !== c.BY.TAO;
    })), e.alivePlayerIds.every(function (r) {
      return e.playerBlood[r] >= e.playerMaxBlood[r];
    }) && (n = n.filter(function (e) {
      return (0, d.e3)(e) !== c.BY.TAO_YUAN;
    })), (0, I.Zp)(e, r, c.BY.SHAN_DIAN) && (n = n.filter(function (e) {
      return (0, d.e3)(e) !== c.BY.SHAN_DIAN;
    })), [c.sl.SELECT_HAND_CARD1, c.Ld.SELECT_BY_CARD, n, [], function (n, t) {
      if (1 === n.length) {
        var a = n[0],
          l = (0, d.e3)(a);
        if (l === c.BY.JIE_DAO) return 2 !== t.length ? ["\u90092\u4EBA"] : t[0] === r ? ["\u90092\u4EBA\uFF0C\u7B2C\u4E00\u4E2A\u9009\u7684\u73A9\u5BB6\u4E0D\u80FD\u662F\u81EA\u5DF1"] : !(0, I.jC)(e, t[0], t[1]) || e.heroSkills[t[1]].includes(E.x.KONG_CHENG) && !(0, I.fo)(e, t[1]) ? ["\u8BF7\u91CD\u65B0\u90092\u4EBA\uFF0C\u56E0\u4E3A\u4F60\u9009\u7684\u7B2C\u4E00\u4E2A\u73A9\u5BB6\u65E0\u6CD5\u6740\u7B2C\u4E8C\u4E2A\u73A9\u5BB6"] : ["\u90092\u4EBA", Y];
        if (l === c.BY.TIE_SUO) return ["\u90090\u4EBA\uFF08\u53EF\u63621\u5F20\u724C\uFF09\uFF0C\u6216\u90091-2\u4EBA", Y];
        if ([c.BY.SHA, c.BY.LEI_SHA, c.BY.HUO_SHA, c.BY.JUE_DOU, c.BY.GUO_HE, c.BY.SHUN_SHOU, c.BY.LE_BU, c.BY.BING_LIANG].includes(l)) {
          if ([c.BY.SHA, c.BY.LEI_SHA, c.BY.HUO_SHA].includes(l) && (0, I.Q_)(e, r, c.M1.FANG_TIAN) && 1 === e.playerHandCard[r].length) {
            if (t.length > 3 || t.length < 1) return ["\u90091-3\u4EBA"];
            if (t.includes(r)) return ["\u90091-3\u4EBA\uFF0C\u4E0D\u80FD\u9009\u81EA\u5DF1"];
            var s = t.filter(function (n) {
              return !(0, I.jC)(e, r, n);
            });
            return s.length ? ["\u8BF7\u91CD\u65B0\u90091-3\u4EBA\uFF0C\u56E0\u4E3A\u4F60\u65E0\u6CD5\u6740".concat(s.map(function (e) {
              return "\u73A9\u5BB6".concat(e + 1);
            }).join("\u3001"))] : ["\u90091-3\u4EBA", Y];
          }
          return 1 !== t.length ? ["\u90091\u4EBA"] : t.includes(r) ? ["\u90091\u4EBA\uFF0C\u4E0D\u80FD\u9009\u81EA\u5DF1"] : [c.BY.SHA, c.BY.LEI_SHA, c.BY.HUO_SHA].includes(l) && !(0, I.jC)(e, r, t[0]) ? ["\u8BF7\u91CD\u65B0\u90091\u4EBA\uFF0C\u56E0\u4E3A\u4F60\u65E0\u6CD5\u6740\u8BE5\u73A9\u5BB6"] : ["\u90091\u4EBA", Y];
        }
        return l === c.BY.HUO_GONG ? 1 !== t.length ? ["\u90091\u4EBA"] : ["\u90091\u4EBA", Y] : ["\u4F7F\u7528\u8BE5\u724C", Y];
      }
      return ["", "", "\u7ED3\u675F\u51FA\u724C"];
    }, function (n, t, a, l) {
      if (l) return n.eventStack = [], k(n), n.whichStep = c.p6.BEFORE_DISCARD, void fe(n);
      var s = e.hero.length;
      if (1 === t.length) {
        var i = t[0],
          o = (0, d.e3)(i);
        n.eventStack = [];
        var _ = [];
        switch (o) {
          case c.BY.SHA:
          case c.BY.LEI_SHA:
          case c.BY.HUO_SHA:
            return Ie(n), void Ae(n, t, r, a, o);
          case c.BY.TAO:
            return F(n, r, 1), re(n, i, r), void x(n, i, r);
          case c.BY.JIU:
            return n.isDrunk = c.Sd.DRUNK, re(n, i, r), void x(n, i, r);
          case c.BY.SHAN_DIAN:
            return ne(n, i, r, r), void M(n, i, r);
          case c.BY.LE_BU:
          case c.BY.BING_LIANG:
            return ne(n, i, r, a[0]), void w(n, i, r, a[0]);
          case c.BY.WU_ZHONG:
            return re(n, i, r), q(n, r), n.eventStack.push({
              eventType: c.MZ.USE_WU_ZHONG,
              cardIds: t,
              playerPos: r + 1
            }), _e(n), void m(n, i, r, 0);
          case c.BY.GUO_HE:
            return re(n, i, r), q(n, r), n.eventStack.push({
              eventType: c.MZ.USE_GUO_HE,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: a[0] + 1
            }), _e(n), void m(n, i, r, a[0] + 1);
          case c.BY.SHUN_SHOU:
            return re(n, i, r), q(n, r), n.eventStack.push({
              eventType: c.MZ.USE_SHUN_SHOU,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: a[0] + 1
            }), _e(n), void m(n, i, r, a[0] + 1);
          case c.BY.JUE_DOU:
            return re(n, i, r), q(n, r), n.eventStack.push({
              eventType: c.MZ.USE_JUE_DOU,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: a[0] + 1,
              skillWuShuang: (0, I.hE)(n, r, E.x.WU_SHUANG) ? 1 : 0
            }), _e(n), void m(n, i, r, a[0] + 1);
          case c.BY.HUO_GONG:
            return re(n, i, r), q(n, r), n.eventStack.push({
              eventType: c.MZ.USE_HUO_GONG,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: a[0] + 1
            }), _e(n), void m(n, i, r, a[0] + 1);
          case c.BY.JIE_DAO:
            return re(n, i, r), q(n, r), n.eventStack.push({
              eventType: c.MZ.USE_JIE_DAO,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: a[0] + 1,
              damagedPlayerPos: a[1] + 1
            }), _e(n), m(n, i, r, 0), void (n.showLine = {
              fromPlayerPos: r + 1,
              toPlayerIds: [a[0]],
              fromPlayerPos2: a[0] + 1,
              toPlayerPos2: a[1] + 1
            });
          case c.BY.TIE_SUO:
            return re(n, i, r), a.length ? (q(n, r), _ = (0, I.qE)(a, r, s).map(function (e) {
              return e + 1;
            }), n.eventStack.push({
              eventType: c.MZ.USE_TIE_SUO,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: _[0],
              targetPlayerPosList: _.slice(1)
            }), m(n, i, r, 0), n.showLine = {
              fromPlayerPos: r + 1,
              toPlayerIds: a
            }, void fe(n)) : (x(n, i, r), void W(n, 1, r).forEach(function (e) {
              return Z(n, e, r);
            }));
          case c.BY.NAN_MAN:
            return re(n, i, r), q(n, r), _ = (0, I.qE)((0, I.IN)(n, r), r, s).map(function (e) {
              return e + 1;
            }), n.eventStack.push({
              eventType: c.MZ.USE_NAN_MAN,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: _[0],
              targetPlayerPosList: _.slice(1)
            }), m(n, i, r, 0), void fe(n);
          case c.BY.WAN_JIAN:
            return re(n, i, r), q(n, r), _ = (0, I.qE)((0, I.IN)(n, r), r, s).map(function (e) {
              return e + 1;
            }), n.eventStack.push({
              eventType: c.MZ.USE_WAN_JIAN,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: _[0],
              targetPlayerPosList: _.slice(1)
            }), m(n, i, r, 0), void fe(n);
          case c.BY.TAO_YUAN:
            return re(n, i, r), q(n, r), _ = (0, I.qE)(n.alivePlayerIds.filter(function (e) {
              return n.playerBlood[e] < n.playerMaxBlood[e];
            }), r, s).map(function (e) {
              return e + 1;
            }), n.eventStack.push({
              eventType: c.MZ.USE_TAO_YUAN,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: _[0],
              targetPlayerPosList: _.slice(1)
            }), _e(n), void m(n, i, r, 0);
          case c.BY.WU_GU:
            return re(n, i, r), q(n, r), _ = (0, I.qE)(n.alivePlayerIds, r, s).map(function (e) {
              return e + 1;
            }), n.eventStack.push({
              eventType: c.MZ.USE_WU_GU,
              cardIds: t,
              playerPos: r + 1,
              targetPlayerPos: _[0],
              targetPlayerPosList: _.slice(1),
              wuGuCardIds: j(n, _.length),
              wuGuSelectedPlayerPosList: new Array(_.length).fill(0)
            }), _e(n), void m(n, i, r, 0);
        }
        if (o >= c.M1.ZHU_GE) {
          var u = n.playerEquip[r][(0, d.mc)(o) - 3];
          if (u) {
            var S = u[c.ao.CARD_ID];
            te(n, S, r), x(n, S, r);
          }
          !function (e, r, n) {
            e.playerHandCard[n] = e.playerHandCard[n].filter(function (e) {
              return e !== r;
            });
            var t = (0, d.e3)(r);
            e.playerEquip[n][(0, d.mc)(t) - 3] = [r, t], e.cardPos[r] = c.Yp.USING, ee(e, n);
          }(n, i, r), M(n, i, r);
        }
      }
    }, function (n, t) {
      if (1 === n.length) {
        var a = n[0],
          l = (0, d.e3)(a),
          s = t.length;
        if (l === c.BY.JIE_DAO) return s > 1 ? [] : s ? e.alivePlayerIds.filter(function (r) {
          return r !== t[0] && !(e.heroSkills[r].includes(E.x.KONG_CHENG) && !(0, I.fo)(e, r));
        }) : (0, I.IN)(e, r).filter(function (r) {
          return (0, I.M8)(e, r);
        });
        if (l === c.BY.TIE_SUO) return s > 1 ? [] : s ? e.alivePlayerIds.filter(function (e) {
          return e !== t[0];
        }) : (0, o.Z)(e.alivePlayerIds);
        if ([c.BY.SHA, c.BY.LEI_SHA, c.BY.HUO_SHA].includes(l) && s < 3 && (0, I.Q_)(e, r, c.M1.FANG_TIAN) && 1 === e.playerHandCard[r].length) return (0, I.HW)(e, r);
        if (1 === s) return [];
        if ([c.BY.SHA, c.BY.LEI_SHA, c.BY.HUO_SHA].includes(l)) return (0, I.HW)(e, r);
        if (l === c.BY.GUO_HE) return (0, I.wH)(e, r);
        if (l === c.BY.SHUN_SHOU) return (0, I.wX)(e, r);
        if (l === c.BY.LE_BU) return (0, I.am)(e, r);
        if (l === c.BY.BING_LIANG) return (0, I.Ab)(e, r);
        if (l === c.BY.HUO_GONG) return (0, I.JP)(e, r);
        if (l === c.BY.JUE_DOU) return (0, I.ve)(e, r);
      }
      return [];
    }];
  }
  function Le(e) {
    var r = e.dcdPlayerId,
      n = e.heroSkills[r],
      t = [];
    return n.forEach(function (n) {
      if (n === E.x.LONG_DAN) {
        var a = (0, I.aH)(e, r);
        a.length > 0 && t.push([n, "\u90091\u6740\uFF0C\u5F53\u95EA", c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, a, [], function (e, n, t, a) {
          if (!a) {
            var l = e.eventStack[e.eventStack.length - 1];
            if (l.eventType === c.MZ.SKILL_HU_JIA) {
              e.eventStack.pop();
              var s = e.eventStack[e.eventStack.length - 1];
              return void Pe(e, n, l.playerPos - 1, s.eventType === c.MZ.SHA ? pe(e) : 1);
            }
            Pe(e, n, r, pe(e));
          }
        }]);
      }
      if (n === E.x.QING_GUO) {
        var l = (0, I.k_)(e, r, d.l5.BLACK),
          s = (0, I.s3)(e, r, d.l5.BLACK);
        (l.length > 0 || s.length > 0) && t.push([n, "\u90091\u9ED1\u724C\uFF0C\u5F53\u95EA", c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, [].concat((0, o.Z)(l), (0, o.Z)(s)), [], function (e, n, t, a) {
          if (!a) {
            var l = e.eventStack[e.eventStack.length - 1];
            if (l.eventType === c.MZ.SKILL_HU_JIA) {
              e.eventStack.pop();
              var s = e.eventStack[e.eventStack.length - 1];
              return void Pe(e, n, l.playerPos - 1, s.eventType === c.MZ.SHA ? pe(e) : 1);
            }
            Pe(e, n, r, pe(e));
          }
        }]);
      }
    }), t;
  }
  function ve(e) {
    var r,
      n = e.dcdPlayerId,
      t = (null === (r = e.eventStack[e.eventStack.length - 1]) || void 0 === r ? void 0 : r.isCanShan) || c.r8.CAN_SHAN;
    return [t === c.r8.CANNOT_SHAN ? c.sl.NO_SELECT : c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, t === c.r8.CANNOT_SHAN ? [] : e.playerHandCard[n].filter(function (e) {
      return (0, d.e3)(e) === c.BY.SHAN;
    }), [], t === c.r8.CANNOT_SHAN ? function () {
      return ["", "", "\u597D\u5427"];
    } : X, function (e, r, t, a) {
      var l = e.eventStack[e.eventStack.length - 1];
      if (l) {
        var s = l.cardIds,
          i = l.playerPos,
          o = l.targetPlayerPos,
          _ = l.eventType === c.MZ.SHA ? pe(e) : 1,
          u = (0, I.M8)(e, i - 1);
        if (a) {
          if (l.eventType === c.MZ.SKILL_HU_JIA) {
            var d = l.targetPlayerPosList;
            return d.length ? (l.targetPlayerPos = d[0], l.targetPlayerPosList = d.slice(1), e.dcdPlayerId = l.targetPlayerPos - 1, de(e, l.targetPlayerPos - 1) ? void (e.dcdType = c.qy.DCD_SKILL_HU_JIA_BA_GUA) : void (e.dcdType = c.qy.DCD_SKILL_HU_JIA_SHAN)) : (e.eventStack.pop(), e.dcdPlayerId = l.playerPos - 1, de(e, e.dcdPlayerId) && (e.dcdType = c.qy.RESPOND_TO_SHA_DCD_BA_GUA), void (e.dcdType = c.qy.RESPOND_TO_SHA));
          }
          if (l.eventType === c.MZ.SHA) {
            if (u && u[c.ao.REAL_TYPE] === c.M1.HAN_BING) {
              var E = 0;
              if ([c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].forEach(function (r) {
                e.playerEquip[o - 1][r] && E++;
              }), E || e.playerHandCard[o - 1].length) return e.dcdType = c.qy.DCD_HAN_BING, void (e.dcdPlayerId = i - 1);
            }
            if (u && u[c.ao.REAL_TYPE] === c.M1.QI_LIN) {
              var S = e.playerEquip[o - 1];
              if (S && (S[c.MX.MINUS_HORSE] || S[c.MX.PLUS_HORSE])) return e.dcdType = c.qy.DCD_QI_LIN, void (e.dcdPlayerId = i - 1);
            }
          }
          if (Q(e, o - 1, s, i, l.attribute || c.BY.SHA, _)) return;
          var f = $(e, o - 1, _, s, i, 0, l.attribute || c.BY.SHA);
          return l.eventType === c.MZ.USE_WAN_JIAN && l.targetPlayerPosList.length ? (l.targetPlayerPos = l.targetPlayerPosList[0], l.targetPlayerPosList = l.targetPlayerPosList.slice(1)) : e.eventStack.splice(e.eventStack.findIndex(function (e) {
            return e === l;
          }), 1), void (f ? V(e, o - 1, i) : fe(e));
        }
        if (l.eventType === c.MZ.SKILL_HU_JIA) {
          e.eventStack.pop();
          var N = e.eventStack[e.eventStack.length - 1];
          return void Pe(e, r, l.playerPos - 1, N.eventType === c.MZ.SHA ? pe(e) : 1);
        }
        Pe(e, r, n, _);
      }
    }];
  }
  function he(e, r, n) {
    var t = e.dcdType,
      a = e.dcdPlayerId,
      l = e.eventStack[e.eventStack.length - 1];
    if (l) {
      var s = n !== a,
        i = l.eventType;
      if (r.forEach(function (r) {
        re(e, r, n), t !== c.qy.RESPOND_TO_JIE_DAO && t !== c.qy.DCD_QING_LONG && x(e, r, n, (0, d.e3)(r));
      }), t === c.qy.RESPOND_TO_JIE_DAO && i === c.MZ.USE_JIE_DAO) return e.eventStack.pop(), void Ae(e, r, a, [l.damagedPlayerPos - 1], (0, d.e3)(r[0]), s);
      if (t !== c.qy.RESPOND_TO_JUE_DOU || i !== c.MZ.USE_JUE_DOU) t !== c.qy.RESPOND_TO_NAN_MAN || i !== c.MZ.USE_NAN_MAN ? t === c.qy.DCD_QING_LONG && i === c.MZ.NOT_USE_SKILL_AFTER_SHAN && (e.eventStack.pop(), Ae(e, r, a, [l.targetPlayerPos - 1], (0, d.e3)(r[0]), s)) : l.targetPlayerPosList.length ? (l.targetPlayerPos = l.targetPlayerPosList[0], l.targetPlayerPosList = l.targetPlayerPosList.slice(1), _e(e)) : (e.eventStack.pop(), fe(e));else {
        if (e.whoseTurn === e.dcdPlayerId && (0, I.hE)(e, e.dcdPlayerId, E.x.KE_JI) && (e.isEverSha = c.Uy.SHA), l.skillWuShuang) return void (l.skillWuShuang = 0);
        var o = l.targetPlayerPos - 1,
          _ = l.playerPos - 1;
        e.dcdPlayerId === o ? (e.dcdPlayerId = _, l.skillWuShuang = (0, I.hE)(e, o, E.x.WU_SHUANG) ? 1 : 0) : (e.dcdPlayerId = o, l.skillWuShuang = (0, I.hE)(e, _, E.x.WU_SHUANG) ? 1 : 0);
      }
    }
  }
  function Oe(e) {
    e.dcdType;
    var r = e.dcdPlayerId,
      n = e.heroSkills[r],
      t = [];
    return n.forEach(function (n) {
      if (n === E.x.LONG_DAN) {
        var a = (0, I.rR)(e, r, c.BY.SHAN);
        a.length > 0 && t.push([n, "\u90091\u95EA\uFF0C\u5F53\u6740", c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, a, [], function (e, n, t, a) {
          if (!a) {
            var l = e.eventStack[e.eventStack.length - 1];
            if (l.eventType === c.MZ.SKILL_JI_JIANG) return e.eventStack.pop(), e.dcdPlayerId = l.playerPos - 1, l.damagedPlayerPos ? (Ie(e), n.forEach(function (n) {
              re(e, n, r), x(e, n, r, (0, d.e3)(n));
            }), void Ae(e, n, e.dcdPlayerId, t, c.BY.SHA, !0)) : void he(e, n, r);
            he(e, n, r);
          }
        }]);
      }
      if (n === E.x.WU_SHENG) {
        var l = (0, I.k_)(e, r, d.l5.RED),
          s = (0, I.s3)(e, r, d.l5.RED);
        (l.length > 0 || s.length > 0) && t.push([n, "\u90091\u7EA2\u724C\uFF0C\u5F53\u6740", c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, [].concat((0, o.Z)(l), (0, o.Z)(s)), [], function (e, n, t, a) {
          if (!a) {
            var l = e.eventStack[e.eventStack.length - 1];
            if (l.eventType === c.MZ.SKILL_JI_JIANG) return e.eventStack.pop(), e.dcdPlayerId = l.playerPos - 1, l.damagedPlayerPos ? (Ie(e), n.forEach(function (n) {
              re(e, n, r), x(e, n, r, (0, d.e3)(n));
            }), void Ae(e, n, e.dcdPlayerId, t, c.BY.SHA, !0)) : void he(e, n, r);
            he(e, n, r);
          }
        }]);
      }
      n === E.x.WEAPON_ZHANG_BA && e.playerHandCard[r].length >= 2 && t.push([n, "\u90092\u724C\uFF0C\u5F53\u6740", c.sl.SELECT_HAND_CARD2, c.Ld.NO_SELECT, (0, I.Nu)(e, r), [], function (e, n, t, a) {
        if (!a) {
          var l = e.eventStack[e.eventStack.length - 1];
          if (l.eventType === c.MZ.SKILL_JI_JIANG) return e.eventStack.pop(), e.dcdPlayerId = l.playerPos - 1, l.damagedPlayerPos ? (Ie(e), n.forEach(function (n) {
            re(e, n, r), x(e, n, r, (0, d.e3)(n));
          }), void Ae(e, n, e.dcdPlayerId, t, c.BY.SHA, !0)) : void he(e, n, r);
          he(e, n, r);
        }
      }]);
    }), t;
  }
  function De(e) {
    var r = e.dcdType,
      n = e.dcdPlayerId;
    return [c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, (0, I.aH)(e, n), [], X, function (e, t, a, l) {
      var s = e.eventStack[e.eventStack.length - 1];
      if (s) {
        var i = s.eventType;
        if (l) {
          if (r === c.qy.RESPOND_TO_JIE_DAO) {
            if (i === c.MZ.USE_JIE_DAO) {
              var o = (0, I.M8)(e, n);
              if (o) {
                var _ = o[c.ao.CARD_ID];
                te(e, _, n), ie(e, _, s.playerPos - 1), e.showCards.push({
                  cardId: _,
                  fromPlayerPos: n + 1,
                  toPlayerPos: s.playerPos,
                  isDirectMove: 1
                });
              }
              return e.eventStack.pop(), void fe(e);
            }
          } else if (r === c.qy.RESPOND_TO_JUE_DOU) {
            if (i === c.MZ.USE_JUE_DOU) {
              var u = s.targetPlayerPos - 1,
                d = s.playerPos - 1,
                S = u;
              e.dcdPlayerId === u && (S = d);
              var f = 1;
              if (e.whoseTurn === S && (0, I.hE)(e, S, E.x.LUO_YI) && e.skillLuoYi === c.Z$.USED && (f = 2), Q(e, n, s.cardIds, S + 1, c.BY.SHA, f)) return;
              var N = $(e, n, f, s.cardIds, S + 1, 0, c.BY.SHA);
              return e.eventStack.splice(e.eventStack.findIndex(function (e) {
                return e === s;
              }), 1), void (N ? V(e, n, S + 1) : fe(e));
            }
          } else if (r === c.qy.RESPOND_TO_NAN_MAN) {
            if (i === c.MZ.USE_NAN_MAN) {
              if (Q(e, n, s.cardIds, s.playerPos, c.BY.SHA, 1)) return;
              var A = $(e, n, 1, s.cardIds, s.playerPos, 0, c.BY.SHA);
              return s.targetPlayerPosList.length ? (s.targetPlayerPos = s.targetPlayerPosList[0], s.targetPlayerPosList = s.targetPlayerPosList.slice(1)) : e.eventStack.splice(e.eventStack.findIndex(function (e) {
                return e === s;
              }), 1), void (A ? V(e, n, s.playerPos) : fe(e));
            }
          } else if (r === c.qy.DCD_QING_LONG) i === c.MZ.NOT_USE_SKILL_AFTER_SHAN && (e.eventStack.pop(), fe(e));else if (r === c.qy.DCD_SKILL_JI_JIANG_SHA && i === c.MZ.SKILL_JI_JIANG) {
            var p = s.targetPlayerPosList;
            if (p.length) return s.targetPlayerPos = p[0], s.targetPlayerPosList = p.slice(1), e.dcdPlayerId = s.targetPlayerPos - 1, void (e.dcdType = c.qy.DCD_SKILL_JI_JIANG_SHA);
            e.eventStack.pop(), e.dcdPlayerId = s.playerPos - 1;
            var P = e.eventStack[e.eventStack.length - 1];
            return void (P.eventType === c.MZ.USE_NAN_MAN ? e.dcdType = c.qy.RESPOND_TO_NAN_MAN : P.eventType === c.MZ.USE_JIE_DAO ? e.dcdType = c.qy.RESPOND_TO_JIE_DAO : P.eventType === c.MZ.USE_JUE_DOU ? e.dcdType = c.qy.RESPOND_TO_JUE_DOU : P.eventType === c.MZ.NOT_USE_SKILL_AFTER_SHAN && P.skillId === E.x.WEAPON_QING_LONG && (e.dcdType = c.qy.DCD_QING_LONG));
          }
        } else {
          if (i === c.MZ.SKILL_JI_JIANG) return e.eventStack.pop(), e.dcdPlayerId = s.playerPos - 1, void he(e, t, n);
          he(e, t, n);
        }
      }
    }];
  }
  function Te(e) {
    var r = e.dcdPlayerId,
      n = e.eventStack,
      t = n[n.length - 1];
    if (t && t.eventType === c.MZ.USE_WU_GU) {
      var a = t.wuGuCardIds,
        l = t.wuGuSelectedPlayerPosList;
      if (a && a.length) {
        var s = a.filter(function (e, r) {
          return !l[r];
        });
        return [c.sl.SELECT_WU_GU, c.Ld.NO_SELECT, s, [], function (e, r) {
          return 1 === e.length ? ["\u62FF\u8BE5\u724C", Y] : [];
        }, function (e, n, t, a) {
          var l = n[0],
            s = e.eventStack[e.eventStack.length - 1],
            i = s.wuGuCardIds.indexOf(l);
          e.playerHandCard[e.dcdPlayerId].push(l), function (e, r, n) {
            e.showCards.push({
              cardId: r,
              realType: (0, d.e3)(r),
              toPlayerPos: n + 1
            });
          }(e, l, r), s.wuGuSelectedPlayerPosList[i] = e.dcdPlayerId + 1;
          var o = s.targetPlayerPosList;
          o.length ? (s.targetPlayerPos = o[0], s.targetPlayerPosList = o.slice(1)) : (e.eventStack.pop(), s.wuGuCardIds.filter(function (e, r) {
            return !s.wuGuSelectedPlayerPosList[r];
          }).forEach(function (r) {
            e.cardPos[r] = c.Yp.PLAYED;
          }));
          fe(e);
        }];
      }
    }
    return console.log("error"), [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], function () {
      return [];
    }, function () {}];
  }
  function Ue(e, r, n) {
    var t = j(e, 1);
    t.forEach(function (r) {
      e.cardPos[r] = c.Yp.PLAYED, function (e, r) {
        e.showCards.push({
          cardId: r,
          isJudge: 1
        });
      }(e, r);
    });
    var a = function (e) {
      var r = [];
      return (0, I.qE)(e.alivePlayerIds, e.whoseTurn, e.hero.length).forEach(function (n) {
        (0, I.hE)(e, n, E.x.GUI_CAI) && r.push([n, E.x.GUI_CAI]), (0, I.hE)(e, n, E.x.GUI_DAO) && r.push([n, E.x.GUI_DAO]);
      }), r;
    }(e);
    if (a.length) return e.eventStack.push({
      eventType: r,
      judgeCardId: t[0],
      playerPos: n,
      targetPlayerPos: a[0][0] + 1,
      targetPlayerPosList: a.slice(1).map(function (e) {
        return e[0] + 1;
      })
    }), e.dcdType = a[0][1] === E.x.GUI_CAI ? c.qy.DCD_SKILL_GUI_CAI : c.qy.DCD_SKILL_GUI_DAO, void (e.dcdPlayerId = a[0][0]);
    e.eventStack.push({
      eventType: r,
      judgeCardId: t[0],
      playerPos: n,
      targetPlayerPos: 0,
      targetPlayerPosList: []
    }), fe(e);
  }
  function Ce(e) {
    var r = e.eventStack[e.eventStack.length - 1];
    if (!r) return 0;
    var n = r.targetPlayerPosList;
    if (n.length) return r.targetPlayerPos = n[0], r.targetPlayerPosList = n.slice(1), e.dcdPlayerId = r.targetPlayerPos - 1, e.dcdType = (0, I.hE)(e, e.dcdPlayerId, E.x.GUI_CAI) ? c.qy.DCD_SKILL_GUI_CAI : c.qy.DCD_SKILL_GUI_DAO, 1;
    if ((0, I.hE)(e, r.playerPos - 1, E.x.TIAN_DU)) {
      var t = r.judgeCardId;
      e.cardPos[t] = c.Yp.USING, e.playerHandCard[r.playerPos - 1].push(t), e.showCards.push({
        cardId: t,
        toPlayerPos: r.playerPos,
        skills: [E.x.TIAN_DU]
      });
    }
    return e.eventStack.pop(), 0;
  }
  function He(e) {
    return [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
      if (t) return e.dcdType === c.qy.RESPOND_TO_SHA_DCD_BA_GUA && (e.dcdType = c.qy.RESPOND_TO_SHA), e.dcdType === c.qy.RESPOND_TO_WAN_JIAN_DCD_BA_GUA && (e.dcdType = c.qy.RESPOND_TO_WAN_JIAN), void (e.dcdType === c.qy.DCD_SKILL_HU_JIA_BA_GUA && (e.dcdType = c.qy.DCD_SKILL_HU_JIA_SHAN));
      Ue(e, c.MZ.JUDGE_BA_GUA, e.dcdPlayerId + 1);
    }];
  }
  function ge(e) {
    return [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
      if (t) return e.eventStack.pop(), void fe(e);
      var a = e.eventStack[e.eventStack.length - 1];
      a && (a.sourceCardIds.forEach(function (r) {
        ie(e, r, e.dcdPlayerId), function (e, r, n) {
          e.showCards.push({
            cardId: r,
            realType: (0, d.e3)(r),
            toPlayerPos: n + 1
          });
        }(e, r, e.dcdPlayerId);
      }), e.eventStack.pop());
      fe(e);
    }];
  }
  function Re(e) {
    var r = e.eventStack[e.eventStack.length - 1];
    return [c.sl.SELECT_GUAN_XING, c.Ld.NO_SELECT, r.wuGuCardIds, [], function () {
      return ["", Y];
    }, function (e, r, n, t) {
      if (!t) {
        var a = r.indexOf(-1);
        (0, o.Z)(r.slice(0, a)).reverse().forEach(function (r) {
          !function (e, r) {
            e.cardPos[r] = c.Yp.TO_DRAW, e.drawCardPos.forEach(function (e) {
              e.pos += 1;
            }), e.drawCardPos.push({
              cardId: r,
              pos: 0
            }), e.drawCards.push(r);
          }(e, r);
        }), r.slice(a + 1).forEach(function (r) {
          !function (e, r) {
            e.cardPos[r] = c.Yp.TO_DRAW, e.drawCardPos.push({
              cardId: r,
              pos: e.drawCards.length
            }), e.drawCards.push(r);
          }(e, r);
        });
      }
      e.eventStack.pop(), fe(e);
    }];
  }
  function ke(e, r) {
    var n,
      t = "",
      a = r ? r - 1 : 0,
      l = e.dcdType,
      s = e.dcdPlayerId,
      _ = e.dcdWuXiePlayers,
      S = s + 1,
      f = !!r && ([c.qy.RESPOND_TO_JIN_NANG, c.qy.RESPOND_TO_WU_XIE].includes(l) ? !!_[a] : s === a),
      N = f ? "\u4F60" : "\u73A9\u5BB6".concat(S),
      A = e.eventStack[e.eventStack.length - 1] || {},
      p = [];
    if (e.stage === c.PR.FINISH) return {
      info: t,
      usableSkills: p,
      usableAction: void 0
    };
    switch (l) {
      case c.qy.PLAY_CARD:
        t = "".concat(N, "\u51FA\u724C"), p = f ? function (e) {
          var r = e.dcdPlayerId,
            n = e.heroSkills[r],
            t = [];
          return n.forEach(function (n) {
            if (B(e)) {
              var a = (0, I.HW)(e, r),
                l = c.Ld.SELECT_OTHER_PLAYER1,
                s = "\u90091\u4EBA";
              if ((0, I.Q_)(e, r, c.M1.FANG_TIAN) && 1 === e.playerHandCard[r].length && (l = c.Ld.SELECT_OTHER_PLAYER1_OR_2_OR_3, s = "\u90091-3\u4EBA"), n === E.x.LONG_DAN) {
                var i = (0, I.rR)(e, r, c.BY.SHAN);
                i.length > 0 && t.push([n, "\u90091\u95EA\u624B\u724C\uFF0C".concat(s), c.sl.SELECT_HAND_CARD1, l, i, a, function (e, n, t, a) {
                  a || (Ie(e), Ae(e, n, r, t, c.BY.SHA));
                }]);
              }
              if (n === E.x.JI_JIANG && e.alivePlayerIds.some(function (e) {
                return e !== r && u.V6[e][u.$.COUNTRY] === u.Ld.SHU;
              }) && t.push([n, "\u90091\u4EBA\uFF0C\u4F60\u6253\u7B97\u6740", c.sl.NO_SELECT, c.Ld.SELECT_OTHER_PLAYER1, [], a, function (e, r, n, t) {
                if (!t) {
                  var a = (0, I.IN)(e, e.dcdPlayerId).filter(function (e) {
                      return u.V6[e][u.$.COUNTRY] === u.Ld.SHU;
                    }),
                    l = (0, I.qE)(a, e.dcdPlayerId, e.hero.length).map(function (e) {
                      return e + 1;
                    });
                  l.length && (e.eventStack.push({
                    eventType: c.MZ.SKILL_JI_JIANG,
                    playerPos: e.dcdPlayerId + 1,
                    damagedPlayerPos: n[0] + 1,
                    targetPlayerPos: l[0],
                    targetPlayerPosList: l.slice(1)
                  }), e.dcdPlayerId = l[0] - 1, e.dcdType = c.qy.DCD_SKILL_JI_JIANG_SHA);
                }
              }]), n === E.x.WU_SHENG) {
                var _ = (0, I.k_)(e, r, d.l5.RED),
                  S = (0, I.s3)(e, r, d.l5.RED);
                (_.length > 0 || S.length > 0) && t.push([n, "\u90091\u7EA2\u724C\uFF0C".concat(s), c.sl.SELECT_HAND_CARD1, l, [].concat((0, o.Z)(_), (0, o.Z)(S)), a, function (e, n, t, a) {
                  a || (Ie(e), Ae(e, n, r, t, c.BY.SHA));
                }]);
              }
              if (n === E.x.WEAPON_ZHANG_BA && e.playerHandCard[r].length >= 2 && t.push([n, "\u90092\u624B\u724C\uFF0C".concat(s), c.sl.SELECT_HAND_CARD2, c.Ld.SELECT_OTHER_PLAYER1, void 0, a, function (e, n, t, a) {
                a || (Ie(e), Ae(e, n, r, t, c.BY.SHA));
              }]), n === E.x.WEAPON_ZHU_QUE) {
                var f = (0, I.rR)(e, r, c.BY.SHA);
                f.length && t.push([n, "\u90091\u6740\uFF0C".concat(s), c.sl.SELECT_HAND_CARD1, c.Ld.SELECT_OTHER_PLAYER1, f, a, function (e, n, t, a) {
                  a || (Ie(e), Ae(e, n, r, t, c.BY.HUO_SHA));
                }]);
              }
            }
            if (n === E.x.REN_DE && (0, I.fo)(e, r) && t.push([n, "\u9009\u4EFB\u610F\u624B\u724C\uFF0C\u90091\u4EBA", c.sl.SELECT_HAND_CARD_ANY, c.Ld.SELECT_OTHER_PLAYER1, void 0, (0, I.IN)(e, r), function (e, n, t, a) {
              if (!a) {
                var l;
                (l = e.playerHandCard[t[0]]).push.apply(l, (0, o.Z)(n)), e.playerHandCard[r] = e.playerHandCard[r].filter(function (e) {
                  return !n.includes(e);
                });
                var s = n.length;
                e.skillRenDe < c.V8.TWO_OR_MORE && e.skillRenDe + s >= c.V8.TWO_OR_MORE && F(e, r, 1), e.skillRenDe += s, e.skillRenDe > 2 && (e.skillRenDe = c.V8.TWO_OR_MORE), e.showCards = n.map(function (e) {
                  return {
                    cardId: e,
                    fromPlayerPos: r + 1,
                    toPlayerPos: t[0] + 1,
                    isBack: 1,
                    isDirectMove: 1,
                    skills: [E.x.REN_DE]
                  };
                });
              }
            }]), n !== E.x.ZHI_HENG || e.skillZhiHeng || !(0, I.fo)(e, r) && !(0, I.L8)(e, r) || t.push([n, "\u9009\u4EFB\u610F\u724C", c.sl.SELECT_EQUIP_HAND_CARD_ANY, c.Ld.NO_SELECT, void 0, [], function (e, n, t, a) {
              a || (e.skillZhiHeng = c.qI.USED, n.forEach(function (n) {
                le(e, n, r);
              }), ee(e, r), W(e, n.length, r), e.showCards = n.map(function (e) {
                return {
                  cardId: e,
                  realType: (0, d.e3)(e),
                  fromPlayerPos: r + 1,
                  isTemp: 1,
                  skills: [E.x.ZHI_HENG]
                };
              }));
            }]), n === E.x.QI_XI) {
              var N = (0, I.k_)(e, r, d.l5.BLACK),
                A = (0, I.s3)(e, r, d.l5.BLACK);
              (N.length > 0 || A.length > 0) && t.push([n, "\u90091\u9ED1\u724C\uFF0C\u90091\u4EBA", c.sl.SELECT_EQUIP_HAND_CARD1, c.Ld.SELECT_OTHER_PLAYER1, [].concat((0, o.Z)(N), (0, o.Z)(A)), (0, I.wH)(e, r), function (e, n, t, a) {
                if (!a) {
                  var l = n[0];
                  le(e, l, r), e.eventStack.push({
                    eventType: c.MZ.USE_GUO_HE,
                    cardIds: n,
                    playerPos: r + 1,
                    targetPlayerPos: t[0] + 1
                  }), _e(e), m(e, l, r, t[0] + 1, c.BY.GUO_HE);
                }
              }]);
            }
            if (n === E.x.KU_ROU && t.push([n, "\u70B9\u786E\u8BA4", c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], function (e, n, t, a) {
              if (!a) {
                if (e.eventStack.push({
                  eventType: c.MZ.NOT_USE_SKILL_HURT,
                  skillId: E.x.KU_ROU,
                  skillOwnerPos: r + 1
                }), Q(e, r, [], 0, c.BY.SHA, 1)) return;
                $(e, r, 1, [], 0, 1, c.BY.SHA) ? V(e, r, 0) : fe(e);
              }
            }]), n === E.x.FAN_JIAN && !e.skillFanJian && (0, I.fo)(e, r) && t.push([n, "\u90091\u4EBA\uFF0C\u8BA9\u4ED6\u731C\u82B1\u8272", c.sl.NO_SELECT, c.Ld.SELECT_OTHER_PLAYER1, [], (0, I.IN)(e, r), function (e, r, n, t) {
              t || (e.skillFanJian = c.d6.USED, e.dcdType = c.qy.DCD_SKILL_FAN_JIAN, e.dcdPlayerId = n[0]);
            }]), n === E.x.GUO_SE) {
              var p = (0, I.KE)(e, r, d.Af.DIAMOND),
                P = (0, I.eC)(e, r, d.Af.DIAMOND);
              (p.length > 0 || P.length > 0) && t.push([n, "\u90091\u65B9\u7247\u724C\uFF0C\u90091\u4EBA", c.sl.SELECT_EQUIP_HAND_CARD1, c.Ld.SELECT_OTHER_PLAYER1, [].concat((0, o.Z)(p), (0, o.Z)(P)), (0, I.am)(e, r), function (e, n, t, a) {
                var l = n[0];
                ne(e, l, r, t[0]), w(e, l, r, t[0]);
              }]);
            }
            n === E.x.JIE_YIN && !e.skillJieYin && e.playerHandCard[r].length >= 2 && e.alivePlayerIds.some(function (n) {
              return n !== r && u.V6[n][u.$.SEX] === u.Ye.MALE && e.playerBlood[n] < e.playerMaxBlood[n];
            }) && t.push([n, "\u90092\u624B\u724C\uFF0C\u90091\u4EBA", c.sl.SELECT_HAND_CARD2, c.Ld.SELECT_OTHER_PLAYER1, void 0, e.alivePlayerIds.filter(function (r) {
              return e.playerBlood[r] < e.playerMaxBlood[r];
            }), function (e, n, t, a) {
              a || (e.skillJieYin = c.TY.USED, n.forEach(function (n) {
                re(e, n, r), x(e, n, r);
              }), F(e, t[0], 1), F(e, r, 1));
            }]), n === E.x.QING_NANG && !e.skillQingNang && (0, I.fo)(e, r) && e.alivePlayerIds.some(function (r) {
              return e.playerBlood[r] < e.playerMaxBlood[r];
            }) && t.push([n, "\u90091\u624B\u724C\uFF0C\u90091\u4EBA", c.sl.SELECT_HAND_CARD1, c.Ld.SELECT_PLAYER1, void 0, e.alivePlayerIds.filter(function (r) {
              return e.playerBlood[r] < e.playerMaxBlood[r];
            }), function (e, n, t, a) {
              a || (e.skillQingNang = c.Jk.USED, n.forEach(function (n) {
                re(e, n, r), x(e, n, r);
              }), F(e, t[0], 1));
            }]), n === E.x.LI_JIAN && !e.skillLiJian && (0, I.fo)(e, r) && e.alivePlayerIds.filter(function (e) {
              return u.V6[e][u.$.SEX] === u.Ye.MALE;
            }).length >= 2 && t.push([n, "\u90091\u624B\u724C\u548C2\u7537\uFF0C\u540E\u9009\u7684\u7537\u5148\u51FA\u6740", c.sl.SELECT_HAND_CARD1, c.Ld.SELECT_OTHER_PLAYER2, void 0, (0, I.cW)(e, r), function (e, n, t, a) {
              if (!a) {
                var l = n[0];
                re(e, l, r), e.eventStack.push({
                  eventType: c.MZ.USE_JUE_DOU,
                  cardIds: [],
                  playerPos: t[0] + 1,
                  targetPlayerPos: t[1] + 1,
                  skillWuShuang: (0, I.hE)(e, t[0], E.x.WU_SHUANG) ? 1 : 0
                }), m(e, l, r, t[0] + 1), e.showLine = {
                  fromPlayerPos: t[0] + 1,
                  toPlayerIds: [t[1]]
                }, e.dcdType = c.qy.RESPOND_TO_JUE_DOU, e.dcdPlayerId = t[1];
              }
            }]);
          }), t;
        }(e) : [], n = f ? ye(e) : void 0;
        break;
      case c.qy.RESPOND_TO_DEATH:
        t = "".concat(N, "\u51FA\u6843\uFE0F\u6216\u4E0D\u51FA"), p = f ? function (e) {
          var r = e.dcdPlayerId,
            n = e.heroSkills[r],
            t = [];
          return n.forEach(function (n) {
            if (n === E.x.JI_JIU) {
              var a = (0, I.k_)(e, r, d.l5.RED),
                l = (0, I.s3)(e, r, d.l5.RED);
              (a.length > 0 || l.length > 0) && t.push([n, "\u90091\u7EA2\u724C\uFF0C\u6551\u4EBA", c.sl.SELECT_EQUIP_HAND_CARD1, c.Ld.NO_SELECT, [].concat((0, o.Z)(a), (0, o.Z)(l)), [], function (e, n, t, a) {
                if (!a) {
                  var l = e.eventStack[e.eventStack.length - 1],
                    s = n[0];
                  F(e, l.playerPos - 1, 1), re(e, s, r), x(e, s, r), e.playerBlood[l.playerPos - 1] > 0 && (e.eventStack.pop(), fe(e));
                }
              }]);
            }
          }), t;
        }(e) : [], n = f ? function (e) {
          var r = e.dcdPlayerId,
            n = e.eventStack[e.eventStack.length - 1];
          return [c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, e.playerHandCard[r].filter(function (e) {
            var t = (0, d.e3)(e);
            return t === c.BY.TAO || n.playerPos === r + 1 && t === c.BY.JIU;
          }), [], X, function (n, t, a, l) {
            var s = n.eventStack[n.eventStack.length - 1],
              _ = s.playerPos,
              u = _ - 1;
            if (l) {
              if (s.targetPlayerPosList.length) s.targetPlayerPos = s.targetPlayerPosList[0], s.targetPlayerPosList = s.targetPlayerPosList.slice(1), n.dcdPlayerId = s.targetPlayerPos - 1;else {
                n.eventStack.pop();
                var d = n.alivePlayerIds.indexOf(u);
                d >= 0 && n.alivePlayerIds.splice(d, 1);
                var E = n.hero.length;
                if (E < 3) return n.stage = c.PR.FINISH, void (n.winners = n.alivePlayerIds);
                var S = s.sourcePlayerPos - 1;
                if ((0, I.bg)(n.rule, E)[c.Sp.MODE] === c.D7.ZHU_MODE) {
                  if (n.roles[u] === c.XP.ZHU) return n.stage = c.PR.FINISH, void (1 === n.alivePlayerIds.length && n.roles[n.alivePlayerIds[0]] === c.XP.NEI ? n.winners = [n.alivePlayerIds[0]] : n.winners = e.roles.map(function (e, r) {
                    return e === c.XP.FAN ? r : -1;
                  }).filter(function (e) {
                    return e >= 0;
                  }));
                  if ([c.XP.NEI, c.XP.FAN].includes(n.roles[u]) && n.alivePlayerIds.every(function (e) {
                    return [c.XP.ZHU, c.XP.ZHONG].includes(n.roles[e]);
                  })) return n.stage = c.PR.FINISH, void (n.winners = n.roles.map(function (e, r) {
                    return e === c.XP.ZHU || e === c.XP.ZHONG ? r : -1;
                  }).filter(function (e) {
                    return e >= 0;
                  }));
                } else {
                  var f = n.roles.map(function (e, r) {
                      return e !== c.XP.FAN ? r : -1;
                    }).filter(function (e) {
                      return e >= 0;
                    }),
                    N = n.roles.map(function (e, r) {
                      return e === c.XP.FAN ? r : -1;
                    }).filter(function (e) {
                      return e >= 0;
                    });
                  if (f.every(function (e) {
                    return !n.alivePlayerIds.includes(e);
                  })) return n.stage = c.PR.FINISH, void (n.winners = N);
                  if (N.every(function (e) {
                    return !n.alivePlayerIds.includes(e);
                  })) return n.stage = c.PR.FINISH, void (n.winners = f);
                }
                n.heroSkills[u].length = 0, n.playerHandCard[u].forEach(function (e) {
                  re(n, e, u), x(n, e, u);
                }), [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].forEach(function (e) {
                  var r = n.playerEquip[u][e];
                  r && (te(n, r[c.ao.CARD_ID], u), x(n, r[c.ao.CARD_ID], u));
                });
                var A = n.playerJudge[u];
                if (A && A.length && A.forEach(function (e) {
                  var r = (0, i.Z)(e, 1)[0];
                  ae(n, r, u), x(n, r, u);
                }), n.playerConn[u] = 0, n.playerBack[u] = 0, (0, I.bg)(n.rule, E)[c.Sp.MODE] === c.D7.ZHU_MODE) {
                  if (n.roles[u] === c.XP.FAN) S >= 0 && n.alivePlayerIds.includes(S) && W(n, 3, S).forEach(function (e) {
                    return Z(n, e, S);
                  });else if (n.roles[u] === c.XP.ZHONG && S >= 0 && n.roles[S] === c.XP.ZHU) {
                    var p,
                      P = (0, o.Z)(n.heroSkills[S]);
                    n.heroSkills[S].length = 0, n.playerHandCard[S].forEach(function (e) {
                      re(n, e, S), x(n, e, S);
                    }), [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].forEach(function (e) {
                      var r = n.playerEquip[S][e];
                      r && (te(n, r[c.ao.CARD_ID], S), x(n, r[c.ao.CARD_ID], S));
                    }), (p = n.heroSkills[S]).push.apply(p, (0, o.Z)(P));
                  }
                } else {
                  for (var y = (0, I.XM)(n, u), L = 0; n.roles[y] !== n.roles[u] && (y = (0, I.XM)(n, y), !(L++ > 100)););
                  W(n, 1, y).forEach(function (e) {
                    return Z(n, e, y);
                  });
                }
                for (var v = 0; v < n.eventStack.length; v++) {
                  var h = n.eventStack[n.eventStack.length - 1 - v];
                  h && (h.eventType === c.MZ.NOT_USE_SKILL_HURT && h.skillOwnerPos - 1 === u && (n.eventStack.splice(n.eventStack.length - 1 - v, 1), v--), h.eventType === c.MZ.NOT_USE_SKILL_AFTER_SHAN && h.skillOwnerPos - 1 === u && (n.eventStack.splice(n.eventStack.length - 1 - v, 1), v--), h.eventType === c.MZ.NOT_FINISH_SKILL_FAN_JIAN && h.targetPlayerPos === u + 1 && (n.eventStack.splice(n.eventStack.length - 1 - v, 1), v--), [c.MZ.USE_WAN_JIAN, c.MZ.USE_NAN_MAN, c.MZ.USE_WU_GU, c.MZ.SHA_MULTI, c.MZ.USE_TIE_SUO, c.MZ.TIE_SUO_HURT].includes(h.eventType) && h.targetPlayerPosList.includes(u + 1) && (h.targetPlayerPosList = h.targetPlayerPosList.filter(function (e) {
                    return e !== u + 1;
                  })));
                }
                n.whoseTurn === u && (n.whichStep = c.p6.AFTER_DISCARD), fe(n);
              }
            } else {
              var O = t[0];
              F(n, _ - 1, 1), re(n, O, r), x(n, O, r), n.playerBlood[_ - 1] > 0 && (n.eventStack.pop(), fe(n));
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.RESPOND_TO_SHA_DCD_BA_GUA:
      case c.qy.RESPOND_TO_WAN_JIAN_DCD_BA_GUA:
        t = "".concat(N, "\u662F\u5426\u53D1\u52A8\u516B\u5366\u9635"), n = f ? He() : void 0;
        break;
      case c.qy.RESPOND_TO_SHA:
      case c.qy.RESPOND_TO_WAN_JIAN:
        t = "".concat(N, "\u51FA\u95EA\u6216\u4E0D\u51FA"), A.skillWuShuang && (t += " \u4E00\u5171\u9700\u51FA2\u5F20"), p = f ? Le(e) : [], n = f ? ve(e) : void 0, A.isCanShan === c.r8.CANNOT_SHAN && (t = "".concat(N, "\u4E0D\u80FD\u51FA\u95EA\uFF0C\u7B49").concat(N, "\u786E\u8BA4"), p = []);
        break;
      case c.qy.RESPOND_TO_NAN_MAN:
      case c.qy.RESPOND_TO_JIE_DAO:
      case c.qy.RESPOND_TO_JUE_DOU:
        t = "".concat(N, "\u51FA\u6740\u6216\u4E0D\u51FA"), A.skillWuShuang && (t += " \u4E00\u5171\u9700\u51FA2\u5F20"), p = f ? Oe(e) : [], n = f ? De(e) : void 0;
        break;
      case c.qy.DCD_QING_LONG:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u4F7F\u7528\u6B66\u5668\uFF08\u7EE7\u7EED\u6740\uFF09"), p = f ? Oe(e) : [], n = f ? De(e) : void 0;
        break;
      case c.qy.RESPOND_TO_WU_GU:
        t = "".concat(N, "\u9009\u724C"), n = f ? Te(e) : void 0;
        break;
      case c.qy.RESPOND_TO_HUO_GONG_SHOW:
        t = "".concat(N, "\u5C55\u793A\u4E00\u4E2A\u724C"), n = f ? function (e) {
          var r = e.dcdPlayerId;
          return [e.playerHandCard[r].length ? c.sl.SELECT_HAND_CARD1 : c.sl.NO_SELECT, c.Ld.NO_SELECT, void 0, [], function (n, t) {
            return 1 === n.length ? ["\u5C55\u793A\u8BE5\u724C", Y] : e.playerHandCard[r].length ? [] : ["\u6CA1\u724C\uFF0C\u65E0\u9700\u5C55\u793A\u724C", "", "\u597D\u7684"];
          }, function (e, n, t, a) {
            if (!a) {
              var l = e.eventStack[e.eventStack.length - 1];
              return l.judgeCardId = n[0], e.dcdType = c.qy.RESPOND_TO_HUO_GONG_DISCARD, e.dcdPlayerId = l.playerPos - 1, void e.showCards.push({
                cardId: n[0],
                fromPlayerPos: r + 1,
                toPlayerPos: r + 1
              });
            }
            e.eventStack.pop(), fe(e);
          }];
        }(e) : void 0;
        break;
      case c.qy.RESPOND_TO_HUO_GONG_DISCARD:
        t = "".concat(N, "\u9009\u724C"), n = f ? function (e) {
          var r = e.dcdPlayerId,
            n = [],
            t = Se(e, c.MZ.USE_HUO_GONG);
          if (t) {
            var a = t.targetPlayerPos,
              l = t.judgeCardId;
            if (l !== undefined && a) return n = e.playerHandCard[r].filter(function (n) {
              return (0, I.f)(e, n, r) === (0, I.f)(e, l, a - 1);
            }), [c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, n, [], function (e, r) {
              return 1 === e.length ? ["\u5F03\u8BE5\u724C", Y, J] : ["", "", J];
            }, function (e, n, t, a) {
              if (a) return e.eventStack.pop(), void fe(e);
              var l = e.eventStack[e.eventStack.length - 1];
              e.eventStack.pop(), re(e, n[0], r), x(e, n[0], r);
              var s = 1;
              ue(e, l.targetPlayerPos - 1, c.M1.TENG_JIA) && s++, Q(e, l.targetPlayerPos - 1, l.cardIds, r + 1, c.BY.HUO_SHA, s) || ($(e, l.targetPlayerPos - 1, s, l.cardIds, r + 1, 0, c.BY.HUO_SHA) ? V(e, l.targetPlayerPos - 1, r + 1) : fe(e));
            }];
          }
          return console.log("error"), [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], function () {
            return [];
          }, function () {}];
        }(e) : void 0;
        break;
      case c.qy.RESPOND_TO_GUO_HE:
        t = "".concat(N, "\u62C6\u724C"), n = f ? function (e) {
          return [c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1, c.Ld.NO_SELECT, void 0, [e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1], function (e, r) {
            return 1 === e.length ? ["", Y] : [];
          }, function (e, r, n, t) {
            var a = e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1,
              l = oe(e, r, a);
            se(e, l[0], a), x(e, l[0], a), e.eventStack.pop(), fe(e);
          }];
        }(e) : void 0;
        break;
      case c.qy.RESPOND_TO_SHUN_SHOU:
        t = "".concat(N, "\u5077\u724C"), n = f ? function (e) {
          return [c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1, c.Ld.NO_SELECT, void 0, [e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1], function (e, r) {
            return 1 === e.length ? ["", Y] : [];
          }, function (e, r, n, t) {
            var a = e.eventStack[e.eventStack.length - 1],
              l = oe(e, r, a.targetPlayerPos - 1),
              s = se(e, l[0], a.targetPlayerPos - 1);
            e.cardPos[l[0]] = c.Yp.USING, e.playerHandCard[e.dcdPlayerId].push(l[0]), e.eventStack.pop(), e.showCards.push({
              cardId: l[0],
              fromPlayerPos: a.targetPlayerPos,
              toPlayerPos: e.dcdPlayerId + 1,
              isBack: s > 1 ? 0 : 1
            }), fe(e);
          }];
        }(e) : void 0;
        break;
      case c.qy.RESPOND_TO_JIN_NANG:
      case c.qy.RESPOND_TO_WU_XIE:
        t = "", p = f ? function (e, r) {
          return e.dcdPlayerId, [];
        }(e) : [], n = f ? function (e, r) {
          return [c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, e.playerHandCard[r].filter(function (e) {
            return (0, d.e3)(e) === c.BY.WU_XIE;
          }), [], X, function (e, n, t, a) {
            var l = e.dcdType;
            a ? e.dcdWuXiePlayers[r] = 0 : (e.dcdType = l === c.qy.RESPOND_TO_JIN_NANG ? c.qy.RESPOND_TO_WU_XIE : c.qy.RESPOND_TO_JIN_NANG, e.dcdWuXiePlayers = new Array(e.hero.length).fill(1).map(function (r, n) {
              return e.alivePlayerIds.includes(n) && e.playerHandCard[n].some(function (e) {
                return (0, d.e3)(e) === c.BY.WU_XIE;
              }) ? 1 : 0;
            }), re(e, n[0], r), m(e, n[0], r, 0, c.BY.WU_XIE), q(e, r));
          }];
        }(e, a) : void 0;
        break;
      case c.qy.DCD_CI_XIONG:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u4F7F\u7528\u6B66\u5668\uFF08\u5BF9\u65B9\u5F031\u6216\u81EA\u5DF1\u64781\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) fe(e);else {
            var a = e.eventStack[e.eventStack.length - 1];
            e.dcdType = c.qy.DCD_CI_XIONG2, e.dcdPlayerId = a.targetPlayerPos - 1;
          }
        }] : void 0;
        break;
      case c.qy.DCD_CI_XIONG2:
        t = "".concat(N, "\u51B3\u5B9A\u5F031\u8FD8\u662F\u5BF9\u65B9\u64781"), n = f ? [c.sl.SELECT_HAND_CARD1, c.Ld.NO_SELECT, void 0, [], function (e, r) {
          return 1 === e.length ? ["", "\u5F03\u8FD9\u4E2A\u724C", "\u8BA9\u4ED6\u64781"] : ["", "", "\u8BA9\u4ED6\u64781"];
        }, function (e, r, n, t) {
          if (t) {
            var a = e.eventStack[e.eventStack.length - 1];
            return W(e, 1, a.playerPos - 1).forEach(function (r) {
              return Z(e, r, a.playerPos - 1);
            }), void fe(e);
          }
          re(e, r[0], e.dcdPlayerId), x(e, r[0], e.dcdPlayerId), fe(e);
        }] : void 0;
        break;
      case c.qy.DCD_HAN_BING:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u4F7F\u7528\u6B66\u5668\uFF08\u5F03\u5BF9\u65B92\u724C\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          t ? z(e) : e.dcdType = c.qy.DCD_HAN_BING2;
        }] : void 0;
        break;
      case c.qy.DCD_HAN_BING2:
        t = "".concat(N, "\u9009\u62E9\u5BF9\u65B92\u724C"), n = f ? function (e) {
          return [c.sl.SELECT_OTHER_EQUIP_HAND_CARD2, c.Ld.NO_SELECT, void 0, [e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1], function (r, n) {
            if (2 === r.length) return ["", Y];
            var t = e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1,
              a = e.playerHandCard[t],
              l = e.playerEquip[t],
              s = a.length;
            return [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].forEach(function (e) {
              l[e] && s++;
            }), 1 === s && 1 === r.length ? ["", Y] : [];
          }, function (e, r, n, t) {
            if (!t) {
              var a = e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1;
              oe(e, r, a).forEach(function (r) {
                se(e, r, a), x(e, r, a);
              }), e.eventStack.pop(), fe(e);
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_GUAN_SHI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u4F7F\u7528\u6B66\u5668\uFF08\u5F032\u724C\u547D\u4E2D\uFF09"), n = f ? function (e) {
          var r = e.dcdPlayerId,
            n = (0, o.Z)(e.playerHandCard[r]);
          return [c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].forEach(function (t) {
            var a = e.playerEquip[r][t];
            a && n.push(a[c.ao.CARD_ID]);
          }), [c.sl.SELECT_EQUIP_HAND_CARD2, c.Ld.NO_SELECT, n, [], function (e, r) {
            return 2 === e.length ? ["\u5F03\u8BE5\u724C", Y, J] : ["", "", J];
          }, function (e, n, t, a) {
            if (a) return e.eventStack.pop(), void fe(e);
            var l = e.eventStack[e.eventStack.length - 1];
            n.forEach(function (n) {
              re(e, n, r), x(e, n, r);
            }), e.eventStack.pop(), Q(e, l.targetPlayerPos - 1, l.cardIds, l.playerPos, l.attribute || c.BY.SHA, l.damageValue) || ($(e, l.targetPlayerPos - 1, l.damageValue, l.cardIds, l.playerPos, 0, l.attribute || c.BY.SHA) ? V(e, l.targetPlayerPos - 1, l.playerPos) : fe(e));
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_QI_LIN:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u4F7F\u7528\u6B66\u5668\uFF08\u4E0B\u5750\u9A91\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          t ? z(e) : e.dcdType = c.qy.DCD_QI_LIN2;
        }] : void 0;
        break;
      case c.qy.DCD_QI_LIN2:
        t = "".concat(N, "\u51B3\u5B9A\u4E0B\u54EA\u4E2A\u5750\u9A91"), n = f ? function (e) {
          return [c.sl.SELECT_OTHER_HORSE1, c.Ld.NO_SELECT, void 0, [e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1], function (e, r) {
            return 1 === e.length ? ["", Y] : [];
          }, function (e, r, n, t) {
            if (!t) {
              var a = e.eventStack[e.eventStack.length - 1].targetPlayerPos - 1;
              r.forEach(function (r) {
                se(e, r, a), x(e, r, a);
              }), z(e);
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.DISCARD_CARD:
        t = "".concat(N, "\u5F03\u724C"), n = f ? function (e) {
          return [c.sl.SELECT_HAND_CARD_ANY, c.Ld.NO_SELECT, void 0, [], function (r, n) {
            var t = e.whoseTurn,
              a = e.playerHandCard[t].length - e.playerBlood[t];
            return (0, I.hE)(e, t, E.x.KE_JI) && e.isEverSha === c.Uy.NEVER_SHA && e.playerHandCard[t].length > 20 && (a = e.playerHandCard[t].length - 20), r.length === a ? ["", Y] : ["\u9009".concat(a, "\u5F20\u624B\u724C\uFF0C\u5F03\u6389")];
          }, function (e, r, n, t) {
            r.forEach(function (r) {
              re(e, r, e.whoseTurn), x(e, r, e.whoseTurn, (0, d.e3)(r));
            }), e.whichStep = c.p6.AFTER_DISCARD, fe(e);
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_JIAN_XIONG:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.JIAN_XIONG][0], "\uFF09"), n = f ? ge() : void 0;
        break;
      case c.qy.DCD_SKILL_FAN_KUI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.FAN_KUI][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) return e.eventStack.pop(), void fe(e);
          e.dcdType = c.qy.DCD_SKILL_FAN_KUI2;
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_FAN_KUI2:
        t = "".concat(N, "\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.FAN_KUI][0], "\uFF09\uFF0C\u9009\u724C"), n = f ? function (e) {
          return [c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1, c.Ld.NO_SELECT, void 0, [e.eventStack[e.eventStack.length - 1].sourcePlayerPos - 1], function (e) {
            return 1 === e.length ? ["", Y] : [];
          }, function (e, r, n, t) {
            if (!t) {
              var a = e.eventStack[e.eventStack.length - 1],
                l = oe(e, r, a.sourcePlayerPos - 1),
                s = le(e, l[0], a.sourcePlayerPos - 1);
              e.cardPos[l[0]] = c.Yp.USING, e.playerHandCard[e.dcdPlayerId].push(l[0]), e.eventStack.pop(), e.showCards.push({
                cardId: l[0],
                fromPlayerPos: a.sourcePlayerPos,
                toPlayerPos: e.dcdPlayerId + 1,
                isBack: s > 1 ? 0 : 1,
                isDirectMove: 1
              }), fe(e);
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_GANG_LIE:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.GANG_LIE][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) return e.eventStack.pop(), void fe(e);
          var a = e.eventStack[e.eventStack.length - 1];
          e.eventStack.pop(), Ue(e, c.MZ.JUDGE_SKILL_GANG_LIE, a.sourcePlayerPos);
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_GANG_LIE2:
        t = "\u5DF2\u53D1\u52A8\u6280\u80FD\uFF08".concat(E.H[E.x.GANG_LIE][0], "\uFF09\uFF0C").concat(N, "\u5F03\u724C\u6216\u6389\u8840"), n = f ? [c.sl.SELECT_HAND_CARD2, c.Ld.NO_SELECT, void 0, [], function (e) {
          return 2 === e.length ? ["", Y] : ["", "", "\u6389\u8840"];
        }, function (e, r, n, t) {
          if (t) {
            var a = (0, I.IN)(e, e.dcdPlayerId).find(function (r) {
                return (0, I.hE)(e, r, E.x.GANG_LIE);
              }),
              l = void 0 === a ? 0 : a + 1;
            if (Q(e, e.dcdPlayerId, [], l, c.BY.SHA, 1)) return;
            $(e, e.dcdPlayerId, 1, [], l, 0, c.BY.SHA) ? V(e, e.dcdPlayerId, l) : fe(e);
          } else r.forEach(function (r) {
            re(e, r, e.dcdPlayerId), x(e, r, e.dcdPlayerId, (0, d.e3)(r));
          }), fe(e);
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_YI_JI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.YI_JI][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) return e.eventStack.pop(), void fe(e);
          var a = e.eventStack[e.eventStack.length - 1];
          e.dcdType = c.qy.DCD_SKILL_YI_JI2;
          var l = j(e, 2 * a.damageValue);
          a.wuGuCardIds = l;
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_YI_JI2:
        t = "".concat(N, "\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.YI_JI][0], "\uFF09\uFF0C\u9009\u724C"), n = f ? function (e) {
          var r = e.eventStack[e.eventStack.length - 1];
          return [c.sl.SELECT_NEW_DRAW_CARD2, c.Ld.SELECT_PLAYER1, r.wuGuCardIds, e.alivePlayerIds, function (e, n) {
            return e.length && 1 === n.length && e.every(function (e) {
              return r.wuGuCardIds.includes(e);
            }) ? ["", Y] : [];
          }, function (e, r, n, t) {
            if (!t) {
              var a = e.eventStack[e.eventStack.length - 1];
              r.forEach(function (r) {
                a.wuGuCardIds = a.wuGuCardIds.filter(function (e) {
                  return e !== r;
                }), e.playerHandCard[n[0]].push(r), e.showCards.push({
                  cardId: r,
                  fromPlayerPos: e.dcdPlayerId + 1,
                  toPlayerPos: n[0] + 1,
                  isBack: 1,
                  isDirectMove: 1,
                  skills: [E.x.YI_JI]
                });
              }), a.wuGuCardIds.length || (e.eventStack.pop(), fe(e));
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_TIAN_XIANG:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.TIAN_XIANG][0], "\uFF09"), n = f ? function (e) {
          return [c.sl.SELECT_HAND_CARD1, c.Ld.SELECT_OTHER_PLAYER1, e.playerHandCard[e.dcdPlayerId].filter(function (r) {
            return (0, I.f)(e, r, e.dcdPlayerId) === d.Af.HEART;
          }), [], function (e, r) {
            return 1 === e.length && 1 === r.length ? ["", Y] : ["\u82E5\u8981\u8F6C\u4F24\uFF0C\u8BF7\u90091\u624B\u724C\u30011\u4EBA", "", J];
          }, function (e, r, n, t) {}];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_HU_JIA:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.HU_JIA][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) de(e, e.dcdPlayerId) ? e.dcdType = c.qy.RESPOND_TO_SHA_DCD_BA_GUA : e.dcdType = c.qy.RESPOND_TO_SHA;else {
            var a = e.eventStack[e.eventStack.length - 1],
              l = (0, I.IN)(e, e.dcdPlayerId).filter(function (e) {
                return u.V6[e][u.$.COUNTRY] === u.Ld.WEI;
              }),
              s = (0, I.qE)(l, e.dcdPlayerId, e.hero.length).map(function (e) {
                return e + 1;
              });
            s.length ? (e.eventStack.push({
              eventType: c.MZ.SKILL_HU_JIA,
              playerPos: e.dcdPlayerId + 1,
              targetPlayerPos: s[0],
              targetPlayerPosList: s.slice(1)
            }), e.dcdPlayerId = a.targetPlayerPos - 1, de(e, e.dcdPlayerId) ? e.dcdType = c.qy.DCD_SKILL_HU_JIA_BA_GUA : e.dcdType = c.qy.DCD_SKILL_HU_JIA_SHAN) : de(e, e.dcdPlayerId) ? e.dcdType = c.qy.RESPOND_TO_SHA_DCD_BA_GUA : e.dcdType = c.qy.RESPOND_TO_SHA;
          }
        }] : void 0, A.skillWuShuang && (t += " \u4E00\u5171\u9700\u51FA2\u5F20");
        break;
      case c.qy.DCD_SKILL_HU_JIA_BA_GUA:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u516B\u5366\u9635\uFF0C\u54CD\u5E94\u6280\u80FD\uFF08").concat(E.H[E.x.HU_JIA][0], "\uFF09"), n = f ? He() : void 0;
        break;
      case c.qy.DCD_SKILL_HU_JIA_SHAN:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u51FA\u95EA\u54CD\u5E94\u6280\u80FD\uFF08").concat(E.H[E.x.HU_JIA][0], "\uFF09"), p = f ? Le(e) : [], n = f ? ve(e) : void 0;
        break;
      case c.qy.DCD_SKILL_LEI_JI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.LEI_JI][0], "\uFF09"), n = f ? function (e) {
          return [c.sl.NO_SELECT, c.Ld.SELECT_PLAYER1, [], e.alivePlayerIds, function (e, r) {
            return 1 === r.length ? ["", Y] : ["", "", J];
          }, function (e, r, n, t) {}];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_GUI_CAI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.GUI_CAI][0], "\uFF09"), n = f ? [c.sl.SELECT_EQUIP_HAND_CARD1, c.Ld.NO_SELECT, void 0, [], function (e) {
          return 1 === e.length ? ["", Y] : ["", "", J];
        }, function (e, r, n, t) {
          if (t) fe(e);else {
            var a = e.eventStack[e.eventStack.length - 1];
            a && (a.judgeCardId = r[0], re(e, r[0], e.dcdPlayerId), e.showCards.push({
              cardId: r[0],
              fromPlayerPos: e.dcdPlayerId + 1,
              skills: [E.x.GUI_CAI]
            }), fe(e));
          }
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_GUI_DAO:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.GUI_DAO][0], "\uFF09"), n = f ? [c.sl.SELECT_EQUIP_HAND_CARD1, c.Ld.NO_SELECT, void 0, [], function (e) {
          return 1 === e.length ? ["", Y] : ["", "", J];
        }, function (e, r, n, t) {
          if (t) fe(e);else {
            var a = e.eventStack[e.eventStack.length - 1];
            if (a) {
              var l = a.judgeCardId;
              a.judgeCardId = r[0], e.playerHandCard[e.dcdPlayerId].push(l), e.cardPos[l] = c.Yp.USING, re(e, r[0], e.dcdPlayerId), e.showCards.push({
                cardId: l,
                toPlayerPos: e.dcdPlayerId + 1,
                skills: [E.x.GUI_DAO]
              }), e.showCards.push({
                cardId: r[0],
                fromPlayerPos: e.dcdPlayerId + 1,
                skills: [E.x.GUI_DAO]
              }), fe(e);
            }
          }
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_TU_XI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.TU_XI][0], "\uFF09"), n = f ? function (e) {
          return [c.sl.NO_SELECT, c.Ld.SELECT_OTHER_PLAYER1_OR_2, [], (0, I.IN)(e, e.dcdPlayerId).filter(function (r) {
            return e.playerHandCard[r].length;
          }), function (e, r) {
            return [1, 2].includes(r.length) ? ["", Y] : ["", "", J];
          }, function (e, r, n, t) {
            e.skillAskTuXi = c.ym.ASK, t || (n.forEach(function (r) {
              var n = e.playerHandCard[r],
                t = n[(0, g.M)(n.length)];
              re(e, t, r), ie(e, t, e.dcdPlayerId), e.showCards.push({
                cardId: t,
                fromPlayerPos: r + 1,
                toPlayerPos: e.dcdPlayerId + 1,
                isBack: 1,
                isDirectMove: 1,
                skills: [E.x.TU_XI]
              });
            }), e.skipDraw = c.MP.SKIP), fe(e);
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_LUO_YI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.LUO_YI][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          e.skillAskLuoYi = c.Lm.ASK, t || (e.skillLuoYi = c.Z$.USED), fe(e);
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_GUAN_XING:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.GUAN_XING][0], "\uFF09"), n = f ? function (e) {
          return [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (r, n, t, a) {
            if (r.skillAskGuanXing = c.Gb.ASK, a) fe(r);else {
              var l = e.alivePlayerIds.length,
                s = j(r, l < 5 ? l : 5);
              r.eventStack.push({
                wuGuCardIds: s
              }), r.dcdType = c.qy.DCD_SKILL_GUAN_XING2;
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_GUAN_XING2:
        t = "".concat(N, "\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.GUAN_XING][0], "\uFF09\uFF0C\u6392\u5E8F\u4E2D"), n = f ? Re(e) : void 0;
        break;
      case c.qy.DCD_SKILL_LUO_SHEN:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.LUO_SHEN][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) return e.skillAskLuoShen = c.yE.NOT_CONTINUE, void fe(e);
          Ue(e, c.MZ.JUDGE_SKILL_LUO_SHEN, e.dcdPlayerId + 1);
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_LIU_LI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.LIU_LI][0], "\uFF09"), n = f ? function (e) {
          var r = Se(e, c.MZ.SHA);
          return [c.sl.SELECT_EQUIP_HAND_CARD1, c.Ld.SELECT_OTHER_PLAYER1, void 0, (0, I.IN)(e, e.dcdPlayerId).filter(function (e) {
            return e !== r.playerPos - 1;
          }), function (e, r) {
            return 1 === e.length && 1 === r.length ? ["", Y] : ["", "", J];
          }, function (e, r, n, t) {
            if (t) fe(e);else {
              var a = Se(e, c.MZ.SHA);
              a && (a.targetPlayerPos = n[0] + 1, e.eventStack = e.eventStack.filter(function (e) {
                return e.eventType !== c.MZ.NOT_USE_SKILL_SHA_AIM;
              }), e.showLine = {
                fromPlayerPos: a.playerPos,
                toPlayerIds: [n[0]]
              }, Ne(e));
            }
          }];
        }(e) : void 0;
        break;
      case c.qy.DCD_SKILL_TIE_JI:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.TIE_JI][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          t ? fe(e) : Ue(e, c.MZ.JUDGE_SKILL_TIE_JI, e.dcdPlayerId + 1);
        }] : void 0;
        break;
      case c.qy.DCD_SKILL_JI_JIANG:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u53D1\u52A8\u6280\u80FD\uFF08").concat(E.H[E.x.JI_JIANG][0], "\uFF09"), n = f ? [c.sl.NO_SELECT, c.Ld.NO_SELECT, [], [], K, function (e, r, n, t) {
          if (t) e.dcdType = c.qy.RESPOND_TO_NAN_MAN;else {
            var a = e.eventStack[e.eventStack.length - 1],
              l = (0, I.IN)(e, e.dcdPlayerId).filter(function (e) {
                return u.V6[e][u.$.COUNTRY] === u.Ld.SHU;
              }),
              s = (0, I.qE)(l, e.dcdPlayerId, e.hero.length).map(function (e) {
                return e + 1;
              });
            s.length ? (e.eventStack.push({
              eventType: c.MZ.SKILL_JI_JIANG,
              playerPos: e.dcdPlayerId + 1,
              targetPlayerPos: s[0],
              targetPlayerPosList: s.slice(1)
            }), e.dcdPlayerId = a.targetPlayerPos - 1, e.dcdType = c.qy.DCD_SKILL_JI_JIANG_SHA) : e.dcdType = c.qy.RESPOND_TO_NAN_MAN;
          }
        }] : void 0, A.skillWuShuang && (t += " \u4E00\u5171\u9700\u51FA2\u5F20");
        break;
      case c.qy.DCD_SKILL_JI_JIANG_SHA:
        t = "".concat(N, "\u51B3\u5B9A\u662F\u5426\u54CD\u5E94\u6280\u80FD\uFF08").concat(E.H[E.x.JI_JIANG][0], "\uFF09"), p = f ? Oe(e) : [], n = f ? De(e) : void 0;
        break;
      case c.qy.DCD_SKILL_FAN_JIAN:
        t = "".concat(N, "\u9700\u8981\u54CD\u5E94\u6280\u80FD\uFF08").concat(E.H[E.x.FAN_JIAN][0], "\uFF09\uFF0C\u9009\u724C\u548C\u82B1\u8272"), n = f ? function (e) {
          return [c.sl.SELECT_OTHER_HAND_CARD1_SUIT, c.Ld.NO_SELECT, void 0, [e.whoseTurn], function (e, r) {
            return 1 === e.length ? ["", Y] : [];
          }, function (e, r, n, t, a) {
            if (!t) {
              var l = e.whoseTurn,
                s = e.dcdPlayerId,
                i = oe(e, r, l)[0];
              if ((0, d.fE)(i) === a) re(e, i, l), e.playerHandCard[s].push(i), e.cardPos[i] = c.Yp.USING, e.showCards.push({
                cardId: i,
                fromPlayerPos: l + 1,
                toPlayerPos: s + 1,
                isDirectMove: 1
              }), fe(e);else {
                if (Q(e, s, [], l + 1, c.BY.SHA, 1)) return;
                $(e, s, 1, [], l + 1, 0, c.BY.SHA) ? (e.eventStack.push({
                  eventType: c.MZ.NOT_FINISH_SKILL_FAN_JIAN,
                  cardIds: [i],
                  playerPos: l + 1,
                  targetPlayerPos: s + 1
                }), V(e, s, l + 1)) : (re(e, i, l), e.playerHandCard[s].push(i), e.cardPos[i] = c.Yp.USING, e.showCards.push({
                  cardId: i,
                  fromPlayerPos: l + 1,
                  toPlayerPos: s + 1,
                  isDirectMove: 1
                }), fe(e));
              }
            }
          }];
        }(e) : void 0;
    }
    return {
      info: t,
      usableSkills: p,
      usableAction: n
    };
  }
  var Ge = 4500;
  function me(e) {
    return null;
  }
  var xe = t.memo(me, function (e, r) {
    return e.version === r.version && e.selectedCardIds[0] === r.selectedCardIds[0];
  });
  var Me = function (e) {
    var r = e.wuGuCardIds,
      n = e.selectedCardIds,
      a = e.setSelectedCardIds,
      s = (0, t.useState)(null),
      c = (0, i.Z)(s, 2),
      _ = c[0],
      u = c[1];
    (0, t.useEffect)(function () {
      a([].concat((0, o.Z)(r), [-1]));
    }, []);
    var d = n.indexOf(-1);
    return (0, S.jsxs)("div", {
      className: "mt-2 mx-auto border rounded p-2",
      children: ["\u6392\u5E8F\u724C(\u724C\u9876)", (0, S.jsxs)("div", {
        className: "my-2 flex items-center justify-center sgs-card-small-list",
        children: [n.slice(0, d).map(function (e, r) {
          return (0, S.jsxs)(t.Fragment, {
            children: [(0, S.jsx)(l.Z, {
              small: !0,
              disabled: null === _,
              onClick: function () {
                if (_ !== e) {
                  var r = n.filter(function (e) {
                      return e !== _;
                    }),
                    t = r.indexOf(e);
                  r.splice(t, 0, _), a(r);
                }
              },
              children: "\u653E\u8FD9"
            }), (0, S.jsx)(p, {
              id: e,
              className: _ === e ? "sgs-select" : "",
              onClick: function () {
                u(e);
              }
            }, r)]
          }, r);
        }), (0, S.jsx)(l.Z, {
          small: !0,
          disabled: null === _,
          onClick: function () {
            var e = n.filter(function (e) {
                return e !== _;
              }),
              r = e.indexOf(-1);
            e.splice(r, 0, _), a(e);
          },
          children: "\u653E\u8FD9"
        })]
      }), "\u6392\u5E8F\u724C(\u724C\u5E95)", (0, S.jsxs)("div", {
        className: "mt-2 flex items-center justify-center sgs-card-small-list",
        children: [n.slice(d + 1).map(function (e, r) {
          return (0, S.jsxs)(t.Fragment, {
            children: [(0, S.jsx)(l.Z, {
              small: !0,
              disabled: null === _,
              onClick: function () {
                if (_ !== e) {
                  var r = n.filter(function (e) {
                      return e !== _;
                    }),
                    t = r.indexOf(e);
                  r.splice(t, 0, _), a(r);
                }
              },
              children: "\u653E\u8FD9"
            }), (0, S.jsx)(p, {
              id: e,
              className: _ === e ? "sgs-select" : "",
              onClick: function () {
                u(e);
              }
            }, r)]
          }, r);
        }), (0, S.jsx)(l.Z, {
          small: !0,
          disabled: null === _,
          onClick: function () {
            var e = n.filter(function (e) {
              return e !== _;
            });
            e.push(_), a(e);
          },
          children: "\u653E\u8FD9"
        })]
      })]
    });
  };
  function we(e) {
    return e === c.sl.NO_SELECT || e === c.sl.SELECT_GUAN_XING ? 0 : [c.sl.SELECT_HAND_CARD1, c.sl.SELECT_EQUIP_HAND_CARD1, c.sl.SELECT_OTHER_HAND_CARD1, c.sl.SELECT_OTHER_HAND_CARD1_SUIT, c.sl.SELECT_OTHER_EQUIP_HAND_CARD1, c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1, c.sl.SELECT_OTHER_HORSE1, c.sl.SELECT_WU_GU].includes(e) ? 1 : [c.sl.SELECT_HAND_CARD2, c.sl.SELECT_EQUIP_HAND_CARD2, c.sl.SELECT_NEW_DRAW_CARD2, c.sl.SELECT_OTHER_EQUIP_HAND_CARD2].includes(e) ? 2 : -1;
  }
  function Ze(e) {
    return e === c.Ld.NO_SELECT ? 0 : [c.Ld.SELECT_PLAYER1, c.Ld.SELECT_OTHER_PLAYER1].includes(e) ? 1 : [c.Ld.SELECT_PLAYER2, c.Ld.SELECT_OTHER_PLAYER2].includes(e) ? 2 : -1;
  }
  function Ye(e, r, n) {
    if (e.includes(r)) return e.filter(function (e) {
      return e !== r;
    });
    if (1 === n) return [r];
    if (2 === n) {
      var t = [].concat((0, o.Z)(e), [r]);
      return t.length > 2 ? t.slice(t.length - 2) : t;
    }
    return [].concat((0, o.Z)(e), [r]);
  }
  var Je = function (e) {
      var r = e.room,
        n = e.view,
        a = e.version,
        s = e.send,
        _ = e.updateGameData,
        u = !!r.position,
        f = r.position,
        N = n.hero.length,
        y = u ? r.position - 1 : 0,
        L = ke(n, f),
        v = L.usableSkills,
        O = L.usableAction,
        D = L.info,
        T = "",
        C = (0, t.useState)([]),
        H = (0, i.Z)(C, 2),
        g = H[0],
        G = H[1],
        m = (0, t.useState)([]),
        x = (0, i.Z)(m, 2),
        M = x[0],
        w = x[1],
        Z = (0, t.useState)(E.x.NONE),
        Y = (0, i.Z)(Z, 2),
        J = Y[0],
        B = Y[1],
        K = (0, t.useState)(0),
        X = (0, i.Z)(K, 2),
        b = X[0],
        j = X[1],
        W = function (e, r, n, t, a, l) {
          var s,
            i = c.sl.NO_SELECT,
            o = c.Ld.NO_SELECT,
            _ = [];
          if (r !== E.x.NONE) {
            var u = n.find(function (e) {
              return e[0] === r;
            });
            if (u) {
              i = u[c.DG.SELECT_CARD_TYPE], s = u[c.DG.SELECTABLE_CARD_IDS], o = u[c.DG.SELECT_PLAYER_TYPE];
              var d = u[c.DG.SELECTABLE_PLAYER_IDS],
                S = u[c.DG.TARGET_PLAYERS_FUNC];
              _ = S ? S(a, l) : d;
            }
          } else if (t) {
            i = t[c.yP.SELECT_CARD_TYPE], s = t[c.yP.SELECTABLE_CARD_IDS], o = t[c.yP.SELECT_PLAYER_TYPE];
            var f = t[c.yP.SELECTABLE_PLAYER_IDS],
              N = t[c.yP.TARGET_PLAYERS_FUNC];
            _ = N ? N(a, l) : f;
          }
          return [i, s, o, _];
        }(0, J, v, O, g, M),
        q = (0, i.Z)(W, 4),
        F = q[0],
        Q = q[1],
        V = q[2],
        $ = q[3],
        z = (0, I.bp)(n),
        ee = u && (0, I.Hk)(n, y),
        re = n.playerHandCard[y].sort(function (e, r) {
          return (0, d.e3)(e) - (0, d.e3)(r);
        }),
        ne = (0, t.useRef)(null),
        te = P(ne, re.length),
        ae = Array.from({
          length: N - 1
        }, function (e, r) {
          return (y + r + 1) % N;
        }).reverse(),
        le = n.stage === c.PR.FINISH ? [[], ""] : function (e, r, n, t, a, l) {
          var s = [],
            i = l;
          if (e !== E.x.NONE) {
            var _ = r.find(function (r) {
              return r[0] === e;
            });
            if (_) {
              var u = _[1],
                d = "string" === typeof u;
              i = d ? u : u[0], s = d ? ["\u786E\u5B9A", "\u53D6\u6D88"] : [].concat((0, o.Z)(u.slice(1)), ["\u53D6\u6D88"]);
            }
          } else if (n) {
            var S = n[c.yP.BUTTON_TEXTS_FUNC](t, a);
            s = S.slice(1), i = S[0] || i;
          }
          return [s, i];
        }(J, v, O, g, M, D),
        se = (0, i.Z)(le, 2),
        ie = se[0],
        oe = se[1],
        ce = function (e, r, n, t, a, l, s) {
          if (e.length > 0 && void 0 !== r && !e.every(function (e) {
            return r.includes(e);
          })) return [!1, "".concat(s, " \u8BF7\u9009\u62E9\u7B26\u5408\u6761\u4EF6\u7684\u724C\u3002")];
          if (n !== c.sl.NO_SELECT) {
            var i = we(n);
            if (i >= 0 && e.length !== i) return [!1, "".concat(s, " \u8BF7\u9009\u62E9").concat(i, "\u5F20\u724C\u3002")];
          }
          if (l !== c.Ld.NO_SELECT) {
            var o = Ze(l);
            if (o >= 0 && t.length !== o || l === c.Ld.SELECT_OTHER_PLAYER1_OR_2_OR_3 && t.length > 3 || l === c.Ld.SELECT_OTHER_PLAYER1_OR_2_OR_3 && !t.length || l === c.Ld.SELECT_OTHER_PLAYER1_OR_2 && t.length > 2 || l === c.Ld.SELECT_OTHER_PLAYER1_OR_2 && !t.length) return [!1, "".concat(s, " \u8BF7\u9009\u62E9\u6EE1\u8DB3\u6570\u91CF\u8981\u6C42\u7684\u73A9\u5BB6\u3002")];
          }
          return [!0, s];
        }(g, Q, F, M, 0, V, D = oe),
        _e = (0, i.Z)(ce, 2),
        ue = _e[0],
        de = _e[1];
      D = n.stage !== c.PR.FINISH ? de : "\u6E38\u620F\u7ED3\u675F\uFF01\u83B7\u80DC\u8005\uFF1A\u73A9\u5BB6".concat(n.winners.map(function (e) {
        return e + 1;
      }).join(",\u73A9\u5BB6"));
      var Ee = we(F),
        Se = Ze(V);
      (0, t.useEffect)(function () {
        w([]);
      }, [a, g]);
      var fe = n.eventStack[n.eventStack.length - 1] || {},
        Ne = O ? void 0 === O[c.yP.SELECTABLE_PLAYER_IDS][0] ? 0 : O[c.yP.SELECTABLE_PLAYER_IDS][0] + 1 : 0,
        Ie = ee && [c.sl.SELECT_OTHER_HAND_CARD1, c.sl.SELECT_OTHER_HAND_CARD1_SUIT, c.sl.SELECT_OTHER_EQUIP_HAND_CARD1, c.sl.SELECT_OTHER_EQUIP_HAND_CARD2, c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1].includes(F),
        Ae = ee && [c.sl.SELECT_OTHER_EQUIP_HAND_CARD1, c.sl.SELECT_OTHER_EQUIP_HAND_CARD2, c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1].includes(F),
        pe = ee && [c.sl.SELECT_OTHER_HORSE1].includes(F),
        Pe = ee && [c.sl.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1].includes(F),
        ye = ee && [c.sl.SELECT_OTHER_HAND_CARD1_SUIT].includes(F),
        Le = ee && [c.sl.SELECT_EQUIP_HAND_CARD1, c.sl.SELECT_EQUIP_HAND_CARD2, c.sl.SELECT_EQUIP_HAND_CARD_ANY].includes(F),
        ve = fe.eventType === c.MZ.USE_WU_GU,
        he = [c.sl.SELECT_WU_GU].includes(F) && ee,
        Oe = [c.sl.SELECT_NEW_DRAW_CARD2].includes(F) && ee,
        De = [c.sl.SELECT_GUAN_XING].includes(F) && ee;
      n.stage !== c.PR.FINISH && n.eventStack.length && fe.eventType === c.MZ.DEATH && (T = "\u73A9\u5BB6".concat(fe.playerPos, "\u6FD2\u6B7B"));
      var Te = function () {
        var e = ae.length;
        return 4 === e ? [[ae[1], ae[2]], [ae[0], ae[3]]] : 5 === e ? [[ae[1], ae[2], ae[3]], [ae[0], ae[4]]] : 6 === e ? [[ae[2], ae[3]], [ae[1], ae[4]], [ae[0], ae[5]]] : 7 === e ? [[ae[2], ae[3], ae[4]], [ae[1], ae[5]], [ae[0], ae[6]]] : [ae];
      }();
      return (0, S.jsxs)(S.Fragment, {
        children: [(0, S.jsx)("div", {
          className: "flex items-center justify-center",
          children: "".concat((0, I.xJ)(n.rule, N, !1), "\u6478\u724C\u5806").concat(n.drawCards.length, "\u5F20")
        }), (0, S.jsxs)("div", {
          className: "flex-grow flex flex-col sgs-public-panel",
          children: [Te.map(function (e, t) {
            return (0, S.jsx)("div", {
              className: "flex flex-wrap items-start justify-between",
              children: e.map(function (e, a) {
                return function (e, t) {
                  return (0, S.jsx)("div", {
                    className: "m-1",
                    children: (0, S.jsx)(A, {
                      room: r,
                      view: n,
                      send: s,
                      hisId: e,
                      isHisTurn: z.includes(e),
                      selectedPlayerIds: M,
                      hp: t,
                      onClick: function () {
                        if (Se) if (M.includes(e)) w(M.filter(function (r) {
                          return r !== e;
                        }));else {
                          if ($ && !$.includes(e)) return;
                          w(1 === Se ? [e] : 2 === Se ? function (r) {
                            var n = [].concat((0, o.Z)(r), [e]);
                            return n.length > 2 ? n.slice(n.length - 2) : n;
                          } : [].concat((0, o.Z)(M), [e]));
                        }
                      }
                    })
                  }, e);
                }(e, 0 === t ? 0 : 0 === a ? 1 : 2);
              })
            }, t);
          }), (Ie || Ae || Ae || pe || Pe) && (0, S.jsxs)("div", {
            className: "border rounded w-fit mx-auto my-2 px-2 pb-2",
            children: [(0, S.jsx)("div", {
              className: "text-center text-xs mt-2",
              children: "\u8BF7\u9009\u73A9\u5BB6".concat(Ne, "\u7684\u724C")
            }), Ie && (0, S.jsx)("div", {
              className: "mt-2 flex items-center justify-center sgs-card-small-list",
              children: n.playerHandCard[Ne - 1].map(function (e, r) {
                return (0, S.jsx)(h, {
                  className: g.includes(-r - 1) ? "sgs-select" : "",
                  onClick: function () {
                    G(function (e) {
                      return Ye(e, -r - 1, Ee);
                    });
                  }
                }, r);
              })
            }), (Ae || pe) && (0, S.jsx)("div", {
              className: "mt-2 flex items-center justify-center sgs-card-small-list",
              children: (Ae ? [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE] : [c.MX.MINUS_HORSE, c.MX.PLUS_HORSE]).map(function (e) {
                var r = n.playerEquip[Ne - 1][e];
                if (r) {
                  var t = r[c.ao.CARD_ID];
                  return (0, S.jsx)(p, {
                    id: t,
                    className: g.includes(t) ? "sgs-select" : "",
                    onClick: function () {
                      G(function (e) {
                        return Ye(e, t, Ee);
                      });
                    }
                  }, e);
                }
                return null;
              })
            }), Pe && !!n.playerJudge && !!n.playerJudge.length && (0, S.jsx)("div", {
              className: "mt-2 flex items-center justify-center sgs-card-small-list",
              children: n.playerJudge[Ne - 1].map(function (e, r) {
                var n = e[c.K_.CARD_ID];
                return (0, S.jsx)(p, {
                  id: n,
                  className: g.includes(n) ? "sgs-select" : "",
                  onClick: function () {
                    G(function (e) {
                      return Ye(e, n, Ee);
                    });
                  }
                }, r);
              })
            }), ye && (0, S.jsxs)("div", {
              className: "mt-2 text-center flex items-center justify-center",
              children: ["\u731C\u82B1\u8272\uFF0C\u4F60\u731C\u7684\u662F".concat(-1 === b ? "" : d.If[b]), d.If.map(function (e, r) {
                return (0, S.jsx)(l.Z, {
                  className: "mx-1",
                  small: !0,
                  disabled: b === r,
                  onClick: function () {
                    return j(r);
                  },
                  children: e
                }, r);
              })]
            })]
          }), (0, S.jsx)(U, {
            view: n,
            version: a,
            myPos: f
          }), ve && (0, S.jsxs)("div", {
            className: "mt-2 mx-auto border rounded p-2",
            children: ["\u4E00\u4EBA\u9009\u4E00\u5F20", (0, S.jsx)("div", {
              className: "mt-2 flex items-center justify-center sgs-card-small-list",
              children: fe.wuGuCardIds.map(function (e, r) {
                return (0, S.jsx)(p, {
                  id: e,
                  className: g.includes(e) ? "sgs-select" : "",
                  style: {
                    filter: fe.wuGuSelectedPlayerPosList[r] ? "grayscale(100%)" : "none"
                  },
                  onClick: function () {
                    !fe.wuGuSelectedPlayerPosList[r] && he && G([e]);
                  }
                }, r);
              })
            })]
          }), Oe && (0, S.jsxs)("div", {
            className: "mt-2 mx-auto border rounded p-2",
            children: ["\u9009\u724C\u9009\u4EBA", (0, S.jsx)("div", {
              className: "mt-2 flex items-center justify-center sgs-card-small-list",
              children: fe.wuGuCardIds.map(function (e, r) {
                return (0, S.jsx)(p, {
                  id: e,
                  className: g.includes(e) ? "sgs-select" : "",
                  onClick: function () {
                    g.includes(e) ? G(g.filter(function (r) {
                      return r !== e;
                    })) : G([].concat((0, o.Z)(g), [e]));
                  }
                }, r);
              })
            })]
          }), De && (0, S.jsx)(Me, {
            wuGuCardIds: fe.wuGuCardIds,
            selectedCardIds: g,
            setSelectedCardIds: G
          }), (0, S.jsxs)("div", {
            className: "mx-auto px-2 w-full flex sgs-hand-panel",
            children: [(0, S.jsx)("div", {
              className: "mr-2 flex flex-col justify-end",
              children: (0, S.jsx)(A, {
                room: r,
                view: n,
                send: s,
                hisId: y,
                hp: 0,
                isHisTurn: u ? ee : z.includes(y),
                selectedPlayerIds: M,
                onClick: function () {
                  Se && (M.includes(y) ? w(M.filter(function (e) {
                    return e !== y;
                  })) : $ && !$.includes(y) || (V === c.Ld.SELECT_PLAYER1 ? w([y]) : V === c.Ld.SELECT_PLAYER2 ? w(function (e) {
                    var r = [].concat((0, o.Z)(e), [y]);
                    return r.length > 2 ? r.slice(r.length - 2) : r;
                  }) : V === c.Ld.SELECT_BY_CARD && w([].concat((0, o.Z)(M), [y]))));
                }
              })
            }), (0, S.jsxs)("div", {
              className: "flex-grow flex flex-col",
              children: [[c.qy.RESPOND_TO_JIN_NANG, c.qy.RESPOND_TO_WU_XIE].includes(n.dcdType) ? (0, S.jsx)(xe, {
                view: n,
                isPlayer: u,
                myId: y,
                version: a,
                usableAction: O,
                selectedCardIds: g,
                updateGameData: _,
                afterUpdate: function () {
                  G([]), w([]), B(E.x.NONE);
                }
              }) : (0, S.jsxs)(S.Fragment, {
                children: [(0, S.jsx)("div", {
                  className: "text-center",
                  children: T
                }), (0, S.jsx)("div", {
                  className: "text-center",
                  children: D
                }), (0, S.jsx)("div", {
                  className: "text-center h-10 mt-2 flex items-center justify-center",
                  children: u && ee && (J !== E.x.NONE || O) && (0, S.jsx)(S.Fragment, {
                    children: ie.map(function (e, r) {
                      return e ? (0, S.jsx)(l.Z, {
                        className: "mr-8",
                        disabled: J !== E.x.NONE && r !== ie.length - 1 && !ue,
                        onClick: function () {
                          return function (e) {
                            if (J !== E.x.NONE) {
                              var r = v.find(function (e) {
                                return e[0] === J;
                              });
                              if (r) {
                                if (e === ie.length - 1) return G([]), w([]), void B(E.x.NONE);
                                var t = r[c.DG.OP_FUNC],
                                  a = (0, I.Z1)(n);
                                R(a), t(a, g, M, e), _(a), G([]), w([]), B(E.x.NONE);
                              } else G([]), w([]), B(E.x.NONE);
                            } else if (O) {
                              var l = O[c.yP.OP_FUNC],
                                s = (0, I.Z1)(n);
                              n.dcdType === c.qy.PLAY_CARD ? k(s) : R(s), l(s, g, M, e, b), _(s), G([]), w([]);
                            }
                          }(r);
                        },
                        children: e
                      }, r) : (0, S.jsx)("div", {
                        className: "w-24 mr-8"
                      }, r);
                    })
                  })
                })]
              }), Le && (0, S.jsx)("div", {
                className: "mt-2 flex items-center justify-center sgs-card-small-list",
                children: [c.MX.WEAPON, c.MX.ARMOR, c.MX.MINUS_HORSE, c.MX.PLUS_HORSE].map(function (e, r) {
                  var t = n.playerEquip[y][e];
                  if (t) {
                    var a = t[c.ao.CARD_ID];
                    return (0, S.jsx)(p, {
                      id: a,
                      className: g.includes(a) ? "sgs-select" : "",
                      style: Q && !Q.includes(a) ? {
                        filter: "grayscale(100%)"
                      } : void 0,
                      onClick: function () {
                        Q && !Q.includes(a) || G(function (e) {
                          return Ye(e, a, Ee);
                        });
                      }
                    }, r);
                  }
                  return null;
                })
              }), (0, S.jsx)("div", {
                children: u && n.heroSkills[y].map(function (e, r) {
                  return (0, S.jsx)(l.Z, {
                    small: !0,
                    disabled: !v.map(function (e) {
                      return e[0];
                    }).includes(e),
                    className: "mr-2 mt-1".concat(J === e ? " sgs-select" : ""),
                    onClick: function () {
                      J === e ? B(E.x.NONE) : (B(e), G([]), w([]));
                    },
                    children: E.H[e][0] + (J === e ? "\u3010\u5DF2\u9009\u62E9\u3011" : "")
                  }, r);
                })
              }), (0, S.jsx)("div", {
                className: "sgs-card-list",
                ref: ne,
                children: u && re.map(function (e, r) {
                  return (0, S.jsx)(p, {
                    id: e,
                    alignLeft: te < 50,
                    className: "absolute",
                    style: {
                      left: te * r,
                      top: g.includes(e) ? 4 : 24,
                      filter: Q && !Q.includes(e) ? "grayscale(100%)" : "none"
                    },
                    onClick: function () {
                      if (Ee) {
                        if (!(F > c.sl.SELECT_EQUIP_HAND_CARD_ANY)) if (g.includes(e)) G(function (r) {
                          return r.filter(function (r) {
                            return r !== e;
                          });
                        });else {
                          if (Q && !Q.includes(e)) return;
                          G(1 === Ee ? [e] : 2 === Ee ? function (r) {
                            var n = [].concat((0, o.Z)(r), [e]);
                            return n.length > 2 ? n.slice(n.length - 2) : n;
                          } : [].concat((0, o.Z)(g), [e]));
                        }
                      } else G([]);
                    }
                  }, e);
                })
              })]
            })],
            "data-guide-target": "sgs.hand",
            "data-room-region": "sgs.hand"
          })]
        })]
      });
    },
    Be = n(575),
    Ke = n(3366);
  var Xe = function (e) {
    var r = e.room,
      n = e.view,
      a = (e.version, e.send),
      s = e.updateGameData,
      o = (0, t.useState)(0),
      d = (0, i.Z)(o, 2),
      E = d[0],
      f = d[1],
      p = r.position,
      P = !!p,
      y = P ? p - 1 : 0,
      L = [],
      v = r.playerList.length,
      h = (0, I.bg)(n.rule, v)[c.Sp.MODE],
      O = n.stage === c.PR.CHOOSE0;
    return P && (h === c.D7.ZHU_MODE ? (O && n.roles[y] === c.XP.ZHU && (L = n.heroCandidates[y]), O || n.roles[y] === c.XP.ZHU || (L = n.heroCandidates[y])) : L = n.roles[y] === c.XP.FAN ? n.heroCandidates[1] : n.heroCandidates[0]), (0, S.jsxs)("div", {
      className: "text-center",
      children: [(0, S.jsx)("div", {
        children: (0, I.xJ)(n.rule, v, !0)
      }), (0, S.jsx)("div", {
        children: "\u9009\u82F1\u96C4\u9636\u6BB5(\u73A9\u5BB6".concat(n.whoseTurn + 1, "\u5148\u51FA\u724C)")
      }), (0, S.jsx)("div", {
        className: "flex flex-wrap items-start justify-center",
        children: new Array(v).fill(0).map(function (e, t) {
          return (0, S.jsxs)("div", {
            className: "m-2",
            children: [(0, I.eg)(n, p, t), (0, I.ri)(n, p, t) ? (0, S.jsx)(A, {
              room: r,
              view: n,
              send: a,
              hisId: t,
              hp: 0,
              isHisTurn: !1,
              selectedPlayerIds: []
            }) : (0, S.jsx)(_.ZP, {
              className: "m-2",
              room: r,
              index: t,
              send: a,
              isTurn: !n.hero[t] && (h !== c.D7.ZHU_MODE || (O ? n.roles[t] === c.XP.ZHU : n.roles[t] !== c.XP.ZHU))
            })]
          }, t);
        })
      }), L.length > 0 && (0, S.jsx)("div", {
        children: "\u4ECE\u4E0B\u65B9\u9009\u82F1\u96C4\uFF1A".concat(h === c.D7.TEAM_MODE ? "\u7EC4\u961F\u6A21\u5F0F\uFF0C\u5171\u4EAB\u9009\u5C06\uFF0C\u4E0D\u80FD\u548C\u961F\u53CB\u51B2\u7A81" : "")
      }), (0, S.jsx)("div", {
        className: "flex flex-wrap items-center justify-center",
        children: L.map(function (e, r) {
          var t = (0, I.eg)(n, p, y);
          return (0, S.jsx)("div", {
            className: "m-2",
            children: companionBridge.heroCard ? (0, S.jsx)(companionBridge.heroCard, {
              ...{
                id: e,
                pid: r,
                color: 0,
                roleName: t,
                count: {
                  "\u4e3b": 0,
                  "\u5927\u5fe0": 0,
                  "\u5fe0": 0,
                  "\u53cd": 1,
                  "\u5185": 2,
                  "?": 2
                }[t] || 0,
                blood: u.V6[e][u.$.BLOOD] + ("\u4E3B" === t || "\u5927\u5FE0" === t ? 1 : 0),
                onClick: function () {
                  return f(e);
                },
                className: E === e ? "sgs-select" : "",
                style: n.hero.findIndex(function (r) {
                  return r === e;
                }) >= 0 ? {
                  filter: "grayscale(100%)"
                } : void 0
              },
              children: (0, S.jsx)(N, {
                id: e,
                pid: r,
                color: 0,
                roleName: t,
                count: {
                  "\u4e3b": 0,
                  "\u5927\u5fe0": 0,
                  "\u5fe0": 0,
                  "\u53cd": 1,
                  "\u5185": 2,
                  "?": 2
                }[t] || 0,
                blood: u.V6[e][u.$.BLOOD] + ("\u4E3B" === t || "\u5927\u5FE0" === t ? 1 : 0),
                onClick: function () {
                  return f(e);
                },
                className: E === e ? "sgs-select" : "",
                style: n.hero.findIndex(function (r) {
                  return r === e;
                }) >= 0 ? {
                  filter: "grayscale(100%)"
                } : void 0
              })
            }) : (0, S.jsx)(N, {
              id: e,
              pid: r,
              color: 0,
              roleName: t,
              count: {
                "\u4e3b": 0,
                "\u5927\u5fe0": 0,
                "\u5fe0": 0,
                "\u53cd": 1,
                "\u5185": 2,
                "?": 2
              }[t] || 0,
              blood: u.V6[e][u.$.BLOOD] + ("\u4E3B" === t || "\u5927\u5FE0" === t ? 1 : 0),
              onClick: function () {
                return f(e);
              },
              className: E === e ? "sgs-select" : "",
              style: n.hero.findIndex(function (r) {
                return r === e;
              }) >= 0 ? {
                filter: "grayscale(100%)"
              } : void 0
            })
          }, e);
        })
      }), L.length > 0 && !n.hero[y] && (0, S.jsx)("div", {
        children: (0, S.jsx)(l.Z, {
          className: "mt-4",
          primary: !0,
          disabled: 0 === E,
          onClick: function () {
            if (n.hero.findIndex(function (e) {
              return e === E;
            }) >= 0) (0, Ke.Z)("\u961F\u53CB\u5DF2\u7ECF\u9009\u8FD9\u4E2A\u82F1\u96C4\u4E86");else {
              var e = function (e, r, n) {
                companionBridge.sink({
                  type: "sgs-hero",
                  hero: r
                });
                return e;
              }(n, E, y);
              s(e);
            }
          },
          children: "\u786E\u5B9A"
        })
      })]
    });
  };
  var be = function (e) {
    var r = e.room,
      n = e.game,
      t = e.send,
      i = undefined,
      o = e.view,
      u = !!r.position;
    (0, s.N)([]);
    var d = function (e) {
      t(a.Z.PlayerUpdateGameData, {
        data: Be.L.encode((0, I.qA)(e)).finish()
      });
    };
    return (0, S.jsxs)(S.Fragment, {
      children: [r.owner === r.position && (0, S.jsx)("div", {
        className: "button-container",
        children: (0, S.jsx)("div", {
          className: "button-right",
          children: (0, S.jsx)(l.Z, {
            small: !0,
            onClick: function () {
              return (0, s.Z)("\u786E\u8BA4\u7ED3\u675F\u6E38\u620F\u5417\uFF1F", function () {
                return t(a.Z.OwnerExitGame, {
                  data: Be.L.encode({
                    rule: o.rule
                  }).finish()
                });
              });
            },
            children: "\u7ED3\u675F\u6E38\u620F"
          })
        })
      }), I.$H.V >= o.v ? [c.PR.CHOOSE0, c.PR.CHOOSE1].includes(o.stage) ? (0, S.jsx)(Xe, {
        room: r,
        view: o,
        version: n.version,
        send: t,
        updateGameData: d
      }) : (0, S.jsx)(Je, {
        room: r,
        view: o,
        version: n.version,
        updateGameData: d,
        send: t
      }) : (0, S.jsxs)(S.Fragment, {
        children: [(0, S.jsx)("div", {
          className: "flex flex-wrap items-center justify-center",
          children: r.playerList.map(function (e, n) {
            return (0, S.jsx)(_.ZP, {
              className: "m-2",
              room: r,
              index: n,
              send: t
            }, n);
          })
        }), (0, S.jsxs)("div", {
          className: "m-2 text-center",
          children: ["\u4F60\u7684\u7F51\u9875\u7248\u672C\u548C\u623F\u4E3B\u5F00\u5C40\u65F6\u6240\u7528\u7248\u672C\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u4F9D\u6B21\u5C1D\u8BD5\uFF1A", (0, S.jsx)("br", {}), "1\u3001\u5237\u65B0\u9875\u9762", (0, S.jsx)("br", {}), "2\u3001\u8BA9\u623F\u4E3B\u7ED3\u675F\u6E38\u620F\u91CD\u5F00"]
        })]
      }), !u && (0, S.jsx)("div", {
        className: "text-center text-2xl mt-12",
        children: "\u89C2\u6218\u4E2D"
      })]
    });
  };
  var companionBridge = n.bridge;
  r.actionSpec = ke;
  r.chooseHero = function (e, r, n) {
    var t = (0, I.Z1)(e);
    t.hero[n] = r, (0, I.bg)(t.rule, t.hero.length)[c.Sp.MODE] === c.D7.ZHU_MODE && (t.heroCandidates[n] = []);
    var a = t.stage === c.PR.CHOOSE0;
    if (t.playerBlood[n] = u.V6[r][u.$.BLOOD] + (e.roles[n] === c.XP.ZHU ? 1 : 0), a) {
      t.stage = c.PR.CHOOSE1;
      var l = (0, g.T)(new Array(u.V6.length - 1).fill(0).map(function (e, r) {
          return r + 1;
        }).filter(function (e) {
          return e !== r;
        })),
        s = t.hero.length - 1,
        i = Math.min(4, Math.floor(l.length / s)),
        o = 0;
      return t.heroCandidates.forEach(function (e, r) {
        r !== n && (t.heroCandidates[r] = l.slice(o * i, (o + 1) * i), o++);
      }), t;
    }
    if (t.hero.every(function (e) {
      return e;
    })) {
      t.heroCandidates = new Array(e.hero.length).fill([]), t.stage = c.PR.PLAY, t.whichStep = c.p6.BEFORE_JUDGE;
      var _ = (0, I.my)((0, I.qA)(t), t.hero.length);
      return fe(_), _;
    }
    return t;
  };
  r.resolveCounterspell = function (e) {
    R(e);
    (function (e) {
      if (e.dcdType !== c.qy.RESPOND_TO_WU_XIE) {
        var r = e.eventStack[e.eventStack.length - 1];
        if (r) {
          var n = r.eventType,
            t = r.playerPos,
            a = r.targetPlayerPos,
            l = t - 1;
          if (n === c.MZ.USE_WU_ZHONG) return e.eventStack.pop(), W(e, 2, l).forEach(function (r) {
            return Z(e, r, l);
          }), void fe(e);
          if (n === c.MZ.USE_GUO_HE) return e.dcdType = c.qy.RESPOND_TO_GUO_HE, void (e.dcdPlayerId = t - 1);
          if (n === c.MZ.USE_SHUN_SHOU) return e.dcdType = c.qy.RESPOND_TO_SHUN_SHOU, void (e.dcdPlayerId = t - 1);
          if (n === c.MZ.USE_JUE_DOU) return e.dcdType = c.qy.RESPOND_TO_JUE_DOU, void (e.dcdPlayerId = a - 1);
          if (n === c.MZ.USE_JIE_DAO) return e.dcdType = c.qy.RESPOND_TO_JIE_DAO, void (e.dcdPlayerId = a - 1);
          if (n === c.MZ.USE_HUO_GONG) return e.dcdType = c.qy.RESPOND_TO_HUO_GONG_SHOW, void (e.dcdPlayerId = a - 1);
          if (n === c.MZ.USE_NAN_MAN) return e.dcdType = c.qy.RESPOND_TO_NAN_MAN, void (e.dcdPlayerId = a - 1);
          if (n === c.MZ.USE_WAN_JIAN) return e.dcdType = c.qy.RESPOND_TO_WAN_JIAN, void (e.dcdPlayerId = a - 1);
          if (n === c.MZ.USE_TAO_YUAN) return F(e, a - 1, 1), void (r.targetPlayerPosList.length ? (r.targetPlayerPos = r.targetPlayerPosList[0], r.targetPlayerPosList = r.targetPlayerPosList.slice(1), _e(e)) : (e.eventStack.pop(), fe(e)));
          if (n === c.MZ.USE_WU_GU) return e.dcdType = c.qy.RESPOND_TO_WU_GU, void (e.dcdPlayerId = a - 1);
          n === c.MZ.USE_TIE_SUO && (e.playerConn[a - 1] = 1 - e.playerConn[a - 1], r.targetPlayerPosList.length ? (r.targetPlayerPos = r.targetPlayerPosList[0], r.targetPlayerPosList = r.targetPlayerPosList.slice(1)) : e.eventStack.pop(), fe(e));
        } else if (e.whichStep === c.p6.JUDGING) {
          var s,
            i = e.whoseTurn,
            o = e.playerJudge[i] || [],
            _ = o[o.length - 1][c.K_.REAL_TYPE];
          Ue(e, (s = {}, (0, C.Z)(s, c.BY.SHAN_DIAN, c.MZ.JUDGE_SHAN_DIAN), (0, C.Z)(s, c.BY.LE_BU, c.MZ.JUDGE_LE_BU), (0, C.Z)(s, c.BY.BING_LIANG, c.MZ.JUDGE_BING_LIANG), s)[_], i + 1);
        }
      } else {
        var u = e.eventStack[e.eventStack.length - 1];
        if (u) {
          var d = u.eventType,
            E = u.targetPlayerPosList;
          if ([c.MZ.USE_NAN_MAN, c.MZ.USE_WAN_JIAN, c.MZ.USE_TAO_YUAN, c.MZ.USE_WU_GU, c.MZ.USE_TIE_SUO].includes(d)) return E.length ? (u.targetPlayerPos = E[0], u.targetPlayerPosList = E.slice(1)) : e.eventStack.pop(), void fe(e);
          e.eventStack.pop();
        } else if (e.whichStep === c.p6.JUDGING) {
          var S = e.whoseTurn,
            f = e.playerJudge[S] || [],
            N = f[f.length - 1][c.K_.REAL_TYPE],
            A = e.playerJudge[S].pop();
          if (N === c.BY.SHAN_DIAN) {
            var p = (0, I.XM)(e, S);
            e.playerJudge[p].some(function (e) {
              return e[c.K_.REAL_TYPE] === c.BY.SHAN_DIAN;
            }) && (p = (0, I.XM)(e, p)) === S ? (e.playerJudge[p].splice(0, 0, A), e.skipShanDian = c.aG.SKIP) : e.playerJudge[p].push(A), e.showCards.push({
              cardId: A[c.K_.CARD_ID],
              realType: A[c.K_.REAL_TYPE],
              fromPlayerPos: S + 1,
              toPlayerPos: p + 1,
              isDirectMove: S === p ? 0 : 1
            });
          } else e.cardPos[A[c.K_.CARD_ID]] = c.Yp.PLAYED;
        }
        fe(e);
      }
    })(e);
  };
  r.reset = R;
  r.resetPlay = k;
  r.cardCount = we;
  r.targetCount = Ze;
  r.advance = fe;
  var companionOriginalSpec = ke;
  ke = function (view, position) {
    var spec = companionOriginalSpec(view, position);
    if (!companionBridge.sink) return spec;
    if (spec.usableAction) {
      spec.usableAction = spec.usableAction.slice();
      spec.usableAction[c.yP.OP_FUNC] = function (state, cards, targets, button, option) {
        companionBridge.sink({
          type: 'sgs-choice',
          cards,
          targets,
          button,
          option: option || 0,
          skill: -1
        });
      };
    }
    spec.usableSkills = spec.usableSkills.map(function (skill) {
      var result = skill.slice();
      result[c.DG.OP_FUNC] = function (state, cards, targets, button) {
        companionBridge.sink({
          type: 'sgs-choice',
          cards,
          targets,
          button,
          option: 0,
          skill: skill[0]
        });
      };
      return result;
    });
    return spec;
  };
},
8655: function (e, r, n) {
  var t, a, l, s, i, o, c, _, u, d, E, S, f, N, I, A, p, P, y, L, v, h, O, D, T, U, C, H, g, R, k, G, m, x, M, w, Z, Y, J;
  n.d(r, {
    BY: function () {
      return u;
    },
    D7: function () {
      return a;
    },
    DG: function () {
      return N;
    },
    DZ: function () {
      return w;
    },
    Gb: function () {
      return G;
    },
    Jk: function () {
      return T;
    },
    K_: function () {
      return o;
    },
    Ld: function () {
      return f;
    },
    Lm: function () {
      return k;
    },
    M1: function () {
      return d;
    },
    MP: function () {
      return Z;
    },
    MX: function () {
      return s;
    },
    MZ: function () {
      return E;
    },
    PR: function () {
      return t;
    },
    RW: function () {
      return p;
    },
    Sd: function () {
      return P;
    },
    Sp: function () {
      return l;
    },
    TY: function () {
      return H;
    },
    Uy: function () {
      return y;
    },
    V8: function () {
      return L;
    },
    XE: function () {
      return U;
    },
    XP: function () {
      return c;
    },
    Yp: function () {
      return _;
    },
    Z$: function () {
      return R;
    },
    aG: function () {
      return M;
    },
    ao: function () {
      return i;
    },
    d6: function () {
      return C;
    },
    p6: function () {
      return J;
    },
    qI: function () {
      return v;
    },
    qy: function () {
      return A;
    },
    r8: function () {
      return Y;
    },
    sl: function () {
      return S;
    },
    yE: function () {
      return m;
    },
    yP: function () {
      return I;
    },
    ym: function () {
      return x;
    }
  }), function (e) {
    e[e.CHOOSE0 = 1] = "CHOOSE0", e[e.CHOOSE1 = 2] = "CHOOSE1", e[e.PLAY = 0] = "PLAY", e[e.FINISH = 3] = "FINISH";
  }(t || (t = {})), function (e) {
    e[e.ZHU_MODE = 0] = "ZHU_MODE", e[e.TEAM_MODE = 1] = "TEAM_MODE";
  }(a || (a = {})), function (e) {
    e[e.TOTAL_CARD_COUNT = 0] = "TOTAL_CARD_COUNT", e[e.MODE = 1] = "MODE";
  }(l || (l = {})), function (e) {
    e[e.WEAPON = 0] = "WEAPON", e[e.ARMOR = 1] = "ARMOR", e[e.MINUS_HORSE = 2] = "MINUS_HORSE", e[e.PLUS_HORSE = 3] = "PLUS_HORSE";
  }(s || (s = {})), function (e) {
    e[e.CARD_ID = 0] = "CARD_ID", e[e.REAL_TYPE = 1] = "REAL_TYPE";
  }(i || (i = {})), function (e) {
    e[e.CARD_ID = 0] = "CARD_ID", e[e.REAL_TYPE = 1] = "REAL_TYPE";
  }(o || (o = {})), function (e) {
    e[e.ZHONG = 0] = "ZHONG", e[e.FAN = 1] = "FAN", e[e.ZHU = 2] = "ZHU", e[e.NEI = 3] = "NEI";
  }(c || (c = {})), function (e) {
    e[e.TO_DRAW = 0] = "TO_DRAW", e[e.PLAYED = 1] = "PLAYED", e[e.USING = 2] = "USING";
  }(_ || (_ = {})), function (e) {
    e[e.SHA = 0] = "SHA", e[e.LEI_SHA = 1] = "LEI_SHA", e[e.HUO_SHA = 2] = "HUO_SHA", e[e.SHAN = 3] = "SHAN", e[e.TAO = 4] = "TAO", e[e.JIU = 5] = "JIU", e[e.WU_XIE = 6] = "WU_XIE", e[e.WU_ZHONG = 7] = "WU_ZHONG", e[e.GUO_HE = 8] = "GUO_HE", e[e.SHUN_SHOU = 9] = "SHUN_SHOU", e[e.JIE_DAO = 10] = "JIE_DAO", e[e.JUE_DOU = 11] = "JUE_DOU", e[e.HUO_GONG = 12] = "HUO_GONG", e[e.NAN_MAN = 13] = "NAN_MAN", e[e.WAN_JIAN = 14] = "WAN_JIAN", e[e.WU_GU = 15] = "WU_GU", e[e.TAO_YUAN = 16] = "TAO_YUAN", e[e.TIE_SUO = 17] = "TIE_SUO", e[e.SHAN_DIAN = 18] = "SHAN_DIAN", e[e.LE_BU = 19] = "LE_BU", e[e.BING_LIANG = 20] = "BING_LIANG";
  }(u || (u = {})), function (e) {
    e[e.ZHU_GE = 21] = "ZHU_GE", e[e.CI_XIONG = 22] = "CI_XIONG", e[e.HAN_BING = 23] = "HAN_BING", e[e.QING_GANG = 24] = "QING_GANG", e[e.GU_DING = 25] = "GU_DING", e[e.GUAN_SHI = 26] = "GUAN_SHI", e[e.ZHANG_BA = 27] = "ZHANG_BA", e[e.QING_LONG = 28] = "QING_LONG", e[e.FANG_TIAN = 29] = "FANG_TIAN", e[e.ZHU_QUE = 30] = "ZHU_QUE", e[e.QI_LIN = 31] = "QI_LIN", e[e.BA_GUA = 32] = "BA_GUA", e[e.BAI_YIN = 33] = "BAI_YIN", e[e.REN_WANG = 34] = "REN_WANG", e[e.TENG_JIA = 35] = "TENG_JIA", e[e.JIN_GONG = 36] = "JIN_GONG", e[e.FANG_YU = 37] = "FANG_YU";
  }(d || (d = {})), function (e) {
    e[e.SHA = 1] = "SHA", e[e.SHA_MULTI = 2] = "SHA_MULTI", e[e.BEFORE_HURT = 3] = "BEFORE_HURT", e[e.USE_WU_ZHONG = 4] = "USE_WU_ZHONG", e[e.USE_GUO_HE = 5] = "USE_GUO_HE", e[e.USE_SHUN_SHOU = 6] = "USE_SHUN_SHOU", e[e.USE_JUE_DOU = 7] = "USE_JUE_DOU", e[e.USE_JIE_DAO = 8] = "USE_JIE_DAO", e[e.USE_HUO_GONG = 9] = "USE_HUO_GONG", e[e.USE_NAN_MAN = 10] = "USE_NAN_MAN", e[e.USE_WAN_JIAN = 11] = "USE_WAN_JIAN", e[e.USE_TAO_YUAN = 12] = "USE_TAO_YUAN", e[e.USE_WU_GU = 13] = "USE_WU_GU", e[e.USE_TIE_SUO = 14] = "USE_TIE_SUO", e[e.NOT_USE_SKILL_SHA_AIM = 15] = "NOT_USE_SKILL_SHA_AIM", e[e.NOT_USE_SKILL_AFTER_SHAN = 16] = "NOT_USE_SKILL_AFTER_SHAN", e[e.NOT_USE_SKILL_HURT = 17] = "NOT_USE_SKILL_HURT", e[e.NOT_FINISH_SKILL_FAN_JIAN = 18] = "NOT_FINISH_SKILL_FAN_JIAN", e[e.DEATH = 19] = "DEATH", e[e.SKILL_HU_JIA = 20] = "SKILL_HU_JIA", e[e.SKILL_JI_JIANG = 21] = "SKILL_JI_JIANG", e[e.JUDGE_BA_GUA = 22] = "JUDGE_BA_GUA", e[e.JUDGE_LE_BU = 23] = "JUDGE_LE_BU", e[e.JUDGE_BING_LIANG = 24] = "JUDGE_BING_LIANG", e[e.JUDGE_SHAN_DIAN = 25] = "JUDGE_SHAN_DIAN", e[e.JUDGE_SKILL_GANG_LIE = 26] = "JUDGE_SKILL_GANG_LIE", e[e.JUDGE_SKILL_LUO_SHEN = 27] = "JUDGE_SKILL_LUO_SHEN", e[e.JUDGE_SKILL_TIE_JI = 28] = "JUDGE_SKILL_TIE_JI", e[e.TIE_SUO_HURT = 29] = "TIE_SUO_HURT";
  }(E || (E = {})), function (e) {
    e[e.NO_SELECT = 0] = "NO_SELECT", e[e.SELECT_HAND_CARD1 = 1] = "SELECT_HAND_CARD1", e[e.SELECT_HAND_CARD2 = 2] = "SELECT_HAND_CARD2", e[e.SELECT_HAND_CARD_ANY = 3] = "SELECT_HAND_CARD_ANY", e[e.SELECT_EQUIP_HAND_CARD1 = 4] = "SELECT_EQUIP_HAND_CARD1", e[e.SELECT_EQUIP_HAND_CARD2 = 5] = "SELECT_EQUIP_HAND_CARD2", e[e.SELECT_EQUIP_HAND_CARD_ANY = 6] = "SELECT_EQUIP_HAND_CARD_ANY", e[e.SELECT_NEW_DRAW_CARD2 = 7] = "SELECT_NEW_DRAW_CARD2", e[e.SELECT_OTHER_HAND_CARD1 = 8] = "SELECT_OTHER_HAND_CARD1", e[e.SELECT_OTHER_HAND_CARD1_SUIT = 9] = "SELECT_OTHER_HAND_CARD1_SUIT", e[e.SELECT_OTHER_EQUIP_HAND_CARD1 = 10] = "SELECT_OTHER_EQUIP_HAND_CARD1", e[e.SELECT_OTHER_EQUIP_HAND_CARD2 = 11] = "SELECT_OTHER_EQUIP_HAND_CARD2", e[e.SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1 = 12] = "SELECT_OTHER_EQUIP_HAND_JUDGE_CARD1", e[e.SELECT_OTHER_HORSE1 = 13] = "SELECT_OTHER_HORSE1", e[e.SELECT_WU_GU = 14] = "SELECT_WU_GU", e[e.SELECT_GUAN_XING = 15] = "SELECT_GUAN_XING";
  }(S || (S = {})), function (e) {
    e[e.NO_SELECT = 0] = "NO_SELECT", e[e.SELECT_OTHER_PLAYER1 = 1] = "SELECT_OTHER_PLAYER1", e[e.SELECT_OTHER_PLAYER2 = 2] = "SELECT_OTHER_PLAYER2", e[e.SELECT_PLAYER1 = 3] = "SELECT_PLAYER1", e[e.SELECT_PLAYER2 = 4] = "SELECT_PLAYER2", e[e.SELECT_OTHER_PLAYER1_OR_2 = 5] = "SELECT_OTHER_PLAYER1_OR_2", e[e.SELECT_OTHER_PLAYER1_OR_2_OR_3 = 6] = "SELECT_OTHER_PLAYER1_OR_2_OR_3", e[e.SELECT_BY_CARD = 7] = "SELECT_BY_CARD";
  }(f || (f = {})), function (e) {
    e[e.SKILL = 0] = "SKILL", e[e.HINT = 1] = "HINT", e[e.SELECT_CARD_TYPE = 2] = "SELECT_CARD_TYPE", e[e.SELECT_PLAYER_TYPE = 3] = "SELECT_PLAYER_TYPE", e[e.SELECTABLE_CARD_IDS = 4] = "SELECTABLE_CARD_IDS", e[e.SELECTABLE_PLAYER_IDS = 5] = "SELECTABLE_PLAYER_IDS", e[e.OP_FUNC = 6] = "OP_FUNC", e[e.TARGET_PLAYERS_FUNC = 7] = "TARGET_PLAYERS_FUNC";
  }(N || (N = {})), function (e) {
    e[e.SELECT_CARD_TYPE = 0] = "SELECT_CARD_TYPE", e[e.SELECT_PLAYER_TYPE = 1] = "SELECT_PLAYER_TYPE", e[e.SELECTABLE_CARD_IDS = 2] = "SELECTABLE_CARD_IDS", e[e.SELECTABLE_PLAYER_IDS = 3] = "SELECTABLE_PLAYER_IDS", e[e.BUTTON_TEXTS_FUNC = 4] = "BUTTON_TEXTS_FUNC", e[e.OP_FUNC = 5] = "OP_FUNC", e[e.TARGET_PLAYERS_FUNC = 6] = "TARGET_PLAYERS_FUNC";
  }(I || (I = {})), function (e) {
    e[e.NONE = 0] = "NONE", e[e.PLAY_CARD = 1] = "PLAY_CARD", e[e.DISCARD_CARD = 2] = "DISCARD_CARD", e[e.RESPOND_TO_DEATH = 3] = "RESPOND_TO_DEATH", e[e.RESPOND_TO_SHA_DCD_BA_GUA = 4] = "RESPOND_TO_SHA_DCD_BA_GUA", e[e.RESPOND_TO_SHA = 5] = "RESPOND_TO_SHA", e[e.RESPOND_TO_WAN_JIAN_DCD_BA_GUA = 6] = "RESPOND_TO_WAN_JIAN_DCD_BA_GUA", e[e.RESPOND_TO_WAN_JIAN = 7] = "RESPOND_TO_WAN_JIAN", e[e.RESPOND_TO_NAN_MAN = 8] = "RESPOND_TO_NAN_MAN", e[e.RESPOND_TO_JIE_DAO = 9] = "RESPOND_TO_JIE_DAO", e[e.RESPOND_TO_JUE_DOU = 10] = "RESPOND_TO_JUE_DOU", e[e.RESPOND_TO_WU_GU = 11] = "RESPOND_TO_WU_GU", e[e.RESPOND_TO_HUO_GONG_SHOW = 12] = "RESPOND_TO_HUO_GONG_SHOW", e[e.RESPOND_TO_HUO_GONG_DISCARD = 13] = "RESPOND_TO_HUO_GONG_DISCARD", e[e.RESPOND_TO_GUO_HE = 14] = "RESPOND_TO_GUO_HE", e[e.RESPOND_TO_SHUN_SHOU = 15] = "RESPOND_TO_SHUN_SHOU", e[e.RESPOND_TO_JIN_NANG = 16] = "RESPOND_TO_JIN_NANG", e[e.RESPOND_TO_WU_XIE = 17] = "RESPOND_TO_WU_XIE", e[e.DCD_CI_XIONG = 18] = "DCD_CI_XIONG", e[e.DCD_CI_XIONG2 = 19] = "DCD_CI_XIONG2", e[e.DCD_HAN_BING = 20] = "DCD_HAN_BING", e[e.DCD_HAN_BING2 = 21] = "DCD_HAN_BING2", e[e.DCD_QING_LONG = 22] = "DCD_QING_LONG", e[e.DCD_GUAN_SHI = 23] = "DCD_GUAN_SHI", e[e.DCD_QI_LIN = 24] = "DCD_QI_LIN", e[e.DCD_QI_LIN2 = 25] = "DCD_QI_LIN2", e[e.DCD_SKILL_JIAN_XIONG = 26] = "DCD_SKILL_JIAN_XIONG", e[e.DCD_SKILL_FAN_KUI = 27] = "DCD_SKILL_FAN_KUI", e[e.DCD_SKILL_FAN_KUI2 = 28] = "DCD_SKILL_FAN_KUI2", e[e.DCD_SKILL_GANG_LIE = 29] = "DCD_SKILL_GANG_LIE", e[e.DCD_SKILL_GANG_LIE2 = 30] = "DCD_SKILL_GANG_LIE2", e[e.DCD_SKILL_YI_JI = 31] = "DCD_SKILL_YI_JI", e[e.DCD_SKILL_YI_JI2 = 32] = "DCD_SKILL_YI_JI2", e[e.DCD_SKILL_TIAN_XIANG = 33] = "DCD_SKILL_TIAN_XIANG", e[e.DCD_SKILL_HU_JIA = 34] = "DCD_SKILL_HU_JIA", e[e.DCD_SKILL_HU_JIA_BA_GUA = 35] = "DCD_SKILL_HU_JIA_BA_GUA", e[e.DCD_SKILL_HU_JIA_SHAN = 36] = "DCD_SKILL_HU_JIA_SHAN", e[e.DCD_SKILL_LEI_JI = 37] = "DCD_SKILL_LEI_JI", e[e.DCD_SKILL_GUI_CAI = 38] = "DCD_SKILL_GUI_CAI", e[e.DCD_SKILL_GUI_DAO = 39] = "DCD_SKILL_GUI_DAO", e[e.DCD_SKILL_TU_XI = 40] = "DCD_SKILL_TU_XI", e[e.DCD_SKILL_LUO_YI = 41] = "DCD_SKILL_LUO_YI", e[e.DCD_SKILL_GUAN_XING = 42] = "DCD_SKILL_GUAN_XING", e[e.DCD_SKILL_GUAN_XING2 = 43] = "DCD_SKILL_GUAN_XING2", e[e.DCD_SKILL_LUO_SHEN = 44] = "DCD_SKILL_LUO_SHEN", e[e.DCD_SKILL_LIU_LI = 45] = "DCD_SKILL_LIU_LI", e[e.DCD_SKILL_TIE_JI = 46] = "DCD_SKILL_TIE_JI", e[e.DCD_SKILL_JI_JIANG = 47] = "DCD_SKILL_JI_JIANG", e[e.DCD_SKILL_JI_JIANG_SHA = 48] = "DCD_SKILL_JI_JIANG_SHA", e[e.DCD_SKILL_FAN_JIAN = 49] = "DCD_SKILL_FAN_JIAN";
  }(A || (A = {})), function (e) {
    e[e.NEVER_SHA = 0] = "NEVER_SHA", e[e.SHA_ONCE = 1] = "SHA_ONCE", e[e.SHA_TWICE_OR_MORE = 2] = "SHA_TWICE_OR_MORE";
  }(p || (p = {})), function (e) {
    e[e.NEVER_DRUNK = 0] = "NEVER_DRUNK", e[e.DRUNK = 1] = "DRUNK", e[e.EVER_DRUNK_SHA = 2] = "EVER_DRUNK_SHA";
  }(P || (P = {})), function (e) {
    e[e.NEVER_SHA = 0] = "NEVER_SHA", e[e.SHA = 1] = "SHA";
  }(y || (y = {})), function (e) {
    e[e.NONE = 0] = "NONE", e[e.ONE = 1] = "ONE", e[e.TWO_OR_MORE = 2] = "TWO_OR_MORE";
  }(L || (L = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(v || (v = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(h || (h = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.SUCCESS = 1] = "SUCCESS", e[e.FAIL = 2] = "FAIL";
  }(O || (O = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.RED = 1] = "RED", e[e.BLACK = 2] = "BLACK";
  }(D || (D = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(T || (T = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(U || (U = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(C || (C = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(H || (H = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(g || (g = {})), function (e) {
    e[e.NOT_USED = 0] = "NOT_USED", e[e.USED = 1] = "USED";
  }(R || (R = {})), function (e) {
    e[e.NOT_ASK = 0] = "NOT_ASK", e[e.ASK = 1] = "ASK";
  }(k || (k = {})), function (e) {
    e[e.NOT_ASK = 0] = "NOT_ASK", e[e.ASK = 1] = "ASK";
  }(G || (G = {})), function (e) {
    e[e.CAN_ASK = 0] = "CAN_ASK", e[e.NOT_CONTINUE = 1] = "NOT_CONTINUE";
  }(m || (m = {})), function (e) {
    e[e.NOT_ASK = 0] = "NOT_ASK", e[e.ASK = 1] = "ASK";
  }(x || (x = {})), function (e) {
    e[e.NOT_SKIP = 0] = "NOT_SKIP", e[e.SKIP = 1] = "SKIP";
  }(M || (M = {})), function (e) {
    e[e.NOT_SKIP = 0] = "NOT_SKIP", e[e.SKIP = 1] = "SKIP";
  }(w || (w = {})), function (e) {
    e[e.NOT_SKIP = 0] = "NOT_SKIP", e[e.SKIP = 1] = "SKIP";
  }(Z || (Z = {})), function (e) {
    e[e.CAN_SHAN = 0] = "CAN_SHAN", e[e.CANNOT_SHAN = 1] = "CANNOT_SHAN";
  }(Y || (Y = {})), function (e) {
    e[e.BEFORE_JUDGE = 0] = "BEFORE_JUDGE", e[e.JUDGING = 1] = "JUDGING", e[e.BEFORE_DRAW = 2] = "BEFORE_DRAW", e[e.DRAWING = 3] = "DRAWING", e[e.BEFORE_PLAY = 4] = "BEFORE_PLAY", e[e.PLAY_CARD = 5] = "PLAY_CARD", e[e.BEFORE_DISCARD = 6] = "BEFORE_DISCARD", e[e.DISCARDING = 7] = "DISCARDING", e[e.AFTER_DISCARD = 8] = "AFTER_DISCARD";
  }(J || (J = {}));
},
8467: function (e, r, n) {
  n.d(r, {
    $: function () {
      return t;
    },
    Ld: function () {
      return l;
    },
    V6: function () {
      return i;
    },
    Ye: function () {
      return a;
    }
  });
  var t,
    a,
    l,
    s = n(1983);
  n(8655);
  !function (e) {
    e[e.NAME = 0] = "NAME", e[e.SEX = 1] = "SEX", e[e.COUNTRY = 2] = "COUNTRY", e[e.BLOOD = 3] = "BLOOD", e[e.SKILLS = 4] = "SKILLS", e[e.LORD_SKILL = 5] = "LORD_SKILL";
  }(t || (t = {})), function (e) {
    e[e.MALE = 0] = "MALE", e[e.FEMALE = 1] = "FEMALE";
  }(a || (a = {})), function (e) {
    e[e.WEI = 0] = "WEI", e[e.SHU = 1] = "SHU", e[e.WU = 2] = "WU", e[e.QUN = 3] = "QUN";
  }(l || (l = {}));
  var i = [["\ud83d\ude0a", a.MALE, l.WEI, 5, []], ["\xa9\ufe0f", a.MALE, l.WEI, 4, [s.x.JIAN_XIONG]], ["\ud83d\udc34", a.MALE, l.WEI, 3, [s.x.GUI_CAI, s.x.FAN_KUI]], ["\ud83d\udee1\ufe0f", a.MALE, l.WEI, 4, [s.x.GANG_LIE]], ["\ud83d\udc12", a.MALE, l.WEI, 4, [s.x.TU_XI]], ["\ud83e\udd8d", a.MALE, l.WEI, 4, [s.x.LUO_YI]], ["\ud83c\udf73", a.MALE, l.WEI, 3, [s.x.TIAN_DU, s.x.YI_JI]], ["\ud83d\udda4", a.FEMALE, l.WEI, 3, [s.x.QING_GUO, s.x.LUO_SHEN]], ["\ud83e\uddd1\u200d\ud83c\udf84", a.MALE, l.SHU, 4, [s.x.REN_DE]], ["\ud83e\udd4a", a.MALE, l.SHU, 4, [s.x.PAO_XIAO]], ["\ud83c\udf45", a.MALE, l.SHU, 4, [s.x.WU_SHENG]], ["\ud83d\udd2e", a.MALE, l.SHU, 3, [s.x.GUAN_XING, s.x.KONG_CHENG]], ["\ud83c\udf74", a.MALE, l.SHU, 4, [s.x.LONG_DAN]], ["\ud83e\udd77", a.MALE, l.SHU, 4, [s.x.MA_SHU, s.x.TIE_JI]], ["\u262a\ufe0f", a.FEMALE, l.SHU, 3, [s.x.JI_ZHI, s.x.QI_CAI]], ["\ud83d\udcb0", a.MALE, l.WU, 4, [s.x.ZHI_HENG]], ["\ud83d\udeae", a.MALE, l.WU, 4, [s.x.QI_XI]], ["\ud83e\udd11", a.MALE, l.WU, 4, [s.x.KE_JI]], ["\ud83e\udd79", a.MALE, l.WU, 4, [s.x.KU_ROU]], ["\ud83d\ude0f", a.MALE, l.WU, 3, [s.x.YING_ZI, s.x.FAN_JIAN]], ["\ud83e\udd8c", a.MALE, l.WU, 3, [s.x.QIAN_XUN, s.x.LIAN_YING]], ["\ud83d\udc59", a.FEMALE, l.WU, 3, [s.x.JIE_YIN, s.x.XIAO_JI]], ["\ud83d\udc8a", a.MALE, l.QUN, 3, [s.x.JI_JIU, s.x.QING_NANG]], ["\ud83c\udfcb\ufe0f", a.MALE, l.QUN, 4, [s.x.WU_SHUANG]]];
},
1983: function (e, r, n) {
  var t;
  n.d(r, {
    H: function () {
      return a;
    },
    x: function () {
      return t;
    }
  }), function (e) {
    e[e.NONE = -1] = "NONE", e[e.WEAPON_ZHU_GE = 0] = "WEAPON_ZHU_GE", e[e.WEAPON_CI_XIONG = 1] = "WEAPON_CI_XIONG", e[e.WEAPON_HAN_BING = 2] = "WEAPON_HAN_BING", e[e.WEAPON_QING_GANG = 3] = "WEAPON_QING_GANG", e[e.WEAPON_GU_DING = 4] = "WEAPON_GU_DING", e[e.WEAPON_GUAN_SHI = 5] = "WEAPON_GUAN_SHI", e[e.WEAPON_ZHANG_BA = 6] = "WEAPON_ZHANG_BA", e[e.WEAPON_QING_LONG = 7] = "WEAPON_QING_LONG", e[e.WEAPON_FANG_TIAN = 8] = "WEAPON_FANG_TIAN", e[e.WEAPON_ZHU_QUE = 9] = "WEAPON_ZHU_QUE", e[e.WEAPON_QI_LIN = 10] = "WEAPON_QI_LIN", e[e.JIAN_XIONG = 11] = "JIAN_XIONG", e[e.HU_JIA = 12] = "HU_JIA", e[e.FAN_KUI = 13] = "FAN_KUI", e[e.GUI_CAI = 14] = "GUI_CAI", e[e.GANG_LIE = 15] = "GANG_LIE", e[e.TU_XI = 16] = "TU_XI", e[e.LUO_YI = 17] = "LUO_YI", e[e.TIAN_DU = 18] = "TIAN_DU", e[e.YI_JI = 19] = "YI_JI", e[e.QING_GUO = 20] = "QING_GUO", e[e.LUO_SHEN = 21] = "LUO_SHEN", e[e.REN_DE = 22] = "REN_DE", e[e.JI_JIANG = 23] = "JI_JIANG", e[e.PAO_XIAO = 24] = "PAO_XIAO", e[e.WU_SHENG = 25] = "WU_SHENG", e[e.GUAN_XING = 26] = "GUAN_XING", e[e.KONG_CHENG = 27] = "KONG_CHENG", e[e.LONG_DAN = 28] = "LONG_DAN", e[e.MA_SHU = 29] = "MA_SHU", e[e.TIE_JI = 30] = "TIE_JI", e[e.JI_ZHI = 31] = "JI_ZHI", e[e.QI_CAI = 32] = "QI_CAI", e[e.ZHI_HENG = 33] = "ZHI_HENG", e[e.JIU_YUAN = 34] = "JIU_YUAN", e[e.QI_XI = 35] = "QI_XI", e[e.KE_JI = 36] = "KE_JI", e[e.KU_ROU = 37] = "KU_ROU", e[e.YING_ZI = 38] = "YING_ZI", e[e.FAN_JIAN = 39] = "FAN_JIAN", e[e.GUO_SE = 40] = "GUO_SE", e[e.LIU_LI = 41] = "LIU_LI", e[e.QIAN_XUN = 42] = "QIAN_XUN", e[e.LIAN_YING = 43] = "LIAN_YING", e[e.JIE_YIN = 44] = "JIE_YIN", e[e.XIAO_JI = 45] = "XIAO_JI", e[e.JI_JIU = 46] = "JI_JIU", e[e.QING_NANG = 47] = "QING_NANG", e[e.WU_SHUANG = 48] = "WU_SHUANG", e[e.LI_JIAN = 49] = "LI_JIAN", e[e.BI_YUE = 50] = "BI_YUE", e[e.JU_SHOU = 51] = "JU_SHOU", e[e.SHEN_SU = 52] = "SHEN_SU", e[e.KUANG_GU = 53] = "KUANG_GU", e[e.LIE_GONG = 54] = "LIE_GONG", e[e.TIAN_XIANG = 55] = "TIAN_XIANG", e[e.HONG_YAN = 56] = "HONG_YAN", e[e.LEI_JI = 57] = "LEI_JI", e[e.GUI_DAO = 58] = "GUI_DAO", e[e.HUANG_TIAN = 59] = "HUANG_TIAN";
  }(t || (t = {}));
  var a = [["\u65E0\u9650\u6740"], ["\u6740\u5F02\u6027\u5F03\u6478"], ["\u6740\u53EF\u5F032\u724C"], ["\u62D2\u9632\u5177"], ["\u6CA1\u724C\u6740+\u4F24\u5BB3"], ["\u5F032\u547D\u4E2D"], ["2\u724C\u5F53\u6740"], ["\u88AB\u95EA\u518D\u6740"], ["\u5C3E\u724C\u67403"], ["\u6740\u89C6\u4E3A\u706B\u7130\u6740"], ["\u6740\u540E\u4E0B\u5750\u9A91"], ["\u5F97\u4F24\u4F60\u7684\u724C"], ["\u9B4F\u52BF\u529B\u89D2\u8272\u5E2E\u51FA\u95EA"], ["\u5F97\u4F24\u4F60\u4EBA1\u724C"], ["\u6539\u5224\u5B9A"], ["\u5224\u975E\u2665\uFE0F\u53CD\u51FB"], ["\u5077\u724C"], ["\u5C11\u6478+\u4F24\u5BB3"], ["\u83B7\u5F97\u5224\u5B9A\u724C"], ["\u53D7\u4F24\u64782\u5206\u53D1"], ["\u9ED1\u724C\u5F53\u95EA"], ["\u62FF\u8FDE\u5224\u9ED1\u724C"], ["\u9001\u624B\u724C"], ["\u8700\u52BF\u529B\u89D2\u8272\u5E2E\u51FA\u6740"], ["\u65E0\u9650\u6740"], ["\u7EA2\u724C\u5F53\u6740"], ["\u6392\u5E8F\u5F00\u5934\u724C"], ["\u6CA1\u724C\u4E0D\u88AB\u6740\u51B3\u6597"], ["\u6740\u95EA\u4E92\u7528"], ["\u8DDD\u79BB-1"], ["\u6740\u5224\u7EA2\u7981\u95EA"], ["\u7528\u975E\u5EF6\u9526\u64781"], ["\u9526\u56CA\u65E0\u9650\u8DDD"], ["\u6362\u724C"], ["\u5434\u52BF\u529B\u89D2\u8272\u6551\u591A+1\u8840"], ["\u9ED1\u724C\u5F53\u62C6"], ["\u4E0D\u6740\u4E0D\u5F03\u724C"], ["\u81EA\u6B8B\u6478\u724C"], ["\u591A\u64781\u724C"], ["\u8BA9\u4ED6\u731C\u82B1\u8272"], ["\u65B9\u5757\u724C\u53EF\u5F53\u4E50\u4E0D\u601D\u8700\u4F7F\u7528"], ["\u88AB\u6740\u8F6C\u79FB"], ["\u4E0D\u80FD\u6210\u4E3A\u987A\u624B\u7275\u7F8A\u548C\u4E50\u4E0D\u601D\u8700\u7684\u76EE\u6807"], ["\u6CA1\u724C\u65F6\u6478\u724C"], ["\u5F03\u724C\u5F02\u6027\u52A0\u8840"], ["\u8131\u88C5\u5907\u62FF2\u724C"], ["\u7EA2\u724C\u5F53\u6843"], ["\u5F03\u724C\u52A0\u8840"], ["\u97002\u95EA2\u6740"], ["\u8BA92\u7537\u51B3\u6597"], ["\u7ED3\u675F\u64781\u724C"], ["\u64783\u724C\u7FFB\u9762"], ["\u8DF3\u8FC7\u89C6\u4E3A\u6740"], ["\u5438\u8840"], ["\u6740\u6709\u65F6\u5FC5\u4E2D"], ["\u2665\uFE0F\u8F6C\u4F24"], ["\u2660\uFE0F\u4E3A\u2665\uFE0F"], ["\u51FA\u95EA\u5224\u2660\uFE0F-2\u8840"], ["\u6362\u5224\u5B9A\u724C"], ["\u7FA4\u52BF\u529B\u89D2\u8272\u7ED9\u4E3B\u95EA\u7535\u95EA"]];
},
8280: function (e, r, n) {
  n.d(r, {
    Af: function () {
      return a;
    },
    If: function () {
      return l;
    },
    dg: function () {
      return o;
    },
    e3: function () {
      return _;
    },
    fE: function () {
      return i;
    },
    l5: function () {
      return t;
    },
    mc: function () {
      return d;
    },
    s2: function () {
      return S;
    },
    uR: function () {
      return s;
    },
    vr: function () {
      return A;
    },
    zd: function () {
      return N;
    }
  });
  var t,
    a,
    l = ["\u2665\uFE0F", "\u2666\uFE0F", "\u2663\uFE0F", "\u2660\uFE0F"],
    s = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  function i(e) {
    return e % 4;
  }
  function o(e) {
    return e < 4 ? [11, 11, 1, 1][e] : Math.floor(e / 4 - 1) % 13;
  }
  !function (e) {
    e[e.RED = 0] = "RED", e[e.BLACK = 1] = "BLACK";
  }(t || (t = {})), function (e) {
    e[e.HEART = 0] = "HEART", e[e.DIAMOND = 1] = "DIAMOND", e[e.CLUB = 2] = "CLUB", e[e.SPADE = 3] = "SPADE";
  }(a || (a = {}));
  var c = [18, 6, 34, 23, 16, 21, 21, 18, 3, 3, 0, 22, 4, 3, 0, 9, 4, 3, 0, 9, 36, 3, 37, 37, 4, 0, 0, 24, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 9, 4, 4, 10, 27, 3, 0, 10, 13, 14, 11, 11, 11, 3, 3, 32, 32, 15, 9, 8, 8, 15, 9, 8, 8, 31, 26, 0, 28, 19, 3, 19, 19, 7, 3, 13, 13, 7, 3, 0, 0, 7, 3, 0, 0, 0, 3, 0, 0, 7, 3, 0, 6, 8, 29, 6, 8, 37, 36, 6, 36, 6, 30, 33, 25, 12, 4, 35, 35, 12, 4, 5, 5, 2, 2, 20, 1, 4, 2, 1, 1, 4, 3, 1, 1, 2, 3, 1, 1, 3, 3, 1, 1, 3, 5, 5, 5, 2, 3, 17, 20, 3, 3, 17, 17, 3, 12, 17, 17, 6, 37, 17, 6];
  function _(e) {
    return c[e];
  }
  var u = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 6];
  function d(e) {
    return u[e];
  }
  var E = ["\u6740", "\u96F7\u6740", "\u706B\u6740", "\u95EA", "\u6843", "\u9152", "\u65E0\u61C8\u53EF\u51FB", "\u65E0\u4E2D\u751F\u6709", "\uD83D\uDEAE\u724C", "\u987A\u624B\u7275\u7F8A", "\u501F\u5200\u6740\u4EBA", "\u51B3\u6597", "\u706B\u653B", "\u5357\u86EE\u5165\u4FB5", "\u4E07\u7BAD\u9F50\u53D1", "\u4E94\u8C37\u4E30\u767B", "\u6843\u56ED\u7ED3\u4E49", "\u94C1\u7D22\u8FDE\u73AF", "\u95EA\u7535", "\u4E50\u4E0D\u601D\u8700", "\u5175\u7CAE\u5BF8\u65AD", "\u8BF8\u845B\u8FDE\u5F29", "\u96CC\u96C4\u53CC\u80A1\u5251", "\u5BD2\u51B0\u5251", "\u9752\u91ED\u5251", "\u53E4\u952D\u5200", "\u8D2F\u77F3\u65A7", "\u4E08\u516B\u86C7\u77DB", "\u9752\u9F99\u5043\u6708\u5200", "\u65B9\u5929\u753B\u621F", "\u6731\u96C0\u7FBD\u6247", "\u9E92\u9E9F\u5F13", "\u516B\u5366\u9635", "\u767D\u94F6\u72EE\u5B50", "\u4EC1\u738B\u76FE", "\u85E4\u7532", "\u8FDB\u653B\u9A6C", "\u9632\u5FA1\u9A6C"];
  function S(e) {
    return E[e];
  }
  var f = ["", "\u95EA\u7535", "\u706B\u7130", "\u9632\u6740", "\u52A0\u8840", "\u81EA\u6551+\u4F24", "\u62D2\u9526\u56CA", "\u64782\u724C", "\u5F03\u4ED6\u724C", "\u5077\u4ED6\u724C", "\u501F", "\u4E92\u6740", "\u5F03\u540C\u82B1\u4F24", "\u90FD\u51FA\u6740", "\u90FD\u51FA\u95EA", "\u90FD\u62FF\u724C", "\u90FD\u52A0\u8840", "\u6478or\u8FDE", "\u5224\u2660\uFE0F2-9", "\u5224\u975E\u2665\uFE0F", "\u5224\u975E\u2663\uFE0F", "\u65E0\u9650\u6740", "\u6740\u5F02\u6027\u5F03\u6478", "\u6740\u53EF\u5F032", "\u62D2\u9632\u5177", "\u6CA1\u724C\u6740+\u4F24", "\u5F032\u547D\u4E2D", "2\u724C\u5F53\u6740", "\u88AB\u95EA\u518D\u6740", "\u5C3E\u724C\u67403", "\u6740\u89C6\u4E3A\u706B\u7130", "\u6740\u540E\u4E0B\u9A6C", "\u5224\u7EA2\u4E3A\u95EA", "\u6700\u591A-1\u8840", "\u9ED1\u6740\u65E0\u6548", "\u514B\u7FA4\u6740\u6015\u706B\u7130", "\u8DDD-1", "\u8DDD+1"];
  function N(e) {
    return f[e];
  }
  var I = [,,,,,, 9, 9, 9, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5,,,,, -1, 1];
  function A(e) {
    return I[e];
  }
},
5051: function (e, r, n) {
  n.d(r, {
    $H: function () {
      return t;
    },
    Ab: function () {
      return J;
    },
    HW: function () {
      return x;
    },
    Hk: function () {
      return X;
    },
    IN: function () {
      return k;
    },
    JP: function () {
      return B;
    },
    KE: function () {
      return U;
    },
    L8: function () {
      return v;
    },
    Lq: function () {
      return ae;
    },
    M8: function () {
      return f;
    },
    Nu: function () {
      return P;
    },
    Q_: function () {
      return h;
    },
    XM: function () {
      return S;
    },
    Z1: function () {
      return te;
    },
    Zp: function () {
      return O;
    },
    aH: function () {
      return L;
    },
    am: function () {
      return Y;
    },
    bg: function () {
      return j;
    },
    bp: function () {
      return K;
    },
    cW: function () {
      return G;
    },
    eC: function () {
      return H;
    },
    eg: function () {
      return F;
    },
    f: function () {
      return D;
    },
    fo: function () {
      return p;
    },
    hE: function () {
      return E;
    },
    jC: function () {
      return A;
    },
    k_: function () {
      return C;
    },
    my: function () {
      return re;
    },
    nu: function () {
      return N;
    },
    qA: function () {
      return ne;
    },
    qE: function () {
      return b;
    },
    rR: function () {
      return y;
    },
    ri: function () {
      return W;
    },
    s3: function () {
      return g;
    },
    u$: function () {
      return T;
    },
    v0: function () {
      return Q;
    },
    ve: function () {
      return M;
    },
    wH: function () {
      return Z;
    },
    wX: function () {
      return w;
    },
    xJ: function () {
      return q;
    },
    zR: function () {
      return R;
    }
  });
  var t,
    a = n(885),
    l = n(2982),
    s = n(3329),
    i = n(1983),
    o = n(8655),
    c = n(4420),
    _ = n(8467),
    u = n(8280),
    d = n(575);
  function E(e, r, n) {
    return e.heroSkills[r].includes(n);
  }
  function S(e, r) {
    for (var n = e.hero.length, t = (r + 1) % n, a = 0; !e.alivePlayerIds.includes(t) && (t = (t + 1) % n, !(a++ > 100)););
    return t;
  }
  function f(e, r) {
    return e.playerEquip[r][o.MX.WEAPON];
  }
  function N(e, r) {
    return e.playerEquip[r][o.MX.ARMOR];
  }
  function I(e, r, n) {
    if (r === n) return 0;
    var t = e.alivePlayerIds;
    if (!t.includes(r) || !t.includes(n)) return 9;
    var a = t.indexOf(r),
      l = t.indexOf(n),
      s = t.length,
      c = l > a ? l - a : l + s - a,
      _ = a > l ? a - l : a + s - l,
      u = Math.min(c, _);
    return function (e, r) {
      return e.playerEquip[r][o.MX.PLUS_HORSE];
    }(e, n) && u++, e.heroSkills[r].includes(i.x.MA_SHU) && u--, function (e, r) {
      return e.playerEquip[r][o.MX.MINUS_HORSE];
    }(e, r) && u--, Math.max(1, u);
  }
  function A(e, r, n) {
    var t = I(e, r, n),
      a = f(e, r);
    if (a) {
      if ((0, u.vr)(a[o.ao.REAL_TYPE]) >= t) return 1;
    } else if (t < 2) return 1;
    return 0;
  }
  function p(e, r) {
    return e.playerHandCard[r].length > 0;
  }
  function P(e, r) {
    return (0, l.Z)(e.playerHandCard[r]);
  }
  function y(e, r, n) {
    return e.playerHandCard[r].filter(function (e) {
      return (0, u.e3)(e) === n;
    });
  }
  function L(e, r) {
    return e.playerHandCard[r].filter(function (e) {
      return [o.BY.SHA, o.BY.LEI_SHA, o.BY.HUO_SHA].includes((0, u.e3)(e));
    });
  }
  function v(e, r) {
    var n = e.playerEquip[r];
    return !!(n[o.MX.WEAPON] || n[o.MX.ARMOR] || n[o.MX.MINUS_HORSE] || n[o.MX.PLUS_HORSE]);
  }
  function h(e, r, n) {
    var t = e.playerEquip[r],
      a = o.MX.WEAPON;
    return n > o.M1.QI_LIN && (a = o.MX.ARMOR), n > o.M1.TENG_JIA && (a = o.MX.MINUS_HORSE), n > o.M1.JIN_GONG && (a = o.MX.PLUS_HORSE), !!t[a] && t[a][1] === n;
  }
  function O(e, r, n) {
    return e.playerJudge[r].some(function (e) {
      return e[o.K_.REAL_TYPE] === n;
    });
  }
  function D(e, r, n) {
    var t = (0, u.fE)(r);
    return e.heroSkills[n].includes(i.x.HONG_YAN) && t === u.Af.SPADE ? u.Af.HEART : t;
  }
  function T(e, r, n) {
    return D(e, r, n) < u.Af.CLUB ? u.l5.RED : u.l5.BLACK;
  }
  function U(e, r, n) {
    return e.playerHandCard[r].filter(function (t) {
      return D(e, t, r) === n;
    });
  }
  function C(e, r, n) {
    return e.playerHandCard[r].filter(function (t) {
      return T(e, t, r) === n;
    });
  }
  function H(e, r, n) {
    var t = e.playerEquip[r];
    return [o.MX.WEAPON, o.MX.ARMOR, o.MX.MINUS_HORSE, o.MX.PLUS_HORSE].reduce(function (a, l) {
      var s = null === t || void 0 === t ? void 0 : t[l];
      return s && D(e, s[o.ao.CARD_ID], r) === n && a.push(s[o.ao.CARD_ID]), a;
    }, []);
  }
  function g(e, r, n) {
    var t = e.playerEquip[r];
    return [o.MX.WEAPON, o.MX.ARMOR, o.MX.MINUS_HORSE, o.MX.PLUS_HORSE].reduce(function (a, l) {
      var s = null === t || void 0 === t ? void 0 : t[l];
      return s && T(e, s[o.ao.CARD_ID], r) === n && a.push(s[o.ao.CARD_ID]), a;
    }, []);
  }
  function R(e, r) {
    return p(e, r) || v(e, r) || function (e, r) {
      return e.playerJudge[r].length > 0;
    }(e, r);
  }
  function k(e, r) {
    return e.alivePlayerIds.filter(function (e) {
      return e !== r;
    });
  }
  function G(e, r) {
    return e.alivePlayerIds.filter(function (n) {
      return n !== r && _.V6[e.hero[n]][_.$.SEX] === _.Ye.MALE;
    });
  }
  function m(e, r, n) {
    return e.alivePlayerIds.filter(function (t) {
      return t !== r && I(e, r, t) <= n;
    });
  }
  function x(e, r) {
    return function (e, r) {
      return e.alivePlayerIds.filter(function (n) {
        return n !== r && A(e, r, n);
      });
    }(e, r).filter(function (r) {
      return !(e.heroSkills[r].includes(i.x.KONG_CHENG) && !p(e, r));
    });
  }
  function M(e, r) {
    return k(e, r).filter(function (r) {
      return !(e.heroSkills[r].includes(i.x.KONG_CHENG) && !p(e, r));
    });
  }
  function w(e, r) {
    return e.heroSkills[r].includes(i.x.QI_CAI) ? e.alivePlayerIds.filter(function (n) {
      return n !== r && !e.heroSkills[n].includes(i.x.QIAN_XUN);
    }).filter(function (r) {
      return R(e, r);
    }) : m(e, r, 1).filter(function (r) {
      return !e.heroSkills[r].includes(i.x.QIAN_XUN);
    }).filter(function (r) {
      return R(e, r);
    });
  }
  function Z(e, r) {
    return k(e, r).filter(function (r) {
      return R(e, r);
    });
  }
  function Y(e, r) {
    return e.alivePlayerIds.filter(function (n) {
      return n !== r && !O(e, n, o.BY.LE_BU) && !e.heroSkills[n].includes(i.x.QIAN_XUN);
    });
  }
  function J(e, r) {
    return e.heroSkills[r].includes(i.x.QI_CAI) ? k(e, r) : m(e, r, 1).filter(function (r) {
      return !O(e, r, o.BY.BING_LIANG);
    });
  }
  function B(e, r) {
    var n = k(e, r).filter(function (r) {
      return p(e, r);
    });
    return e.playerHandCard[r].length >= 2 && n.push(r), n;
  }
  function K(e) {
    return e.stage === o.PR.FINISH ? [] : e.dcdType === o.qy.RESPOND_TO_JIN_NANG || e.dcdType === o.qy.RESPOND_TO_WU_XIE ? e.alivePlayerIds : [e.dcdPlayerId];
  }
  function X(e, r) {
    return e.stage !== o.PR.FINISH && (e.dcdType === o.qy.RESPOND_TO_JIN_NANG || e.dcdType === o.qy.RESPOND_TO_WU_XIE ? !!e.dcdWuXiePlayers[r] : e.dcdPlayerId === r);
  }
  function b(e, r, n) {
    return e.sort(function (e, t) {
      return (e < r ? e + n : e) - (t < r ? t + n : t);
    });
  }
  function j(e, r) {
    var n = 2 & e ? o.D7.TEAM_MODE : o.D7.ZHU_MODE;
    return r < 3 && (n = o.D7.TEAM_MODE), [1 & e ? 160 : 108, n];
  }
  function W(e, r, n) {
    var t = e.hero.length,
      a = j(e.rule, t)[o.Sp.MODE];
    return !!e.hero[n] && (r === n + 1 || !e.alivePlayerIds.includes(n) || e.stage === o.PR.FINISH || (a === o.D7.ZHU_MODE ? e.roles[n] === o.XP.ZHU : !!(t % 2 && e.roles[r - 1] !== o.XP.FAN) || !!r && (e.roles[r - 1] === o.XP.FAN ? e.roles[n] === o.XP.FAN : e.roles[n] !== o.XP.FAN)));
  }
  function q(e, r, n) {
    var t;
    return j(e, r)[o.Sp.MODE] === o.D7.TEAM_MODE ? (t = "\u7EC4\u961F\u6A21\u5F0F(", 4 === r ? (t += "14\u4E00\u961F\uFF0C23\u4E00\u961F", n && (t += "\uFF1B1\u5148\u51FA\u724C\uFF1B13\u521D\u59CB\u724C\u5C111")) : r % 2 ? (3 === r ? t += "1\u4E00\u961F\uFF0C23" : 5 === r ? t += "13\u4E00\u961F\uFF0C245" : 7 === r ? t += "135\u4E00\u961F\uFF0C2467" : 9 === r && (t += "1357\u4E00\u961F\uFF0C24689"), t += "\u4E00\u961F", n && (t += "\uFF1B1\u5148\u51FA\u724C\uFF1B1\u591A1\u8840\uFF1B\u5FE0\u961F\u53EF\u63D0\u524D\u770B\u5230\u53CD\u961F\u7684\u9009\u5C06\uFF1B\u53CD\u961F\u521D\u59CB\u724C\u5C111")) : (t += "\u6309\u5947\u5076\u5206\u961F", n && (t += "\uFF1B\u968F\u673A\u9009\u4EBA\u5148\u51FA\u724C\uFF1B\u5148\u51FA\u724C\u4EBA\u521D\u59CB\u724C\u5C111")), n && (t += "\uFF1B\u82E5\u6B7B\u5219\u4E0B\u4E2A\u961F\u53CB\u64781\u724C")) : (t = "\u8EAB\u4EFD\u6A21\u5F0F(\u4E3B", t += ["\u53CD\u5185\uFF0C\u8EAB\u4EFD\u900F\u660E", "\u5FE0\u53CD\u5185", "\u5FE0\u53CD\u53CD\u5185", "\u5FE0\u53CD\u53CD\u53CD\u5185", "\u5FE0\u5FE0\u53CD\u53CD\u53CD\u5185", "\u5FE0\u5FE0\u53CD\u53CD\u53CD\u53CD\u5185", "\u5FE0\u5FE0\u5FE0\u53CD\u53CD\u53CD\u53CD\u5185", "\u5FE0\u5FE0\u5FE0\u53CD\u53CD\u53CD\u53CD\u5185\u5185"][r - 3], n && (t += "\uFF1B\u82E5\u53CD\u6B7B\u5219\u4F24\u5BB3\u6765\u6E90\u64783\u724C")), t += ")";
  }
  function F(e, r, n) {
    var t = e.hero.length;
    return j(e.rule, t)[o.Sp.MODE] === o.D7.ZHU_MODE ? r === n + 1 || t < 4 || W(e, r, n) ? "\u5FE0\u53CD\u4E3B\u5185"[e.roles[n]] : e.roles[n] === o.XP.ZHU ? "\u4E3B" : "?" : e.roles[n] === o.XP.ZHU ? "\u5927\u5FE0" : "\u5FE0\u53CD"[e.roles[n]];
  }
  function Q(e, r, n) {
    return {
      "\u4e3b": 0,
      "\u5927\u5fe0": 0,
      "\u5fe0": 0,
      "\u53cd": 1,
      "\u5185": 2,
      "?": 3
    }[F(e, r, n)] || 0;
  }
  function V(e) {
    var r,
      n = [],
      t = 0,
      i = 0,
      o = Object.keys(e).length,
      c = (0, s.F)(i, t, o, 8),
      _ = (0, a.Z)(c, 3);
    return i = _[0], t = _[1], r = _[2], n.push.apply(n, (0, l.Z)(r)), Object.entries(e).forEach(function (e) {
      var o = (0, a.Z)(e, 2),
        c = o[0],
        _ = o[1],
        u = (0, s.F)(i, t, Number(c), 8),
        d = (0, a.Z)(u, 3);
      i = d[0], t = d[1], r = d[2], n.push.apply(n, (0, l.Z)(r));
      var E = (0, s.F)(i, t, _, 6),
        S = (0, a.Z)(E, 3);
      i = S[0], t = S[1], r = S[2], n.push.apply(n, (0, l.Z)(r));
    }), t && n.push(i), Uint8Array.from(n);
  }
  function $(e, r, n, t) {
    for (var l, i = [], c = [], _ = [], d = new Array(r).fill(0).map(function () {
        return [];
      }), E = new Array(r).fill(0).map(function () {
        return {};
      }), S = new Array(r).fill(0).map(function () {
        return [];
      }), f = function (e) {
        var r,
          n = 0,
          t = (0, s.lS)(e, n, 8),
          l = (0, a.Z)(t, 2);
        r = l[0], n = l[1];
        for (var i = r, o = {}, c = 0; c < i; c++) {
          var _ = (0, s.lS)(e, n, 8),
            u = (0, a.Z)(_, 2);
          r = u[0], n = u[1];
          var d = r,
            E = (0, s.lS)(e, n, 6),
            S = (0, a.Z)(E, 2);
          r = S[0], n = S[1], o[d] = r;
        }
        return o;
      }(t), N = 0, I = j(n, r)[o.Sp.TOTAL_CARD_COUNT], A = 0; A < I; A++) {
      var p = (0, s.lS)(e, N, 1),
        P = (0, a.Z)(p, 2);
      if (l = P[0], N = P[1], l) {
        var y = (0, s.lS)(e, N, 1),
          L = (0, a.Z)(y, 2);
        if (l = L[0], N = L[1], l) {
          i.push(o.Yp.USING);
          var v = (0, s.lS)(e, N, 4),
            h = (0, a.Z)(v, 2);
          if (l = h[0], N = h[1], l < 15) {
            var O = l,
              D = (0, s.lS)(e, N, 1),
              T = (0, a.Z)(D, 2);
            if (l = T[0], N = T[1], l) {
              var U = (0, s.lS)(e, N, 1),
                C = (0, a.Z)(U, 2);
              if (l = C[0], N = C[1], l) {
                var H = (0, s.lS)(e, N, 2),
                  g = (0, a.Z)(H, 2);
                l = g[0], N = g[1], S[O][l] = [A, void 0 !== f[A] ? f[A] : (0, u.e3)(A)];
              } else {
                var R = (0, s.lS)(e, N, 2),
                  k = (0, a.Z)(R, 2);
                l = k[0], N = k[1], E[O][l] = [A, void 0 !== f[A] ? f[A] : (0, u.e3)(A)];
              }
            } else d[O].push(A);
          }
        } else _.push(A), i.push(o.Yp.PLAYED);
      } else c.push(A), i.push(o.Yp.TO_DRAW);
    }
    return {
      cardPos: i,
      drawCards: c,
      playedCards: _,
      playerHandCard: d,
      playerEquip: E,
      playerJudge: S
    };
  }
  function z(e) {
    var r,
      n = 0,
      t = (0, s.lS)(e, n, 8),
      l = (0, a.Z)(t, 2);
    r = l[0], n = l[1];
    for (var i = r, o = [], c = 0; c < i; c++) {
      var _ = (0, s.lS)(e, n, 8),
        u = (0, a.Z)(_, 2);
      r = u[0], n = u[1];
      var d = r,
        E = (0, s.lS)(e, n, 8),
        S = (0, a.Z)(E, 2);
      r = S[0], n = S[1];
      var f = r;
      o.push({
        cardId: d,
        pos: f
      });
    }
    return o;
  }
  function ee(e) {
    var r,
      n = [],
      t = 0,
      i = 0,
      o = (0, s.F)(i, t, e.length, 8),
      c = (0, a.Z)(o, 3);
    return i = c[0], t = c[1], r = c[2], n.push.apply(n, (0, l.Z)(r)), e.forEach(function (e) {
      var o = e.cardId,
        c = e.pos,
        _ = (0, s.F)(i, t, o, 8),
        u = (0, a.Z)(_, 3);
      i = u[0], t = u[1], r = u[2], n.push.apply(n, (0, l.Z)(r));
      var d = (0, s.F)(i, t, c, 8),
        E = (0, a.Z)(d, 3);
      i = E[0], t = E[1], r = E[2], n.push.apply(n, (0, l.Z)(r));
    }), t && n.push(i), Uint8Array.from(n);
  }
  function re(e, r) {
    var n = $(e.cards, r, e.rule, e.using),
      t = n.cardPos,
      a = n.drawCards,
      s = n.playedCards,
      i = n.playerHandCard,
      c = n.playerEquip,
      u = n.playerJudge,
      d = {
        v: e.v,
        rule: e.rule,
        roles: [],
        stage: e.stage,
        winners: [],
        heroCandidates: new Array(r).fill(0).map(function () {
          return [];
        }),
        hero: [],
        heroSkills: [],
        playerBlood: [],
        playerMaxBlood: [],
        alivePlayerIds: [],
        cardPos: t,
        drawCardPos: z(e.draw),
        drawCards: a,
        playedCards: s,
        playerHandCard: i,
        playerEquip: c,
        playerJudge: u,
        playerConn: [],
        playerBack: [],
        whoseTurn: 15 & e.st,
        whichStep: e.st >> 4,
        skillLuoShenCardIds: e.lsc,
        shaTimes: 3 & e.prop,
        isDrunk: e.prop >> 2 & 3,
        skipShanDian: e.prop >> 4 & 1,
        skipPlay: e.prop >> 5 & 1,
        skipDraw: e.prop >> 6 & 1,
        isEverSha: e.prop >> 7 & 1,
        skillAskGuanXing: e.prop >> 8 & 1,
        skillAskLuoShen: e.prop >> 9 & 1,
        skillLuoYi: e.prop >> 10 & 1,
        skillAskLuoYi: e.prop >> 11 & 1,
        skillAskTuXi: e.prop >> 12 & 1,
        skillRenDe: e.prop >> 13 & 3,
        skillZhiHeng: e.prop >> 15 & 1,
        skillQingNang: e.prop >> 16 & 1,
        skillLiJian: e.prop >> 17 & 1,
        skillFanJian: e.prop >> 18 & 1,
        skillJieYin: e.prop >> 19 & 1,
        dcdType: e.dc >> 4,
        dcdPlayerId: 15 & e.dc,
        dcdWuXiePlayers: new Array(r).fill(0).map(function (r, n) {
          return e.wu >> n & 1;
        }),
        eventStack: e.ev.map(function (e) {
          return {
            eventType: e.t,
            cardIds: e.c,
            playerPos: e.p,
            targetPlayerPos: e.tgt,
            targetPlayerPosList: e.tgts,
            damagedPlayerPos: e.dp,
            attribute: 3 & e.prop,
            isDrunk: e.prop >> 2 & 1,
            skillWuShuang: e.prop >> 3 & 1,
            isCanShan: e.prop >> 4 & 1,
            sourceCardIds: e.src,
            sourcePlayerPos: e.srcp,
            wuGuCardIds: e.wu,
            wuGuSelectedPlayerPosList: e.wup,
            damageValue: e.damage,
            skillId: e.sk,
            skillOwnerPos: e.skp,
            judgeCardId: e.jc
          };
        }),
        showCards: e.sh.map(function (e) {
          return {
            cardId: e.c,
            realType: e.t,
            isTemp: 1 & e.prop,
            isJudge: e.prop >> 1 & 1,
            isBack: e.prop >> 2 & 1,
            isDirectMove: e.prop >> 3 & 1,
            fromPlayerPos: e.fr,
            toPlayerPos: e.to,
            skills: e.sk
          };
        }),
        showLine: {
          fromPlayerPos: e.ln.fr,
          toPlayerIds: e.ln.to,
          fromPlayerPos2: e.ln.f2,
          toPlayerPos2: e.ln.t2
        }
      };
    if (j(d.rule, r)[o.Sp.MODE] === o.D7.ZHU_MODE) for (var E = 0; E < r; E++) for (var S = 0; S < 5; S++) {
      var N = e.cand[E] >> 5 * S & 31;
      N && d.heroCandidates[E].push(N);
    } else if (4 === e.cand.length) {
      for (var I = 0; I < 5; I++) {
        var A = e.cand[0] >> 5 * I & 31;
        A && d.heroCandidates[0].push(A);
      }
      for (var p = 0; p < 5; p++) {
        var P = e.cand[1] >> 5 * p & 31;
        P && d.heroCandidates[0].push(P);
      }
      for (var y = 0; y < 5; y++) {
        var L = e.cand[2] >> 5 * y & 31;
        L && d.heroCandidates[1].push(L);
      }
      for (var v = 0; v < 5; v++) {
        var h = e.cand[3] >> 5 * v & 31;
        h && d.heroCandidates[1].push(h);
      }
    } else if (2 === e.cand.length) for (var O = 0; O < 2; O++) for (var D = 0; D < 5; D++) {
      var T = e.cand[O] >> 5 * D & 31;
      T && d.heroCandidates[O].push(T);
    }
    for (var U = 0; U < r; U++) {
      d.roles.push(e.roles >> 2 * U & 3);
      var C = Math.pow(2, 6 * U),
        H = 63 & Math.floor((e.hero - e.hero % C) / C);
      d.hero.push(H);
      var g = Math.pow(2, 4 * U),
        R = (15 & Math.floor((e.blood - e.blood % g) / g)) - 5;
      d.playerBlood.push(R);
      var k = e.win >> 4 * U & 15;
      k && d.winners.push(k - 1);
      var G = e.bc >> 2 * U & 3;
      d.playerConn.push(1 === (1 & G) ? 1 : 0), d.playerBack.push(2 === (2 & G) ? 1 : 0);
    }
    return d.hero.forEach(function (e, r) {
      d.playerMaxBlood.push(_.V6[e][_.$.BLOOD] + (d.roles[r] === o.XP.ZHU ? 1 : 0));
    }), d.alivePlayerIds = d.playerBlood.map(function (e, r) {
      return e > 0 || d.eventStack.findIndex(function (e) {
        return e.eventType === o.MZ.DEATH && e.playerPos === r + 1;
      }) >= 0 ? r : -1;
    }).filter(function (e) {
      return e >= 0;
    }), d.heroSkills = d.hero.map(function (e, r) {
      if (!d.alivePlayerIds.includes(r)) return [];
      var n = (0, l.Z)(_.V6[e][_.$.SKILLS]),
        t = _.V6[e][_.$.LORD_SKILL];
      t && d.roles[r] === o.XP.ZHU && n.push(t);
      var a = f(d, r);
      return a && n.push(a[o.ao.REAL_TYPE] - 21), n;
    }), d;
  }
  function ne(e) {
    for (var r = e.showLine, n = e.roles.length, t = 0, i = 0; i < n; i++) t |= (3 & e.roles[i]) << 2 * i;
    for (var c = 0, _ = 0; _ < e.winners.length; _++) {
      var d = e.winners[_];
      c |= (d + 1 & 15) << 4 * d;
    }
    var E = [];
    if (j(e.rule, n)[o.Sp.MODE] === o.D7.ZHU_MODE) for (var S = 0; S < n; S++) {
      for (var f = 0, N = e.heroCandidates[S], I = 0; I < N.length && I < 5; I++) f |= (31 & N[I]) << 5 * I;
      E.push(f);
    } else {
      for (var A = e.heroCandidates[0], p = e.heroCandidates[1], P = 0, y = 0; y < Math.min(A.length, 5); y++) P |= (31 & A[y]) << 5 * y;
      if (E.push(P), A.length > 5) {
        P = 0;
        for (var L = 0; L < A.length - 5; L++) P |= (31 & A[L + 5]) << 5 * L;
        E.push(P);
      }
      P = 0;
      for (var v = 0; v < Math.min(p.length, 5); v++) P |= (31 & p[v]) << 5 * v;
      if (E.push(P), p.length > 5) {
        P = 0;
        for (var h = 0; h < p.length - 5; h++) P |= (31 & p[h + 5]) << 5 * h;
        E.push(P);
      }
    }
    for (var O = 0, D = 0; D < n; D++) {
      O += (63 & e.hero[D]) * Math.pow(2, 6 * D);
    }
    for (var T = 0, U = 0; U < n; U++) {
      T += (e.playerBlood[U] + 5 & 15) * Math.pow(2, 4 * U);
    }
    for (var C = 0, H = 0; H < n; H++) {
      C |= ((e.playerConn[H] ? 1 : 0) | (e.playerBack[H] ? 2 : 0)) << 2 * H;
    }
    for (var g = 0, R = 0; R < e.dcdWuXiePlayers.length; R++) e.dcdWuXiePlayers[R] && (g |= 1 << R);
    var k = function (e) {
        for (var r, n = e.cardPos, t = e.playerHandCard, i = e.playerEquip, c = e.playerJudge, _ = t.length, d = [], E = 0, S = 0, f = j(e.rule, _)[o.Sp.TOTAL_CARD_COUNT], N = {}, I = function (e) {
            if (n[e] === o.Yp.TO_DRAW) {
              var f = (0, s.F)(S, E, 0, 1),
                I = (0, a.Z)(f, 3);
              S = I[0], E = I[1], r = I[2], d.push.apply(d, (0, l.Z)(r));
            } else if (n[e] === o.Yp.PLAYED) {
              var A = (0, s.F)(S, E, 2, 2),
                p = (0, a.Z)(A, 3);
              S = p[0], E = p[1], r = p[2], d.push.apply(d, (0, l.Z)(r));
            } else {
              var P = (0, s.F)(S, E, 3, 2),
                y = (0, a.Z)(P, 3);
              S = y[0], E = y[1], r = y[2], d.push.apply(d, (0, l.Z)(r));
              for (var L = 0, v = function (n) {
                  if (t[n].includes(e)) {
                    L = 1;
                    var o = (0, s.F)(S, E, n, 4),
                      _ = (0, a.Z)(o, 3);
                    S = _[0], E = _[1], r = _[2], d.push.apply(d, (0, l.Z)(r));
                    var f = (0, s.F)(S, E, 0, 1),
                      I = (0, a.Z)(f, 3);
                    S = I[0], E = I[1], r = I[2], d.push.apply(d, (0, l.Z)(r));
                  } else [0, 1, 2, 3].forEach(function (t) {
                    if (i[n][t]) {
                      var o = (0, a.Z)(i[n][t], 2),
                        c = o[0],
                        _ = o[1];
                      if (e === c) {
                        L = 1;
                        var f = (0, s.F)(S, E, n, 4),
                          I = (0, a.Z)(f, 3);
                        S = I[0], E = I[1], r = I[2], d.push.apply(d, (0, l.Z)(r));
                        var A = (0, s.F)(S, E, 2, 2),
                          p = (0, a.Z)(A, 3);
                        S = p[0], E = p[1], r = p[2], d.push.apply(d, (0, l.Z)(r));
                        var P = (0, s.F)(S, E, t, 2),
                          y = (0, a.Z)(P, 3);
                        S = y[0], E = y[1], r = y[2], d.push.apply(d, (0, l.Z)(r)), _ !== (0, u.e3)(e) && (N[e] = _);
                      }
                    }
                  }), L || [0, 1, 2].forEach(function (t) {
                    if (c[n][t]) {
                      var i = (0, a.Z)(c[n][t], 2),
                        o = i[0],
                        _ = i[1];
                      if (e === o) {
                        L = 1;
                        var f = (0, s.F)(S, E, n, 4),
                          I = (0, a.Z)(f, 3);
                        S = I[0], E = I[1], r = I[2], d.push.apply(d, (0, l.Z)(r));
                        var A = (0, s.F)(S, E, 3, 2),
                          p = (0, a.Z)(A, 3);
                        S = p[0], E = p[1], r = p[2], d.push.apply(d, (0, l.Z)(r));
                        var P = (0, s.F)(S, E, t, 2),
                          y = (0, a.Z)(P, 3);
                        S = y[0], E = y[1], r = y[2], d.push.apply(d, (0, l.Z)(r)), _ !== (0, u.e3)(e) && (N[e] = _);
                      }
                    }
                  });
                }, h = 0; h < _; h++) v(h);
              if (!L) {
                var O = (0, s.F)(S, E, 15, 4),
                  D = (0, a.Z)(O, 3);
                S = D[0], E = D[1], r = D[2], d.push.apply(d, (0, l.Z)(r));
              }
            }
          }, A = 0; A < f; A++) I(A);
        return E && d.push(S), [Uint8Array.from(d), V(N)];
      }(e),
      G = (0, a.Z)(k, 2),
      m = G[0],
      x = G[1];
    return {
      v: e.v,
      rule: e.rule,
      stage: e.stage,
      roles: t,
      win: c,
      cand: E,
      hero: O,
      blood: T,
      cards: m,
      draw: ee(e.drawCardPos),
      using: x,
      bc: C,
      st: e.whichStep << 4 | e.whoseTurn,
      dc: e.dcdType << 4 | e.dcdPlayerId,
      wu: g,
      ev: e.eventStack.map(function (e) {
        return {
          t: e.eventType,
          c: e.cardIds,
          p: e.playerPos,
          tgt: e.targetPlayerPos,
          tgts: e.targetPlayerPosList,
          dp: e.damagedPlayerPos,
          prop: e.attribute | (e.isDrunk ? 4 : 0) | (e.skillWuShuang ? 8 : 0) | (e.isCanShan ? 16 : 0),
          src: e.sourceCardIds,
          srcp: e.sourcePlayerPos,
          wu: e.wuGuCardIds,
          wup: e.wuGuSelectedPlayerPosList,
          damage: e.damageValue,
          sk: e.skillId,
          skp: e.skillOwnerPos,
          jc: e.judgeCardId
        };
      }),
      lsc: e.skillLuoShenCardIds,
      prop: e.shaTimes | e.isDrunk << 2 | e.skipShanDian << 4 | e.skipPlay << 5 | e.skipDraw << 6 | e.isEverSha << 7 | e.skillAskGuanXing << 8 | e.skillAskLuoShen << 9 | e.skillLuoYi << 10 | e.skillAskLuoYi << 11 | e.skillAskTuXi << 12 | e.skillRenDe << 13 | e.skillZhiHeng << 15 | e.skillQingNang << 16 | e.skillLiJian << 17 | e.skillFanJian << 18 | e.skillJieYin << 19,
      sh: e.showCards.map(function (e) {
        return {
          c: e.cardId,
          t: e.realType,
          prop: (e.isTemp ? 1 : 0) | (e.isJudge ? 2 : 0) | (e.isBack ? 4 : 0) | (e.isDirectMove ? 8 : 0),
          fr: e.fromPlayerPos,
          to: e.toPlayerPos,
          sk: e.skills
        };
      }),
      ln: {
        fr: r.fromPlayerPos,
        to: r.toPlayerIds,
        f2: r.fromPlayerPos2,
        t2: r.toPlayerPos2
      }
    };
  }
  function te(e) {
    return JSON.parse(JSON.stringify(e));
  }
  function ae(e, r) {
    var n = d.L.decode(r).rule,
      l = e.playerList.length,
      s = j(n, l),
      i = (0, a.Z)(s, 2),
      u = i[0],
      E = i[1],
      S = {
        v: t.V,
        rule: n,
        roles: new Array(l).fill(0).map(function (e, r) {
          return r % 2;
        }),
        stage: o.PR.CHOOSE1,
        winners: [],
        heroCandidates: new Array(l).fill(0).map(function () {
          return [];
        }),
        hero: new Array(l).fill(0),
        heroSkills: new Array(l).fill(0).map(function () {
          return [];
        }),
        playerBlood: new Array(l).fill(4),
        playerMaxBlood: new Array(l).fill(4),
        alivePlayerIds: new Array(l).fill(0).map(function (e, r) {
          return r;
        }),
        cardPos: new Array(u).fill(0),
        drawCardPos: [],
        drawCards: [],
        playedCards: [],
        playerHandCard: new Array(l).fill(0).map(function () {
          return [];
        }),
        playerEquip: new Array(l).fill(0).map(function () {
          return {};
        }),
        playerJudge: new Array(l).fill(0).map(function () {
          return [];
        }),
        playerConn: new Array(l).fill(0),
        playerBack: new Array(l).fill(0),
        whoseTurn: 0,
        whichStep: o.p6.BEFORE_JUDGE,
        skillLuoShenCardIds: [],
        skipShanDian: o.aG.NOT_SKIP,
        skipPlay: o.DZ.NOT_SKIP,
        skipDraw: o.MP.NOT_SKIP,
        shaTimes: o.RW.NEVER_SHA,
        isDrunk: o.Sd.NEVER_DRUNK,
        isEverSha: o.Uy.NEVER_SHA,
        skillAskGuanXing: o.Gb.NOT_ASK,
        skillAskLuoShen: o.yE.CAN_ASK,
        skillLuoYi: o.Z$.NOT_USED,
        skillAskLuoYi: o.Lm.NOT_ASK,
        skillAskTuXi: o.ym.NOT_ASK,
        skillRenDe: o.V8.NONE,
        skillZhiHeng: o.qI.NOT_USED,
        skillQingNang: o.Jk.NOT_USED,
        skillLiJian: o.XE.NOT_USED,
        skillFanJian: o.d6.NOT_USED,
        skillJieYin: o.TY.NOT_USED,
        dcdType: o.qy.NONE,
        dcdPlayerId: 0,
        dcdWuXiePlayers: new Array(l).fill(0),
        eventStack: [],
        showCards: [],
        showLine: {
          fromPlayerPos: 0,
          toPlayerIds: [],
          fromPlayerPos2: 0,
          toPlayerPos2: 0
        }
      },
      f = (0, c.T)(new Array(_.V6.length - 1).fill(0).map(function (e, r) {
        return r + 1;
      }));
    if (E === o.D7.ZHU_MODE) {
      S.stage = o.PR.CHOOSE0, S.roles = (0, c.T)([[o.XP.ZHU, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.FAN, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.ZHONG, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.ZHONG, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.ZHONG, o.XP.ZHONG, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.NEI], [o.XP.ZHU, o.XP.ZHONG, o.XP.ZHONG, o.XP.ZHONG, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.FAN, o.XP.NEI, o.XP.NEI]][l - 3]);
      var N = S.roles.indexOf(o.XP.ZHU);
      S.heroCandidates[N] = f.slice(0, 5), S.whoseTurn = N;
    } else {
      var I = [4, 6, 6, 8, 9, 9, 10, 10, 10][l - 2];
      S.heroCandidates[0] = f.slice(0, I), S.heroCandidates[1] = f.slice(I, 2 * I), 4 === l ? (S.roles[2] = o.XP.FAN, S.roles[3] = o.XP.ZHONG) : l % 2 ? (S.roles[l - 1] = o.XP.FAN, S.roles[0] = o.XP.ZHU) : S.whoseTurn = (0, c.M)(l);
    }
    var A = (0, c.T)(new Array(u).fill(0).map(function (e, r) {
      return r;
    }));
    if (E === o.D7.TEAM_MODE) {
      if (4 === l) for (var p = 0, P = 0; P < 4; P++) for (var y = 0; y < [3, 4, 3, 4][P]; y++) {
        var L = A[p];
        p++, S.cardPos[L] = o.Yp.USING, S.playerHandCard[P].push(L);
      } else if (l % 2) for (var v = 0, h = 0; h < l; h++) for (var O = h === l - 1 ? 3 : [4, 3, 4, 3, 4, 3, 4, 3, 4][h], D = 0; D < O; D++) {
        var T = A[v];
        v++, S.cardPos[T] = o.Yp.USING, S.playerHandCard[h].push(T);
      } else for (var U = 0, C = 0; C < l; C++) for (var H = C === S.whoseTurn ? 3 : 4, g = 0; g < H; g++) {
        var R = A[U];
        U++, S.cardPos[R] = o.Yp.USING, S.playerHandCard[C].push(R);
      }
    } else for (var k = 0; k < l; k++) for (var G = 0; G < 4; G++) {
      var m = A[4 * k + G];
      S.cardPos[m] = o.Yp.USING, S.playerHandCard[k].push(m);
    }
    return ne(re(ne(S), l));
  }
  !function (e) {
    e[e.V = 3] = "V";
  }(t || (t = {}));
},
575: function (e, r, n) {
  n.d(r, {
    L: function () {
      return o;
    }
  });
  var t = n(7710),
    a = t.Reader,
    l = t.Writer,
    s = t.util,
    i = t.roots.default || (t.roots.default = {}),
    o = (i.EV = function () {
      function e(e) {
        if (this.c = [], this.tgts = [], this.src = [], this.wu = [], this.wup = [], e) for (var r = Object.keys(e), n = 0; n < r.length; ++n) null != e[r[n]] && (this[r[n]] = e[r[n]]);
      }
      return e.prototype.t = 0, e.prototype.c = s.emptyArray, e.prototype.p = 0, e.prototype.tgt = 0, e.prototype.tgts = s.emptyArray, e.prototype.dp = 0, e.prototype.prop = 0, e.prototype.src = s.emptyArray, e.prototype.srcp = 0, e.prototype.wu = s.emptyArray, e.prototype.wup = s.emptyArray, e.prototype.damage = 0, e.prototype.sk = 0, e.prototype.skp = 0, e.prototype.jc = 0, e.encode = function (e, r) {
        if (r || (r = l.create()), null != e.t && Object.hasOwnProperty.call(e, "t") && r.uint32(8).uint32(e.t), null != e.c && e.c.length) {
          r.uint32(18).fork();
          for (var n = 0; n < e.c.length; ++n) r.uint32(e.c[n]);
          r.ldelim();
        }
        if (null != e.p && Object.hasOwnProperty.call(e, "p") && r.uint32(24).uint32(e.p), null != e.tgt && Object.hasOwnProperty.call(e, "tgt") && r.uint32(32).uint32(e.tgt), null != e.tgts && e.tgts.length) {
          r.uint32(42).fork();
          for (n = 0; n < e.tgts.length; ++n) r.uint32(e.tgts[n]);
          r.ldelim();
        }
        if (null != e.dp && Object.hasOwnProperty.call(e, "dp") && r.uint32(48).uint32(e.dp), null != e.prop && Object.hasOwnProperty.call(e, "prop") && r.uint32(56).uint32(e.prop), null != e.src && e.src.length) {
          r.uint32(66).fork();
          for (n = 0; n < e.src.length; ++n) r.uint32(e.src[n]);
          r.ldelim();
        }
        if (null != e.srcp && Object.hasOwnProperty.call(e, "srcp") && r.uint32(72).uint32(e.srcp), null != e.wu && e.wu.length) {
          r.uint32(82).fork();
          for (n = 0; n < e.wu.length; ++n) r.uint32(e.wu[n]);
          r.ldelim();
        }
        if (null != e.wup && e.wup.length) {
          r.uint32(90).fork();
          for (n = 0; n < e.wup.length; ++n) r.uint32(e.wup[n]);
          r.ldelim();
        }
        return null != e.damage && Object.hasOwnProperty.call(e, "damage") && r.uint32(96).uint32(e.damage), null != e.sk && Object.hasOwnProperty.call(e, "sk") && r.uint32(104).uint32(e.sk), null != e.skp && Object.hasOwnProperty.call(e, "skp") && r.uint32(112).uint32(e.skp), null != e.jc && Object.hasOwnProperty.call(e, "jc") && r.uint32(120).uint32(e.jc), r;
      }, e.decode = function (e, r) {
        e instanceof a || (e = a.create(e));
        for (var n = void 0 === r ? e.len : e.pos + r, t = new i.EV(); e.pos < n;) {
          var l = e.uint32();
          switch (l >>> 3) {
            case 1:
              t.t = e.uint32();
              break;
            case 2:
              if (t.c && t.c.length || (t.c = []), 2 === (7 & l)) for (var s = e.uint32() + e.pos; e.pos < s;) t.c.push(e.uint32());else t.c.push(e.uint32());
              break;
            case 3:
              t.p = e.uint32();
              break;
            case 4:
              t.tgt = e.uint32();
              break;
            case 5:
              if (t.tgts && t.tgts.length || (t.tgts = []), 2 === (7 & l)) for (s = e.uint32() + e.pos; e.pos < s;) t.tgts.push(e.uint32());else t.tgts.push(e.uint32());
              break;
            case 6:
              t.dp = e.uint32();
              break;
            case 7:
              t.prop = e.uint32();
              break;
            case 8:
              if (t.src && t.src.length || (t.src = []), 2 === (7 & l)) for (s = e.uint32() + e.pos; e.pos < s;) t.src.push(e.uint32());else t.src.push(e.uint32());
              break;
            case 9:
              t.srcp = e.uint32();
              break;
            case 10:
              if (t.wu && t.wu.length || (t.wu = []), 2 === (7 & l)) for (s = e.uint32() + e.pos; e.pos < s;) t.wu.push(e.uint32());else t.wu.push(e.uint32());
              break;
            case 11:
              if (t.wup && t.wup.length || (t.wup = []), 2 === (7 & l)) for (s = e.uint32() + e.pos; e.pos < s;) t.wup.push(e.uint32());else t.wup.push(e.uint32());
              break;
            case 12:
              t.damage = e.uint32();
              break;
            case 13:
              t.sk = e.uint32();
              break;
            case 14:
              t.skp = e.uint32();
              break;
            case 15:
              t.jc = e.uint32();
              break;
            default:
              e.skipType(7 & l);
          }
        }
        return t;
      }, e;
    }(), i.SH = function () {
      function e(e) {
        if (this.sk = [], e) for (var r = Object.keys(e), n = 0; n < r.length; ++n) null != e[r[n]] && (this[r[n]] = e[r[n]]);
      }
      return e.prototype.c = 0, e.prototype.t = 0, e.prototype.fr = 0, e.prototype.to = 0, e.prototype.prop = 0, e.prototype.sk = s.emptyArray, e.encode = function (e, r) {
        if (r || (r = l.create()), null != e.c && Object.hasOwnProperty.call(e, "c") && r.uint32(8).uint32(e.c), null != e.t && Object.hasOwnProperty.call(e, "t") && r.uint32(16).uint32(e.t), null != e.fr && Object.hasOwnProperty.call(e, "fr") && r.uint32(24).uint32(e.fr), null != e.to && Object.hasOwnProperty.call(e, "to") && r.uint32(32).uint32(e.to), null != e.prop && Object.hasOwnProperty.call(e, "prop") && r.uint32(40).uint32(e.prop), null != e.sk && e.sk.length) {
          r.uint32(50).fork();
          for (var n = 0; n < e.sk.length; ++n) r.uint32(e.sk[n]);
          r.ldelim();
        }
        return r;
      }, e.decode = function (e, r) {
        e instanceof a || (e = a.create(e));
        for (var n = void 0 === r ? e.len : e.pos + r, t = new i.SH(); e.pos < n;) {
          var l = e.uint32();
          switch (l >>> 3) {
            case 1:
              t.c = e.uint32();
              break;
            case 2:
              t.t = e.uint32();
              break;
            case 3:
              t.fr = e.uint32();
              break;
            case 4:
              t.to = e.uint32();
              break;
            case 5:
              t.prop = e.uint32();
              break;
            case 6:
              if (t.sk && t.sk.length || (t.sk = []), 2 === (7 & l)) for (var s = e.uint32() + e.pos; e.pos < s;) t.sk.push(e.uint32());else t.sk.push(e.uint32());
              break;
            default:
              e.skipType(7 & l);
          }
        }
        return t;
      }, e;
    }(), i.LN = function () {
      function e(e) {
        if (this.to = [], e) for (var r = Object.keys(e), n = 0; n < r.length; ++n) null != e[r[n]] && (this[r[n]] = e[r[n]]);
      }
      return e.prototype.fr = 0, e.prototype.to = s.emptyArray, e.prototype.f2 = 0, e.prototype.t2 = 0, e.encode = function (e, r) {
        if (r || (r = l.create()), null != e.fr && Object.hasOwnProperty.call(e, "fr") && r.uint32(8).uint32(e.fr), null != e.to && e.to.length) {
          r.uint32(18).fork();
          for (var n = 0; n < e.to.length; ++n) r.uint32(e.to[n]);
          r.ldelim();
        }
        return null != e.f2 && Object.hasOwnProperty.call(e, "f2") && r.uint32(24).uint32(e.f2), null != e.t2 && Object.hasOwnProperty.call(e, "t2") && r.uint32(32).uint32(e.t2), r;
      }, e.decode = function (e, r) {
        e instanceof a || (e = a.create(e));
        for (var n = void 0 === r ? e.len : e.pos + r, t = new i.LN(); e.pos < n;) {
          var l = e.uint32();
          switch (l >>> 3) {
            case 1:
              t.fr = e.uint32();
              break;
            case 2:
              if (t.to && t.to.length || (t.to = []), 2 === (7 & l)) for (var s = e.uint32() + e.pos; e.pos < s;) t.to.push(e.uint32());else t.to.push(e.uint32());
              break;
            case 3:
              t.f2 = e.uint32();
              break;
            case 4:
              t.t2 = e.uint32();
              break;
            default:
              e.skipType(7 & l);
          }
        }
        return t;
      }, e;
    }(), i.SGSGameData = function () {
      function e(e) {
        if (this.cand = [], this.ev = [], this.lsc = [], this.sh = [], e) for (var r = Object.keys(e), n = 0; n < r.length; ++n) null != e[r[n]] && (this[r[n]] = e[r[n]]);
      }
      return e.prototype.v = 0, e.prototype.rule = 0, e.prototype.roles = 0, e.prototype.stage = 0, e.prototype.win = 0, e.prototype.cand = s.emptyArray, e.prototype.hero = s.Long ? s.Long.fromBits(0, 0, !0) : 0, e.prototype.blood = s.Long ? s.Long.fromBits(0, 0, !0) : 0, e.prototype.cards = s.newBuffer([]), e.prototype.draw = s.newBuffer([]), e.prototype.bc = 0, e.prototype.st = 0, e.prototype.dc = 0, e.prototype.wu = 0, e.prototype.ev = s.emptyArray, e.prototype.lsc = s.emptyArray, e.prototype.prop = 0, e.prototype.sh = s.emptyArray, e.prototype.ln = null, e.prototype.using = s.newBuffer([]), e.encode = function (e, r) {
        if (r || (r = l.create()), null != e.v && Object.hasOwnProperty.call(e, "v") && r.uint32(8).uint32(e.v), null != e.rule && Object.hasOwnProperty.call(e, "rule") && r.uint32(16).uint32(e.rule), null != e.roles && Object.hasOwnProperty.call(e, "roles") && r.uint32(24).uint32(e.roles), null != e.stage && Object.hasOwnProperty.call(e, "stage") && r.uint32(32).uint32(e.stage), null != e.win && Object.hasOwnProperty.call(e, "win") && r.uint32(40).uint32(e.win), null != e.cand && e.cand.length) {
          r.uint32(50).fork();
          for (var n = 0; n < e.cand.length; ++n) r.uint32(e.cand[n]);
          r.ldelim();
        }
        if (null != e.hero && Object.hasOwnProperty.call(e, "hero") && r.uint32(56).uint64(e.hero), null != e.blood && Object.hasOwnProperty.call(e, "blood") && r.uint32(64).uint64(e.blood), null != e.cards && Object.hasOwnProperty.call(e, "cards") && r.uint32(74).bytes(e.cards), null != e.draw && Object.hasOwnProperty.call(e, "draw") && r.uint32(82).bytes(e.draw), null != e.bc && Object.hasOwnProperty.call(e, "bc") && r.uint32(88).uint32(e.bc), null != e.st && Object.hasOwnProperty.call(e, "st") && r.uint32(96).uint32(e.st), null != e.dc && Object.hasOwnProperty.call(e, "dc") && r.uint32(104).uint32(e.dc), null != e.wu && Object.hasOwnProperty.call(e, "wu") && r.uint32(112).uint32(e.wu), null != e.ev && e.ev.length) for (n = 0; n < e.ev.length; ++n) i.EV.encode(e.ev[n], r.uint32(122).fork()).ldelim();
        if (null != e.lsc && e.lsc.length) {
          r.uint32(130).fork();
          for (n = 0; n < e.lsc.length; ++n) r.uint32(e.lsc[n]);
          r.ldelim();
        }
        if (null != e.prop && Object.hasOwnProperty.call(e, "prop") && r.uint32(136).uint32(e.prop), null != e.sh && e.sh.length) for (n = 0; n < e.sh.length; ++n) i.SH.encode(e.sh[n], r.uint32(146).fork()).ldelim();
        return null != e.ln && Object.hasOwnProperty.call(e, "ln") && i.LN.encode(e.ln, r.uint32(154).fork()).ldelim(), null != e.using && Object.hasOwnProperty.call(e, "using") && r.uint32(162).bytes(e.using), r;
      }, e.decode = function (e, r) {
        e instanceof a || (e = a.create(e));
        for (var n = void 0 === r ? e.len : e.pos + r, t = new i.SGSGameData(); e.pos < n;) {
          var l = e.uint32();
          switch (l >>> 3) {
            case 1:
              t.v = e.uint32();
              break;
            case 2:
              t.rule = e.uint32();
              break;
            case 3:
              t.roles = e.uint32();
              break;
            case 4:
              t.stage = e.uint32();
              break;
            case 5:
              t.win = e.uint32();
              break;
            case 6:
              if (t.cand && t.cand.length || (t.cand = []), 2 === (7 & l)) for (var s = e.uint32() + e.pos; e.pos < s;) t.cand.push(e.uint32());else t.cand.push(e.uint32());
              break;
            case 7:
              t.hero = e.uint64();
              break;
            case 8:
              t.blood = e.uint64();
              break;
            case 9:
              t.cards = e.bytes();
              break;
            case 10:
              t.draw = e.bytes();
              break;
            case 11:
              t.bc = e.uint32();
              break;
            case 12:
              t.st = e.uint32();
              break;
            case 13:
              t.dc = e.uint32();
              break;
            case 14:
              t.wu = e.uint32();
              break;
            case 15:
              t.ev && t.ev.length || (t.ev = []), t.ev.push(i.EV.decode(e, e.uint32()));
              break;
            case 16:
              if (t.lsc && t.lsc.length || (t.lsc = []), 2 === (7 & l)) for (s = e.uint32() + e.pos; e.pos < s;) t.lsc.push(e.uint32());else t.lsc.push(e.uint32());
              break;
            case 17:
              t.prop = e.uint32();
              break;
            case 18:
              t.sh && t.sh.length || (t.sh = []), t.sh.push(i.SH.decode(e, e.uint32()));
              break;
            case 19:
              t.ln = i.LN.decode(e, e.uint32());
              break;
            case 20:
              t.using = e.bytes();
              break;
            default:
              e.skipType(7 & l);
          }
        }
        return t;
      }, e;
    }());
},
7002: function (e, r, n) {
  n(7313);
  var t = n(2335),
    a = n(6417);
  r.Z = function (e) {
    var r = e.className;
    return (0, a.jsx)("img", {
      alt: "",
      "aria-hidden": !0,
      src: "".concat(t.lN, "game/logo-").concat(t.s_.logo, ".svg"),
      className: r
    });
  };
},
6359: function (e, t, n) {
  var r;
  !function (a, l, o) {
    var i,
      u = 256,
      s = o.pow(u, 6),
      c = o.pow(2, 52),
      f = 2 * c,
      d = 255;
    function p(e, t, n) {
      var r = [],
        d = y(v((t = 1 == t ? {
          entropy: !0
        } : t || {}).entropy ? [e, g(l)] : null == e ? function () {
          try {
            var e;
            return i && (e = i.randomBytes) ? e = e(u) : (e = new Uint8Array(u), (a.crypto || a.msCrypto).getRandomValues(e)), g(e);
          } catch (r) {
            var t = a.navigator,
              n = t && t.plugins;
            return [+new Date(), a, n, a.screen, g(l)];
          }
        }() : e, 3), r),
        p = new h(r),
        b = function () {
          for (var e = p.g(6), t = s, n = 0; e < c;) e = (e + n) * u, t *= u, n = p.g(1);
          for (; e >= f;) e /= 2, t /= 2, n >>>= 1;
          return (e + n) / t;
        };
      return b.int32 = function () {
        return 0 | p.g(4);
      }, b.quick = function () {
        return p.g(4) / 4294967296;
      }, b.double = b, y(g(p.S), l), (t.pass || n || function (e, t, n, r) {
        return r && (r.S && m(r, p), e.state = function () {
          return m(p, {});
        }), n ? (o.random = e, t) : e;
      })(b, d, "global" in t ? t.global : this == o, t.state);
    }
    function h(e) {
      var t,
        n = e.length,
        r = this,
        a = 0,
        l = r.i = r.j = 0,
        o = r.S = [];
      for (n || (e = [n++]); a < u;) o[a] = a++;
      for (a = 0; a < u; a++) o[a] = o[l = d & l + e[a % n] + (t = o[a])], o[l] = t;
      (r.g = function (e) {
        for (var t, n = 0, a = r.i, l = r.j, o = r.S; e--;) t = o[a = d & a + 1], n = n * u + o[d & (o[a] = o[l = d & l + t]) + (o[l] = t)];
        return r.i = a, r.j = l, n;
      })(u);
    }
    function m(e, t) {
      return t.i = e.i, t.j = e.j, t.S = e.S.slice(), t;
    }
    function v(e, t) {
      var n,
        r = [],
        a = typeof e;
      if (t && "object" == a) for (n in e) try {
        r.push(v(e[n], t - 1));
      } catch (l) {}
      return r.length ? r : "string" == a ? e : e + "\0";
    }
    function y(e, t) {
      for (var n, r = e + "", a = 0; a < r.length;) t[d & a] = d & (n ^= 19 * t[d & a]) + r.charCodeAt(a++);
      return g(t);
    }
    function g(e) {
      return String.fromCharCode.apply(0, e);
    }
    if (y(o.random(), l), e.exports) {
      e.exports = p;
      try {
        i = n(5042);
      } catch (b) {}
    } else void 0 === (r = function () {
      return p;
    }.call(t, n, t, e)) || (e.exports = r);
  }("undefined" !== typeof self ? self : this, [], Math);
},
5042: function () {},
7448: function (e, r, i) {
  var companionMapBridge = i.bridge;
  i.r(r), i.d(r, {
    default: function () {
      return H;
    }
  });
  var t = i(1413),
    l = i(7313),
    s = i(4595),
    n = i(5982),
    a = i(3953),
    o = i(6630),
    f = i(4929),
    u = i(6417);
  function x() {
    return (0, u.jsxs)(u.Fragment, {
      children: [(0, u.jsxs)("defs", {
        children: [(0, u.jsxs)("radialGradient", {
          id: "bps",
          children: [(0, u.jsx)("stop", {
            offset: "80%",
            stopColor: "#444444",
            stopOpacity: "0.33"
          }), (0, u.jsx)("stop", {
            offset: "87%",
            stopColor: "#333333",
            stopOpacity: "0.23"
          }), (0, u.jsx)("stop", {
            offset: "100%",
            stopColor: "#000000",
            stopOpacity: "0"
          })]
        }), (0, u.jsxs)("g", {
          id: "bp",
          children: [(0, u.jsx)("circle", {
            r: "6.1",
            fill: "url(#bps)",
            stroke: "none"
          }), (0, u.jsx)("circle", {
            r: "5",
            cx: "0",
            cy: "0",
            fill: "#f4ffed",
            strokeWidth: "0.85"
          }), (0, u.jsx)("circle", {
            r: "4",
            cx: "0",
            cy: "0",
            fill: "#f4ffed",
            strokeWidth: "0.34"
          }), (0, u.jsx)("path", {
            d: "M-0.23,-3.077L0.23,-3.077L0.92,2.46L-0.92,2.46Z",
            stroke: "none"
          }), (0, u.jsx)("path", {
            d: "M-0.69,-1.69V1.077L-2.308,2.461Z",
            stroke: "none"
          }), (0, u.jsx)("path", {
            d: "M0.69,-1.69V1.077L2.308,2.461Z",
            stroke: "none"
          })]
        }), (0, u.jsx)("use", {
          id: "p-blue-0",
          xlinkHref: "#bp",
          fill: "#0b75c1",
          stroke: "#0b75c1"
        }), (0, u.jsx)("use", {
          id: "p-green-0",
          xlinkHref: "#bp",
          fill: "#0ca80d",
          stroke: "#0ca80d",
          transform: "rotate(90,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-red-0",
          xlinkHref: "#bp",
          fill: "#e43415",
          stroke: "#e43415",
          transform: "rotate(180,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-yellow-0",
          xlinkHref: "#bp",
          fill: "#fed105",
          stroke: "#fed105",
          transform: "rotate(270,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-blue-1",
          xlinkHref: "#p-blue-0",
          transform: "rotate(90,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-green-1",
          xlinkHref: "#p-green-0",
          transform: "rotate(90,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-red-1",
          xlinkHref: "#p-red-0",
          transform: "rotate(90,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-yellow-1",
          xlinkHref: "#p-yellow-0",
          transform: "rotate(90,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-blue-2",
          xlinkHref: "#p-blue-0",
          transform: "rotate(180,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-green-2",
          xlinkHref: "#p-green-0",
          transform: "rotate(180,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-red-2",
          xlinkHref: "#p-red-0",
          transform: "rotate(180,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-yellow-2",
          xlinkHref: "#p-yellow-0",
          transform: "rotate(180,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-blue-3",
          xlinkHref: "#p-blue-0",
          transform: "rotate(270,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-green-3",
          xlinkHref: "#p-green-0",
          transform: "rotate(270,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-red-3",
          xlinkHref: "#p-red-0",
          transform: "rotate(270,0,0)"
        }), (0, u.jsx)("use", {
          id: "p-yellow-3",
          xlinkHref: "#p-yellow-0",
          transform: "rotate(270,0,0)"
        }), (0, u.jsxs)("g", {
          id: "win",
          children: [(0, u.jsx)("rect", {
            width: "12",
            height: "6",
            x: "-6",
            y: "-3",
            fill: "#000",
            fillOpacity: "50%"
          }), (0, u.jsx)(f.Z, {
            fill: "#fff",
            fontSize: "4.2",
            fontFamily: "monospace",
            fontWeight: "bold",
            children: "Win"
          })]
        }), (0, u.jsx)("rect", {
          id: "j",
          x: "-3",
          y: "-33",
          width: "6",
          height: "66",
          fill: "#fff",
          fillOpacity: "40%",
          stroke: "#fff",
          strokeOpacity: "80%",
          strokeWidth: "0.5"
        }), (0, u.jsx)("path", {
          id: "ar",
          d: "M-2 -2.5L0 -0.5L2 -2.5M-2 0.5L0 2.5L2 0.5",
          fill: "none",
          strokeLinejoin: "round",
          strokeLinecap: "round"
        }), (0, u.jsx)("path", {
          id: "ar2",
          d: "M2.5 80H-0.5V75l-1.8 1.8h3.6l-1.8 -1.8",
          fill: "none",
          stroke: "#fff",
          strokeWidth: "1.4",
          strokeOpacity: "90%",
          strokeLinejoin: "round",
          strokeLinecap: "round"
        }), (0, u.jsx)("rect", {
          id: "rv",
          rx: "2",
          ry: "2",
          x: "-5.8",
          y: "-7.8",
          width: "11.6",
          height: "15.6"
        }), (0, u.jsx)("rect", {
          id: "rh",
          rx: "2",
          ry: "2",
          x: "-7.8",
          y: "-5.8",
          width: "15.6",
          height: "11.6"
        }), (0, u.jsx)("rect", {
          id: "rv2",
          rx: "2",
          ry: "2",
          x: "-5.3",
          y: "-5.8",
          width: "10.6",
          height: "11.6"
        }), (0, u.jsx)("rect", {
          id: "rh2",
          rx: "2",
          ry: "2",
          x: "-5.8",
          y: "-5.3",
          width: "11.6",
          height: "10.6"
        }), (0, u.jsx)("path", {
          id: "des",
          d: "M0,0L-15,15H15Z",
          strokeWidth: "0.4",
          stroke: "#0a1d42"
        }), (0, u.jsx)("path", {
          id: "t3",
          d: "M-6.66 6.95A0.5 0.5 0 0 0 -6.31 7.8H5.8A2 2 0 0 0 7.8 5.8V-6.31A0.5 0.5 0 0 0 6.95 -6.66Z"
        }), (0, u.jsx)("path", {
          id: "t7",
          d: "M6.66 -6.95A0.5 0.5 0 0 0 6.31 -7.8H-5.8A2 2 0 0 0 -7.8 -5.8V6.31A0.5 0.5 0 0 0 -6.95 6.66Z"
        }), (0, u.jsx)("path", {
          id: "t1",
          d: "M6.66 6.95A0.5 0.5 0 0 1 6.31 7.8H-5.8A2 2 0 0 1 -7.8 5.8V-6.31A0.5 0.5 0 0 1 -6.95 -6.66Z"
        }), (0, u.jsx)("path", {
          id: "t9",
          d: "M-6.66 -6.95A0.5 0.5 0 0 1 -6.31 -7.8H5.8A2 2 0 0 1 7.8 -5.8V6.31A0.5 0.5 0 0 1 6.95 6.66Z"
        }), (0, u.jsx)("circle", {
          id: "c",
          r: "4",
          fill: "#fff",
          fillOpacity: "90%"
        }), (0, u.jsxs)("g", {
          id: "ori",
          children: [(0, u.jsx)("rect", {
            width: "30",
            height: "30",
            x: "-15",
            y: "-15",
            rx: "2",
            ry: "2"
          }), (0, u.jsx)("circle", {
            r: "5.2",
            cx: "6.2",
            cy: "6.2",
            fill: "#fff",
            fillOpacity: "50%"
          }), (0, u.jsx)("circle", {
            r: "5.2",
            cx: "-6.2",
            cy: "6.2",
            fill: "#fff",
            fillOpacity: "50%"
          }), (0, u.jsx)("circle", {
            r: "5.2",
            cx: "6.2",
            cy: "-6.2",
            fill: "#fff",
            fillOpacity: "50%"
          }), (0, u.jsx)("circle", {
            r: "5.2",
            cx: "-6.2",
            cy: "-6.2",
            fill: "#fff",
            fillOpacity: "50%"
          })]
        }), (0, u.jsxs)("g", {
          id: "first",
          children: [(0, u.jsx)("path", {
            d: "M-46 72.5H-51V85h17.5Z",
            strokeWidth: "1",
            strokeLinejoin: "round"
          }), (0, u.jsx)(f.Z, {
            x: "-46",
            y: "80",
            fill: "#fff",
            stroke: "none",
            fontSize: "7",
            fontFamily: "emoji",
            fillOpacity: "100%",
            children: "\u2708\ufe0f"
          })]
        }), (0, u.jsxs)("radialGradient", {
          id: "red",
          children: [(0, u.jsx)("stop", {
            offset: "0%",
            stopColor: "#ff5744"
          }), (0, u.jsx)("stop", {
            offset: "100%",
            stopColor: "#fb4a38"
          })]
        }), (0, u.jsxs)("radialGradient", {
          id: "green",
          children: [(0, u.jsx)("stop", {
            offset: "0%",
            stopColor: "#63e2a3"
          }), (0, u.jsx)("stop", {
            offset: "100%",
            stopColor: "#18de8d"
          })]
        }), (0, u.jsxs)("radialGradient", {
          id: "blue",
          children: [(0, u.jsx)("stop", {
            offset: "0%",
            stopColor: "#05c0ea"
          }), (0, u.jsx)("stop", {
            offset: "100%",
            stopColor: "#0fa3e3"
          })]
        }), (0, u.jsxs)("radialGradient", {
          id: "yellow",
          children: [(0, u.jsx)("stop", {
            offset: "0%",
            stopColor: "#fddc04"
          }), (0, u.jsx)("stop", {
            offset: "100%",
            stopColor: "#fecc08"
          })]
        })]
      }), (0, u.jsx)("use", {
        xlinkHref: "#j",
        x: "42.5"
      }), (0, u.jsx)("use", {
        xlinkHref: "#j",
        x: "42.5",
        transform: "rotate(90,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#j",
        x: "42.5",
        transform: "rotate(180,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#j",
        x: "42.5",
        transform: "rotate(270,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "18",
        stroke: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "-18",
        stroke: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "18",
        stroke: "url(#red)",
        transform: "rotate(90,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "-18",
        stroke: "url(#red)",
        transform: "rotate(90,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "18",
        stroke: "url(#yellow)",
        transform: "rotate(180,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "-18",
        stroke: "url(#yellow)",
        transform: "rotate(180,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "18",
        stroke: "url(#blue)",
        transform: "rotate(270,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar",
        x: "42.5",
        y: "-18",
        stroke: "url(#blue)",
        transform: "rotate(270,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "0",
        y: "-78",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-12",
        y: "-78",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-24",
        y: "-78",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "12",
        y: "-78",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "24",
        y: "-78",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-38",
        y: "-64",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-38",
        y: "-52",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "38",
        y: "-64",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "38",
        y: "-52",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t3",
        x: "-38",
        y: "-78",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t1",
        x: "38",
        y: "-78",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t7",
        x: "38",
        y: "-38",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t3",
        x: "38",
        y: "-38",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t9",
        x: "-38",
        y: "-38",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t1",
        x: "-38",
        y: "-38",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "0",
        y: "78",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-12",
        y: "78",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-24",
        y: "78",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "12",
        y: "78",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "24",
        y: "78",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-38",
        y: "64",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-38",
        y: "52",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "38",
        y: "64",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "38",
        y: "52",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t9",
        x: "-38",
        y: "78",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t7",
        x: "38",
        y: "78",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-78",
        y: "0",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-78",
        y: "-12",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-78",
        y: "-24",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-78",
        y: "12",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "-78",
        y: "24",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-64",
        y: "38",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-52",
        y: "38",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-64",
        y: "-38",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "-52",
        y: "-38",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t3",
        x: "-78",
        y: "-38",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t9",
        x: "-78",
        y: "38",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "78",
        y: "0",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "78",
        y: "-12",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "78",
        y: "-24",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "78",
        y: "12",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh",
        x: "78",
        y: "24",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "64",
        y: "38",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "52",
        y: "38",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "64",
        y: "-38",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv",
        x: "52",
        y: "-38",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t1",
        x: "78",
        y: "-38",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t7",
        x: "78",
        y: "38",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t9",
        x: "38",
        y: "38",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t1",
        x: "38",
        y: "38",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t3",
        x: "-38",
        y: "38",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#t7",
        x: "-38",
        y: "38",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "64.5",
        y: "0",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "53.5",
        y: "0",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "42.5",
        y: "0",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "31.5",
        y: "0",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "20.5",
        y: "0",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#c",
        x: "42.5"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "-64.5",
        y: "0",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "-53.5",
        y: "0",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "-42.5",
        y: "0",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "-31.5",
        y: "0",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rv2",
        x: "-20.5",
        y: "0",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#c",
        x: "-42.5"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "64.5",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "53.5",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "42.5",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "31.5",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "20.5",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#c",
        y: "42.5"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "-64.5",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "-53.5",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "-42.5",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "-31.5",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#rh2",
        x: "0",
        y: "-20.5",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#c",
        y: "-42.5"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar2"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar2",
        transform: "rotate(90,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar2",
        transform: "rotate(180,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ar2",
        transform: "rotate(270,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#des",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#des",
        fill: "url(#green)",
        transform: "rotate(90,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#des",
        fill: "url(#red)",
        transform: "rotate(180,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#des",
        fill: "url(#yellow)",
        transform: "rotate(270,0,0)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ori",
        x: "-68",
        y: "68",
        fill: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ori",
        x: "-68",
        y: "-68",
        fill: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ori",
        x: "68",
        y: "-68",
        fill: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#ori",
        x: "68",
        y: "68",
        fill: "url(#yellow)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#first",
        fill: "url(#blue)",
        stroke: "url(#blue)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#first",
        fill: "url(#green)",
        transform: "rotate(90,0,0)",
        stroke: "url(#green)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#first",
        fill: "url(#red)",
        transform: "rotate(180,0,0)",
        stroke: "url(#red)"
      }), (0, u.jsx)("use", {
        xlinkHref: "#first",
        fill: "url(#yellow)",
        transform: "rotate(270,0,0)",
        stroke: "url(#yellow)"
      })]
    });
  }
  var c = l.memo(x),
    p = i(885),
    d = i(4062),
    h = ["blue", "green", "red", "yellow"];
  var y = function (e) {
      var r = e.room,
        i = e.game,
        t = e.updateGameData,
        s = e.gameVersion;
      (0, l.useEffect)(function () {
        var e = !1,
          r = 0;
        return Array.from(document.getElementsByTagName("animateTransform")).forEach(function (e) {
          e.beginElement();
          var i = parseFloat(e.getAttribute("dur") || "0");
          i > r && (r = i);
        }), r && setTimeout(function () {
          e || Array.from(document.getElementsByTagName("animate")).forEach(function (e) {
            e.beginElement();
          });
        }, 1e3 * r), function () {
          e = !0;
        };
      }, [s]);
      for (var n = i.state, a = 3 & i.state, o = !(4 & n), f = r.position - 1, x = a === f && !o, c = i.planePositionList.length / 4, y = [], j = new Set(), k = new Set(), m = 0; m < i.planePositionList.length; m++) if (m !== i.lastAirline[0]) {
        for (var v = i.planePositionList[m], H = (0, d.iM)(m, c), g = h[H], w = (0, d.Vh)(m % 4, v, H), L = (0, p.Z)(w, 2), P = L[0], b = L[1]; j.has("".concat(P, ",").concat(b));) b -= 2;
        j.add("".concat(P, ",").concat(b));
        var M = i.lastMove.filter(function (e, r) {
            return !(r % 2);
          }),
          A = M.indexOf(m);
        if (A >= 0) {
          for (var Z = (0, d.iM)(m, i.planePositionList.length / 4), D = i.lastMove[2 * A + 1], N = (0, d.Vh)(m % 4, D, Z), O = (0, p.Z)(N, 2), T = O[0], V = O[1]; k.has("".concat(T, ",").concat(V));) V -= 2;
          k.add("".concat(T, ",").concat(V));
          var C = i.planePositionList[m],
            G = (0, d.Vh)(m % 4, C, Z),
            E = (0, p.Z)(G, 2),
            W = E[0],
            S = E[1],
            z = "".concat(Math.sqrt((T - W) * (T - W) + (V - S) * (V - S)) / 128, "s");
          y.push((0, u.jsxs)("use", {
            xlinkHref: "#p-".concat(g, "-").concat((0, d.Mg)(D)),
            x: T,
            y: V,
            children: [(0, u.jsx)("animate", {
              attributeName: "x",
              from: T,
              to: W,
              dur: z,
              begin: "indefinite",
              fill: "freeze"
            }), (0, u.jsx)("animate", {
              attributeName: "y",
              from: V,
              to: S,
              dur: z,
              begin: "indefinite",
              fill: "freeze"
            }), (0, u.jsx)("animate", {
              attributeName: "xlink:href",
              from: "#p-".concat(g, "-").concat((0, d.Mg)(D)),
              to: "#p-".concat(g, "-").concat((0, d.Mg)(C)),
              dur: z,
              begin: "indefinite",
              fill: "freeze"
            })]
          }, m));
        } else y.push((0, u.jsx)("use", {
          xlinkHref: "#p-".concat(g, "-").concat((0, d.Mg)(v)),
          x: P,
          y: b
        }, m)), v > 56 && y.push((0, u.jsx)("use", {
          xlinkHref: "#win",
          x: P,
          y: b
        }, "win".concat(m)));
      }
      if (i.lastAirline.length) {
        for (var F = i.lastAirline[0], B = i.planePositionList[F], U = (0, d.iM)(F, c), X = h[U], q = (0, d.Vh)(F % 4, B, U), I = (0, p.Z)(q, 2), J = I[0], Q = I[1]; j.has("".concat(J, ",").concat(Q));) Q -= 2;
        j.add("".concat(J, ",").concat(Q));
        var R = 3 * (i.lastAirline.length - 1) / 10,
          Y = [],
          K = [],
          $ = [];
        i.lastAirline.slice(1).forEach(function (e) {
          var r = (0, d.Vh)(F % 4, e, U),
            i = (0, p.Z)(r, 2),
            t = i[0],
            l = i[1];
          Y.push(t), K.push(l), $.push("".concat(t, ",").concat(l));
        }), Y.push(J), K.push(Q), $.push("".concat(J, ",").concat(Q));
        for (var _ = [], ee = 1; ee < Y.length; ee++) {
          var re = Y[ee] - Y[ee - 1],
            ie = K[ee] - K[ee - 1];
          if (re > 0) {
            var te = 180 * Math.atan(ie / re) / Math.PI;
            _.push("".concat(te < 0 ? te + 360 : te));
          } else re < 0 ? _.push("".concat(180 * Math.atan(ie / re) / Math.PI + 180)) : _.push(ie > 0 ? "90" : "270");
        }
        y.push((0, u.jsxs)("use", {
          xlinkHref: "#p-".concat(X, "-").concat([1, 0, 3, 2][U]),
          style: {
            filter: "drop-shadow(0 0 3px #fff)"
          },
          children: [(0, u.jsx)("animateTransform", {
            attributeName: "transform",
            type: "translate",
            additive: "sum",
            values: $.join(";"),
            dur: R,
            begin: "indefinite",
            fill: "freeze"
          }), (0, u.jsx)("animateTransform", {
            attributeName: "transform",
            type: "rotate",
            calcMode: "discrete",
            additive: "sum",
            values: _.join(";"),
            dur: R,
            begin: "indefinite",
            fill: "freeze"
          })]
        }, F)), B > 56 && y.push((0, u.jsx)("use", {
          xlinkHref: "#win",
          x: J,
          y: Q,
          style: {
            opacity: 0
          },
          children: (0, u.jsx)("animate", {
            attributeName: "opacity",
            from: "0",
            to: "1",
            dur: "0.3s",
            begin: "indefinite",
            fill: "freeze"
          })
        }, "win".concat(F)));
      }
      if (!(0, d.f0)(i) && x) for (var le = (0, d.tU)(i.lastDice), se = (0, d.iM)(4 * f, c), ne = h[se], ae = new Set(), oe = function (e) {
          var r = 4 * f + e,
            l = i.planePositionList[r];
          if (l ? l < 57 : le && i.sixTimes < 3) {
            var s = (0, d.Vh)(e, l, se),
              n = (0, p.Z)(s, 2),
              a = n[0],
              o = n[1];
            if (ae.has("".concat(a, ",").concat(o))) return "continue";
            ae.add("".concat(a, ",").concat(o)), y.push((0, u.jsx)("use", {
              xlinkHref: "#p-".concat(ne, "-").concat((0, d.Mg)(l)),
              className: "fxq-selectable-plane",
              x: a,
              y: o,
              onClick: function () {
                return t((0, d.VX)(i, f, r));
              }
            }, "s".concat(e)));
          }
        }, fe = 0; fe < 4; fe++) oe(fe);
      return (0, u.jsx)(u.Fragment, {
        children: y
      });
    },
    j = i(7992);
  var k = function (e) {
      var r = e.room,
        i = e.game,
        t = e.updateGameData,
        l = (e.send, i.state),
        n = 3 & l,
        a = !(4 & l),
        o = r.position - 1,
        f = (0, d.f0)(i);
      return r.position, (0, u.jsxs)("div", {
        className: "mt-2",
        children: [(0, u.jsxs)("div", {
          children: ["\u4f60\u662f".concat("\u84dd\u7eff\u7ea2\u9ec4"[(0, d.iM)(4 * o, r.playerList.length)], "\u8272\uff0c"), i.winners.includes(o) ? "\u606d\u559c\u4f60\u5230\u8fbe\u7ec8\u70b9\uff01" : (0, d.f0)(i) ? "\u4e0b\u6b21\u52a0\u6cb9" : n === o ? a ? "\u8f6e\u5230\u4f60\u63b7\u9ab0\u5b50" : i.sixTimes >= 3 ? "\u8fde\u7eed\u63b7\u52303\u6b21\u516d\uff0c\u4f60\u9700\u8981\u9009\u4e00\u4e2a\u98de\u673a\u56de\u539f\u70b9" : "\u8bf7\u9009\u4e00\u4e2a\u98de\u673a\u79fb\u52a8" : "\u8bf7\u7b49\u5f85\u4ed6\u4eba\u64cd\u4f5c"]
        }), !f && (0, u.jsxs)("div", {
          className: "mt-4",
          children: [o !== n && (0, j.Yw)(r, n) && (0, u.jsx)("div", {
            className: "mb-4",
            children: (0, u.jsx)(s.Z, {
              small: !0,
              primary: !0,
              onClick: function () {
                return t((0, d.S1)(i, n));
              },
              children: "\u8be5\u73a9\u5bb6\u5df2\u6302\u673a\uff0c\u70b9\u6b64\u8df3\u8fc7\u4ed6\u7684\u56de\u5408"
            })
          }), (0, u.jsx)("div", {
            children: (0, u.jsx)(s.Z, {
              primary: !0,
              disabled: !a || n !== o,
              onClick: function () {
                return t((0, d.HU)(i, o));
              },
              children: "\ud83c\udfb2 \u63b7\u9ab0\u5b50"
            })
          })]
        })]
      });
    },
    m = i(4591),
    v = l.memo(function (e) {
      var r = e.c,
        i = e.w,
        t = e.className;
      return (0, u.jsxs)("svg", {
        className: t,
        style: {
          width: i
        },
        viewBox: "-6,-6,12,12",
        xmlns: "http://www.w3.org/2000/svg",
        children: [(0, u.jsx)("circle", {
          r: "4.5",
          fill: "#f4ffed",
          strokeWidth: "0.5",
          stroke: r
        }), (0, u.jsx)("path", {
          d: "M-0.23,-3.077L0.23,-3.077L0.92,2.46L-0.92,2.46Z",
          fill: r,
          stroke: "none"
        }), (0, u.jsx)("path", {
          d: "M-0.69,-1.69V1.077L-2.308,2.461Z",
          fill: r,
          stroke: "none"
        }), (0, u.jsx)("path", {
          d: "M0.69,-1.69V1.077L2.308,2.461Z",
          fill: r,
          stroke: "none"
        })]
      });
    });
  var H = function (e) {
    var r = e.room,
      i = e.game,
      l = e.send,
      f = e.view,
      x = 3 & f.state,
      p = !(4 & f.state),
      h = !!r.position,
      H = h && r.position === r.owner,
      g = (0, d.f0)(f),
      w = function (e) {
        l(n.Z.PlayerUpdateGameData, {
          data: o.b.encode((0, t.Z)({
            rule: f.rule
          }, e)).finish()
        });
      },
      L = r.playerList.length;
    return (0, a.N)([]), (0, u.jsxs)(u.Fragment, {
      children: [H && (0, u.jsx)("div", {
        className: "button-container",
        children: (0, u.jsx)("div", {
          className: "button-right",
          children: (0, u.jsx)(s.Z, {
            small: !0,
            onClick: function () {
              return (0, a.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return l(n.Z.OwnerExitGame, {
                  data: o.b.encode({
                    rule: f.rule
                  }).finish()
                });
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), (0, u.jsx)("div", {
        className: "flex justify-evenly",
        children: r.playerList.map(function (e, i) {
          var t = (0, d.iM)(4 * i, L),
            s = "#".concat(["0b75c1", "0ca80d", "e43415", "fed105"][t]);
          return (0, u.jsxs)("div", {
            children: [(0, u.jsx)(j.ZP, {
              className: "mx-auto",
              room: r,
              index: i,
              send: l,
              isTurn: !g && x === i
            }), (0, u.jsx)(v, {
              c: s,
              className: "mt-1 mx-auto",
              w: 28
            }), (0, u.jsx)("div", {
              className: "flex justify-center",
              children: new Array(L).fill(0).map(function (e, r) {
                var t = f.attack[i] >> 5 * r & 31;
                return t > 30 && (t = ">30"), (0, u.jsxs)("div", {
                  className: "flex items-center justify-center text-xs flex-wrap",
                  children: [(0, u.jsx)(v, {
                    className: "",
                    w: 18,
                    c: "#".concat(["0b75c1", "0ca80d", "e43415", "fed105"][(0, d.iM)(4 * r, L)])
                  }), t]
                }, r);
              })
            }), f.winners.includes(i) && (0, u.jsx)("div", {
              className: "text-center",
              children: "\u7b2c ".concat(f.winners.indexOf(i) + 1, " \u540d")
            })]
          }, i);
        })
      }), (0, u.jsx)(companionMapBridge.mapViewport, {
        children: (0, u.jsxs)("div", {
          className: "max-w-3xl mx-auto w-full relative",
          children: [(0, u.jsxs)("svg", {
            viewBox: "-88,-92,176,184",
            xmlns: "http://www.w3.org/2000/svg",
            children: [(0, u.jsx)(c, {}), (0, u.jsx)(y, {
              room: r,
              gameVersion: i.version,
              game: f,
              updateGameData: w
            })]
          }), !!f.lastDice && (0, u.jsx)("div", {
            className: "absolute inset-0 m-auto w-10 h-10 scale-125 sm:scale-150",
            children: (0, u.jsx)(m.Z, {
              n: f.lastDice - 1,
              className: p ? "" : "animate-bounce"
            })
          })]
        })
      }), (0, u.jsxs)("div", {
        className: "text-center",
        children: [g && (0, u.jsx)("div", {
          className: "mt-2 text-2xl",
          children: (0, u.jsx)("div", {
            children: "\u606d\u559c".concat(f.winners[0] + 1 === r.position ? "\u4f60" : "\u73a9\u5bb6".concat(f.winners[0] + 1), "\u83b7\u5f97\u51a0\u519b\uff01")
          })
        }), h ? (0, u.jsx)(k, {
          room: r,
          game: f,
          updateGameData: w,
          send: l
        }) : (0, u.jsx)("div", {
          className: "text-2xl mt-2",
          children: "\u89c2\u6218\u4e2d"
        })]
      })]
    });
  };
},
6630: function (e, r, i) {
  i.d(r, {
    b: function () {
      return o;
    }
  });
  var t = i(7710),
    l = t.Reader,
    s = t.Writer,
    n = t.util,
    a = t.roots.default || (t.roots.default = {}),
    o = a.FXQGameData = function () {
      function e(e) {
        if (this.winners = [], this.planePositionList = [], this.lastAirline = [], this.lastMove = [], this.attack = [], e) for (var r = Object.keys(e), i = 0; i < r.length; ++i) null != e[r[i]] && (this[r[i]] = e[r[i]]);
      }
      return e.prototype.rule = 0, e.prototype.state = 0, e.prototype.lastDice = 0, e.prototype.sixTimes = 0, e.prototype.winners = n.emptyArray, e.prototype.planePositionList = n.emptyArray, e.prototype.lastAirline = n.emptyArray, e.prototype.lastMove = n.emptyArray, e.prototype.attack = n.emptyArray, e.prototype.lastDicePlayer = 0, e.encode = function (e, r) {
        if (r || (r = s.create()), null != e.rule && Object.hasOwnProperty.call(e, "rule") && r.uint32(8).uint32(e.rule), null != e.state && Object.hasOwnProperty.call(e, "state") && r.uint32(16).uint32(e.state), null != e.lastDice && Object.hasOwnProperty.call(e, "lastDice") && r.uint32(24).uint32(e.lastDice), null != e.sixTimes && Object.hasOwnProperty.call(e, "sixTimes") && r.uint32(32).uint32(e.sixTimes), null != e.winners && e.winners.length) {
          r.uint32(42).fork();
          for (var i = 0; i < e.winners.length; ++i) r.uint32(e.winners[i]);
          r.ldelim();
        }
        if (null != e.planePositionList && e.planePositionList.length) {
          r.uint32(50).fork();
          for (i = 0; i < e.planePositionList.length; ++i) r.uint32(e.planePositionList[i]);
          r.ldelim();
        }
        if (null != e.lastAirline && e.lastAirline.length) {
          r.uint32(58).fork();
          for (i = 0; i < e.lastAirline.length; ++i) r.uint32(e.lastAirline[i]);
          r.ldelim();
        }
        if (null != e.lastMove && e.lastMove.length) {
          r.uint32(66).fork();
          for (i = 0; i < e.lastMove.length; ++i) r.uint32(e.lastMove[i]);
          r.ldelim();
        }
        if (null != e.attack && e.attack.length) {
          r.uint32(74).fork();
          for (i = 0; i < e.attack.length; ++i) r.uint32(e.attack[i]);
          r.ldelim();
        }
        return null != e.lastDicePlayer && Object.hasOwnProperty.call(e, "lastDicePlayer") && r.uint32(80).uint32(e.lastDicePlayer), r;
      }, e.decode = function (e, r) {
        e instanceof l || (e = l.create(e));
        for (var i = void 0 === r ? e.len : e.pos + r, t = new a.FXQGameData(); e.pos < i;) {
          var s = e.uint32();
          switch (s >>> 3) {
            case 1:
              t.rule = e.uint32();
              break;
            case 2:
              t.state = e.uint32();
              break;
            case 3:
              t.lastDice = e.uint32();
              break;
            case 4:
              t.sixTimes = e.uint32();
              break;
            case 5:
              if (t.winners && t.winners.length || (t.winners = []), 2 === (7 & s)) for (var n = e.uint32() + e.pos; e.pos < n;) t.winners.push(e.uint32());else t.winners.push(e.uint32());
              break;
            case 6:
              if (t.planePositionList && t.planePositionList.length || (t.planePositionList = []), 2 === (7 & s)) for (n = e.uint32() + e.pos; e.pos < n;) t.planePositionList.push(e.uint32());else t.planePositionList.push(e.uint32());
              break;
            case 7:
              if (t.lastAirline && t.lastAirline.length || (t.lastAirline = []), 2 === (7 & s)) for (n = e.uint32() + e.pos; e.pos < n;) t.lastAirline.push(e.uint32());else t.lastAirline.push(e.uint32());
              break;
            case 8:
              if (t.lastMove && t.lastMove.length || (t.lastMove = []), 2 === (7 & s)) for (n = e.uint32() + e.pos; e.pos < n;) t.lastMove.push(e.uint32());else t.lastMove.push(e.uint32());
              break;
            case 9:
              if (t.attack && t.attack.length || (t.attack = []), 2 === (7 & s)) for (n = e.uint32() + e.pos; e.pos < n;) t.attack.push(e.uint32());else t.attack.push(e.uint32());
              break;
            case 10:
              t.lastDicePlayer = e.uint32();
              break;
            default:
              e.skipType(7 & s);
          }
        }
        return t;
      }, e;
    }();
},
4062: function (e, r, i) {
  i.d(r, {
    Bx: function () {
      return o;
    },
    HU: function () {
      return w;
    },
    Mg: function () {
      return u;
    },
    S1: function () {
      return P;
    },
    VX: function () {
      return L;
    },
    Vh: function () {
      return x;
    },
    f0: function () {
      return v;
    },
    iM: function () {
      return h;
    },
    tU: function () {
      return f;
    }
  });
  var t = i(7762),
    l = i(2982),
    s = i(885),
    n = i(6630),
    a = i(4420),
    o = function (e, r) {
      var i = n.b.decode(r),
        t = e.playerList.length;
      return {
        rule: t < 4 ? 0 : i.rule,
        state: 0,
        lastDice: 0,
        sixTimes: 0,
        winners: [],
        planePositionList: new Array(4 * t).fill(0),
        lastAirline: [],
        lastMove: [],
        attack: new Array(t).fill(0),
        lastDicePlayer: 0
      };
    },
    f = function (e) {
      return !(e % 2);
    },
    u = function (e) {
      return [0, 0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0][e];
    },
    x = function (e, r, i) {
      var t = function (e, r) {
          return !r || r > 57 ? [[-6.2, 6.2, -6.2, 6.2][e] - 68, [-6.2, -6.2, 6.2, 6.2][e] + 68] : [[0, -46, -34.5, -38, -38, -34.3, -41.7, -52, -64, -74.3, -78, -78, -78, -78, -78, -74.5, -64, -52, -41.7, -34.3, -38, -38, -34.3, -24, -12, -0, 12, 24, 34.5, 38, 38, 34.3, 41.7, 52, 64, 74.3, 78, 78, 78, 78, 78, 74.5, 64, 52, 41.7, 34.3, 38, 38, 34.3, 24, 12, 0, 0, 0, 0, 0, 0, 0][r], [0, 80, 74.5, 64, 52, 41.7, 34.3, 38, 38, 34.3, 24, 12, 0, -12, -24, -34.5, -38, -38, -34.3, -41.7, -52, -64, -74.3, -78, -78, -78, -78, -78, -74.5, -64, -52, -41.7, -34.3, -38, -38, -34.3, -24, -12, -0, 12, 24, 34.5, 38, 38, 34.3, 41.7, 52, 64, 74.3, 78, 78, 78, 64.5, 53.5, 42.5, 31.5, 20.5, 9.5][r]];
        }(e, r),
        l = (0, s.Z)(t, 2),
        n = l[0],
        a = l[1];
      return i ? 2 === i ? [-n, -a] : 1 === i ? [-a, n] : [a, -n] : [n, a];
    },
    c = function (e, r) {
      for (var i = 4 * e, t = 0; t < 4; t++) if (r[i + t] < 57) return !1;
      return !0;
    },
    p = function (e, r) {
      for (var i = r.planePositionList.length / 4, t = e + 1, l = 0; l < i; l++) {
        if (t >= i && (t = 0), !(r.winners.includes(t) || c(t, r.planePositionList))) return t;
        t++;
      }
      return t;
    },
    d = function (e, r) {
      for (var i = 0; i < 4; i++) {
        var t = r.planePositionList[4 * e + i];
        if (t > 0 && t < 57) return !1;
      }
      return !0;
    },
    h = function (e, r) {
      return e < 4 ? 0 : r < 3 ? 2 : e < 8 ? 1 : e < 12 ? 2 : 3;
    },
    y = function (e, r, i) {
      if (e > 51 || e < 2) return [];
      for (var t = i.planePositionList, l = t.length / 4, n = x(0, e, r), a = (0, s.Z)(n, 2), o = a[0], f = a[1], u = [], c = 0; c < l; c++) {
        var p = h(4 * c, l);
        if (p !== r) for (var d = 0; d < 4; d++) {
          var y = t[4 * c + d],
            j = x(d, y, p),
            k = (0, s.Z)(j, 2),
            m = k[0],
            v = k[1];
          m === o && v === f && u.push(4 * c + d);
        }
      }
      return u;
    },
    j = function (e, r, i) {
      if (e > 51 || e < 2) return !1;
      for (var t = i.planePositionList, l = t.length / 4, n = x(0, e, r), a = (0, s.Z)(n, 2), o = a[0], f = a[1], u = 0, c = 0; c < l; c++) {
        var p = h(4 * c, l);
        if (p !== r) for (var d = 0; d < 4; d++) {
          var y = t[4 * c + d],
            j = x(d, y, p),
            k = (0, s.Z)(j, 2),
            m = k[0],
            v = k[1];
          if (m === o && v === f && ++u > 1) return !0;
        }
      }
      return !1;
    },
    k = function (e, r, i) {
      for (var t = 1; t < 4; t++) if (j(e + t, r, i)) return !1;
      return !0;
    },
    m = function (e, r) {
      for (var i = function (e, r) {
          var i = r.planePositionList.length / 4;
          return e ? i < 3 || e < 2 ? 4 : e < 3 ? 8 : 12 : 0;
        }([2, 3, 0, 1][e], r), t = [], l = 0; l < 4; l++) {
        54 === r.planePositionList[i + l] && t.push(i + l);
      }
      return t;
    },
    v = function (e) {
      return e.planePositionList.length / 4 - e.winners.length < 2;
    };
  function H(e) {
    return JSON.parse(JSON.stringify(e));
  }
  function g(e, r, i) {
    var t = [0, 0, 0, 0];
    [0, 1, 2, 3].forEach(function (i) {
      t[i] = e[r] >> 5 * i & 31;
    }), t[i] > 30 || (t[i] += 1, e[r] = 0, [0, 1, 2, 3].forEach(function (i) {
      e[r] |= t[i] << 5 * i;
    }));
  }
  function w(e, r) {
    var i = H(e),
      t = (0, a.M)(6) + 1,
      l = 6 === t ? i.sixTimes + 1 : 0,
      s = 4 | r;
    return (l >= 3 && d(r, i) || !f(t) && d(r, i)) && (s = p(r, i), l = 0), i.state = s, i.lastDice = t, i.lastDicePlayer = r, i.sixTimes = l, i.lastAirline = [], i.lastMove = [], i;
  }
  function L(e, r, i) {
    var s = H(e),
      n = s.planePositionList.length / 4,
      a = h(4 * r, n),
      o = e.planePositionList[i],
      f = [i, o],
      u = [];
    s.attack.length || (s.attack = new Array(n).fill(0)), s.sixTimes >= 3 ? (s.planePositionList[i] = 0, g(s.attack, r, r), f.push(0)) : o ? function () {
      var n = function (e, r, i, t) {
        for (var l = 1; l < i; l++) if (j(e + l, r, t)) return e + l;
        return 0;
      }(o, a, e.lastDice, e);
      if (n ? function () {
        var r = 2 * n - e.lastDice - o,
          t = function (e, r, i, t) {
            if (e < 2) return 1;
            for (var l = 1; l < i; l++) {
              if (e - l < 2) return 1;
              if (j(e - l, r, t)) return e - l;
            }
            return 0;
          }(o, a, o - r, e);
        if (r >= o || !t) s.planePositionList[i] = r, f.push.apply(f, (0, l.Z)(new Array(n - o).fill(0).map(function (e, r) {
          return r + o + 1;
        }))), f.push.apply(f, (0, l.Z)(new Array(e.lastDice - n + o).fill(0).map(function (e, r) {
          return n - r - 1;
        })));else {
          for (var u = 2 * (n - t), x = e.lastDice % u, c = (e.lastDice - x) / u, p = 0; p < c; p++) f.push.apply(f, (0, l.Z)(new Array(n - o).fill(0).map(function (e, r) {
            return r + o + 1;
          }))), f.push.apply(f, (0, l.Z)(new Array(n - t).fill(0).map(function (e, r) {
            return n - r - 1;
          }))), f.push.apply(f, (0, l.Z)(new Array(o - t).fill(0).map(function (e, r) {
            return r + t + 1;
          })));
          if (o + x <= n) s.planePositionList[i] = o + x, f.push.apply(f, (0, l.Z)(new Array(x).fill(0).map(function (e, r) {
            return r + o + 1;
          })));else {
            f.push.apply(f, (0, l.Z)(new Array(n - o).fill(0).map(function (e, r) {
              return r + o + 1;
            })));
            var d = 2 * n - x - o;
            d >= t ? (s.planePositionList[i] = d, f.push.apply(f, (0, l.Z)(new Array(n - d).fill(0).map(function (e, r) {
              return n - r - 1;
            })))) : (s.planePositionList[i] = 2 * t - d, f.push.apply(f, (0, l.Z)(new Array(n - t).fill(0).map(function (e, r) {
              return n - r - 1;
            }))), f.push.apply(f, (0, l.Z)(new Array(t - d).fill(0).map(function (e, r) {
              return r + t + 1;
            }))));
          }
        }
      }() : (s.planePositionList[i] += e.lastDice, s.planePositionList[i] > 57 ? (s.planePositionList[i] = 114 - s.planePositionList[i], f.push.apply(f, (0, l.Z)(new Array(57 - o).fill(0).map(function (e, r) {
        return r + o + 1;
      }))), f.push.apply(f, (0, l.Z)(new Array(e.lastDice - 57 + o).fill(0).map(function (e, r) {
        return 57 - r - 1;
      })))) : (f.push.apply(f, (0, l.Z)(new Array(e.lastDice).fill(0).map(function (e, r) {
        return r + o + 1;
      }))), 57 === s.planePositionList[i] && (s.planePositionList[i] = 58, f.push(58)))), s.planePositionList[i] < 52) {
        var x = y(s.planePositionList[i], a, e);
        if (x.length > 1) {
          var c,
            p = y(s.planePositionList[i], a, e),
            d = (0, t.Z)(p);
          try {
            for (d.s(); !(c = d.n()).done;) {
              var h = c.value;
              u.push(h), u.push(s.planePositionList[h]), s.planePositionList[h] = 0, g(s.attack, r, Math.floor(h / 4));
            }
          } catch (N) {
            d.e(N);
          } finally {
            d.f();
          }
          s.planePositionList[i] = 0, g(s.attack, r, r), f.push(0);
        } else if (s.planePositionList[i] < 48 && s.planePositionList[i] % 4 === 3) {
          if (15 === s.planePositionList[i]) {
            if (k(15, a, e)) {
              var v = m(a, e);
              if (v.length > 1) s.planePositionList[i] += 4, f.push(s.planePositionList[i]);else if (s.planePositionList[i] += 16, f.push(s.planePositionList[i] - 12), f.push(s.planePositionList[i]), v.length) {
                var H = v[0];
                u.push(H), u.push(s.planePositionList[H]), s.planePositionList[H] = 0, g(s.attack, r, Math.floor(H / 4));
              }
            }
          } else if (19 === s.planePositionList[i]) {
            var w = m(a, e);
            if (w.length > 1) s.planePositionList[i] += 4, f.push(s.planePositionList[i]);else {
              if (w.length) {
                var L = w[0];
                u.push(L), u.push(s.planePositionList[L]), s.planePositionList[L] = 0, g(s.attack, r, Math.floor(L / 4));
              }
              !j(31, a, e) && k(31, a, e) ? (s.planePositionList[i] += 16, f.push(s.planePositionList[i] - 4), f.push(s.planePositionList[i])) : (s.planePositionList[i] += 12, f.push(s.planePositionList[i]));
            }
          } else k(s.planePositionList[i], a, e) && (s.planePositionList[i] += 4, f.push(s.planePositionList[i]));
          var P = y(s.planePositionList[i], a, e);
          if (P.length > 1) {
            var b,
              M = (0, t.Z)(P);
            try {
              for (M.s(); !(b = M.n()).done;) {
                var A = b.value;
                u.push(A), u.push(s.planePositionList[A]), s.planePositionList[A] = 0, g(s.attack, r, Math.floor(A / 4));
              }
            } catch (N) {
              M.e(N);
            } finally {
              M.f();
            }
            f.push(0), s.planePositionList[i] = 0, g(s.attack, r, r);
          } else if (P.length) {
            var Z = P[0];
            u.push(Z), u.push(s.planePositionList[Z]), s.planePositionList[Z] = 0, g(s.attack, r, Math.floor(Z / 4));
          }
        } else if (x.length) {
          var D = x[0];
          u.push(D), u.push(s.planePositionList[D]), s.planePositionList[D] = 0, g(s.attack, r, Math.floor(D / 4));
        }
      }
    }() : (s.planePositionList[i] = 1, f.push(1));
    var x = c(r, s.planePositionList),
      d = !x && 6 === s.lastDice && s.sixTimes < 3 ? r : p(r, s);
    return x && !s.winners.includes(r) && s.winners.push(r), s.state = d, s.lastDice = 0, s.sixTimes = s.sixTimes < 3 ? s.sixTimes : 0, s.lastAirline = f.slice(0, f.length - 1), s.lastMove = u, s;
  }
  function P(e, r) {
    if (e.sixTimes >= 3 && 4 & e.state) {
      for (var i = [], t = 0; t < 4; t++) {
        var l = 4 * r + t,
          s = e.planePositionList[l];
        s > 0 && s < 57 && i.push(l);
      }
      if (i.length) return i.sort(function (r, i) {
        return e.planePositionList[r] - e.planePositionList[i];
      }), L(e, r, i[0]);
    }
    var n = H(e);
    return n.state = p(r, n), n.lastDice = 0, n.sixTimes = 0, n.lastAirline = [], n.lastMove = [], n;
  }
},
1621: function (e, n, r) {
  r.r(n), r.d(n, {
    default: function () {
      return m;
    }
  });
  var t = r(885),
    i = r(7313),
    o = r(4595),
    a = r(3953),
    c = r(5982),
    l = r(1529),
    s = r(5328),
    u = r(1817),
    d = r(6417);
  function p(e) {
    var n = e.room,
      r = e.view,
      t = e.gameVersion,
      i = e.send,
      o = e.perspectivePlayerId,
      a = n.playerList.length,
      p = !!n.position,
      f = p ? n.position - 1 : 0;
    return (0, d.jsx)(u.Z, {
      view: r,
      playerCount: a,
      activePlayerId: p ? f : null,
      onMove: function (e) {
        return n = (0, s.oe)(r, e), void i(c.Z.PlayerUpdateGameData, {
          data: l.QY.encode((0, s.qA)(n)).finish()
        });
        var n;
      },
      gameVersion: t,
      perspectivePlayerId: o
    });
  }
  var f = i.memo(p, function (e, n) {
      return e.gameVersion === n.gameVersion && e.perspectivePlayerId === n.perspectivePlayerId;
    }),
    h = r(7992);
  var m = function (e) {
    var n = e.room,
      r = e.game,
      u = e.send,
      p = l.QY.decode(r.data),
      m = e.view,
      v = n.owner === n.position,
      x = !!n.position,
      y = x ? n.position - 1 : 0,
      g = (0, i.useState)(y),
      w = (0, t.Z)(g, 2),
      j = w[0],
      Z = w[1],
      C = m.finish && m.winnerId.length > 0,
      I = m.winnerId.map(function (e) {
        return "\u73a9\u5bb6".concat(e + 1);
      }).join("\u3001"),
      b = m.playerPieces.length - m.winnerId.length === 1;
    return (0, i.useEffect)(function () {
      Z(y);
    }, [y]), (0, a.N)([]), (0, d.jsxs)(d.Fragment, {
      children: [v && (0, d.jsx)("div", {
        className: "button-container",
        children: (0, d.jsx)("div", {
          className: "button-right",
          children: (0, d.jsx)(o.Z, {
            small: !0,
            onClick: function () {
              return (0, a.Z)("\u786e\u8ba4\u7ed3\u675f\u6e38\u620f\u5417\uff1f", function () {
                return u(c.Z.OwnerExitGame, {
                  data: l.QY.encode({
                    prop: p.prop
                  }).finish()
                });
              });
            },
            children: "\u7ed3\u675f\u6e38\u620f"
          })
        })
      }), !m.finish && (0, d.jsx)("div", {
        className: "text-center",
        children: "\u7b2c ".concat(m.round, " \u56de\u5408").concat(b ? "\uff08\u4ec5\u5269\u6700\u540e\u4e00\u6b65\uff09" : "")
      }), C && (0, d.jsxs)("div", {
        className: "text-center mt-2",
        children: [(0, d.jsx)("div", {
          children: "\ud83c\udf89\u606d\u559c".concat(I, "\u80dc\u5229")
        }), e.onReplay && (0, d.jsx)(o.Z, {
          className: "mt-2",
          small: !0,
          primary: !0,
          children: "\u5BA1\u6838 AI \u51B3\u7B56",
          onClick: e.onReplay
        })]
      }), (0, d.jsx)("div", {
        className: "flex justify-evenly flex-wrap mt-4",
        children: n.playerList.map(function (e, r) {
          return (0, d.jsxs)("div", {
            className: "mx-2 w-20 flex flex-col items-center",
            children: [(0, d.jsx)(h.ZP, {
              room: n,
              index: r,
              send: u,
              isTurn: !m.finish && m.waitFor === r
            }), (0, d.jsx)("div", {
              className: "mt-2 mx-auto border rounded-full w-4 h-4",
              style: {
                background: s.DM[r]
              }
            }), (0, d.jsx)(o.Z, {
              className: "mt-2",
              small: !0,
              disabled: j === r,
              onClick: function () {
                return Z(r);
              },
              children: "\u9009\u89c6\u89d2"
            }), (0, d.jsx)("div", {
              className: "text-center mt-2 text-sm",
              children: m.winnerId.includes(r) ? "\u5171 ".concat(m.winnerRound[m.winnerId.indexOf(r)], " \u6b65") : ""
            })]
          }, r);
        })
      }), (0, d.jsx)(f, {
        room: n,
        view: m,
        gameVersion: r.version,
        send: u,
        perspectivePlayerId: j
      }), !x && (0, d.jsx)("div", {
        className: "text-2xl mt-4 text-center",
        children: "\u89c2\u6218\u4e2d"
      })]
    });
  };
},
1529: function (e, n, r) {
  r.d(n, {
    QY: function () {
      return l;
    }
  });
  var t = r(7710),
    i = t.Reader,
    o = t.Writer,
    a = t.util,
    c = t.roots.default || (t.roots.default = {}),
    l = (c.TQOperation = function () {
      function e(e) {
        if (this.route = [], e) for (var n = Object.keys(e), r = 0; r < n.length; ++r) null != e[n[r]] && (this[n[r]] = e[n[r]]);
      }
      return e.prototype.playerId = 0, e.prototype.pieceId = 0, e.prototype.route = a.emptyArray, e.encode = function (e, n) {
        if (n || (n = o.create()), null != e.playerId && Object.hasOwnProperty.call(e, "playerId") && n.uint32(8).uint32(e.playerId), null != e.pieceId && Object.hasOwnProperty.call(e, "pieceId") && n.uint32(16).uint32(e.pieceId), null != e.route && e.route.length) {
          n.uint32(26).fork();
          for (var r = 0; r < e.route.length; ++r) n.uint32(e.route[r]);
          n.ldelim();
        }
        return n;
      }, e.decode = function (e, n) {
        e instanceof i || (e = i.create(e));
        for (var r = void 0 === n ? e.len : e.pos + n, t = new c.TQOperation(); e.pos < r;) {
          var o = e.uint32();
          switch (o >>> 3) {
            case 1:
              t.playerId = e.uint32();
              break;
            case 2:
              t.pieceId = e.uint32();
              break;
            case 3:
              if (t.route && t.route.length || (t.route = []), 2 === (7 & o)) for (var a = e.uint32() + e.pos; e.pos < a;) t.route.push(e.uint32());else t.route.push(e.uint32());
              break;
            default:
              e.skipType(7 & o);
          }
        }
        return t;
      }, e;
    }(), c.TQGameData = function () {
      function e(e) {
        if (this.pieces = [], this.winners = [], e) for (var n = Object.keys(e), r = 0; r < n.length; ++r) null != e[n[r]] && (this[n[r]] = e[n[r]]);
      }
      return e.prototype.prop = 0, e.prototype.round = 0, e.prototype.waitFor = 0, e.prototype.pieces = a.emptyArray, e.prototype.winners = a.emptyArray, e.prototype.lastOp = null, e.prototype.records = a.newBuffer([]), e.encode = function (e, n) {
        if (n || (n = o.create()), null != e.prop && Object.hasOwnProperty.call(e, "prop") && n.uint32(8).uint32(e.prop), null != e.round && Object.hasOwnProperty.call(e, "round") && n.uint32(16).uint32(e.round), null != e.waitFor && Object.hasOwnProperty.call(e, "waitFor") && n.uint32(24).uint32(e.waitFor), null != e.pieces && e.pieces.length) {
          n.uint32(34).fork();
          for (var r = 0; r < e.pieces.length; ++r) n.uint32(e.pieces[r]);
          n.ldelim();
        }
        if (null != e.winners && e.winners.length) {
          n.uint32(42).fork();
          for (r = 0; r < e.winners.length; ++r) n.uint32(e.winners[r]);
          n.ldelim();
        }
        return null != e.lastOp && Object.hasOwnProperty.call(e, "lastOp") && c.TQOperation.encode(e.lastOp, n.uint32(50).fork()).ldelim(), null != e.records && Object.hasOwnProperty.call(e, "records") && n.uint32(58).bytes(e.records), n;
      }, e.decode = function (e, n) {
        e instanceof i || (e = i.create(e));
        for (var r = void 0 === n ? e.len : e.pos + n, t = new c.TQGameData(); e.pos < r;) {
          var o = e.uint32();
          switch (o >>> 3) {
            case 1:
              t.prop = e.uint32();
              break;
            case 2:
              t.round = e.uint32();
              break;
            case 3:
              t.waitFor = e.uint32();
              break;
            case 4:
              if (t.pieces && t.pieces.length || (t.pieces = []), 2 === (7 & o)) for (var a = e.uint32() + e.pos; e.pos < a;) t.pieces.push(e.uint32());else t.pieces.push(e.uint32());
              break;
            case 5:
              if (t.winners && t.winners.length || (t.winners = []), 2 === (7 & o)) for (a = e.uint32() + e.pos; e.pos < a;) t.winners.push(e.uint32());else t.winners.push(e.uint32());
              break;
            case 6:
              t.lastOp = c.TQOperation.decode(e, e.uint32());
              break;
            case 7:
              t.records = e.bytes();
              break;
            default:
              e.skipType(7 & o);
          }
        }
        return t;
      }, e;
    }());
},
5328: function (e, n, r) {
  r.d(n, {
    Bx: function () {
      return Q;
    },
    DM: function () {
      return u;
    },
    Dw: function () {
      return C;
    },
    Qq: function () {
      return v;
    },
    Us: function () {
      return D;
    },
    WJ: function () {
      return j;
    },
    Z7: function () {
      return ne;
    },
    _9: function () {
      return m;
    },
    bX: function () {
      return O;
    },
    fE: function () {
      return p;
    },
    my: function () {
      return E;
    },
    oX: function () {
      return Z;
    },
    oe: function () {
      return te;
    },
    p4: function () {
      return J;
    },
    qA: function () {
      return S;
    },
    t2: function () {
      return z;
    },
    u0: function () {
      return ee;
    },
    ym: function () {
      return re;
    },
    zd: function () {
      return I;
    }
  });
  var t = r(1413),
    i = r(2982),
    o = r(885),
    a = r(1529),
    c = r(4420),
    l = r(3329),
    s = r(4962),
    u = ["#ef4444", "#2563eb", "#ca8a04", "#16a34a", "#7c3aed", "#ea580c"],
    d = {
      playerCount: 2,
      pieceCount: 10,
      mode: 0,
      rule: 0,
      routeMode: 0,
      firstId: 0,
      perspectivePlayerId: 0
    };
  function p(e) {
    var n = e[0],
      r = e[1];
    return [100 * (n + r / 2), 100 * r * 1.73205 / 2];
  }
  var f = [[[0, 3], [0, 2], [0, 1]], [[0, 2, 4], [0, 1, 2]], [[0, 1, 3, 4], [0, 1, 2, 3], [0, 1, 2, 4]], [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4, 5]]],
    h = [[[0, 3], [0, 2]], [[0, 2, 4]]];
  function m(e, n) {
    return 15 === n ? h[e - 2] : f[e - 2];
  }
  function v(e, n, r) {
    var t = m(n, r);
    return t && e >= 0 && e < t.length ? e : 0;
  }
  function x(e, n) {
    return e >= 0 && e < n ? e : d.firstId;
  }
  function y(e, n) {
    return 15 === e && n >= 2 && n <= 3 ? 15 : 10;
  }
  function g(e) {
    var n = function (e) {
        return e >= 2 && e <= 6 ? e : d.playerCount;
      }(e.playerCount),
      r = y(e.pieceCount, n);
    return {
      playerCount: n,
      pieceCount: r,
      mode: v(e.mode, n, r),
      rule: e.rule ? 1 : 0,
      routeMode: e.routeMode ? 1 : 0,
      firstId: x(e.firstId, n),
      perspectivePlayerId: x(e.perspectivePlayerId, n)
    };
  }
  function w(e, n) {
    return y(128 & e ? 15 : 10, n);
  }
  function j(e, n, r, t, i) {
    return (15 === i ? 128 : 0) | n << 6 | t << 4 | r << 1 | e;
  }
  function Z(e) {
    var n,
      r = g(e),
      t = [],
      a = 0,
      c = 0,
      u = (0, l.F)(c, a, r.playerCount - 2, 3),
      d = (0, o.Z)(u, 3);
    c = d[0], a = d[1], n = d[2], t.push.apply(t, (0, i.Z)(n));
    var p = (0, l.F)(c, a, r.mode, 2),
      f = (0, o.Z)(p, 3);
    c = f[0], a = f[1], n = f[2], t.push.apply(t, (0, i.Z)(n));
    var h = (0, l.F)(c, a, r.rule, 1),
      m = (0, o.Z)(h, 3);
    c = m[0], a = m[1], n = m[2], t.push.apply(t, (0, i.Z)(n));
    var v = (0, l.F)(c, a, r.routeMode, 1),
      x = (0, o.Z)(v, 3);
    c = x[0], a = x[1], n = x[2], t.push.apply(t, (0, i.Z)(n));
    var y = (0, l.F)(c, a, r.firstId, 3),
      w = (0, o.Z)(y, 3);
    c = w[0], a = w[1], n = w[2], t.push.apply(t, (0, i.Z)(n));
    var j = (0, l.F)(c, a, r.perspectivePlayerId, 3),
      Z = (0, o.Z)(j, 3);
    c = Z[0], a = Z[1], n = Z[2], t.push.apply(t, (0, i.Z)(n));
    var C = (0, l.F)(c, a, 15 === r.pieceCount ? 1 : 0, 1),
      I = (0, o.Z)(C, 3);
    return c = I[0], a = I[1], n = I[2], t.push.apply(t, (0, i.Z)(n)), a && t.push(c), (0, s.Z)(Uint8Array.from(t));
  }
  function C(e) {
    var n = g(e);
    return n.playerCount === d.playerCount && n.pieceCount === d.pieceCount && n.mode === d.mode && n.rule === d.rule && n.routeMode === d.routeMode && n.firstId === d.firstId && n.perspectivePlayerId === d.perspectivePlayerId;
  }
  function I(e) {
    if (!e) return (0, t.Z)({}, d);
    var n = (0, s.I)(e);
    if (!n) return (0, t.Z)({}, d);
    try {
      var r = (0, l.lS)(n, 0, 3),
        i = (0, o.Z)(r, 2),
        a = i[0],
        c = i[1],
        u = (0, l.lS)(n, c, 2),
        p = (0, o.Z)(u, 2),
        f = p[0],
        h = p[1],
        m = (0, l.lS)(n, h, 1),
        v = (0, o.Z)(m, 2),
        x = v[0],
        y = v[1],
        w = (0, l.lS)(n, y, 1),
        j = (0, o.Z)(w, 2),
        Z = j[0],
        C = j[1],
        I = (0, l.lS)(n, C, 3),
        b = (0, o.Z)(I, 2),
        k = b[0],
        M = b[1],
        O = d.perspectivePlayerId,
        N = M;
      try {
        var P = (0, l.lS)(n, M, 3),
          F = (0, o.Z)(P, 2);
        O = F[0], N = F[1];
      } catch (L) {}
      var E = 0;
      try {
        var S = (0, l.lS)(n, N, 1);
        E = (0, o.Z)(S, 1)[0];
      } catch (D) {}
      var U = a + 2;
      return U < 2 || U > 6 ? (0, t.Z)({}, d) : g({
        playerCount: U,
        pieceCount: E ? 15 : 10,
        mode: f,
        rule: x,
        routeMode: Z,
        firstId: k,
        perspectivePlayerId: O
      });
    } catch (A) {
      return (0, t.Z)({}, d);
    }
  }
  function b(e, n, r) {
    var t = m(n, r);
    return t[e] || t[0];
  }
  var k = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], [20, 21, 22, 23, 24, 25, 26, 27, 28, 29], [30, 31, 32, 33, 34, 35, 36, 37, 38, 39], [40, 41, 42, 43, 44, 45, 46, 47, 48, 49], [50, 51, 52, 53, 54, 55, 56, 57, 58, 59]],
    M = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 60, 61, 62, 63, 64], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 64, 70, 77, 85, 117], [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 117, 109, 102, 96, 91], [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 91, 92, 93, 94, 95], [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 95, 101, 108, 116, 86], [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 86, 78, 71, 65, 60]];
  function O(e, n) {
    return (15 === n ? M : k)[e] || [];
  }
  function N(e) {
    var n = [];
    return e.forEach(function (e) {
      n.push.apply(n, (0, i.Z)(e));
    }), n;
  }
  function P(e, n, r, t, o) {
    var a = function (e, n) {
      for (var r = [], t = 0; t < n; t++) e.includes(t) || r.push(t);
      return r;
    }(e, o);
    if (0 === a.length) return !0;
    if (a.length > 1) return !1;
    var c = a[0],
      l = Math.max.apply(Math, (0, i.Z)(n));
    return r !== c || t !== l;
  }
  function F(e, n, r, t, o, a) {
    var c = b(t, o, a),
      l = function (e, n) {
        var r = new Array(e.length).fill(0).map(function () {
          return [];
        });
        return e.forEach(function (e, t) {
          var o;
          (o = r[t]).push.apply(o, (0, i.Z)(O(e, n)));
        }), r;
      }(c, a);
    return {
      rule: e,
      routeMode: n,
      firstId: r,
      pieceCount: a,
      mode: t,
      round: 1,
      waitFor: r - 1,
      pieces: N(l),
      winnerId: [],
      winnerRound: [],
      lastOp: {
        playerId: 0,
        route: []
      },
      recordList: [],
      playerPieces: l,
      finish: !1,
      pos: c
    };
  }
  function E(e, n) {
    for (var r = e.prop || 0, t = e.pieces || [], i = e.winners || [], o = w(r, n), a = v(r >> 4 & 3, n, o), c = i.map(function (e) {
        return 7 & e;
      }), l = i.map(function (e) {
        return e >> 3;
      }), s = [], u = -1, d = 0; d < t.length; d++) d % o || (s.push([]), u += 1), s[u].push(t[d]);
    return {
      rule: 1 & r,
      routeMode: r >> 6 & 1,
      firstId: r >> 1 & 7,
      pieceCount: o,
      mode: a,
      round: e.round,
      waitFor: e.waitFor,
      pieces: t,
      playerPieces: s,
      winnerId: c,
      winnerRound: l,
      lastOp: e.lastOp || {
        playerId: 0,
        route: []
      },
      recordList: K(e, n),
      finish: P(c, l, e.waitFor, e.round, n),
      pos: b(a, n, o)
    };
  }
  function S(e) {
    return {
      prop: j(e.rule, e.routeMode, e.firstId, e.mode, e.pieceCount),
      round: e.round,
      waitFor: e.waitFor,
      pieces: N(e.playerPieces),
      winners: e.winnerId.map(function (n, r) {
        return n | e.winnerRound[r] << 3;
      }),
      lastOp: e.lastOp,
      records: $(e)
    };
  }
  var U = [12, 11, 12, 10, 11, 12, 9, 10, 11, 12, 16, 15, 15, 14, 14, 14, 13, 13, 13, 13, 12, 12, 11, 12, 11, 10, 12, 11, 10, 9, 4, 5, 4, 6, 5, 4, 7, 6, 5, 4, 0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 4, 5, 6, 4, 5, 6, 7, 8, 9, 10, 11, 12, 7, 8, 9, 10, 11, 12, 6, 7, 8, 9, 10, 11, 12, 5, 6, 7, 8, 9, 10, 11, 12, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4, 10, 9, 8, 7, 6, 5, 4, 11, 10, 9, 8, 7, 6, 5, 4, 12, 11, 10, 9],
    L = [0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 4, 5, 6, 4, 5, 6, 7, 12, 11, 12, 10, 11, 12, 9, 10, 11, 12, 16, 15, 15, 14, 14, 14, 13, 13, 13, 13, 12, 12, 11, 12, 11, 10, 12, 11, 10, 9, 4, 5, 4, 6, 5, 4, 7, 6, 5, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 12, 12, 12, 12, 12, 11, 11, 11, 11, 11, 11, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 8];
  function D(e) {
    return [U[e], L[e]];
  }
  function A(e, n) {
    for (var r = 0; r < 121; r++) if (U[r] === e && L[r] === n) return r;
    return 0;
  }
  function Q(e, n) {
    var r = e.playerList.length,
      t = a.QY.decode(n).prop || 0,
      i = w(t, r),
      o = v(t >> 4 & 3, r, i);
    return S(F(1 & t, t >> 6 & 1, (0, c.M)(r) + 1, o, r, i));
  }
  function T(e) {
    return JSON.parse(JSON.stringify(e));
  }
  function R(e, n) {
    for (var r = 0; r < 121; r++) if (U[r] === e && L[r] === n) return !0;
    return !1;
  }
  function W(e, n, r) {
    for (var t = 0; t < e.pieces.length; t++) {
      var i = D(e.pieces[t]),
        a = (0, o.Z)(i, 2),
        c = a[0],
        l = a[1];
      if (c === n && l === r) return !1;
    }
    return !0;
  }
  function Y(e, n, r) {
    for (var t = [], i = [], o = 0; o < 6; o++) {
      var a = [0, 0, 1, -1, 1, -1][o],
        c = [1, -1, 0, 0, -1, 1][o],
        l = n + a,
        s = r + c;
      if (R(l, s)) if (W(e, l, s)) {
        if (t.push([l, s]), e.rule) for (var u = 0; u < 6 && R(l += a, s += c); u++) if (!W(e, l, s)) {
          i.push([l, s]);
          break;
        }
      } else i.push([l, s]);
    }
    return [t, i];
  }
  function V(e, n) {
    if (!e || e.length !== n.length) return !1;
    for (var r = 0; r < e.length; r++) if (e[r] !== n[r]) return !1;
    return !0;
  }
  function _(e, n) {
    return !!e && e[0] === n[0] && e[e.length - 1] === n[n.length - 1];
  }
  function G(e, n) {
    if (e.length !== n.length) return !1;
    for (var r = 0; r < e.length; r++) if (e[r] !== n[r]) return !1;
    return !0;
  }
  function B(e, n) {
    for (var r = n; r < 8 * e.length; r++) if (e[Math.floor(r / 8)] >> 7 - r % 8 & 1) return !1;
    return !0;
  }
  function X(e, n) {
    var r = D(e),
      t = (0, o.Z)(r, 2),
      i = t[0],
      a = t[1],
      c = D(n),
      l = (0, o.Z)(c, 2),
      s = i - l[0],
      u = a - l[1];
    return Math.max(Math.abs(s), Math.abs(u), Math.abs(s + u));
  }
  function q(e, n, r) {
    var t = function (e, n) {
      return O((e.pos[n] + 3) % 6, e.pieceCount)[0];
    }(e, n);
    return X(r[0], t) - X(r[r.length - 1], t);
  }
  function z(e, n) {
    var r = [];
    return (e.playerPieces[n] || []).forEach(function (n) {
      r.push.apply(r, (0, i.Z)(function (e, n) {
        var r = T(e);
        r.pieces.splice(r.pieces.indexOf(n), 1);
        var t = [],
          a = D(n),
          c = (0, o.Z)(a, 2),
          l = c[0],
          s = c[1],
          u = Y(r, l, s),
          d = (0, o.Z)(u, 2),
          p = d[0],
          f = d[1],
          h = new Set();
        h.add("".concat(l, ",").concat(s)), p.forEach(function (e) {
          t.push([n, A(e[0], e[1])]), h.add("".concat(e[0], ",").concat(e[1]));
        });
        var m = [];
        f.forEach(function (e) {
          var i = 2 * e[0] - l,
            o = 2 * e[1] - s,
            a = e[0] - l,
            c = e[1] - s;
          a && (a = a > 0 ? 1 : -1), c && (c = c > 0 ? 1 : -1);
          for (var u = 1; u < Math.max(Math.abs(e[0] - l), Math.abs(e[1] - s)); u++) {
            var d = e[0] + a * u,
              p = e[1] + c * u;
            if (!R(d, p) || !W(r, d, p)) return;
          }
          R(i, o) && W(r, i, o) && (t.push([n, A(i, o)]), h.add("".concat(i, ",").concat(o)), m.push([i, o, [n, A(i, o)]]));
        });
        for (var v = function () {
          var e = m.shift();
          Y(r, e[0], e[1])[1].forEach(function (n) {
            if (n[0] !== l || n[1] !== s) {
              var o = 2 * n[0] - e[0],
                a = 2 * n[1] - e[1],
                c = n[0] - e[0],
                u = n[1] - e[1];
              c && (c = c > 0 ? 1 : -1), u && (u = u > 0 ? 1 : -1);
              for (var d = 1; d < Math.max(Math.abs(n[0] - e[0]), Math.abs(n[1] - e[1])); d++) {
                var p = n[0] + c * d,
                  f = n[1] + u * d;
                if (!R(p, f) || !W(r, p, f)) return;
              }
              !h.has("".concat(o, ",").concat(a)) && R(o, a) && W(r, o, a) && (t.push([].concat((0, i.Z)(e[2]), [A(o, a)])), h.add("".concat(o, ",").concat(a)), m.push([o, a, [].concat((0, i.Z)(e[2]), [A(o, a)])]));
            }
          });
        }; m.length > 0;) v();
        return t;
      }(e, n)));
    }), r.map(function (r, t) {
      return {
        candidate: r,
        index: t,
        progress: q(e, n, r)
      };
    }).sort(function (e, n) {
      return n.progress - e.progress || e.index - n.index;
    }).slice(0, 511).map(function (e) {
      return e.candidate;
    });
  }
  function J(e, n) {
    if (!n.length) return [];
    if (n.length > 1 && 1 === X(n[0], n[1])) return [];
    var r = T(e);
    r.pieces.splice(r.pieces.indexOf(n[0]), 1);
    var t = D(n[n.length - 1]),
      a = (0, o.Z)(t, 2),
      c = a[0],
      l = a[1],
      s = Y(r, c, l),
      u = (0, o.Z)(s, 2),
      d = u[0],
      p = u[1],
      f = new Set(n),
      h = [];
    return 1 === n.length && d.forEach(function (e) {
      var r = A(e[0], e[1]);
      f.has(r) || h.push([].concat((0, i.Z)(n), [r]));
    }), p.forEach(function (e) {
      var t = 2 * e[0] - c,
        o = 2 * e[1] - l,
        a = e[0] - c,
        s = e[1] - l;
      a && (a = a > 0 ? 1 : -1), s && (s = s > 0 ? 1 : -1);
      for (var u = 1; u < Math.max(Math.abs(e[0] - c), Math.abs(e[1] - l)); u++) {
        var d = e[0] + a * u,
          p = e[1] + s * u;
        if (!R(d, p) || !W(r, d, p)) return;
      }
      if (R(t, o) && W(r, t, o)) {
        var m = A(t, o);
        f.has(m) || h.push([].concat((0, i.Z)(n), [m]));
      }
    }), h;
  }
  function H(e, n) {
    for (var r = e.waitFor, t = e.playerPieces[r], i = e.playerPieces.length, o = e.round, a = 0; a < i && (e.waitFor = (e.waitFor + 1) % i, e.waitFor === e.firstId - 1 && (e.round += 1), e.winnerId.includes(e.waitFor)); a++);
    var c = t.findIndex(function (e) {
      return e === n[0];
    });
    t[c] = n[n.length - 1], e.lastOp = {
      playerId: r,
      route: n
    }, function (e) {
      e.pieces = N(e.playerPieces);
    }(e);
    for (var l = !0, s = new Set(O((e.pos[r] + 3) % 6, e.pieceCount)), u = 0; u < t.length; u++) {
      var d = t[u];
      if (!s.has(d)) {
        l = !1;
        break;
      }
    }
    l && !e.winnerId.includes(r) && (e.winnerId.push(r), e.winnerRound.push(o)), e.finish = P(e.winnerId, e.winnerRound, e.waitFor, e.round, i);
  }
  function $(e) {
    var n = e.recordList || [];
    if (!n.length) return new Uint8Array([]);
    var r,
      t = [],
      a = 0,
      c = 0,
      s = (0, l.F)(c, a, 127 & n.length, 7),
      u = (0, o.Z)(s, 3);
    c = u[0], a = u[1], r = u[2], t.push.apply(t, (0, i.Z)(r));
    var d = F(e.rule, e.routeMode, e.firstId, e.mode, e.playerPieces.length, e.pieceCount);
    return n.forEach(function (e) {
      var n = z(d, d.waitFor),
        s = e.candidateId;
      V(n[s], e.route) || (s = n.findIndex(function (n) {
        return V(n, e.route);
      })), s < 0 && (s = n.findIndex(function (n) {
        return _(n, e.route);
      }));
      var u = (0, l.p2)(c, a, s, n.length),
        p = (0, o.Z)(u, 3);
      c = p[0], a = p[1], r = p[2], t.push.apply(t, (0, i.Z)(r)), H(d, n[s]);
    }), a && t.push(c), Uint8Array.from(t);
  }
  function K(e, n) {
    var r = e.records || new Uint8Array([]);
    if (!r.length) return [];
    var t,
      i,
      a = [],
      c = 0;
    try {
      var s = (0, l.lS)(r, c, 7),
        u = (0, o.Z)(s, 2);
      i = u[0], c = u[1];
    } catch (I) {
      return [];
    }
    var d = e.prop || 0,
      p = w(d, n),
      f = F(1 & d, d >> 6 & 1, d >> 1 & 7, v(d >> 4 & 3, n, p), n, p),
      h = e.pieces || [],
      m = h.length > 0;
    try {
      for (var x = 0; x < 1e4; x++) {
        var y = f.waitFor,
          g = z(f, y);
        if (!g.length) break;
        var j = (0, l.Su)(r, c, g.length),
          Z = (0, o.Z)(j, 2);
        t = Z[0], c = Z[1];
        var C = g[t];
        if (!C) break;
        if (a.push({
          playerId: y,
          candidateId: t,
          route: C
        }), H(f, C), (127 & a.length) === i && B(r, c) && (!m || G(f.pieces, h))) break;
      }
    } catch (b) {}
    return a;
  }
  function ee(e) {
    return (0, s.Z)($(e));
  }
  function ne(e, n) {
    if (!e) return [];
    var r = (0, s.I)(e);
    if (!r || !r.length) return [];
    var t = g(n);
    return K({
      prop: j(t.rule, t.routeMode, t.firstId + 1, t.mode, t.pieceCount),
      round: 1,
      waitFor: t.firstId,
      pieces: [],
      winners: [],
      lastOp: {
        playerId: 0,
        route: []
      },
      records: r
    }, t.playerCount);
  }
  function re(e, n, r) {
    for (var t = function (e) {
        var n = g(e);
        return F(n.rule, n.routeMode, n.firstId + 1, n.mode, n.playerCount, n.pieceCount);
      }(e), i = null === r ? n.length : Math.max(0, Math.min(n.length, n.length - r)), o = function (e) {
        var r = n[e],
          i = t.waitFor,
          o = z(t, i),
          a = r.candidateId;
        if (V(o[a], r.route) || (a = o.findIndex(function (e) {
          return V(e, r.route);
        })), a < 0 && (a = o.findIndex(function (e) {
          return _(e, r.route);
        })), a < 0 || !o[a]) return "break";
        var c = o[a];
        t.recordList.push({
          playerId: i,
          candidateId: a,
          route: c
        }), H(t, c);
      }, a = 0; a < i; a++) {
      if ("break" === o(a)) break;
    }
    return t;
  }
  function te(e, n) {
    var r,
      t,
      i = T(e),
      o = e.waitFor,
      a = z(e, o),
      c = a.findIndex(function (e) {
        return _(e, n);
      }),
      l = a[c] || n;
    return !(null === (r = e.lastOp) || void 0 === r || null === (t = r.route) || void 0 === t || !t.length) && !e.recordList.length || i.recordList.push({
      playerId: o,
      candidateId: c,
      route: l
    }), H(i, n), i;
  }
  var companionCheckersCandidates = z;
  var companionCheckersCache = new WeakMap();
  z = function (view, actor) {
    var entry = companionCheckersCache.get(view);
    if (!entry || entry.pieces !== view.pieces || entry.rule !== view.rule) {
      entry = {
        pieces: view.pieces,
        rule: view.rule,
        routes: new Map()
      };
      companionCheckersCache.set(view, entry);
    }
    if (entry.routes.has(actor)) return entry.routes.get(actor);
    var routes = companionCheckersCandidates(view, actor);
    entry.routes.set(actor, routes);
    return routes;
  };
},
1817: function (e, n, r) {
  var companionMapBridge = r.bridge;
  r.d(n, {
    Z: function () {
      return f;
    }
  });
  var t = r(885),
    i = r(7313),
    o = r(5328),
    a = r(161),
    c = r(6417);
  function l(e, n, r) {
    for (var t = 0; t < n.length; t++) if ((0, o.bX)(n[t], e).includes(r)) return o.DM[t];
    return a.wC;
  }
  function s(e) {
    e.playerCount;
    var n = e.pos,
      r = e.pieceCount;
    return (0, c.jsxs)(c.Fragment, {
      children: [(0, c.jsxs)("defs", {
        children: [(0, c.jsxs)("radialGradient", {
          id: "shadow",
          children: [(0, c.jsx)("stop", {
            offset: "90%",
            stopColor: "#333333",
            stopOpacity: "0.33"
          }), (0, c.jsx)("stop", {
            offset: "100%",
            stopColor: "#000000",
            stopOpacity: "0"
          })]
        }), (0, c.jsxs)("g", {
          id: "piece-black",
          children: [(0, c.jsx)("circle", {
            r: "4.55",
            cx: "0.1",
            cy: "0.3",
            fill: "url(#shadow)"
          }), (0, c.jsx)("circle", {
            r: "4.4",
            fill: "#765031"
          }), (0, c.jsx)("circle", {
            r: "4.3",
            fill: "url(#linear-black)"
          }), (0, c.jsx)("circle", {
            r: "3.8",
            fill: "#443322"
          })]
        }), (0, c.jsxs)("g", {
          id: "piece-red",
          children: [(0, c.jsx)("circle", {
            r: "4.55",
            cx: "0.1",
            cy: "0.3",
            fill: "url(#shadow)"
          }), (0, c.jsx)("circle", {
            r: "4.4",
            fill: "#ca5f36"
          }), (0, c.jsx)("circle", {
            r: "4.3",
            fill: "url(#linear-red)"
          }), (0, c.jsx)("circle", {
            r: "3.8",
            fill: "#ee2211"
          })]
        })]
      }), new Array(121).fill(0).map(function (e, i) {
        var a = (0, o.Us)(i),
          s = (0, t.Z)(a, 2),
          u = s[0],
          d = s[1],
          p = (0, o.fE)([u, d]),
          f = (0, t.Z)(p, 2),
          h = f[0],
          m = f[1];
        return (0, c.jsx)("circle", {
          cx: h,
          cy: m,
          r: 35,
          strokeWidth: "2",
          fill: "none",
          stroke: l(r, n, i),
          "data-guide-target": "tq.cell",
          "data-guide-id": i
        }, i);
      })]
    });
  }
  var u = i.memo(s, function (e, n) {
      return e.playerCount === n.playerCount && e.pieceCount === n.pieceCount && e.pos.length === n.pos.length && e.pos.every(function (e, r) {
        return e === n.pos[r];
      });
    }),
    d = r(4595),
    p = 692.82;
  var f = function (e) {
    var n,
      r = e.view,
      l = e.playerCount,
      s = e.activePlayerId,
      f = e.onMove,
      h = e.gameVersion,
      m = e.perspectivePlayerId,
      v = (0, i.useState)(-1),
      x = (0, t.Z)(v, 2),
      y = x[0],
      g = x[1],
      w = (0, i.useState)([]),
      j = (0, t.Z)(w, 2),
      Z = j[0],
      C = j[1],
      I = null !== s && !!f && !r.finish && r.waitFor === s,
      b = null !== s && void 0 !== s ? s : r.waitFor,
      k = 1 === r.routeMode,
      M = I && !k && y >= 0 ? (0, o.t2)(r, b).filter(function (e) {
        return e[0] === y;
      }) : [],
      O = I && k && Z.length ? (0, o.p4)(r, Z) : [],
      N = k ? O : M,
      P = (60 * (3 - (null !== (n = r.pos[m]) && void 0 !== n ? n : r.pos[0])) % 360 + 360) % 360,
      F = (0, i.useState)(P),
      E = (0, t.Z)(F, 2),
      S = E[0],
      U = E[1];
    (0, i.useEffect)(function () {
      g(-1), C([]);
    }, [I, h, r.routeMode]), (0, i.useEffect)(function () {
      U(function (e) {
        for (var n = P; n > e;) n -= 360;
        return n;
      });
    }, [P]);
    var L = function () {
      !f || Z.length < 2 || (f(Z), g(-1), C([]));
    };
    return (0, c.jsxs)("div", {
      children: [(0, c.jsx)(companionMapBridge.mapViewport, {
        children: (0, c.jsx)("div", {
          className: "max-w-2xl mx-auto",
          children: (0, c.jsx)("svg", {
            viewBox: "500,-127,1400,1620",
            xmlns: "http://www.w3.org/2000/svg",
            children: (0, c.jsx)("g", {
              transform: "translate(".concat(1200, " ").concat(p, ")"),
              children: (0, c.jsx)("g", {
                style: {
                  transform: "rotate(".concat(S, "deg)"),
                  transformOrigin: "0 0",
                  transition: "transform 300ms ease-in-out"
                },
                children: (0, c.jsxs)("g", {
                  transform: "translate(".concat(-1200, " ").concat(-692.82, ")"),
                  children: [(0, c.jsx)(u, {
                    playerCount: l,
                    pos: r.pos,
                    pieceCount: r.pieceCount
                  }), r.playerPieces.map(function (e, n) {
                    return e.map(function (e, r) {
                      var i = (0, o.Us)(e),
                        a = (0, t.Z)(i, 2),
                        l = a[0],
                        s = a[1],
                        u = (0, o.fE)([l, s]),
                        d = (0, t.Z)(u, 2),
                        p = d[0],
                        f = d[1];
                      return (0, c.jsx)("circle", {
                        className: I && n === b ? "cursor-pointer" : "",
                        cx: p,
                        cy: f,
                        r: "45",
                        fill: o.DM[n],
                        strokeWidth: "5",
                        stroke: y === e ? "black" : "none",
                        onClick: I && n === b ? function () {
                          !function (e) {
                            k ? y === e ? (g(-1), C([])) : (g(e), C([e])) : g(e === y ? -1 : e);
                          }(e);
                        } : void 0,
                        "data-guide-target": "tq.piece",
                        "data-guide-id": e,
                        "data-guide-player": n
                      }, "".concat(n).concat(r));
                    });
                  }), r.lastOp && r.lastOp.route && r.lastOp.route.length > 0 ? (0, c.jsxs)(c.Fragment, {
                    children: [(0, c.jsx)("circle", {
                      cx: (0, o.fE)((0, o.Us)(r.lastOp.route[0]))[0],
                      cy: (0, o.fE)((0, o.Us)(r.lastOp.route[0]))[1],
                      r: 45,
                      fill: o.DM[r.lastOp.playerId],
                      fillOpacity: "0.4"
                    }), (0, c.jsx)("circle", {
                      cx: (0, o.fE)((0, o.Us)(r.lastOp.route[r.lastOp.route.length - 1]))[0],
                      cy: (0, o.fE)((0, o.Us)(r.lastOp.route[r.lastOp.route.length - 1]))[1],
                      r: 13,
                      fill: "#fff"
                    }), (0, c.jsx)("path", {
                      stroke: a.wC,
                      fill: "none",
                      strokeWidth: "4",
                      strokeDasharray: "20,30",
                      d: "M".concat((0, o.fE)((0, o.Us)(r.lastOp.route[0]))[0], ",").concat((0, o.fE)((0, o.Us)(r.lastOp.route[0]))[1], "L").concat(r.lastOp.route.slice(1).map(function (e) {
                        return "".concat((0, o.fE)((0, o.Us)(e))[0], ",").concat((0, o.fE)((0, o.Us)(e))[1]);
                      }).join("L"))
                    })]
                  }) : null, k && Z.length > 1 ? (0, c.jsx)("path", {
                    stroke: o.DM[b],
                    fill: "none",
                    strokeWidth: "6",
                    d: "M".concat((0, o.fE)((0, o.Us)(Z[0]))[0], ",").concat((0, o.fE)((0, o.Us)(Z[0]))[1], "L").concat(Z.slice(1).map(function (e) {
                      return "".concat((0, o.fE)((0, o.Us)(e))[0], ",").concat((0, o.fE)((0, o.Us)(e))[1]);
                    }).join("L")),
                    "data-guide-target": "tq.route"
                  }) : null, k && Z.map(function (e, n) {
                    var r = (0, o.Us)(e),
                      i = (0, t.Z)(r, 2),
                      a = i[0],
                      l = i[1],
                      s = (0, o.fE)([a, l]),
                      u = (0, t.Z)(s, 2),
                      d = u[0],
                      p = u[1];
                    return (0, c.jsx)("circle", {
                      className: "cursor-pointer",
                      cx: d,
                      cy: p,
                      r: 30,
                      fill: o.DM[b],
                      fillOpacity: n === Z.length - 1 ? "0.25" : "0.1",
                      onClick: I ? function () {
                        return function (e) {
                          var n = Z.indexOf(e);
                          0 === n ? (g(-1), C([])) : n === Z.length - 1 ? L() : n > 0 && C(Z.slice(0, n + 1));
                        }(e);
                      } : void 0
                    }, "".concat(e, "-").concat(n));
                  }), N.map(function (e) {
                    var n = e[e.length - 1],
                      r = (0, o.Us)(n),
                      i = (0, t.Z)(r, 2),
                      a = i[0],
                      l = i[1],
                      s = (0, o.fE)([a, l]),
                      u = (0, t.Z)(s, 2),
                      d = u[0],
                      p = u[1];
                    return (0, c.jsx)("circle", {
                      className: "cursor-pointer",
                      cx: d,
                      cy: p,
                      r: 45,
                      fill: o.DM[b],
                      fillOpacity: "0",
                      stroke: o.DM[b],
                      strokeWidth: "5",
                      onClick: function () {
                        k ? C(e) : f && f(e);
                      },
                      "data-guide-target": "tq.landing",
                      "data-guide-id": n
                    }, n);
                  })]
                })
              })
            })
          })
        })
      }), k && I && (0, c.jsxs)("div", {
        className: "text-center mb-2",
        children: [(0, c.jsx)(d.Z, {
          primary: !0,
          disabled: Z.length < 2,
          onClick: L,
          children: "\u786e\u8ba4\u79fb\u52a8"
        }), Z.length > 1 && (0, c.jsx)("div", {
          className: "mt-2 text-xs opacity-40",
          children: "\u518d\u6b21\u70b9\u51fb\u5f53\u524d\u8def\u7ebf\u7ec8\u70b9\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u786e\u8ba4\u79fb\u52a8"
        })]
      })]
    });
  };
}
};
