# redux-pathspace

> Quickly & easily create path-based namespaces to add actions that map to reducers

## ([live demo](https://codesandbox.io/s/48zkpvnz47))

## Usage

```js
import { createStore, applyMiddleware } from 'redux';
import { promiseMiddleware } from 'some-promise-middleware';
import { createNamespace, createReducer } from 'redux-pathspace';
import { api } from './my-api';

const initialState = { foo: 'bar', baz: [] };

const store = createStore(
  createReducer(initialState),
  initialState,
  applyMiddleware(promiseMiddleware),
);

store.getState(); // -> { foo: 'bar', baz: [] }

// no side effects:
const foo = createNamespace('foo');

// use the default reducer (just returns the payload)
const fooAnyActionCreator = foo.mapActionToReducer('ANY');
fooAnyActionCreator('xyz'); // -> { type: 'foo:ANY', payload: 'xyz', meta: {} }
store.dispatch(fooAnyActionCreator('xyz'));
store.getState(); // -> { foo: 'xyz', baz: [] }
foo.examine(store.getState()); // -> 'xyz'

// specify your own reducer...this one ignores the payload and alwyays returns 'hello'
const fooHelloActionCreator = foo.mapActionToReducer('HELLO', () => 'hello');
fooHelloActionCreator() // -> { type: 'foo:HELLO', payload: undefined, meta: {} }
store.dispatch(fooHelloActionCreator());
store.getState(); // -> { foo: 'hello', baz: [] }
foo.examine(store.getState()); // -> 'hello'

// a duplicate action name wihtin a namespace will throw
foo.mapActionToReducer('HELLO'); // -> ERROR: action type already exists for `foo` namespace

// manage side-effects
const baz = createNamespace('baz');

function getBazItems() {
  // some promise
  return api.getBazItems.then(items => items);
}

const getBazItemsActionCreator = baz.mapActionToReducer('GET_ITEMS').withSideEffect(getBazItems);
store.dispatch(getBazItemsActionCreator());
store.getState(); // -> { foo: 'hello', baz: ['Item 1', 'Item 2', 'Item 3'] }
baz.examine(store.getState()); // ['Item 1', 'Item 2', 'Item 3' ]

// paths can also be created for array indexes
const bazIndex1 = createNamespace(1, baz); // passing a namespace as a second argument will create a sub-path
bazIndex1.examine(store.getState()); // -> 'Item 2'
bazIndex1ActionCreator = bazIndex1.mapActionToReducer('FOO');
bazIndex1ActionCreator(); // -> { type: baz[1]:FOO, payload: undefined, meta: {} }

```

## API

```js
import { createNamespace, createReducer, mapNamespaces, setStore, createPathspace } from 'redux-pathspace';
```

### createNamespace(path: string|array|number|func[, parentPath: path]);

Returns a new namespace object. You can think of a namespace as a self-contained unit (closure) that keeps track of action/reducer pairs and any additional meta data.

- `path` - The path to target on the redux state. If it's a string, it can be dot notation such as `foo.bar.baz`. If it's an array it can consist of strings and numbers *without* dot notated strings `['foo', 'bar', 0]`. If it's a number (whether standalone or in an array), then it specifies an array index within your given path. The specified `path` will be used as a prefix for the `action.type`.
- `parentPath` - If supplied, this *must* be a valid `path` returned from a previous `createNamespace` call, which will act as the parent path (behind the scenes, this accesses the previous Ramda lens and composes those lenses together to create sub-paths).
- returns - (object) - A new namespace.

### const namespace = createNamespace(...);

#### namespace.mapActionToReducer(actionType: string[, reducer: func, meta: object]);

- `actionType`  - The name of your action that will get prefixed with the parent path to avoid collisions.
- `reducer` - Reducer to be called when `actionType` is dispatched. If not supplied it uses a default reducer with the signature: `defaultReducer = (state, payload) -> payload`. All supplied reducers get passed the value of of the state based on the path specified when calling `createNamespace` as the first argument--you can think of it as the "slice" of state specified by the given `path`. All reducers get passed a second argument which is the value supplied to `actionCreator(value)`. All reducers will receive the full state supplied by `store.getState()` as the third argument. For example: `myReducer(path, payload, fullState) => payload`.
- `meta` - Object to set on the `action.meta` property. Defaults to `{}`.
- returns - (function) - A new `actionCreator`.

#### namespace.examine(item: object|array|string);

Function that peers into the specified depth of an object based on the path of the namespace and returns its value.

- `item` - Object/array/string to inspect. If there's no matching path, it will return `undefined`. Otherwise, it will return the value of the specified path.

#### namespace.lens;

Retrieves the underlying Ramda lens being used by `redux-pathspace` for the given path should you need it for your own purposes.

### const actionCreator = namespace.mapActionToReducer('FOO');

A new action creator that, when called, returns a flux standard action (FSA) that looks like: `{ type, payload, meta }`. Prior to returning the FSA object, the action creator will check for any side-effects, and pass all arguments supplied to `actionCreator` to the side-effect function you specify when calling `actionCreator.withSideEffect(func)`. The return value of the side-effect function call will get set on the `payload` of the FSA. More on the side-effect API below.

#### actionCreator.withSideEffect(sideEffect: func);

Adds a side effect to the `actionCreator`. 

- `sideEffect` - This function should return another function. The signature is `(store, actionCreator) => (...args) => { ... }`. The first function gets called with `store` and `actionCreators` (see `setStore` method below). Obviously, if you didn't use `setStore`, then both of those arguments will be `undefined`. The function that's returned gets passed the arguments supplied to `yourActionCreator(...args)` to execute any side effects before getting set onto action.payload.

The `sideEffect` you specify gets called like this:

```js
function actionCreator(...args) {
  return {
    type: 'SOME_ACTION',
    payload: sideEffect(store, actionCreators)(...args),
    meta: {},
  };
}
```

Notice `store` is passed as the first argument to the function provided to `withSideEffect`. If you used `setStore` (see documentation below), `store` will get passed to all `sideEffect` functions you pass to `withSideEffect`. The rationale behind this is that your reducers should be as simple and pure as possible--ideally, simple enough to where they return primitive values in most cases, and are completely unaware of the shape of the rest of your state. When you need to update other parts of the state in order to properly set the portion of the state your reducer is concerned with, then that is a side-effect. Therefore `store` gets passed as the first argument to `sideEffect` so any other updates to the state can be completely transparent when you call `store.dispatch(actionCreator('foo'))`.

The `actionCreators` argument passed after `store` is usually object of action creators you specified when calling `setStore` for convenience--although it could technically be anything (i.e. a getter function that retrieves your action creators, etc.). See the `setStore` documentation below for more information.

Again, if you didn't let `redux-pathspace` know about your store by using `setStore`, then `store` and `actionCreators` will both be `undefined` and unavailable to your `sideEffect` functions (unless you manually pass it in your action creators).

### const reducer = createReducer(initialState: string|array|number|object);

- `initialState` - Used to store the supplied initial state which is returned whenever the state passed to a reducer is `undefined`.
- returns - (function) - A "root" reducer which should get passed to redux's `createStore`.


### mapNamespaces(initialState: object|array|string);

- `initialState` - If an object, will deeply map namespaces to each key in your object. If an array, will deeply traverse your array and create a namespace for each index (see more on arrays below). If a string, will create a namespace for each index in the string.

#### *Note*: Array values

If any of the values in the `initialState` passed to `mapNamespaces` are arrays (or just plain array itself), a new function will be created for that key that takes one argument--the array's index you want to target. When called, it returns a `namespace` for that specific index. In addition, all the `namespace` methods/properties are mapped onto the function, so you don't have to target a specific index. You can just use the normal `namespace` methods/properties as you would for non-arrays.

Additionally, `mapNamespaces` will recursively walk down arrays provided and if an object is found, it will assume all objects within that array will have the same shape, and create a namespace for any index in that array that matches that shape. If it finds other arrays nested within your array, it will map those arrays (and nested objects) as well.

Here is a usage example:

```js
import { createNamespace, mapNamespaces, createReducer } from 'redux-pathspace';
import { createStore } from 'redux';

const initialState = { someKey: 'someValue', myArr: ['foo', 'bar'], arrWithObjects: [{ name: 'John' }]};
const namespaces = mapNamespaces(initialState);
const store = createStore(createReducer(initialState), initialState);

console.log(typeof namespaces.someKey); // -> 'object'
console.log(typeof namespaces.myArr); // -> 'function'

namespaces.myArr(1).examine(initialState); // -> bar
namespaces.myArr(10).examine(initialState); // -> undefined
namespaces.arrWithObjects(0).examine(initialState); // -> { name: 'John' }
namespaces.arrWithObjects(0).name.examine(initialState); //  -> 'John'
namespaces.arrWithObjects(42).name.examine(initialState); // -> undefined

const newNameActionCreator = namespaces.arrWithObjects(42).name.mapActionToReducer('NEW_NAME');
store.dispatch(newNameActionCreator('Lizzie');
namespaces.arrWithObjects(42).name.examine(store.getState()); // -> 'Lizzie'

```

### setStore(store: object[, actionCreators: any]);

This function essentially makes your redux store available to `redux-pathspace`. The motivation for this API method was to make `store.dispatch` available to the function you pass to `withSideEffect` without having to pass it manually each time you create a side-effect that dispatches other actions before updating the state. This gives you the power to focus on small "slices" of the state in your reducers--keeping them simple and pure--while at the same time updating other parts of the state if you need to (by dispatching actions that handle those other parts, thus letting each reducer do its "job" for each part of the state you're concerned with). This way, you can use something like `mapNamespaces` to create namespaces for each part of your state (no matter how deep) and return simple values in your reducers, without worrying about the larger shape of your state...without limiting your ability to affect other parts of the state in a controlled, predictable way.

Optionally, it takes a second argument--an object containing your action creators. This is added for convenience so your action creators can be passed to your side-effects and used with `store.dispatch` without having to `import` or `require` your action creators everywhere you define your side-effects. This will be undefined if you did not pass a second argument to `setStore`.

- `object` - A redux store returned from `createStore`. Returns the same redux store you pass it.

Example usage:

```js
import { createStore } from 'redux';
import { createReducer, setStore } from 'redux-pathspace';
import actionCreators from './action-creators';

const initialState = { foo: 'bar', baz: [] };

export const store = setStore(createStore(createReducer(initialState), initialState), actionCreators);
```

### createPathspace();

The `redux-pathspace` module automatically calls `createPathspace()` which creates a closure and exports all of the above API methods. If, however, you need to create that closure yourself, you can use this method instead of the exported methods.

This method is typically useful for when you're doing hot module reloading (HMR), which in some cases can call your namespace creators (via `createNamespace` or `mapNamespaces`), which will throw an error. With `createPathspace`, you can ensure you get a fresh closure so your namespace creators re-create your namespaces successfully on HMR.

## Install

With [npm](https://npmjs.org/) installed, run

```sh
$ npm install --save redux-pathspace
```

## Acknowledgements

As noted above, this library uses [Ramda](https://github.com/Ramda/ramda) lenses under the hood. The required Ramda functions are bundled with the distribution instead of requiring users of this lib to download the entire Ramda library as a dependency.

## License

MIT
