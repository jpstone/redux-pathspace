import set from 'ramda/src/set';
import _view from 'ramda/src/view';
import lensPath from 'ramda/src/lensPath';
import lensProp from 'ramda/src/lensProp';
import lensIndex from 'ramda/src/lensIndex';

function createPathspace() {
  const PREFIX_JOINER = '.';
  const PREFIX_SEPERATOR = '_';
  const pathStringSymbol = Symbol('@@Pathspace->addPath->path[pathString]');
  const pathLensSymbol = Symbol('@@Pathspace->addPath->path[pathLens]');

  const _namespaces = new Map();

  function getPathPrefix(path) {
    return Array.isArray(path)
      ? path.join(PREFIX_JOINER)
      : path;
  }

  function reducerWrapper(lens, reducer) {
    const getter = _view(lens);
    const setter = set(lens);
    return function wrappedReducer(state, payload) {
      return setter(reducer(getter(state), payload, state), state);
    };
  }

  function createActionContainer(lens) {
    const _actions = new Map();
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

  function validatePath(path, parentPath) {
    if (typeof path !== 'number' && !path) throw new Error('No path was provided to "addPath" function, which is required');
    if (typeof path !== 'string' && !Array.isArray(path) && typeof path !== 'number') throw new Error('The path provided to "addPath" function must be a string or array');
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath[pathLensSymbol])) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "addPath"');
    if (Array.isArray(path) && !checkPathArray(path)) throw new Error('When using an array to "addPath", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (!Array.isArray(path) && typeof path !== 'number') {
      const split = path.split(PREFIX_JOINER);
      if (split.length > 1) return split;
      return split[0];
    }
    return path;
  }

  function createLens(path, parentPath) {
    let lens;
    if (Array.isArray(path)) lens = lensPath(path);
    if (typeof path === 'number') lens = lensIndex(path);
    if (typeof path === 'string') lens = lensProp(path);
    return parentPath
      ? x => parentPath[pathLensSymbol](lens(x))
      : lens;
  }

  function setNamespace(path, parentPath) {
    validatePath(path, parentPath);
    const lens = createLens(ensurePath(path), parentPath);
    const pathString = parentPath ? getSubPath(parentPath[pathStringSymbol], path) : path;
    const prefix = getPathPrefix(pathString);
    if (_namespaces.has(prefix)) throw new Error(`The path "${pathString}" already exists`);
    _namespaces.set(prefix, createActionContainer(lens));
    return { lens, prefix };
  }

  function addPath(p, parentPath) {
    const { lens, prefix } = setNamespace(p, parentPath);
    function path({ actionType, reducer = defaultReducer, meta = {} } = {}) {
      validateAddActionArgs(actionType, reducer, meta);
      const type = getActionName(prefix, actionType);
      getNamespace(prefix).set(type, reducer);
      return function createActionCreator(payloadHandler = defaultPayloadHandler) {
        if (typeof payloadHandler !== 'function') throw new Error('Payload handler supplied to "createActionCreator" must be a function');
        return (...args) => ({
          type,
          payload: payloadHandler(...args),
          meta,
        });
      };
    }
    path[pathStringSymbol] = prefix;
    path[pathLensSymbol] = lens;
    return path;
  }

  function view(path) {
    return _view(path[pathLensSymbol]);
  }

  function getLens(path) {
    return path[pathLensSymbol];
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
    view,
    addPath,
    getLens,
    createReducer,
  };
}

const { addPath, getLens, view, createReducer } = createPathspace();

export { addPath, getLens, view, createReducer };
