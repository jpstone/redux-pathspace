import set from 'ramda/src/set';
import view from 'ramda/src/view';
import lensPath from 'ramda/src/lensPath';
import lensProp from 'ramda/src/lensProp';
import lensIndex from 'ramda/src/lensIndex';
import isPlainObject from 'lodash.isplainobject';

function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}

function createPathspace() {
  const PATH_JOINER = '.';
  const PREFIX_SEPERATOR = ':';
  const pathStringSymbol = Symbol('@@Pathspace->createNamespace->path[pathString]');
  const pathLensSymbol = Symbol('@@Pathspace->createNamespace->path[pathLens]');

  const _namespaces = new Map();
  let _store;
  let _actionCreators;

  function getPathPrefix(path) {
    if (!Array.isArray(path)) return path;
    return path.reduce((stringified, location) => (
      typeof location === 'number'
        ? `${stringified.slice(0, -1)}[${location}].`
        : `${stringified}${location}.`
    ), '').slice(0, -1);
  }

  function checkPathArray(arr) {
    const isValid = arr.reduce((bool, val) => {
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

  function getNamespaceName(actionType) {
    const split = actionType.split(PREFIX_SEPERATOR)[0].split(PATH_JOINER);
    return split.length > 1
      ? split
      : split[0];
  }

  function reducerWrapper(lens, reducer, getPipeline) {
    const getter = view(lens);
    const setter = set(lens);
    return function wrappedReducer(state, payload) {
      const pipe = [
        x => setter(reducer(getter(x), payload, x), x),
        ...getPipeline().map(funcOrObj => (
          typeof funcOrObj === 'function'
            ? x => funcOrObj(x, payload)
            : x => getNamespace(getNamespaceName(funcOrObj.type))
              .get(funcOrObj.type)(x, funcOrObj.payload)
        )),
      ];
      return compose(...pipe)(state);
    };
  }

  function createActionContainer(lens) {
    const _actions = new Map();
    return {
      set(actionName, reducer, getPipeline) {
        if (_actions.has(actionName)) throw new Error(`The action "${actionName}" already exists for this path`);
        return _actions.set(actionName, reducerWrapper(lens, reducer, getPipeline));
      },
      get(actionName) {
        return _actions.get(actionName);
      },
      has(actionName) {
        return _actions.has(actionName);
      },
    };
  }

  function getActionName(path, actionName) {
    return !path.length
      ? actionName
      : `${getPathPrefix(path)}${PREFIX_SEPERATOR}${actionName}`;
  }

  function defaultReducer(state, payload) {
    return payload;
  }

  function createNoSideEffect() {
    return payload => payload;
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
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath[pathLensSymbol])) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "createNamespace"');
    if (Array.isArray(path) && !checkPathArray(path)) throw new Error('When using an array to "createNamespace", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (!Array.isArray(path) && typeof path !== 'number') {
      const split = path.split(PATH_JOINER);
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
    if (_namespaces.has(prefix)) throw new Error(`The path "${prefix}" already exists`);
    _namespaces.set(prefix, createActionContainer(lens));
    return { lens, prefix };
  }

  function createNamespace(p, parentPath) {
    const { lens, prefix } = setNamespace(p, parentPath);

    function mapActionToReducer(actionType, reducer = defaultReducer, meta = {}) {
      validateAddActionArgs(actionType, reducer, meta);
      const _pipeline = [];

      let _createSideEffect = createNoSideEffect;
      const type = getActionName(prefix, actionType);

      function getPipeline() {
        return _pipeline;
      }

      getNamespace(prefix).set(type, reducer, getPipeline);

      function actionCreator(...args) {
        return {
          type,
          payload: _createSideEffect(_store, _actionCreators)(...args),
          meta,
        };
      }

      function withSideEffect(createSideEffect) {
        if (typeof createSideEffect !== 'function') throw new Error('Value supplied to "withSideEffect" must be a function');
        _createSideEffect = createSideEffect;
        return actionCreator;
      }

      function withPipeline(...args) {
        _pipeline.push(...args);
        return actionCreator;
      }

      actionCreator.withSideEffect = withSideEffect;
      actionCreator.withPipeline = withPipeline;

      return actionCreator;
    }

    function wrapReducer(func) {
      return (state, payload) => set(lens, func(view(lens, state), payload, state), state);
    }

    return {
      [pathStringSymbol]: prefix,
      [pathLensSymbol]: lens,
      examine: view(lens),
      mapActionToReducer,
      wrapReducer,
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

  function setStore(store, actionCreators) {
    _store = store;
    _actionCreators = actionCreators;
    return _store;
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
        nested = target.find(val => Array.isArray(val) || isPlainObject(val));
      }
      if (typeof target === 'string') isString = true;
      return createArrayNamespace(prevKey, nested, mapNamespacesToTarget, isString);
    }

    if (isPlainObject(target)) {
      return Object.keys(target).reduce((cloned, key) => {
        const path = [...prevKey, key];
        if (isPlainObject(target[key])) {
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
    if (!Array.isArray(target) && !isPlainObject(target) && typeof target !== 'string') {
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
