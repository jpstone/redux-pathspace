"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prependArray = prependArray;
exports.appendArray = appendArray;
exports.mergeObjectPayloadOverride = mergeObjectPayloadOverride;
exports.mergeObjectStateOverride = mergeObjectStateOverride;
exports.on = on;
exports.off = off;
exports.toggle = toggle;
exports.setUndefined = setUndefined;

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function prependArray(slice, payload) {
  return [payload].concat(_toConsumableArray(slice));
}

function appendArray(slice, payload) {
  return slice.push(payload);
}

function mergeObjectPayloadOverride(slice, payload) {
  return _objectSpread({}, slice, payload);
}

function mergeObjectStateOverride(slice, payload) {
  return _objectSpread({}, payload, slice);
}

function on() {
  return true;
}

function off() {
  return false;
}

function toggle(slice) {
  return !slice;
}

function setUndefined() {
  return undefined;
}