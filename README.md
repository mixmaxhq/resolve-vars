# resolve-vars
Retrieving variables stored in a remote system can be painful, so `resolve-vars`
makes it simple to get and set values stored in Consul.

## Installation
```
 $ yarn add resolve-vars
```

or if using `npm`:
```
 $ npm install resolve-vars --save
```

## Usage

### Initialization

Creating an instance of a variable resolver is simple:

```js
const Resolver = require('resolve-vars');
const resolver = new Resolver();
```

### Retrieving a single value
Retrieving a value is an asynchronous action, as such, `get` returns a promise
that resolves to the retrieved value if one existed.
```js
resolver.get('foo/bar/baz')
  .then((val) => {
    console.log(`value is: ${val}`);
  });
```

### Resolving multiple values at once
In some situations, you'll want to resolve variables in bulk, which is why
`task` exists. `task` returns a promise that resolves to the variables'
values (if found).
```js
resolver.task([ 'foo/bar/baz', 'bizz/buzz' ])()
  .then((vals) => {
    console.log(vals);
  });
```

This is especially useful in situations where you want to resolve a set of
variables on startup, such as in Gulp.

```js
gulp.task('resolve-vars', resolver.task([ 'foo/bar/baz', 'bizz/buzz' ]));
```

### Setting the value for a variable
Setting a value is as simple as retrieving one with get. Set also returns a
promise that resolves once the value is succcessfuly set, otherwise it rejects.
```js
resolver.set('bizz/buzz', 'super')
  .then(() => {
    console.log('successfully set value')
  }).catch((err) => {
    console.log('failed to set value: ' + err);
  });
```


## Release History
 * 1.0.0 Initial release.
