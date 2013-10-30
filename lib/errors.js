/*jshint browser:true*/
/*global module*/

'use strict';

/**
 * Expose `errors`
 */

var errors = module.exports = function errors() {};

var errorMap = {
  INVALID_CALLBACK: ': Callback was not found or invalid',
  INVALID_OPTIONS: ': Options was not found or invalid',
  INVALID_ARGUMENT: ': Invalid argument passed',
  INVALID_ROOM: ': Room was not found or invalid',

  INVALID_ID: ': User was not found or invalid id',
  INVALID_COLORS: ': Colors must be passed as an array',
  INVALID_COLOR: ': A color must be passed as a string',
  INVALID_COLOR_MATCH: ': Passed color overrides do not match previously set'
};

errors.create = function(method, type) {
  if (!method || !type || !errorMap[type]) {
    throw new Error('That error type doesn\'t exist!');
  }

  return new Error(method + '' + errorMap[type]);
};
