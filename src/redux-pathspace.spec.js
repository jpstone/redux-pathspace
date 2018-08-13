/* eslint global-require: 0 */

const tape = require('tape');
const { createPathspace } = require('../dist/redux-pathspace');

function isFunction(f) {
  return [typeof f, 'function'];
}

tape('redux-pathspace', (t) => {
  t.test('properly exports api methods', (tt) => {
    const { createNamespace, createReducer, setStore, mapNamespaces } = createPathspace();

    tt.equal(...isFunction(createNamespace), 'exports a `createNamespace` function');
    tt.equal(...isFunction(createReducer), 'exports a `createReducer` function');
    tt.equal(...isFunction(setStore), 'exports a `setStore` function');
    tt.equal(...isFunction(mapNamespaces), 'exports a `mapNamespaces` function');
    tt.equal(...isFunction(createPathspace), 'exports a `mapNamespaces` function');
    tt.end();
  });

  t.test('mapNamespaces', (tt) => {
    const { mapNamespaces, createReducer } = createPathspace();
    const {
      mapNamespaces: mapNamespacesArray, createReducer: createArrReducer,
    } = createPathspace();
    const {
      mapNamespaces: mapNamespacesString, createReducer: createStringReducer,
    } = createPathspace();
    const { mapNamespaces: mapNamespacesThrow } = createPathspace();
    const { createStore } = require('redux');

    const initialState = {
      foo: {
        bar: [1, 2, 3, 4],
        baz: {
          zab: undefined,
        },
        bing: [{
          name: 'hello',
        }],
        bang: [[{
          boom: 'zing',
          zoom: [{
            zing: 'nested',
          }],
        }]],
      },
    };

    const initialStateArray = [{
      foo: 'bar',
    }];

    const initialStateString = 'fooBar';

    const mapped = mapNamespaces(initialState);
    const mappedArray = mapNamespacesArray(initialStateArray);
    const mappedString = mapNamespacesString(initialStateString);

    tt.equal(...isFunction(mapped.foo.examine), 'properly maps namespaces');
    tt.equal(...isFunction(mapped.foo.bar.examine), 'properly maps namespaces');
    tt.equal(...isFunction(mapped.foo.baz.examine), 'properly maps namespaces');
    tt.equal(...isFunction(mapped.foo.baz.zab.examine), 'properly maps namespaces');
    tt.equal(...isFunction(mapped.foo.bar), 'creates a function for array paths');
    tt.deepEqual(mapped.foo.bar.examine(initialState), [1, 2, 3, 4], 'properly handles array indexes');
    tt.equal(mapped.foo.bar(2).examine(initialState), 3, 'properly handles array indexes');
    tt.equal(mapped.foo.bing(0).name.examine(initialState), 'hello', 'properly maps array item shapes');
    tt.deepEqual(mapped.foo.bing(0).examine(initialState), { name: 'hello' }, 'properly maps array item shapes');
    tt.equal(mapped.foo.bang(0)(0).boom.examine(initialState), 'zing', 'properly handles nested array shapes');
    tt.deepEqual(mapped.foo.bang(0).examine(initialState), initialState.foo.bang[0], 'properly handles nested array shapes');

    const zoom = mapped.foo.bang(0)(0).zoom(0);

    tt.deepEqual(zoom.examine(initialState), initialState.foo.bang[0][0].zoom[0], 'properly handles nested array shapes');
    tt.equal(zoom.zing.examine(initialState), 'nested', 'properly handles nested array shapes');

    const secondIndexActionCreator = mapped.foo.bar(2).mapActionToReducer('FOO');
    const superLongActionCreator = zoom.zing.mapActionToReducer('SET');
    const randomIndexActionCreator = mapped.foo.bar(42).mapActionToReducer('FOO');

    tt.deepEqual(secondIndexActionCreator('foo'), { type: 'foo.bar[2]:FOO', payload: 'foo', meta: {} }, 'properly handles actions');
    tt.throws(() => mapped.foo.bar(2).mapActionToReducer('FOO'), 'throws when duplicate actions created');
    tt.deepEqual(superLongActionCreator('foo'), { type: 'foo.bang[0][0].zoom[0].zing:SET', payload: 'foo', meta: {} }, 'properly handles deeply nested namespace actions');

    const store = createStore(createReducer(initialState), initialState);
    store.dispatch(superLongActionCreator('super long!'));
    store.dispatch(randomIndexActionCreator('hello'));

    tt.equal(zoom.zing.examine(store.getState()), 'super long!', 'properly reduces actions to the store');
    tt.equal(mapped.foo.bar(42).examine(store.getState()), 'hello', 'properly reduces actions to the store');
    tt.equal(mapped.foo.bar(37).examine(store.getState()), undefined, 'properly reduces actions to the store');

    tt.equal(...isFunction(mappedArray.examine), 'properly maps arrays');
    tt.equal(...isFunction(mappedArray(0).examine), 'properly maps arrays');
    tt.equal(...isFunction(mappedArray(0).foo.examine), 'properly maps arrays');
    tt.deepEqual(mappedArray.examine(initialStateArray), initialStateArray, 'properly maps arrays');
    tt.deepEqual(mappedArray(0).examine(initialStateArray), initialStateArray[0], 'properly maps arrays');
    tt.equal(mappedArray(0).foo.examine(initialStateArray), initialStateArray[0].foo, 'properly maps arrays');
    tt.deepEqual(mappedArray.mapActionToReducer('SET')('foo'), { type: 'SET', payload: 'foo', meta: {} }, 'properly creats actions for mapped arrays');
    tt.deepEqual(mappedArray(0).mapActionToReducer('SET')('foo'), { type: '[0]:SET', payload: 'foo', meta: {} }, 'properly creats actions for mapped arrays');
    tt.deepEqual(mappedArray(0).foo.mapActionToReducer('SET')('foo'), { type: '[0].foo:SET', payload: 'foo', meta: {} }, 'properly creats actions for mapped arrays');

    const arrayStore = createStore(createArrReducer(initialStateArray), initialStateArray);
    const mappedArrFooActionCreator = mappedArray(0).foo.mapActionToReducer('YO');
    arrayStore.dispatch(mappedArrFooActionCreator('yo!'));

    tt.equal(mappedArray(0).foo.examine(arrayStore.getState()), 'yo!', 'properly reduces state for mapped arrays');

    tt.equal(...isFunction(mappedString.examine), 'properly maps strings');
    tt.equal(...isFunction(mappedString(0).examine), 'properly maps strings');
    tt.equal(...isFunction(mappedString(1).examine), 'properly maps strings');
    tt.equal(...isFunction(mappedString(2).examine), 'properly maps strings');
    tt.equal(mappedString.examine(initialStateString), initialStateString, 'properly maps strings');
    tt.equal(mappedString(0).examine(initialStateString), initialStateString[0], 'properly maps strings');
    tt.equal(mappedString(1).examine(initialStateString), initialStateString[1], 'properly maps strings');
    tt.equal(mappedString(2).examine(initialStateString), initialStateString[1], 'properly maps strings');
    tt.deepEqual(mappedString.mapActionToReducer('SET')('foo'), { type: 'SET', payload: 'foo', meta: {} }, 'properly creats actions for mapped strings');
    tt.deepEqual(mappedString(0).mapActionToReducer('SET')('foo'), { type: '[0]:SET', payload: 'foo', meta: {} }, 'properly creats actions for mapped strings');
    tt.deepEqual(mappedString(1).mapActionToReducer('SET')('foo'), { type: '[1]:SET', payload: 'foo', meta: {} }, 'properly creats actions for mapped strings');

    const stringStore = createStore(createStringReducer(initialStateString), initialStateString);
    const mappedStringActionCreator = mappedString(3).mapActionToReducer('SET');
    stringStore.dispatch(mappedStringActionCreator('T'));

    tt.equal(mappedString(3).examine(stringStore.getState()), 'T', 'properly reduces state for mapped arrays');
    tt.equal(mappedString.examine(stringStore.getState()), 'fooTar', 'properly reduces state for mapped arrays');

    tt.throws(() => mapNamespacesThrow(0), 'throws when called with a non-object/array/string');
    tt.throws(() => mapNamespacesThrow(() => {}), 'throws when called with a non-object/array/string');
    tt.end();
  });

  t.test('setStore', (tt) => {
    const { createNamespace, createReducer, setStore } = createPathspace();

    const { createStore } = require('redux');
    const initialState = { foo: 'bar', baz: 'zab' };
    const foo = createNamespace('foo');
    const baz = createNamespace('baz');
    const bazActionCreator = baz.mapActionToReducer('SET', () => 'changed');
    const fooActionCreator = foo.mapActionToReducer('CHANGE_BAZ_TOO')
      .withSideEffect(({ dispatch }, ax) => () => { dispatch(ax.bazActionCreator()); return 'hello'; });
    const actionCreators = { bazActionCreator, fooActionCreator };
    const store = setStore(createStore(createReducer(initialState), initialState), actionCreators);
    store.dispatch(fooActionCreator());
    tt.equal(store.getState().baz, 'changed', 'properly sets store and action creators so dispatch/ation creators can be passed to side effects');
    tt.end();
  });

  t.test('createNamespace', (createNamespaceTest) => {
    let mock = createPathspace();

    createNamespaceTest.doesNotThrow(() => mock.createNamespace('foo'), 'accepts a string');
    createNamespaceTest.doesNotThrow(() => mock.createNamespace('foo.bar.baz'), 'accepts a stringed path representation');
    createNamespaceTest.doesNotThrow(() => mock.createNamespace(['foo', 2]), 'accepts an array of strings or numbers');
    createNamespaceTest.doesNotThrow(() => mock.createNamespace(0), 'accepts a number');
    createNamespaceTest.throws(() => mock.createNamespace({}), Error, 'throws when passed an object');
    createNamespaceTest.throws(() => mock.createNamespace(['foo', 'bar', 'baz', {}]), Error, 'throws when passed an array that does not consist of only strings or numbers');
    createNamespaceTest.throws(() => mock.createNamespace('foo'), Error, 'throws when passed an existing path');
    createNamespaceTest.throws(() => mock.createNamespace(['foo.bar.baz', 1]), Error, 'throws when using dot notation for path index in array');

    const state = {
      x: {
        y: 'z',
      },
    };

    function yReducer(slice) {
      if (slice !== 'z') throw new Error();
    }

    const rootReducer = mock.createReducer(state);
    const x = mock.createNamespace('x');
    const y = mock.createNamespace('y', x);
    const yActionCreator = y.mapActionToReducer('FOO', yReducer);

    createNamespaceTest.doesNotThrow(() => rootReducer(state, yActionCreator()), 'should properly compose lenses');

    createNamespaceTest.test('namespace', (namespaceTest) => {
      mock = createPathspace();

      const namespace = mock.createNamespace('x');

      namespaceTest.equal(4, Object.keys(namespace).length, 'returns an object with 4 properties');
      namespaceTest.equal(...isFunction(namespace.mapActionToReducer), 'returns a `mapActionToReducer` function');
      namespaceTest.equal(...isFunction(namespace.examine), 'returns a `examine` function');
      namespaceTest.equal(...isFunction(namespace.examine), 'provides a function');

      namespaceTest.test('examine', (examineTest) => {
        const fooState = {
          m: 'foo',
        };
        const xPath = mock.createNamespace('m');
        const xView = xPath.examine(fooState);

        examineTest.equal(xView, 'foo', 'should properly examine path');
        examineTest.end();
      });

      namespaceTest.test('mapActionToReducer', (mapActionToReducerTest) => {
        mock = createPathspace();

        const ns = mock.createNamespace('x');

        mapActionToReducerTest.doesNotThrow(() => ns.mapActionToReducer('foo'), 'accepts a string');
        mapActionToReducerTest.doesNotThrow(() => ns.mapActionToReducer('bar', () => {}), 'accepts an object with an optional reducer');
        mapActionToReducerTest.doesNotThrow(() => ns.mapActionToReducer('baz', () => {}, {}), 'accepts an object with an optional meta property');
        mapActionToReducerTest.equal(...isFunction(ns.mapActionToReducer('x')), 'returns a function');
        mapActionToReducerTest.throws(() => ns.mapActionToReducer('foo'), Error, 'throws when supplied an existing actionType for the given namespace');
        mapActionToReducerTest.throws(() => ns.mapActionToReducer('alpha', 0), Error, 'throws when optional reducer property is not a function');
        mapActionToReducerTest.throws(() => ns.mapActionToReducer('omega', () => {}, []), Error, 'throws when optional meta property is not a plain object');

        mapActionToReducerTest.test('actionCreator', (actionCreatorTest) => {
          mock = createPathspace();

          let actionCreator = mock.createNamespace('xPath').mapActionToReducer('FOO');
          const action = actionCreator('fooBar');

          actionCreatorTest.equal(action.type, 'xPath:FOO', 'returns a prefixed action.type');
          actionCreatorTest.isEquivalent(action.meta, {}, 'returns a default meta object');
          actionCreatorTest.equal(action.payload, 'fooBar', 'returns the supplied action.payload data');
          actionCreatorTest.end();

          actionCreatorTest.test('withSideEffect', (withSideEffectTest) => {
            mock = createPathspace();
            actionCreator = mock.createNamespace('y').mapActionToReducer('FOO');

            withSideEffectTest.throws(() => actionCreator.withSideEffect(0), Error, 'throws when optional side-effecet is not a function');
            actionCreator.withSideEffect(() => () => 'foo');
            withSideEffectTest.equal(actionCreator().payload, 'foo', 'properly adds side effect');
            withSideEffectTest.end();
          });

          actionCreatorTest.test('withPipeline', (withPipelineTest) => {
            mock = createPathspace();

            const { createStore } = require('redux');
            const xState = { foo: 'foo', bar: 'bar', zab: 'zab' };
            const store = createStore(mock.createReducer(xState), xState);
            const nsFoo = mock.createNamespace('foo');
            const nsBar = mock.createNamespace('bar');
            const nsZab = mock.createNamespace('zab');

            function helloWorld(x, y, z) {
              return 'hello world';
            }

            function byeWorld(x, y, z) {
              return 'bye world';
            }

            actionCreator = nsFoo.mapActionToReducer('hi', helloWorld).withPipeline(nsBar.wrapReducer(byeWorld));

            const zabActionCreator = nsZab.mapActionToReducer('ok');
            const barActionCreator = nsBar.mapActionToReducer('ok', () => 'im bar').withPipeline(zabActionCreator('yep'));

            withPipelineTest.ok(typeof actionCreator.withPipeline === 'function', 'has a withPipeline method');

            store.dispatch(actionCreator());

            withPipelineTest.deepEqual(store.getState(), { foo: 'hello world', bar: 'bye world', zab: 'zab' }, 'properly runs basic pipeline');

            store.dispatch(barActionCreator());

            withPipelineTest.deepEqual(store.getState(), { foo: 'hello world', bar: 'im bar', zab: 'yep' }, 'properly runs basic pipeline');
            withPipelineTest.end();
          });
        });

        mapActionToReducerTest.end();
      });

      namespaceTest.test('lens', (lensTest) => {
        mock = createPathspace();

        const view = require('ramda/src/view');
        const rState = { r: 'foo' };
        const rPath = mock.createNamespace('r');
        const rLens = rPath.lens;

        lensTest.equal(view(rLens, rState), 'foo', 'getLens should properly provide lens');
        lensTest.end();
      });
      namespaceTest.end();
    });
    createNamespaceTest.end();
  });

  t.test('createReducer', (tt) => {
    const { createNamespace, createReducer } = createPathspace();

    tt.doesNotThrow(() => createReducer(0), 'accepts any type');
    tt.equal(...isFunction(createReducer()), 'returns a function');

    tt.test('redux-pathspace -> createReducer -> reducer', (ttt) => {
      const is = 'foo';
      const reducer = createReducer(is);

      ttt.equal(reducer(undefined, { type: 'bar' }), 'foo', 'returns: initial state when state is undefined');

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

      const rootReducer = createReducer(initialState);
      const actionCreator = createNamespace('foo.bar').mapActionToReducer('FOO', pathReducerA);
      const indexPath = createNamespace('indexPath');
      const hiPath = createNamespace(0, createNamespace('arr', indexPath));
      const indexAction = hiPath.mapActionToReducer('FOO');
      const actionB = createNamespace(['foo', 'bar', 'baz', 0]).mapActionToReducer('FOO', pathReducerB);

      ttt.doesNotThrow(() => rootReducer(initialState, actionCreator('foo')), 'reducer: passes slice as first argument payload as second and full state as last argument');
      ttt.doesNotThrow(() => rootReducer(initialState, actionB()), 'reducer: handles array-index paths');
      ttt.doesNotThrow(() => rootReducer(initialState, indexAction()), 'properly handles index paths');

      const newState = rootReducer(initialState, actionB());

      ttt.equal(newState.foo.bar.baz[0].id, 'foo', 'root reducer properly returns modified state');
      ttt.end();
    });
    tt.end();
  });
  t.end();
});
