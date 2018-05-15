/* eslint global-require: 0 */

const tape = require('tape');
const { createPathspace } = require('../dist/redux-pathspace');
const { isFunction } = require('./utils');

tape('exports test', (t) => {
  t.equal(...isFunction(createPathspace), '`createPathspace` successfully exports');
  t.end();
});
