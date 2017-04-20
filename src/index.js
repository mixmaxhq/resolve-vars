/**
 * `@mixmaxhq/resolve-vars` is used to manipulate variables that are stored
 * externally to a given process. Most uses should be simply to resolve
 * multiple variables at once in a `task`, that can then be queried. Example
 * usage would look like:
 *
 * ```
 * const Resolver = require('@mixmaxhq/resolve-vars');
 * const resolver = new Resolver();
 *
 * resolver.task({
 *   foo: 'services/app/foo',
 *   bar: 'queue/reminders/concurrency'
 * })((err) => {
 *   if (err) {
 *     console.log('Failed to resolve variables: ' + err);
 *     return;
 *   }
 *
 *   console.log(resolver.var('foo'));
 *   console.log(resolver.var('bar'));
 * })
 * ```
 */

var consul = require('consul');
var Promise = require('bluebird');

/**
 * A Resolver is used to resolver (and update) key/value pairs in a remote
 * system (which for now is consul).
 */
class Resolver {
  /**
   * Creates a new resolver and initializes the Consul handler reference.
   */
  constructor() {
    this._consul = consul();
    this._vars = {};
  }

  /**
   * Creates a task to fetch multiple variables from Consul. It returns a
   * function that accepts a callback to be fired when all variables have been
   * resolved, or that will pass back an error if we failed to resolve one of
   * them (which will only happen if we have a network issue communicating with
   * Consul).
   *
   * @param {Object} vars An object of local name/remote name pairs. We retrieve
   *    variables from Consul via the remote name (the value), but cache it
   *    locally under the local name (the key).
   * @returns {Function<Function<Error>>} A function that accepts a node style
   *    callback to be called once all variables have been resolved, or we've
   *    failed to try to resolve all variables.
   */
  task(vars) {
    const keys = Object.keys(vars);
    keys.forEach((key) => {
      this._vars[key] = {
        path: vars[key]
      };
    });
    return (cb) => {
      Promise.all(keys.map((key) => {
        return this._get(key, vars[key]);
      })).then(() => {
        cb();
      }).catch((err) => {
        cb(err);
      });
    };
  }

  /**
   * `var` resolves the provided value from the current variable cache.
   *
   * @param {String} name The name of the local variable to resolve.
   * @returns {String|Undefined} The value of the variable, or undefined if
   *    it didn't exist or isn't cached locally.
   */
  var(name) {
    const vr = this._vars[name];
    return vr && vr.value;
  }

  /**
   * A helper function for retrieving values from Consul and caching them
   * locally. It resolves the variable for the given path, caches it under the
   * given name locally, and uses a Promise to communicate with any callers
   * about the state of the attempted variable resolution.
   *
   * @param {String} name The local name to cache the variable under.
   * @param {String} path The variable key in Consul.
   * @returns {Promise} A Promise to communicate the state of the variable
   *    resolution.
   */
  _get(name, path) {
    return new Promise((resolve, reject) => {
      this._consul.kv.get(path, (err, res) => {        
        if (err) reject(err);
        else {
          // Cache the value.
          const val = res && res.Value;
          this._vars[name].value = val;
          resolve(val);
        }
      });
    });
  }

  /**
   * Sets the value for the given `path` to `val`. Optionally, if the
   * name and path are meant to be the same, only two arguments can be passed,
   * in which case the last parameter passed will be considered the value to
   * set, while the name and path will both be the first parameter.
   *
   * @param {String} name The local name for the variable, may be the remote
   *    name too if both are the same.
   * @param {String} path The remote name for the variable.
   * @param {String} val The value to set for the variable.
   * @returns {Promise} A Promise communicating the state of the attempt to set
   *    the variable's value.
   */
  set(name, path, val) {
    if (val === undefined) {
      val = path;
      path = name;
    }

    return new Promise((resolve, reject) => {
      this._consul.kv.set(path, val, (err) => {
        if (err) reject(err);
        else {
          this._vars[name] = {
            path,
            value: val
          };
          resolve();
        }
      });
    });
  }
}

module.exports = Resolver;