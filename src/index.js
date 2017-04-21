/**
 * `resolve-vars` is used to manipulate variables that are stored
 * externally to a given process. Most uses should be simply to resolve
 * multiple variables at once in a `task`, that can then be queried. Example
 * usage with Gulp looks like:
 *
 * ```
 * const Resolver = require('resolve-vars');
 * const resolver = new Resolver();
 *
 * gulp.task('resolve-vars', resolver.task([ 'bar/baz' ]));
 *
 * // We can then resolve variables in dependent tasks.
 * gulp.task('clean', ['resolve-vars'], function() {
 *   let barBaz = resolver.var('bar/baz');
 *   // ...
 * });
 * ```
 */

var consul = require('consul');

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
   * promise that resolves when all variables have been resolved or it rejects
   * when an error occurs if we failed to resolve one of the desired variables
   * (which will only happen if we have a network issue communicating with
   * Consul).
   *
   * @param {String[]} keys An array of variable names to resolve. We cache all
   *   the variables locally as well.
   * @returns {Promise} A promise that resolves once we've resolved all
   *   variables. The resolved value will be an object of key/value pairs.
   */
  task(keys) {
    return () => {
      return Promise.all(keys.map((key) => {
        return this.get(key);
      })).then((vals) => {
        var ret = {};
        for (let i = 0; i < keys.length; i++) {
          ret[keys[i]] = vals[i];
        }
        return ret;
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
    return this._vars[name];
  }

  /**
   * A helper function for retrieving values from Consul and caching them
   * locally. It resolves the variable for the given name, caches it under the
   * given name locally, and uses a Promise to communicate with any callers
   * about the state of the attempted variable resolution.
   *
   * @param {String} name The local name to cache the variable under.
   * @returns {Promise} A Promise to communicate the state of the variable
   *    resolution.
   */
  get(name) {
    return new Promise((resolve, reject) => {
      this._consul.kv.get(name, (err, res) => {
        if (err) reject(err);
        else {
          // Cache the value.
          const val = res && res.Value;
          this._vars[name] = val;
          resolve(val);
        }
      });
    });
  }

  /**
   * Sets the value for the given `name` to `val`.
   *
   * @param {String} name The local name for the variable, may be the remote
   *    name too if both are the same.
   * @param {String} val The value to set for the variable.
   * @returns {Promise} A Promise communicating the state of the attempt to set
   *    the variable's value.
   */
  set(name, val) {
    return new Promise((resolve, reject) => {
      this._consul.kv.set(name, val, (err) => {
        if (err) reject(err);
        else {
          this._vars[name] = val;
          resolve();
        }
      });
    });
  }
}

module.exports = Resolver;