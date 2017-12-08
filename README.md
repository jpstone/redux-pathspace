# redux-pathspace

> Quickly & easily create path-based namespaces to add actions that map to reducers

As simple as creating a new path:

```js
const xPath = addPath('x');
```

...and adding an action/reducer pair to the newly created path container (namespace):

```js
const createFooActionCreator = xPath({ actionType: 'FOO', reducer: fooReducer });
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

`redux-pathspace` exports 2 functions: `addPath` & `createReducer`.

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

const foo = fooPath({ actionType: 'ADD_FROM_ZAB', reducer: addFromState });

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
const barPath = fooPath({ subPath: 'bar' });

export { fooPath, barPath };

```

## API

```js
import { addPath, createReducer } from 'redux-pathspace';
```

### const path = addPath(path);

Creates a new function for adding new directories to an icebox. Both parameters
are optional, and default to sane values.

Creates a new function from which you can add action type/reducer pairs, a meta object (to be attached to the action), or create a sub-path

- `path` (string|array|number) - Required. Create a new namespaced path with the given argument. If it's a string, it can be dot notation such as `foo.bar.baz`; if it's an Array it can consist of strings and numbers *without* dot notated strings `['foo', 'bar', 0]`; if it's a number (whether standalone or in an array) then it specifies an array index within your given path.

### const createActionCreator = path({ [actionType], [reducer], [meta], [subPath] });

Creates a new function used to create new action creators.

- `actionType` (string) - Required if not setting a sub-path.
- `reducer` (function) - Optional. Reducer to be called when `actionType` is dispatched. If not supplied it uses a default reducer with the signature: `defaultReducer = (path, payload) -> payload`. All supplied reducers get passed the path specified when calling `addPath` as the first argument, the `payload` returned from your `actionCreator` as the second argument, and the full state supplied by `redux`. For example: `myReducer(path, payload, fullState) => payload`.
- `meta` (object) - Optional. Object to set on the `action.meta` property. Defaults to `{}`.
- `subPath` (string|array|number) - Optional. If provided, all other arguments are ignored and a new `path` is returned.

### const actionCreator = createActionCreator([payloadHandler]);

Creates a new action creator to be used directly in dispatch calls.

- `payloadHandler` (function) - Optional. This function gets passed the arguments supplied to `actionCreator` for further handling before getting set onto `action.payload`. If not supplied, a default `payloadHandler` is used, with the signature: `defaultPayloadHandler = payload -> payload`. A flux standard action is returned.

### const reducer = createReducer(initialState);

- `initialState` (string|array|number|object) - Required. Used to store the supplied initial state which is returned whenever the state passed to a reducer is `undefined`. A "root" reducer is returned which should get passed to `redux`'s `createStore`.

## Install

With [npm](https://npmjs.org/) installed, run

```sh
$ npm install redux-pathspace
```

## License

MIT
