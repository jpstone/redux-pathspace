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

```

## API

```js
import { createNamespace, createReducer, mapNamespacesToObject } from 'redux-pathspace';
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

#### namespace.examine(item: object|array);

Function that peers into the specified depth of an object based on the path of the namespace and returns its value.

- `item` - Object/array to inspect. If there's no matching path, it will return `undefined`. Otherwise, it will return the value of the specified path.

#### namespace.lens;

Retrieves the underlying Ramda lens being used by `redux-pathspace` for the given path should you need it for your own purposes.

### const actionCreator = namespace.mapActionToReducer('FOO');

A new action creator that, when called, returns a flux standard action (FSA) that looks like: `{ type, payload, meta }`. Prior to returning the FSA object, the action creator will check for any side-effects, and pass all arguments supplied to `actionCreator` to the side-effect function you specify when calling `actionCreator.withSideEffect(func)`. The return value of the side-effect function call will get set on the `payload` of the FSA. More on the side-effect API below.

#### actionCreator.withSideEffect(sideEffect: func);

Adds a side effect to the `actionCreator`. 
- `sideEffect` - This function gets passed the arguments supplied to `actionCreator(...args)` to execute any side effects before getting set onto action.payload. If not supplied, whatever is passed to `actionCreator` will be simply be set on the `payload` property of the FSA.

### const reducer = createReducer(initialState: string|array|number|object);

- `initialState` - Used to store the supplied initial state which is returned whenever the state passed to a reducer is `undefined`.
- returns - (function) - A "root" reducer which should get passed to redux's `createStore`.


### mapNamespacesToObject(obj: object);

Creates and returns an object (typically your initial state) of the same shape as the one it's passed, with each key in the object being a `namespace`. `mapNamespacesToObject` will recursively walk down your object to create a `namespace` for each key. Keep in mind--if you have any keys in your object that conflict with the keys on the `namespace`, they will be overwritten--so don't use this function if you have any of the following keys within your object: `examine`, `mapActionToReducer`, or `lens`.

If any of the values in the `obj` passed to `mapNamespacesToObject` are arrays, a `namespace` will be created for that key as well, however you will manually need to add new namespaces if you want to target specific indexes of that array. For example:

```js
import { createNamespace, mapNamespacesToObject } from 'redux-pathspace';

const initialState = { myArr: ['foo', 'bar'] };
const namespaces = mapNamespacesToObject(initialState);
namespaces['myArr[1]'] = createNamespace(1, namespaces.myArr);

namespaces['myArr[1]'].examine(initialState); // -> 'bar'
```

- `obj` - A plain object to recursively create a new object that has a namespace for each key in `obj`.

## Install

With [npm](https://npmjs.org/) installed, run

```sh
$ npm install --save redux-pathspace
```

## Acknowledgements

As noted above, this library uses [Ramda](https://github.com/Ramda/ramda) lenses under the hood. The required Ramda functions are bundled with the distribution instead of requiring users of this lib to download the entire Ramda library as a dependency.

## License

MIT
