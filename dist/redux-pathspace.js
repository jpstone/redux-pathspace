"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPathspace = createPathspace;
exports.mapNamespaces = exports.setStore = exports.createReducer = exports.createNamespace = void 0;

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
  var PATH_JOINER = '.';
  var PREFIX_SEPERATOR = ':';
  var pathStringSymbol = Symbol('@@Pathspace->createNamespace->path[pathString]');
  var pathLensSymbol = Symbol('@@Pathspace->createNamespace->path[pathLens]');

  var _namespaces = new Map();

  var _store;

  var _actionCreators;

  function getPathPrefix(path) {
    if (!Array.isArray(path)) return path;
    return path.reduce(function (stringified, location) {
      return typeof location === 'number' ? "".concat(stringified.slice(0, -1), "[").concat(location, "].") : "".concat(stringified).concat(location, ".");
    }, '').slice(0, -1);
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
        if (typeof val === 'string') return val.split(PATH_JOINER).length === 1;
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
    return !path.length ? actionName : "".concat(getPathPrefix(path)).concat(PREFIX_SEPERATOR).concat(actionName);
  }

  function defaultReducer(state, payload) {
    return payload;
  }

  function createNoSideEffect() {
    return function (payload) {
      return payload;
    };
  }

  function getNamespaceName(actionType) {
    var split = actionType.split(PREFIX_SEPERATOR)[0].split(PATH_JOINER);
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
        return _toConsumableArray(path).concat(_toConsumableArray(subPath.split(PATH_JOINER)));
      }

      return _toConsumableArray(path).concat([subPath]);
    }

    if (Array.isArray(subPath)) {
      return "".concat(path, ".").concat(subPath.join(PATH_JOINER));
    }

    if (typeof subPath === 'number') {
      return _toConsumableArray(path.split(PATH_JOINER)).concat([subPath]);
    }

    return "".concat(path, ".").concat(subPath);
  }

  function validatePath(path, parentPath) {
    if (typeof path !== 'number' && !path) throw new Error('No path was provided to "createNamespace" function, which is required');
    if (typeof path !== 'string' && !Array.isArray(path) && typeof path !== 'number') throw new Error('The path provided to "createNamespace" function must be a string or array');
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath[pathLensSymbol])) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "createNamespace"');
    if (Array.isArray(path) && !checkPathArray(path)) throw new Error('When using an array to "createNamespace", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (!Array.isArray(path) && typeof path !== 'number') {
      var split = path.split(PATH_JOINER);
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
    if (_namespaces.has(prefix)) throw new Error("The path \"".concat(prefix, "\" already exists"));

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
      var _createSideEffect = createNoSideEffect;
      var type = getActionName(prefix, actionType);
      getNamespace(prefix).set(type, reducer);

      function actionCreator() {
        return {
          type: type,
          payload: _createSideEffect(_store, _actionCreators).apply(void 0, arguments),
          meta: meta
        };
      }

      function withSideEffect(createSideEffect) {
        if (typeof createSideEffect !== 'function') throw new Error('Value supplied to "withSideEffect" must be a function');
        _createSideEffect = createSideEffect;
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

  function setStore(store, actionCreators) {
    _store = store;
    _actionCreators = actionCreators;
    return _store;
  }

  function createArrayNamespace(path, nested, mapper, isString) {
    var namespace = createNamespace(path);
    var _indexNamespaces = [];

    function arrayNamespace(index) {
      if (!_indexNamespaces[index]) {
        _indexNamespaces[index] = mapper(nested, _toConsumableArray(path).concat([index]));
      }

      return _indexNamespaces[index];
    }

    Object.keys(namespace).forEach(function (key) {
      arrayNamespace[key] = namespace[key];
    });

    if (isString) {
      arrayNamespace.examine = function (data) {
        return Object.keys(data).reduce(function (str, key) {
          return "".concat(str).concat(data[key]);
        }, '');
      };
    }

    return arrayNamespace;
  }

  function mapNamespacesToTarget(target) {
    var prevKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    if (Array.isArray(target) || typeof target === 'string') {
      var nested;
      var isString;

      if (Array.isArray(target)) {
        nested = target.find(function (val) {
          return Array.isArray(val) || (0, _lodash.default)(val);
        });
      }

      if (typeof target === 'string') isString = true;
      return createArrayNamespace(prevKey, nested, mapNamespacesToTarget, isString);
    }

    if ((0, _lodash.default)(target)) {
      return Object.keys(target).reduce(function (cloned, key) {
        var path = _toConsumableArray(prevKey).concat([key]);

        if ((0, _lodash.default)(target[key])) {
          return _objectSpread({}, cloned, _defineProperty({}, key, mapNamespacesToTarget(target[key], path)));
        }

        if (Array.isArray(target[key])) {
          return _objectSpread({}, cloned, _defineProperty({}, key, mapNamespacesToTarget(target[key], path)));
        }

        return _objectSpread({}, cloned, _defineProperty({}, key, createNamespace(path)));
      }, createNamespace(prevKey));
    }

    return createNamespace(prevKey);
  }

  function mapNamespaces(target) {
    if (!Array.isArray(target) && !(0, _lodash.default)(target) && typeof target !== 'string') {
      throw new TypeError("mapNamespaces only maps namespaces to arrays and objects. Instead you provided ".concat(target, ", which is of type ").concat(_typeof(target)));
    }

    return mapNamespacesToTarget(target);
  }

  return {
    createNamespace: createNamespace,
    createReducer: createReducer,
    setStore: setStore,
    mapNamespaces: mapNamespaces
  };
}

var _createPathspace = createPathspace(),
    createNamespace = _createPathspace.createNamespace,
    createReducer = _createPathspace.createReducer,
    setStore = _createPathspace.setStore,
    mapNamespaces = _createPathspace.mapNamespaces;

exports.mapNamespaces = mapNamespaces;
exports.setStore = setStore;
exports.createReducer = createReducer;
exports.createNamespace = createNamespace;