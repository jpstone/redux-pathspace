# redux-pathspace

> Quickly & easily create path-based namespaces to add actions that map to reducers

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

console.log(store.getState()); // result -> { foo: 'bar', baz: [] }

// no side effects:
const fooPath = createNamespace('foo');

const fooHelloActionCreator = fooPath.mapActionToReducer('HELLO', () => 'hello');
const fooAnyActionCreator = fooPath.mapActionToReducer('ANY');
const fooHelloAgainActionCreator = fooPath.mapActionToReducer('HELLO'); // -> ERROR: action type already exists for `foo` namespace

console.log(fooHelloActionCreator()); // -> { type: 'foo:HELLO', payload: undefined, meta: {} }
store.dispatch(fooHelloActionCreator('xyz'));
fooPath.examine(store.getState()); // -> 'hello'
store.getState(); // -> { foo: 'hello', baz: [] }

console.log(fooAnyActionCreator('xyz')); // -> { type: 'foo:ANY', payload: 'xyz', meta: {} }
store.dispatch(fooAnyActionCreator('xyz'));
fooPath.examine(store.getState()); // -> 'xyz';
store.getState(); // -> { foo: 'xyz', baz: [] }

// with side effects:
const bazPath = createNamespace('baz');

function getBazItems() {
  return api.getBazItems.then(items => items);
}

const getBazItemsActionCreator = bazPath.mapActionToReducer('GET_ITEMS').withSideEffect(getBazItems);
store.dispatch(getBazItemsActionCreator());

// when promise is finished
bazPath.examine(store.getState()); // ['Item 1', 'Item 2', 'Item 3' ]

```

## API

```js
import { createNamespace, createReducer } from 'redux-pathspace';
```

### const namespace = createNamespace(path: string|array|number|func[, parentPath: path]);

Creates a new function from which you can add action type/reducer pairs, a meta object (to be attached to the action), or create a sub-path

- `path` - Create a new namespaced path with the given argument. If it's a string, it can be dot notation such as `foo.bar.baz`; if it's an Array it can consist of strings and numbers *without* dot notated strings `['foo', 'bar', 0]`; if it's a number (whether standalone or in an array) then it specifies an array index within your given path.
- `parentPath` - If supplied, this *must* be a valid `path` function returned from a previous `addPath` call, which will act as the parent path (behind the scenes, this accesses the previous Ramda lens and composes those lenses together to create sub-paths)
- returns - (object) - A new namespace.

### namespace

#### namespace.mapActionToReducer(actionType: string[, reducer: func, meta: object]);

- `actionType`  - The name of your action that will get prefixed with the parent path to avoid collisions.
- `reducer` - Reducer to be called when `actionType` is dispatched. If not supplied it uses a default reducer with the signature: `defaultReducer = (path, payload) -> payload`. All supplied reducers get passed the value of the path specified when calling `addPath` as the first argument, the `payload` returned from your `actionCreator` as the second argument, and the full state supplied by `redux`. For example: `myReducer(path, payload, fullState) => payload`.
- `meta` - Object to set on the `action.meta` property. Defaults to `{}`.
- returns - (function) - A new `actionCreator`.

#### namespace.examine(item: object|array);

Function that peers into the specified depth of an object based on the specified namespace and returns its value.

- `item` - Object/array to inspect. If there's no matching path, it will return undefined. Otherwise, it will return the value for the specified path.

#### namespace.lens;

Retrieves the underlying Ramda lens being used by `redux-pathspacer` for the given path should you need it for your own purposes.

### const actionCreator = namespace.mapActionToReducer('FOO');

Returns a new action creator (function) to be used directly in dispatch calls. Any arguments provided will be attached to the `payload` property of the action.

Calling this function returns a flux standard action.

#### actionCreator.withSideEffect(sideEffect: func);

Adds a side effect to the `actionCreator` upon which `withSideEffect` is called. 
- `sideEffect` - `This function gets passed the arguments supplied to actionCreator to execute any side effects before getting set onto action.payload. If not supplied, whatever is passed to `actionCreator` will be simply be set on the `payload` property of the `action`.

### const reducer = createReducer(initialState: string|array|number|object);

- `initialState` - Used to store the supplied initial state which is returned whenever the state passed to a reducer is `undefined`.
- returns - (function) - A "root" reducer which should get passed to `redux`'s `createStore`.

## Install

With [npm](https://npmjs.org/) installed, run

```sh
$ npm install --save redux-pathspace
```

## Acknowledgements

As noted above, this library uses [Ramda](https://github.com/Ramda/ramda) lenses under the hood. The required Ramda functions are bundled with the distribution instead of requiring users of this lib to download the entire Ramda library as a dependency.

## License

MIT
