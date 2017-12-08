const tape = require('tape');

function isFunction(f) {
  return [typeof f, 'function'];
}

tape('createPathspace', (t) => {
  const { addPath, createReducer } = require('../dist/redux-pathspace');
  t.equal(...isFunction(addPath), 'exports: function <addPath>');
  t.equal(...isFunction(createReducer), 'exports: function <createReducer>');
  t.end();
});

tape('createPathspace -> addPath', (t) => {
  const { addPath } = require('../dist/redux-pathspace');
  t.doesNotThrow(() => addPath('foo'), 'accepts: string');
  t.doesNotThrow(() => addPath('foo.bar.baz'), 'accepts: stringed path representation');
  t.doesNotThrow(() => addPath(['foo', 2]), 'accepts: array of strings or numbers');
  t.equal(...isFunction(addPath('baz')), 'returns: function <addAction>');
  t.throws(() => addPath({}), Error, 'throws: when passed an object');
  t.throws(() => addPath(['foo', 'bar', 'baz', {}]), Error, 'throws: when passed an array that does not consist of only strings or numbers');
  t.throws(() => addPath('foo'), Error, 'throws: when passed an existing path');
  t.throws(() => addPath(['foo.bar.baz', 1]), Error, 'throws: when using dot notation for path index in array');
  t.end();
});

tape('createPathspace -> addPath -> path', (t) => {
  const { addPath } = require('../dist/redux-pathspace');
  const addAction = addPath('x');

  t.doesNotThrow(() => addAction({ actionType: 'foo' }), 'accepts: object { actionType, [reducer], [meta] }');
  t.doesNotThrow(() => addAction({ actionType: 'bar', reducer: () => {} }), 'accepts: object with optional reducer');
  t.doesNotThrow(() => addAction({ actionType: 'baz', reducer: () => {}, meta: {} }), 'accepts: object with optional meta property');
  t.equal(...isFunction(addAction({ actionType: 'x' })), 'returns: function <createActionCreator>');
  t.throws(() => addAction({ actionType: 'foo' }), Error, 'throws: when supplied an existing actionType for the given namespace');
  t.throws(() => addAction({ actionType: 'alpha', reducer: 0 }), Error, 'throws: when optional reducer property is not a function');
  t.throws(() => addAction({ actionType: 'omega', meta: [] }), Error, 'throws: when optional meta property is not a plain object');
  t.end();
});

tape('createPathspace -> addPath -> path -> createActionCreator', (t) => {
  const { addPath } = require('../dist/redux-pathspace');
  const createActionCreator = addPath('y')({ actionType: 'foo' });

  t.doesNotThrow(() => createActionCreator(), 'accepts: optional [payloadHandler]');
  t.equal(...isFunction(createActionCreator(() => {})), 'returns: function <actionCreator>');
  t.throws(() => createActionCreator(0), Error, 'throws: when optional payloadHandler is not a function');
  t.end();
});

tape('createPathspace -> addPath -> path -> createActionCreator -> actionCreator', (t) => {
  const { addPath } = require('../dist/redux-pathspace');
  const createActionCreator = addPath('xPath')({ actionType: 'FOO' });
  const defaultActionCreator = createActionCreator();
  const fooActionCreator = createActionCreator(() => 'foo');
  const defaultAction = defaultActionCreator('fooBar');
  const fooAction = fooActionCreator();

  t.equal(defaultAction.type, 'xPath_FOO', 'returns: prefixed action.type');
  t.isEquivalent(defaultAction.meta, {}, 'returns: default meta object');
  t.equal(defaultAction.payload, 'fooBar', 'returns: supplied action.payload data');
  t.equal(fooAction.payload, 'foo', 'returns: user defined payloadHandler return value into action.payload');
  t.end();
});

tape('createPathspace -> createReducer', (t) => {
  const { createReducer } = require('../dist/redux-pathspace');
  t.doesNotThrow(() => createReducer(0), 'accepts: any');
  t.equal(...isFunction(createReducer()), 'returns: function');
  t.end();
});

tape('createPathspace -> createReducer -> reducer', (t) => {
  const { addPath, createReducer } = require('../dist/redux-pathspace');
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

  const rootReducer = createReducer(initialState);
  const createActionCreator = addPath('foo.bar')({ actionType: 'FOO', reducer: pathReducerA });
  const actionA = createActionCreator(() => 'foo');
  const actionAA = createActionCreator(() => 'bar');
  const actionB = addPath(['foo', 'bar', 'baz', 0])({ actionType: 'FOO', reducer: pathReducerB })();

  t.doesNotThrow(() => rootReducer(initialState, actionA()), 'reducer: passes slice as first argument and full state as last argument');
  t.doesNotThrow(() => rootReducer(initialState, actionB()), 'reducer: handles array-index paths');
  t.throws(() => rootReducer(initialState, actionAA()), 'reducer: passes payload as second argument');

  const newState = rootReducer(initialState, actionB());

  t.equal(newState.foo.bar.baz[0].id, 'foo', 'root reducer properly returns modified state');
  t.end();
});
