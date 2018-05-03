"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapNamespacesToObject = mapNamespacesToObject;
exports.setStore = exports.createReducer = exports.createNamespace = void 0;

var _set = _interopRequireDefault(require("ramda/src/set"));

var _view = _interopRequireDefault(require("ramda/src/view"));

var _lensPath = _interopRequireDefault(require("ramda/src/lensPath"));

var _lensProp = _interopRequireDefault(require("ramda/src/lensProp"));

var _lensIndex = _interopRequireDefault(require("ramda/src/lensIndex"));

var _lodash = _interopRequireDefault(require("lodash.isplainobject"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function createPathspace() {
  var PREFIX_JOINER = '.';
  var PREFIX_SEPERATOR = ':';
  var pathStringSymbol = Symbol('@@Pathspace->addPath->path[pathString]');
  var pathLensSymbol = Symbol('@@Pathspace->addPath->path[pathLens]');

  var _namespaces = new Map();

  var _store = {};

  function getPathPrefix(path) {
    return Array.isArray(path) ? path.join(PREFIX_JOINER) : path;
  }

  function reducerWrapper(lens, reducer) {
    var getter = (0, _view.default)(lens);
    var setter = (0, _set.default)(lens);
    return function wrappedReducer(state, payload) {
      return setter(reducer(getter(state), payload, state), state);
    };
  }

  function createActionContainer(lens) {
    var _actions = new Map();

    return {
      set: function set(actionName, reducer) {
        if (_actions.has(actionName)) throw new Error("The action \"".concat(actionName, "\" already exists for this path"));
        return _actions.set(actionName, reducerWrapper(lens, reducer));
      },
      get: function get(actionName) {
        return _actions.get(actionName);
      },
      has: function has(actionName) {
        return _actions.has(actionName);
      }
    };
  }

  function checkPathArray(arr) {
    var isValid = arr.reduce(function (bool, val) {
      if (!bool) return false;

      if (typeof val === 'string' || typeof val === 'number') {
        if (typeof val === 'string') return val.split(PREFIX_JOINER).length === 1;
        return true;
      }

      return false;
    }, true);
    return isValid;
  }

  function getNamespace(path) {
    return _namespaces.get(getPathPrefix(path));
  }

  function getActionName(path, actionName) {
    return "".concat(getPathPrefix(path)).concat(PREFIX_SEPERATOR).concat(actionName);
  }

  function defaultReducer(state, payload) {
    return payload;
  }

  function noSideEffect(payload) {
    return payload;
  }

  function getNamespaceName(actionType) {
    var split = actionType.split(PREFIX_SEPERATOR)[0].split(PREFIX_JOINER);
    return split.length > 1 ? split : split[0];
  }

  function validateAddActionArgs(actionType, reducer, meta) {
    if (typeof reducer !== 'function') throw new Error('The "reducer" property passed to "addAction" must be a function');
    if (_typeof(meta) !== 'object') throw new Error('The "meta" property passed to "addAction" must be a plain object');
    if (Array.isArray(meta)) throw new Error('The "meta" property passed to "addAction" must be a plain object');
    if (typeof actionType !== 'string') throw new Error('The "actionType" property passed to "addAction" must be a string');
  }

  function getSubPath(path, subPath) {
    if (Array.isArray(path)) {
      if (Array.isArray(subPath)) {
        return _toConsumableArray(path).concat(_toConsumableArray(subPath));
      }

      if (typeof subPath === 'string') {
        return _toConsumableArray(path).concat(_toConsumableArray(subPath.split(PREFIX_JOINER)));
      }

      return _toConsumableArray(path).concat([subPath]);
    }

    if (Array.isArray(subPath)) {
      return "".concat(path, ".").concat(subPath.join(PREFIX_JOINER));
    }

    if (typeof subPath === 'number') {
      return _toConsumableArray(path.split(PREFIX_JOINER)).concat([subPath]);
    }

    return "".concat(path, ".").concat(subPath);
  }

  function validatePath(path, parentPath) {
    if (typeof path !== 'number' && !path) throw new Error('No path was provided to "addPath" function, which is required');
    if (typeof path !== 'string' && !Array.isArray(path) && typeof path !== 'number') throw new Error('The path provided to "addPath" function must be a string or array');
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath[pathLensSymbol])) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "addPath"');
    if (Array.isArray(path) && !checkPathArray(path)) throw new Error('When using an array to "addPath", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (!Array.isArray(path) && typeof path !== 'number') {
      var split = path.split(PREFIX_JOINER);
      if (split.length > 1) return split;
      return split[0];
    }

    return path;
  }

  function createLens(path, parentPath) {
    var lens;
    if (Array.isArray(path)) lens = (0, _lensPath.default)(path);
    if (typeof path === 'number') lens = (0, _lensIndex.default)(path);
    if (typeof path === 'string') lens = (0, _lensProp.default)(path);
    return parentPath ? function (x) {
      return parentPath[pathLensSymbol](lens(x));
    } : lens;
  }

  function setNamespace(path, parentPath) {
    validatePath(path, parentPath);
    var lens = createLens(ensurePath(path), parentPath);
    var pathString = parentPath ? getSubPath(parentPath[pathStringSymbol], path) : path;
    var prefix = getPathPrefix(pathString);
    if (_namespaces.has(prefix)) throw new Error("The path \"".concat(pathString, "\" already exists"));

    _namespaces.set(prefix, createActionContainer(lens));

    return {
      lens: lens,
      prefix: prefix
    };
  }

  function createNamespace(p, parentPath) {
    var _ref;

    var _setNamespace = setNamespace(p, parentPath),
        lens = _setNamespace.lens,
        prefix = _setNamespace.prefix;

    function mapActionToReducer(actionType) {
      var reducer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultReducer;
      var meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      validateAddActionArgs(actionType, reducer, meta);
      var _sideEffect = noSideEffect;
      var type = getActionName(prefix, actionType);
      getNamespace(prefix).set(type, reducer);

      function actionCreator() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return {
          type: type,
          payload: _sideEffect.apply(void 0, args.concat([_store.dispatch])),
          meta: meta
        };
      }

      function withSideEffect(payloadHandler) {
        if (typeof payloadHandler !== 'function') throw new Error('Payload handler supplied to "createActionCreator" must be a function');
        _sideEffect = payloadHandler;
        return actionCreator;
      }

      actionCreator.withSideEffect = withSideEffect;
      return actionCreator;
    }

    return _ref = {
      mapActionToReducer: mapActionToReducer,
      examine: (0, _view.default)(lens)
    }, _defineProperty(_ref, pathStringSymbol, prefix), _defineProperty(_ref, pathLensSymbol, lens), _defineProperty(_ref, "lens", lens), _ref;
  }

  function createReducer() {
    var initialState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var initState = typeof initialState === 'function' ? initialState() : initialState;
    return function reducer(state, _ref2) {
      var type = _ref2.type,
          payload = _ref2.payload;
      var actions = getNamespace(getNamespaceName(type));

      if (actions && actions.has(type)) {
        var result = actions.get(type)(state, payload);
        return result;
      }

      return state === undefined ? initState : state;
    };
  }

  function setStore(store) {
    _store = store;
    return _store;
  }

  return {
    createNamespace: createNamespace,
    createReducer: createReducer,
    setStore: setStore
  };
}

var _createPathspace = createPathspace(),
    createNamespace = _createPathspace.createNamespace,
    createReducer = _createPathspace.createReducer,
    setStore = _createPathspace.setStore;

exports.setStore = setStore;
exports.createReducer = createReducer;
exports.createNamespace = createNamespace;

function getKey(prevKey, key) {
  return "".concat(prevKey).concat(prevKey ? '.' : '').concat(key);
}

function mapNamespacesToObject(obj) {
  var prevKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  return Object.keys(obj).reduce(function (cloned, key) {
    if ((0, _lodash.default)(obj[key])) {
      return _objectSpread({}, cloned, _defineProperty({}, key, _objectSpread({}, mapNamespacesToObject(obj[key], getKey(prevKey, key)), createNamespace(getKey(prevKey, key)))));
    }

    return _objectSpread({}, cloned, _defineProperty({}, key, createNamespace(getKey(prevKey, key))));
  }, {});
}