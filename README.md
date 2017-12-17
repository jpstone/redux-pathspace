# redux-pathspace

> Quickly & easily create path-based namespaces to add actions that map to reducers

([live demo](https://codesandbox.io/s/y069v1oloz))

As simple as creating a new path:

```js
const xPath = addPath('x');
```

...and adding an action/reducer pair to the newly created path container (namespace):

```js
const createFooActionCreator = xPath('FOO', fooReducer);
```

...which returns a `createActionCreator`, with which you can create, well, as many action creators you want, tied to that namespace:

```js
const fooActionCreatorA = createFooActionCreator(funcThatCreatesPayload);
const fooActionCreatorB = createFooActionCreator(); // use default payload handler, which simply passes args passed to action creator
```

...from which you can readily dispatch actions:

```js
dispatch(fooActionCreatorA(x, y));
dispatch(fooActionCreatorB(z));

// action { type: x_FOO, payload: ..., meta: {...} }
// gets dispatched and picked up by the specified reducer
// (or uses the default reducer if no reducer specified, which simply returns the payload)
```

Wala! `redux-pathspace` automatically prefixes your action names with the `path` supplied initially, so your action names never collide with other namespaces.

Under the hood, each `path` you pass to `addPath` creates a new [Ramda](https://github.com/Ramda/ramda) lens which gets used to get/set state data.

## Usage

`redux-pathspace` exports 4 functions: `addPath`, `getView`, `createReducer`, and `getLens`. For more information on `getLens`, see the API documentation below as it's not needed for most use cases.

First, `import` `createReducer`, pass it your initial state, and then pass the resulting function (your "root" reducer) to `redux`'s `createStore`:

```js
import { createStore } from 'redux';
import { createReducer } from 'redux-pathspace';

const initialState = {
  foo: {
    bar: {
      baz: [1, 2, 3]
    }
  },
  zab: 1
};

const rootReducer = createReducer(initialState);

const store = createStore(rootReducer, initialState);

export { store };
```

In a separate file, say `paths.js`, `import` `addPath` to create and export your paths:

```js
import { addPath } from 'redux-reducer';

const fooPath = addPath('foo');

export { fooPath };
```

In a `create-action-creators.js` file, `import` your paths and begin creating your create-action-creators:

```js
import { fooPath } from './paths';

function addFromState(path, payload, fullState) {
  return payload + fullState.zab;
}

const foo = fooPath('ADD_FROM_ZAB', addFromState);

export { foo };
```

Then, in `action-creators.js`, begin creating your action creators:

```js
import { foo } from './create-action-creators';

function makeOneIfZero(payload) {
  if (payload === 0) return 1;
  return payload;
}

const fooActionCreatorA = foo(makeOneIfZero);
const fooActionCreatorB = foo() // use default payload handler
```

Now you can start dispatching actions at will:

```js
import { store } from './store';
import { fooActionCreatorA, fooActionCreatorB } from './action-creators';

// ... some code where user does something ...
store.dispatch(fooActionCreatorA(0)) // turns 0 into 1
store.dispatch(fooActionCreatorB(2)) // uses default payload handler

```

That's all there is to it. Now you're off and running.

As a side note, sub-paths can be created from the paths created by `addPath`:

```js
import { addPath } from 'redux-reducer';

const fooPath = addPath('foo');
const barPath = addPath('bar', fooPath);

export { fooPath, barPath };

```

## API

```js
import { addPath, getView, createReducer, getLens } from 'redux-pathspace';
```

### const path = addPath(path: string|array|number|func[, parentPath: path]);

Creates a new function from which you can add action type/reducer pairs, a meta object (to be attached to the action), or create a sub-path

- `path` - Create a new namespaced path with the given argument. If it's a string, it can be dot notation such as `foo.bar.baz`; if it's an Array it can consist of strings and numbers *without* dot notated strings `['foo', 'bar', 0]`; if it's a number (whether standalone or in an array) then it specifies an array index within your given path.
- `parentPath` - If supplied, this *must* be a valid `path` function returned from a previous `addPath` call, which will act as the parent path (behind the scenes, this accesses the previous Ramda lens and composes those lenses together to create sub-paths)
- returns - (function) - A new `path` container.

### const createActionCreator = path(actionType: string[, reducer: func][, meta: object]);

Creates a new function used to create new action creators.

- `actionType`  - The name of your action that will get prefixed with the parent path to avoid collisions.
- `reducer` - Reducer to be called when `actionType` is dispatched. If not supplied it uses a default reducer with the signature: `defaultReducer = (path, payload) -> payload`. All supplied reducers get passed the value of the path specified when calling `addPath` as the first argument, the `payload` returned from your `actionCreator` as the second argument, and the full state supplied by `redux`. For example: `myReducer(path, payload, fullState) => payload`.
- `meta` - Object to set on the `action.meta` property. Defaults to `{}`.
- returns - (function) - A new `createActionCreator`.

### const actionCreator = createActionCreator([payloadHandler: func]);

Returns a new action creator (function) to be used directly in dispatch calls.

- `payloadHandler` - This function gets passed the arguments supplied to `actionCreator` for further handling before getting set onto `action.payload`. If not supplied, a default `payloadHandler` is used, with the signature: `defaultPayloadHandler = payload -> payload`.
- returns - (function) - A new `actionCreator`.

### const action = actionCreator([...args: any]);

- `args` - Will get passed to the specified `payloadHandler`, or use the default `payloadHandler` if none was provided (see examples above).
- returns - (object) - A flux standard action (FSA).

### const reducer = createReducer(initialState: string|array|number|object);

- `initialState` - Used to store the supplied initial state which is returned whenever the state passed to a reducer is `undefined`.
- returns - (function) - A "root" reducer which should get passed to `redux`'s `createStore`.

### const view = getView(path: path);

Helper function to make `mapStateToProps` and `mapDispatchToProps` a breeze.

- `path` - Must be a valid `path` function returned from an `addPath` call.
- returns - (function) - A function that takes a state object and returns the value for the view's path.

Example:

```js
import { addPath, getView } from 'redux-pathspace';

const fooPath = addPath('foo');
const fooView = getView(fooPath);


// somewhere later in a mapStateToProps

function mapStateToProps(state) {
  return {
    foo: fooView(state)
  }
}
```

### const lens = getLens(path: func);

Convenience function to retrieve the underlying Ramda lens being used by `redux-pathspacer` for the given path should you need it for your own purposes.

- `path` - Must be a valid `path` function returned from an `addPath` call.
- returns - (function) - The underlying Ramda lens.

## Install

With [npm](https://npmjs.org/) installed, run

```sh
$ npm install --save redux-pathspace
```

## Acknowledgements

As noted above, this library uses [Ramda](https://github.com/Ramda/ramda) lenses under the hood. The required Ramda functions are bundled with the distribution instead of requiring users of this lib to download the entire Ramda library as a dependency.

## License

MIT
