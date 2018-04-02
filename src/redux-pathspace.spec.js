/* eslint global-require: 0 */

const tape = require('tape');

function isFunction(f) {
  return [typeof f, 'function'];
}

tape('redux-pathspace', (t) => {
  const { createNamespace, createReducer } = require('../dist/redux-pathspace');
  t.equal(...isFunction(createNamespace), 'exports: function <createNamespace>');
  t.equal(...isFunction(createReducer), 'exports: function <createReducer>');
  t.end();
});

tape('redux-pathspace -> createNamespace', (t) => {
  const { createNamespace, createReducer } = require('../dist/redux-pathspace');
  t.doesNotThrow(() => createNamespace('foo'), 'accepts: string');
  t.doesNotThrow(() => createNamespace('foo.bar.baz'), 'accepts: stringed path representation');
  t.doesNotThrow(() => createNamespace(['foo', 2]), 'accepts: array of strings or numbers');
  t.doesNotThrow(() => createNamespace(0), 'accepts: number');
  t.throws(() => createNamespace({}), Error, 'throws: when passed an object');
  t.throws(() => createNamespace(['foo', 'bar', 'baz', {}]), Error, 'throws: when passed an array that does not consist of only strings or numbers');
  t.throws(() => createNamespace('foo'), Error, 'throws: when passed an existing path');
  t.throws(() => createNamespace(['foo.bar.baz', 1]), Error, 'throws: when using dot notation for path index in array');

  const state = {
    xx: {
      yy: 'z',
    },
  };

  function yReducer(slice) {
    if (slice !== 'z') throw new Error();
  }

  const rootReducer = createReducer(state);
  const xPath = createNamespace('xx');
  const yPath = createNamespace('yy', xPath);
  const yPathActionCreator = yPath.mapActionToReducer('FOO', yReducer);

  t.doesNotThrow(() => rootReducer(state, yPathActionCreator()), 'should properly compose lenses');
  t.end();
});

tape('redux-pathspace -> createNamespace -> namespace', (t) => {
  const { createNamespace } = require('../dist/redux-pathspace');
  const namespace = createNamespace('x');

  t.equal(3, Object.keys(namespace).length, 'returns an object with 3 properties');
  t.equal(...isFunction(namespace.mapActionToReducer), 'returns a `mapActionToReducer` function');
  t.equal(...isFunction(namespace.examine), 'returns a `examine` function');
  t.equal(...isFunction(namespace.examine), 'provides a function');
  t.end();
});

tape('redux-pathspace -> createNamespace -> namespace -> examine', (t) => {
  const { createNamespace } = require('../dist/redux-pathspace');
  const state = {
    m: 'foo',
  };
  const xPath = createNamespace('m');
  const xView = xPath.examine(state);

  t.equal(xView, 'foo', 'should properly examine path');
  t.end();
});

tape('redux-pathspace -> createNamespace -> namespace -> mapActionToReducer', (t) => {
  const { createNamespace } = require('../dist/redux-pathspace');
  const namespace = createNamespace('X');

  t.doesNotThrow(() => namespace.mapActionToReducer('foo'), 'accepts: actionType[, reducer][, meta]');
  t.doesNotThrow(() => namespace.mapActionToReducer('bar', () => {}), 'accepts: object with optional reducer');
  t.doesNotThrow(() => namespace.mapActionToReducer('baz', () => {}, {}), 'accepts: object with optional meta property');
  t.equal(...isFunction(namespace.mapActionToReducer('x')), 'returns: function <createActionCreator>');
  t.throws(() => namespace.mapActionToReducer('foo'), Error, 'throws: when supplied an existing actionType for the given namespace');
  t.throws(() => namespace.mapActionToReducer('alpha', 0), Error, 'throws: when optional reducer property is not a function');
  t.throws(() => namespace.mapActionToReducer('omega', () => {}, []), Error, 'throws: when optional meta property is not a plain object');
  t.end();
});

tape('redux-pathspace -> createNamespace -> namespace -> mapActionToReducer -> actionCreator', (t) => {
  const { createNamespace } = require('../dist/redux-pathspace');
  const actionCreator = createNamespace('xPath').mapActionToReducer('FOO');
  const action = actionCreator('fooBar');

  t.equal(action.type, 'xPath:FOO', 'returns: prefixed action.type');
  t.isEquivalent(action.meta, {}, 'returns: default meta object');
  t.equal(action.payload, 'fooBar', 'returns: supplied action.payload data');
  t.end();
});

tape('redux-pathspace -> createNamespace -> namespace -> mapActionToReducer -> withSideEffect', (t) => {
  const { createNamespace } = require('../dist/redux-pathspace');
  const actionCreator = createNamespace('y').mapActionToReducer('FOO');

  t.throws(() => actionCreator.withSideEffect(0), Error, 'throws: when optional payloadHandler is not a function');
  actionCreator.withSideEffect(() => 'foo');
  t.equal(actionCreator().payload, 'foo', 'properly adds side effect');
  t.end();
});

tape('redux-pathspace -> createNamespace -> namespace -> lens', (t) => {
  const view = require('ramda/src/view');
  const { createNamespace, getLens } = require('../dist/redux-pathspace');
  const state = { r: 'foo' };
  const rPath = createNamespace('r');
  const rLens = rPath.lens;

  t.equal(view(rLens, state), 'foo', 'getLens should properly provide lens');
  t.end();
});


tape('redux-pathspace -> createReducer', (t) => {
  const { createReducer } = require('../dist/redux-pathspace');
  t.doesNotThrow(() => createReducer(0), 'accepts: any');
  t.equal(...isFunction(createReducer()), 'returns: function');
  t.end();
});

tape('redux-pathspace -> createReducer -> reducer', (t) => {
  const { createNamespace, createReducer } = require('../dist/redux-pathspace');
  const is = 'foo';
  const reducer = createReducer(is);

  t.equal(reducer(undefined, { type: 'bar' }), 'foo', 'returns: initial state when state is undefined');

  const initialState = {
    foo: {
      bar: {
        baz: [{ id: 1, name: 'x' }, { id: 2, name: 'y' }],
        zab: 'hello',
      },
    },
    indexPath: {
      arr: ['hi'],
    },
  };

  function pathReducerA(slice, payload, state) {
    if (JSON.stringify(initialState.foo.bar) !== JSON.stringify(slice)) throw new Error();
    if (JSON.stringify(initialState) !== JSON.stringify(state)) throw new Error();
    if (payload !== 'foo') throw new Error();
    return initialState;
  }

  function pathReducerB(slice) {
    if (!slice.id) throw new Error();
    if (slice.id !== 1) throw new Error();
    const newSlice = { ...slice, id: 'foo' };
    return newSlice;
  }

  function pathReducerC(slice) {
    if (slice !== 'hi') throw new Error();
  }

  const rootReducer = createReducer(initialState);
  const actionCreator = createNamespace('foo.bar').mapActionToReducer('FOO', pathReducerA);
  const indexPath = createNamespace('indexPath');
  const hiPath = createNamespace(0, createNamespace('arr', indexPath));
  const indexAction = hiPath.mapActionToReducer('FOO');
  const actionB = createNamespace(['foo', 'bar', 'baz', 0]).mapActionToReducer('FOO', pathReducerB);

  t.doesNotThrow(() => rootReducer(initialState, actionCreator('foo')), 'reducer: passes slice as first argument payload as second and full state as last argument');
  t.doesNotThrow(() => rootReducer(initialState, actionB()), 'reducer: handles array-index paths');
  t.doesNotThrow(() => rootReducer(initialState, indexAction()), 'properly handles index paths');

  const newState = rootReducer(initialState, actionB());

  t.equal(newState.foo.bar.baz[0].id, 'foo', 'root reducer properly returns modified state');
  t.end();
});

