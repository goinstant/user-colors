/*jshint browser:true, node:false*/
/*global module, require*/

'use strict';

/**
 * @fileoverview
 * @module goinstant/components/user-colors
 * @exports userColorsComponent
 */

/**
 * Module Dependencies
 */
var goinstant = window.goinstant;
var async = require('async');
var _ = require('lodash');

var colors = require('colors-common');
var errors = require('./lib/errors');

/**
 * Constants
 */
var KEY_NAMESPACE = 'goinstant/widgets/color';

/**
 * Validation
 */
var VALID_OPTIONS = ['room', 'colors'];
var DEFAULT_OPTIONS = {
  colors: colors.DEFAULTS
};

module.exports = UserColors;

/**
 * @constructor
 */
function UserColors(opts) {
  if (!opts || !_.isPlainObject(opts)) {
    throw errors.create('UserColors', 'INVALID_OPTIONS');
  }

  var optionsPassed = _.keys(opts);
  var optionsDifference = _.difference(optionsPassed, VALID_OPTIONS);

  if (optionsDifference.length) {
    throw errors.create('UserColors', 'INVALID_ARGUMENT');
  }
  if (!opts.room || !_.isObject(opts.room)) {
    throw errors.create('UserColors', 'INVALID_ROOM');
  }
  if (opts.colors && !_.isArray(opts.colors)) {
    throw errors.create('UserColors', 'INVALID_COLORS');

  } else if (opts.colors) {
    _.each(opts.colors, function(color) {
      if (!_.isString(color)) {
        throw errors.create('UserColors', 'INVALID_COLOR');
      }
    });
  }

  opts = _.defaults(opts, DEFAULT_OPTIONS);

  this.room = opts.room;
  this.colors = opts.colors;

  _.bindAll(this, '_choose', '_getUser', '_getLockedColors', '_setColor',
                  '_acquireColor');
}

/**
 * Globally exposed constants
 */
UserColors.USER_PROPERTY = colors.USER_PROPERTY;
UserColors.KEY_NAMESPACE = KEY_NAMESPACE;
UserColors.DEFAULT_COLORS = colors.DEFAULTS;
UserColors.DEFAULT_COLOR = colors.DEFAULT;

/**
 * Choose a color from among the supplied list or the default colors. This
 * routine is idempotent unless it returns the default color, in which case
 * it may choose a different color if one has become available in the meantime.
 * This routine is NOT reentrant, and will have undefined behaviour if called
 * multiple times concurrently.
 * @param {function(err, color)} cb The function to call with the chosen color,
 *        or an error if a platform error occurs.
 */
UserColors.prototype.choose = function(cb) {
  if (!_.isFunction(cb)) {
    throw errors.create('choose', 'INVALID_CALLBACK');
  }

  var tasks = {
    user: this._getUser,
    locked: this._getLockedColors
  };

  async.parallel(tasks, _.partialRight(this._choose, cb));
};

/**
 * Internal implementation of the choose function. Checks to see if a color
 * is already available and, if not, starts the color acquisition algorithm.
 * @param {Error} err The error that occurred fetching the user or locked color
 *        set, if any.
 * @param {object} results The results of the platform requests to fetch the
 *        user and locked color set.
 * @param {function(err, color)} cb The function to call with the chosen color
 *        or if an error occurs.
 * @private
 */
UserColors.prototype._choose = function(err, results, cb) {
  if (err) {
    return cb(err);
  }

  this.user = results.user[0]; // First argument is the user.
  this.userKey = results.user[1]; // Second argument is the user key.
  this.locked = results.locked[0]; // First argument is the value.

  var self = this;

  // The color that is currently locked in to the user, or undefined if no
  // color is locked.
  var lockedToUser = _.findKey(this.locked, function(id) {
    return id === self.user.id;
  });

  // The locks don't have the hashmark because it's invalid in platform.
  if (lockedToUser) {
    lockedToUser = '#' + lockedToUser;
  }

  var userColor = this.user[colors.USER_PROPERTY];
  if (userColor && lockedToUser === userColor &&
      _.contains(this.colors, userColor)) {
    // Valid color is already assigned to the user and locked to prevent other
    // users from choosing it. Nothing else to do.
    return cb(null, userColor);
  }

  if (lockedToUser && _.contains(this.colors, lockedToUser)) {
    // Valid color is assigned, but doesn't exist in the user object. Save it
    // in the user and we're done.
    return this._setColor(lockedToUser, cb);
  }

  var tasks = [];

  if (lockedToUser) {
    // User currently has a color locked, but it is not a valid color. Release
    // the lock because we're going to be selecting a different color instead.
    var lockKey = this._keyFor(lockedToUser);
    tasks.push(function(next) {
      // Drop any other values returned from remove so they're not passed to
      // acquireColor.
      lockKey.remove(function(err) { next(err); });
    });
  }

  tasks.push(this._acquireColor);
  tasks.push(this._setColor);

  async.waterfall(tasks, cb);
};

/**
 * Returns the updated set of locked colors.
 * @param {function(err, value, context)} cb The callback to call with the
 *        results. Takes an error object, the set of locked colors, and a
 *        context object.
 * @private
 */
UserColors.prototype._getLockedColors = function(cb) {
  this.room.key(KEY_NAMESPACE).get(cb);
};

/**
 * Returns the up-to-date user object for the local user.
 *
 */
UserColors.prototype._getUser = function(cb) {
  this.room.user(cb);
};

/**
 * Saves the color in the user object. This is the last step of acquiring a
 * color and is what triggers other components to update their UI.
 * @private
 */
UserColors.prototype._setColor = function(color, cb) {
  var key = this.userKey.key(colors.USER_PROPERTY);
  key.set(color, function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, color);
  });
};

/**
 *
 */
UserColors.prototype._acquireColor = function(cb) {
  // The locks don't have a hashmark, so add that now.
  var lockedColors = _.keys(this.locked);
  lockedColors = _.map(lockedColors, function(color) { return '#' + color; });

  var availableColors = _.difference(this.colors, lockedColors);

  if (availableColors.length <= 0) {
    // There are no colors available at all. Assign the default color.
    return cb(null, colors.DEFAULT);
  }

  var acquiredColor = null;
  var self = this;

  // Loop conditional. Returns true if we've acquire a color or we've exhausted
  // all the available colors.
  function acquiredOrExhausted() {
    return !!acquiredColor || availableColors.length <= 0;
  }

  // Loop iterator. Attempts to acquire the next available color.
  function tryNextColor(next) {
    var color = availableColors.shift();
    var key = self._keyFor(color);

    // Do not overwrite the lock if another user just acquired it. If we do
    // acquire the lock, remove it when the user leaves the room.
    var options = { overwrite: false, cascade: self.userKey };

    key.set(self.user.id, options, function(err) {
      if (err instanceof goinstant.errors.CollisionError) {
        // Someone else just claimed that color. Move to the next iteration to
        // try a different color.
        return next();
      } else if (err) {
        return next(err);
      }

      // We've locked the color for the local user.
      acquiredColor = color;
      next();
    });
  }

  function done(err) {
    if (err) {
      return cb(err);
    }

    if (acquiredColor) {
      // Got a color, we're all done.
      return cb(null, acquiredColor);
    }

    // Did not get a color. This should only happen in race conditions using a
    // custom color list with less than the maximum room size number of colors,
    // or in a very unlikely race condition with the default color set involving
    // multiple users joining and leaving the room simultaneously. Refetch the
    // list of locks and run the algorithm again; this will most likely assign
    // the default color, but may succeed in the second case described above.
    self._getLockedColors(function(err, locks) {
      if (err) {
        return cb(err);
      }
      self.locked = locks;
      self._acquireColor(cb);
    });
  }

  async.until(acquiredOrExhausted, tryNextColor, done);
};

/**
 *
 */
UserColors.prototype._keyFor = function(color) {
  // Drop the hashmark when making a key.
  return this.room.key(KEY_NAMESPACE).key(color.substr(1));
};
