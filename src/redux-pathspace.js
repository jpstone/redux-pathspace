import set from 'ramda/src/set';
import view from 'ramda/src/view';
import lensPath from 'ramda/src/lensPath';
import lensProp from 'ramda/src/lensProp';
import lensIndex from 'ramda/src/lensIndex';

const throwNewErr = x => { throw new Error(`The action "${x}" already exists for this path`); };

function createPathspace() {
  const PATH_JOINER = '.';
  const PREFIX_SEPERATOR = ':';
  const pathStringSymbol = Symbol('@@Pathspace->createNamespace->path[pathString]');

  // stateful closure variables that power redux-pathspace
  let store;
  const namespaces = new Map();

  function isAcceptableObject(obj) {
    return !Array.isArray(obj) && typeof obj !== 'object';
  }

  function getPathPrefix(path) {
    return Array.isArray(path) ? (
      path.reduce((stringified, location) => (
        typeof location === 'number'
          ? `${stringified.slice(0, -1)}[${location}].`
          : `${stringified}${location}.`
      ), '').slice(0, -1)
    ) : path;
  }

  function reducerWrapper(lens, reducer) {
    const getter = view(lens);
    const setter = set(lens);
    return function wrappedReducer(state, payload) {
      return setter(reducer(getter(state), payload, state), state);
    };
  }


  function createActionContainer(lens) {
    const actions = new Map();
    return ({
      set(actionName, reducer) {
        return !actions.has(actionName)
          ? throwNewErr(actionName)
          : actions.set(actionName, reducerWrapper(lens, reducer));
      },
      get: actions.get,
      has: actions.has,
    });
  }

  function checkPathArray(arr) {
    return arr.reduce((bool, val) => (
      bool ? (
        typeof val === 'string'
          ? val.split(PATH_JOINER).length === 1
          : typeof val === 'number'
      ) : false
    ), true);
  }

  function getNamespace(path) {
    return namespaces.get(getPathPrefix(path));
  }

  function getActionName(path, actionName) {
    return path.length
      ? `${getPathPrefix(path)}${PREFIX_SEPERATOR}${actionName}`
      : actionName;
  }

  function defaultReducer(state, payload) {
    return payload;
  }

  function createNoSideEffect() {
    return payload => payload;
  }

  function getNamespaceName(actionType) {
    const split = actionType.split(PREFIX_SEPERATOR)[0].split(PATH_JOINER);
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
        return [...path, ...subPath.split(PATH_JOINER)];
      }
      return [...path, subPath];
    }
    if (Array.isArray(subPath)) {
      return `${path}.${subPath.join(PATH_JOINER)}`;
    }
    if (typeof subPath === 'number') {
      return [...path.split(PATH_JOINER), subPath];
    }
    return `${path}.${subPath}`;
  }

  function validatePath(path, parentPath) {
    if (typeof path !== 'number' && !path) throw new Error('No path was provided to "createNamespace" function, which is required');
    if (typeof path !== 'string' && !Array.isArray(path) && typeof path !== 'number') throw new Error('The path provided to "createNamespace" function must be a string or array');
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath.lens)) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "createNamespace"');
    if (Array.isArray(path) && !checkPathArray(path)) throw new Error('When using an array to "createNamespace", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (Array.isArray(path) && typeof path === 'number') return path;
    const split = path.split(PATH_JOINER);
    if (split.length > 1) return split;
    return split[0];
  }

  function createLens(path, parentPath) {
    let lens;
    if (Array.isArray(path)) lens = lensPath(path);
    if (typeof path === 'number') lens = lensIndex(path);
    if (typeof path === 'string') lens = lensProp(path);
    return parentPath
      ? x => parentPath.lens(lens(x))
      : lens;
  }

  function setNamespace(path, parentPath) {
    validatePath(path, parentPath);
    const lens = createLens(ensurePath(path), parentPath);
    const pathString = parentPath ? getSubPath(parentPath[pathStringSymbol], path) : path;
    const prefix = getPathPrefix(pathString);
    if (namespaces.has(prefix)) throw new Error(`The path "${prefix}" already exists`);
    namespaces.set(prefix, createActionContainer(lens));
    return { lens, prefix };
  }

  function createNamespace(p, parentPath) {
    const { lens, prefix } = setNamespace(p, parentPath);
    const actionCreators = {};

    function mapActionToReducer(actionType, reducer = defaultReducer, meta = {}) {
      validateAddActionArgs(actionType, reducer, meta);

      let _createSideEffect = createNoSideEffect;
      const type = getActionName(prefix, actionType);

      getNamespace(prefix).set(type, reducer);

      function launchSideEffect(...args) {
        const sideEffect = _createSideEffect(store, actionCreators);
        const sideEffectResult = sideEffect(...args);
        return sideEffectResult || args[0];
      }

      function actionCreator(...args) {
        return {
          type,
          payload: launchSideEffect(...args),
          meta,
        };
      }

      function withSideEffect(createSideEffect) {
        if (typeof createSideEffect !== 'function') throw new Error('Value supplied to "withSideEffect" must be a function');
        _createSideEffect = createSideEffect;
        return actionCreator;
      }

      actionCreator.withSideEffect = withSideEffect;
      actionCreators[actionType] = actionCreator;

      return actionCreator;
    }

    mapActionToReducer('DEFAULT');

    return {
      [pathStringSymbol]: prefix,
      examine: view(lens),
      mapActionToReducer,
      actionCreators,
      lens,
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

  function setStore(_store) {
    store = _store;
    return store;
  }

  function createArrayNamespace(path, nested, mapper, isString) {
    const namespace = createNamespace(path);
    const _indexNamespaces = [];
    function arrayNamespace(index) {
      if (!_indexNamespaces[index]) {
        _indexNamespaces[index] = mapper(nested, [...path, index]);
      }
      return _indexNamespaces[index];
    }
    Object.keys(namespace).forEach((key) => {
      arrayNamespace[key] = namespace[key];
    });
    if (isString) {
      arrayNamespace.examine = data => (
        Object.keys(data).reduce((str, key) => `${str}${data[key]}`, '')
      );
    }
    return arrayNamespace;
  }

  function mapNamespacesToTarget(target, prevKey = []) {
    if (Array.isArray(target) || typeof target === 'string') {
      let nested;
      let isString;
      if (Array.isArray(target)) {
        nested = target.find(val => Array.isArray(val) || isAcceptableObject(val));
      }
      if (typeof target === 'string') isString = true;
      return createArrayNamespace(prevKey, nested, mapNamespacesToTarget, isString);
    }

    if (isAcceptableObject(target)) {
      return Object.keys(target).reduce((cloned, key) => {
        const path = [...prevKey, key];
        if (isAcceptableObject(target[key])) {
          return {
            ...cloned,
            [key]: mapNamespacesToTarget(target[key], path),
          };
        }
        if (Array.isArray(target[key])) {
          return { ...cloned, [key]: mapNamespacesToTarget(target[key], path) };
        }
        return { ...cloned, [key]: createNamespace(path) };
      }, createNamespace(prevKey));
    }
    return createNamespace(prevKey);
  }

  function mapNamespaces(target) {
    if (!Array.isArray(target) && !isAcceptableObject(target) && typeof target !== 'string') {
      throw new TypeError(`mapNamespaces only maps namespaces to arrays and objects. Instead you provided ${target}, which is of type ${typeof target}`);
    }
    return mapNamespacesToTarget(target);
  }

  return {
    createNamespace,
    createReducer,
    setStore,
    mapNamespaces,
  };
}

const { createNamespace, createReducer, setStore, mapNamespaces } = createPathspace();

export {
  createNamespace,
  createReducer,
  setStore,
  mapNamespaces,
  createPathspace,
};
