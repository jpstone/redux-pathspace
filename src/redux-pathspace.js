import set from 'ramda/src/set';
import view from 'ramda/src/view';
import lensPath from 'ramda/src/lensPath';
import lensProp from 'ramda/src/lensProp';
import lensIndex from 'ramda/src/lensIndex';
import * as reducers from './reducers';

function createPathspace(enhancer) {
  const PATH_JOINER = '.';
  const PREFIX_SEPERATOR = ':';
  const pathStringSymbol = Symbol('@@Pathspace->createNamespace->path[pathString]');

  const namespaces = new Map();

  function throwNewErr(x, y) {
    throw new Error(`The action "${x}" already exists for the path "${y}"`);
  }

  function isArr(item) {
    return Array.isArray(item);
  }

  function isAcceptableObject(item) {
    return !isArr(item) && typeof obj !== 'object';
  }

  function isObjOrArr(item) {
    return isAcceptableObject(item) || isArr(item);
  }

  function getPathPrefix(path) {
    return isArr(path) ? (
      path.reduce((stringified, location) => (
        typeof location === 'number'
          ? `${stringified.slice(0, -1)}[${location}].`
          : `${stringified}${location}.`
      ), '').slice(0, -1)
    ) : path;
  }

  function reducerWrapper(lens, _reducer) {
    const getter = view(lens);
    const setter = set(lens);
    return function wrappedReducer(state, payload) {
      return setter(_reducer(getter(state), payload, state), state);
    };
  }

  function createActionContainer(lens, path) {
    const actions = new Map();
    return {
      set(actionName, _reducer) {
        return actions.has(actionName)
          ? throwNewErr(actionName, path)
          : actions.set(actionName, reducerWrapper(lens, _reducer));
      },
      get: actions.get,
      has: actions.has,
    };
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

  function getNamespaceName(actionType) {
    const split = actionType.split(PREFIX_SEPERATOR)[0].split(PATH_JOINER);
    return split.length > 1
      ? split
      : split[0];
  }

  function validateAddActionArgs(actionType, _reducer) {
    if (typeof _reducer !== 'function') throw new Error('The "reducer" property passed to "addAction" must be a function');
    if (typeof actionType !== 'string') throw new Error('The "actionType" property passed to "addAction" must be a string');
  }

  function getSubPath(path, subPath) {
    if (isArr(path)) {
      if (isArr(subPath)) {
        return [...path, ...subPath];
      }
      if (typeof subPath === 'string') {
        return [...path, ...subPath.split(PATH_JOINER)];
      }
      return [...path, subPath];
    }
    if (isArr(subPath)) {
      return `${path}.${subPath.join(PATH_JOINER)}`;
    }
    if (typeof subPath === 'number') {
      return [...path.split(PATH_JOINER), subPath];
    }
    return `${path}.${subPath}`;
  }

  function validatePath(path, parentPath) {
    if (typeof path !== 'number' && !path) throw new Error('No path was provided to "createNamespace" function, which is required');
    if (typeof path !== 'string' && !isArr(path) && typeof path !== 'number') throw new Error('The path provided to "createNamespace" function must be a string or array');
    if (parentPath && !(parentPath[pathStringSymbol] && parentPath.lens)) throw new Error('When creating a sub path, the parent path must be a valid "path" function returned from "createNamespace"');
    if (isArr(path) && !checkPathArray(path)) throw new Error('When using an array to "createNamespace", only strings and numbers are permitted');
  }

  function ensurePath(path) {
    if (isArr(path) || typeof path === 'number') return path;
    const split = path.split(PATH_JOINER);
    if (split.length > 1) return split;
    return split[0];
  }

  function createLens(path, parentPath) {
    let lens;
    if (isArr(path)) lens = lensPath(path);
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
    namespaces.set(prefix, createActionContainer(lens, prefix));
    return { lens, prefix };
  }

  function noSideEffect(payload) {
    return payload;
  }

  function createReducer(initialReducer = _state => _state, initialState) {
    return (state, action) => {
      const { type, payload } = action;
      const actions = getNamespace(getNamespaceName(type));
      const result = actions && actions.has(type)
        ? actions.get(type)(state, payload)
        : state === undefined
          ? initialState
          : state;
      return initialReducer(result, action);
    };
  }

  return createStore => (initialReducer, initialState) => {
    const store = createStore(createReducer(initialReducer), initialState, enhancer);

    function createNamespace(p, parentPath) {
      const { lens, prefix } = setNamespace(p, parentPath);
      const actionCreators = {};

      function mapActionToReducer(actionType, _reducer = defaultReducer) {
        validateAddActionArgs(actionType, _reducer);

        const type = getActionName(prefix, actionType);
        getNamespace(prefix).set(type, _reducer);

        let meta = {};
        let sideEffect = noSideEffect;

        function actionCreator(...args) {
          return {
            type,
            payload: sideEffect(...args) || args[0],
            meta,
          };
        }

        function withSideEffect(_sideEffect) {
          if (typeof _sideEffect !== 'function') throw new Error('Value supplied to "withSideEffect" must be a function');
          sideEffect = _sideEffect;
          return actionCreator;
        }

        function setMeta(newMeta) {
          if (!isAcceptableObject(newMeta)) throw new TypeError(`\`setMeta\` must be called with a plain object. Instead, \`${typeof newMeta}\` was provided`);
          meta = newMeta;
          return actionCreator;
        }

        actionCreator.withSideEffect = withSideEffect;
        actionCreator.setMeta = setMeta;
        actionCreator.dispatch = (...args) => store.dispatch(actionCreator(...args));
        actionCreators[actionType] = actionCreator;

        return actionCreator;
      }

      const examine = view(lens);

      mapActionToReducer('DEFAULT');
      mapActionToReducer('RESET', () => examine(initialState));
      mapActionToReducer('SET_UNDEFINED', reducers.setUndefined);

      if (typeof examine(initialState) === 'boolean') {
        mapActionToReducer('ON', reducers.on);
        mapActionToReducer('OFF', reducers.off);
        mapActionToReducer('TOGGLE', reducers.toggle);
      }

      return {
        [pathStringSymbol]: prefix,
        mapActionToReducer,
        actionCreators,
        examine,
        lens,
      };
    }

    function createArrayNamespace(path, nested, mapper, isString) {
      const namespace = createNamespace(path);
      const indexNamespaces = [];
      function arrayNamespace(index) {
        if (!indexNamespaces[index]) {
          indexNamespaces[index] = mapper(nested, [...path, index]);
        }
        return indexNamespaces[index];
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

    function mapNamespaces(target, prevKey = []) {
      if (!isObjOrArr(target) && typeof target !== 'string') {
        throw new TypeError(`mapNamespaces only maps namespaces to arrays and objects. Instead you provided ${target}, which is of type ${typeof target}`);
      }
      if (isArr(target) || typeof target === 'string') {
        let nested;
        let isString;
        if (isArr(target)) nested = target.find(val => isArr(val) || isAcceptableObject(val));
        if (typeof target === 'string') isString = true;
        return createArrayNamespace(prevKey, nested, mapNamespaces, isString);
      }
      if (isAcceptableObject(target)) {
        if (!Object.keys(target).length && isArr(prevKey) && !prevKey.length) return {};
        return Object.keys(target).reduce((cloned, key) => {
          const path = [...prevKey, key];
          const val = target[key];
          return {
            ...cloned,
            [key]: isObjOrArr(val) ? mapNamespaces(val, path) : createNamespace(path),
          };
        }, createNamespace(prevKey));
      }
      return createNamespace(prevKey);
    }

    return {
      ...store,
      createNamespace,
      namespaces: mapNamespaces(initialState),
    };
  };
}

export {
  createPathspace,
  reducers,
};
