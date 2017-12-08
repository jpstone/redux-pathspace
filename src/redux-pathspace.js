import set from 'ramda/src/set';
import view from 'ramda/src/view';
import lensPath from 'ramda/src/lensPath';
import lensProp from 'ramda/src/lensProp';

function createPathspace() {
  const PREFIX_JOINER = '.';
  const PREFIX_SEPERATOR = '_';

  const _namespaces = new Map();

  function getPathPrefix(path) {
    return Array.isArray(path)
      ? path.join(PREFIX_JOINER)
      : path;
  }

  function createLens(path) {
    if (Array.isArray(path)) return lensPath(path);
    return lensProp(path);
  }

  function reducerWrapper(lens, reducer) {
    const getter = view(lens);
    const setter = set(lens);
    return function wrappedReducer(state, payload) {
      return setter(reducer(getter(state), payload, state), state);
    };
  }

  function createActionContainer(path) {
    const _actions = new Map();
    const lens = createLens(path);
    return {
      set(actionName, reducer) {
        if (_actions.has(actionName)) throw new Error(`The action "${actionName}" already exists for this path`);
        return _actions.set(actionName, reducerWrapper(lens, reducer));
      },
      get(actionName) {
        return _actions.get(actionName);
      },
      has(actionName) {
        return _actions.has(actionName);
      },
    };
  }

  function checkPathArray(arr) {
    const isValid = arr.reduce((bool, val) => {
      if (!bool) return false;
      if (typeof val === 'string' || typeof val === 'number') {
        if (typeof val === 'string') return val.split(PREFIX_JOINER).length === 1;
        return true;
      }
      return false;
    }, true);
    return isValid;
  }

  function validatePath(path) {
    if (!path) throw new Error('No path was provided to "addPath" function, which is required');
    if (typeof path !== 'string' && !Array.isArray(path)) throw new Error('The path provided to "addPath" function must be a string or an array');
    if (Array.isArray(path) && !checkPathArray(path)) throw new Error('When using an array to "addPath", only strings and numbers are permitted');
  }

  function getNamespace(path) {
    return _namespaces.get(getPathPrefix(path));
  }

  function getActionName(path, actionName) {
    return `${getPathPrefix(path)}${PREFIX_SEPERATOR}${actionName}`;
  }

  function defaultReducer(state, payload) {
    return payload;
  }

  function defaultPayloadHandler(payload) {
    return payload;
  }

  function getNamespaceName(actionType) {
    const split = actionType.split(PREFIX_SEPERATOR)[0].split(PREFIX_JOINER);
    return split.length > 1
      ? split
      : split[0];
  }

  function ensurePath(path) {
    if (!Array.isArray(path)) {
      const split = path.split(PREFIX_JOINER);
      if (split.length > 1) return split;
      return split[0];
    }
    return path;
  }

  function setNamespace(path) {
    validatePath(path);
    const prefix = getPathPrefix(path);
    if (_namespaces.has(prefix)) throw new Error(`The path "${path}" already exists`);
    return _namespaces.set(prefix, createActionContainer(ensurePath(path)));
  }

  function validateAddActionArgs(actionType, reducer, meta) {
    if (typeof reducer !== 'function') throw new Error('The "reducer" property passed to "addAction" must be a function');
    if (typeof meta !== 'object') throw new Error('The "meta" property passed to "addAction" must be a plain object');
    if (Array.isArray(meta)) throw new Error('The "meta" property passed to "addAction" must be a plain object');
    if (typeof actionType !== 'string') throw new Error('The "actionType" property passed to "addAction" must be a string');
  }

  function getSubPath(path, subPath) {
    if (Array.isArray(path)) {
      if (Array.isArray(subPath)) {
        return [...path, ...subPath];
      }
      if (typeof subPath === 'string') {
        return [...path, ...subPath.split(PREFIX_JOINER)];
      }
      return [...path, subPath];
    }
    if (Array.isArray(subPath)) {
      return `${path}.${subPath.join(PREFIX_JOINER)}`;
    }
    if (typeof subPath === 'number') {
      return [...path.split(PREFIX_JOINER), subPath];
    }
    return `${path}.${subPath}`;
  }

  function addPath(p) {
    setNamespace(p);
    return function path({ actionType, reducer = defaultReducer, meta = {}, subPath } = {}) {
      if (subPath) return addPath(getSubPath(p, subPath));
      validateAddActionArgs(actionType, reducer, meta);
      const type = getActionName(p, actionType);
      getNamespace(p).set(type, reducer);
      return function createActionCreator(payloadHandler = defaultPayloadHandler) {
        if (typeof payloadHandler !== 'function') throw new Error('Payload handler supplied to "createActionCreator" must be a function');
        return (...args) => ({
          type,
          payload: payloadHandler(...args),
          meta,
        });
      };
    };
  }

  function createReducer(initialState = {}) {
    const initState = typeof initialState === 'function' ? initialState() : initialState;
    return function reducer(state, { type, payload }) {
      const actions = getNamespace(getNamespaceName(type));
      if (actions && actions.has(type)) {
        const result = actions.get(type)(state, payload);
        return result;
      }
      return state === undefined
        ? initState
        : state;
    };
  }

  return {
    addPath,
    createReducer,
  };
}

const { addPath, createReducer } = createPathspace();

export { addPath, createReducer };
