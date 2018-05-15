"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPathspace = createPathspace;
exports.reducers = void 0;

var _set = _interopRequireDefault(require("ramda/src/set"));

var _view = _interopRequireDefault(require("ramda/src/view"));

var _lensPath = _interopRequireDefault(require("ramda/src/lensPath"));

var _lensProp = _interopRequireDefault(require("ramda/src/lensProp"));

var _lensIndex = _interopRequireDefault(require("ramda/src/lensIndex"));

var reducers = _interopRequireWildcard(require("./reducers"));

exports.reducers = reducers;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function createPathspace(enhancer) {
  var PATH_JOINER = '.';
  var PREFIX_SEPERATOR = ':';
  var pathStringSymbol = Symbol('@@Pathspace->createNamespace->path[pathString]');
  var namespaces = new Map();

  function throwNewErr(x, y) {
    throw new Error("The action \"".concat(x, "\" already exists for the path \"").concat(y, "\""));
  }

  function isArr(item) {
    return Array.isArray(item);
  }

  function isAcceptableObject(item) {
    return !isArr(item) && (typeof obj === "undefined" ? "undefined" : _typeof(obj)) !== 'object';
  }

  function isObjOrArr(item) {
    return isAcceptableObject(item) || isArr(item);
  }

  function getPathPrefix(path) {
    return isArr(path) ? path.reduce(function (stringified, location) {
      return typeof location === 'number' ? "".concat(stringified.slice(0, -1), "[").concat(location, "].") : "".concat(stringified).concat(location, ".");
    }, '').slice(0, -1) : path;
  }

  function reducerWrapper(lens, _reducer) {
    var getter = (0, _view.default)(lens);
    var setter = (0, _set.default)(lens);
    return function wrappedReducer(state, payload) {
      return setter(_reducer(getter(state), payload, state), state);
    };
  }

  function createActionContainer(lens, path) {
    var actions = new Map();
    return {
      set: function set(actionName, _reducer) {
        return actions.has(actionName) ? throwNewErr(actionName, path) : actions.set(actionName, reducerWrapper(lens, _reducer));
      },
      get: actions.get,
      has: actions.has
    };
  }

  function checkPathArray(arr) {
    return arr.reduce(function (bool, val) {
      return bool ? typeof val === 'string' ? val.split(PATH_JOINER).length === 1 : typeof val === 'number' : false;
    }, true);
  }

  function getNamespace(path) {
    return namespaces.get(getPathPrefix(path));
  }

  function getActionName(path, actionName) {
    return path.length ? "".concat(getPathPrefix(path)).concat(PREFIX_SEPERATOR).concat(actionName) : actionName;
  }

  function defaultReducer(state, payload) {
    return payload;
  }

  function getNamespaceName(actionType) {
    var split = actionType.split(PREFIX_SEPERATOR)[0].split(PATH_JOINER);
    return split.length > 1 ? split : split[0];
  }

  function validateAddActionArgs(actionType, _reducer) {
    if (typeof _reducer !== 'function') throw new Error('The "reducer" property passed to "addAction" must be a function');
    if (typeof actionType !== 'string') throw new Error('The "actionType" property passed to "addAction" must be a string');
  }

  function getSubPath(path, subPath) {
    if (isArr(path)) {
      if (isArr(subPath)) {
        return _toConsumableArray(path).concat(_toConsumableArray(subPath));
      }

      if (typeof subPath === 'string') {
        return _toConsumableArray(path).concat(_toConsumableArray(subPath.split(PATH_JOINER)));
      }

      return _toConsumableArray(path).concat([subPath]);
    }

    if (isArr(subPath)) {
      return "".concat(path, ".").concat(subPath.join(PATH_JOINER));
    }

    if (typeof subPath === 'number') {
      return _toConsumableArray(path.split(PATH_JOINER)).concat([subPath]);
    }

    return "".concat(path, ".").concat(subPath);
  }

  function validatePath(path, parentPath) {
    if (typeof path !== 'number' && !path) throw new Error('No path was provided to "createNamespace" function, which is required');
    if (typeof path !== 'string' && !isArr(path) && typeof path !== 'number') throw new Error('The path provided to "createNamespace" function must be a string or array');
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath.lens)) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "createNamespace"');
    if (isArr(path) && !checkPathArray(path)) throw new Error('When using an array to "createNamespace", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (isArr(path) || typeof path === 'number') return path;
    var split = path.split(PATH_JOINER);
    if (split.length > 1) return split;
    return split[0];
  }

  function createLens(path, parentPath) {
    var lens;
    if (isArr(path)) lens = (0, _lensPath.default)(path);
    if (typeof path === 'number') lens = (0, _lensIndex.default)(path);
    if (typeof path === 'string') lens = (0, _lensProp.default)(path);
    return parentPath ? function (x) {
      return parentPath.lens(lens(x));
    } : lens;
  }

  function setNamespace(path, parentPath) {
    validatePath(path, parentPath);
    var lens = createLens(ensurePath(path), parentPath);
    var pathString = parentPath ? getSubPath(parentPath[pathStringSymbol], path) : path;
    var prefix = getPathPrefix(pathString);
    if (namespaces.has(prefix)) throw new Error("The path \"".concat(prefix, "\" already exists"));
    namespaces.set(prefix, createActionContainer(lens, prefix));
    return {
      lens: lens,
      prefix: prefix
    };
  }

  function noSideEffect(payload) {
    return payload;
  }

  function createReducer() {
    var initialReducer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function (_state) {
      return _state;
    };
    var initialState = arguments.length > 1 ? arguments[1] : undefined;
    return function (state, action) {
      var type = action.type,
          payload = action.payload;
      var actions = getNamespace(getNamespaceName(type));
      var result = actions && actions.has(type) ? actions.get(type)(state, payload) : state === undefined ? initialState : state;
      return initialReducer(result, action);
    };
  }

  return function (createStore) {
    return function (initialReducer, initialState) {
      var store = createStore(createReducer(initialReducer), initialState, enhancer);

      function createNamespace(p, parentPath) {
        var _ref;

        var _setNamespace = setNamespace(p, parentPath),
            lens = _setNamespace.lens,
            prefix = _setNamespace.prefix;

        var actionCreators = {};

        function mapActionToReducer(actionType) {
          var _reducer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultReducer;

          validateAddActionArgs(actionType, _reducer);
          var type = getActionName(prefix, actionType);
          getNamespace(prefix).set(type, _reducer);
          var meta = {};
          var sideEffect = noSideEffect;

          function actionCreator() {
            return {
              type: type,
              payload: sideEffect.apply(void 0, arguments) || (arguments.length <= 0 ? undefined : arguments[0]),
              meta: meta
            };
          }

          function withSideEffect(_sideEffect) {
            if (typeof _sideEffect !== 'function') throw new Error('Value supplied to "withSideEffect" must be a function');
            sideEffect = _sideEffect;
            return actionCreator;
          }

          function setMeta(newMeta) {
            if (!isAcceptableObject(newMeta)) throw new TypeError("`setMeta` must be called with a plain object. Instead, `".concat(_typeof(newMeta), "` was provided"));
            meta = newMeta;
            return actionCreator;
          }

          actionCreator.withSideEffect = withSideEffect;
          actionCreator.setMeta = setMeta;

          actionCreator.dispatch = function () {
            return store.dispatch(actionCreator.apply(void 0, arguments));
          };

          actionCreators[actionType] = actionCreator;
          return actionCreator;
        }

        var examine = (0, _view.default)(lens);
        mapActionToReducer('DEFAULT');
        mapActionToReducer('RESET', function () {
          return examine(initialState);
        });
        mapActionToReducer('SET_UNDEFINED', reducers.setUndefined);

        if (typeof examine(initialState) === 'boolean') {
          mapActionToReducer('ON', reducers.on);
          mapActionToReducer('OFF', reducers.off);
          mapActionToReducer('TOGGLE', reducers.toggle);
        }

        return _ref = {}, _defineProperty(_ref, pathStringSymbol, prefix), _defineProperty(_ref, "mapActionToReducer", mapActionToReducer), _defineProperty(_ref, "actionCreators", actionCreators), _defineProperty(_ref, "examine", examine), _defineProperty(_ref, "lens", lens), _ref;
      }

      function createArrayNamespace(path, nested, mapper, isString) {
        var namespace = createNamespace(path);
        var indexNamespaces = [];

        function arrayNamespace(index) {
          if (!indexNamespaces[index]) {
            indexNamespaces[index] = mapper(nested, _toConsumableArray(path).concat([index]));
          }

          return indexNamespaces[index];
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

      function mapNamespaces(target) {
        var prevKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

        if (!isObjOrArr(target) && typeof target !== 'string') {
          throw new TypeError("mapNamespaces only maps namespaces to arrays and objects. Instead you provided ".concat(target, ", which is of type ").concat(_typeof(target)));
        }

        if (isArr(target) || typeof target === 'string') {
          var nested;
          var isString;
          if (isArr(target)) nested = target.find(function (val) {
            return isArr(val) || isAcceptableObject(val);
          });
          if (typeof target === 'string') isString = true;
          return createArrayNamespace(prevKey, nested, mapNamespaces, isString);
        }

        if (isAcceptableObject(target)) {
          if (!Object.keys(target).length && isArr(prevKey) && !prevKey.length) return {};
          return Object.keys(target).reduce(function (cloned, key) {
            var path = _toConsumableArray(prevKey).concat([key]);

            var val = target[key];
            return _objectSpread({}, cloned, _defineProperty({}, key, isObjOrArr(val) ? mapNamespaces(val, path) : createNamespace(path)));
          }, createNamespace(prevKey));
        }

        return createNamespace(prevKey);
      }

      return _objectSpread({}, store, {
        createNamespace: createNamespace,
        namespaces: mapNamespaces(initialState)
      });
    };
  };
}