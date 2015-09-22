// Merge Game Prototype and export

'use strict';

var Game = require('./constructor.js');
var addCardFunc = require('./cardFunc.js');
var addPlayerFunc = require('./playerFunc.js');
var addCalCardFunc = require('./calCardFunc.js');
var addSplitFunc = require('./splitFunc.js');

addCardFunc(Game);
addPlayerFunc(Game);
addCalCardFunc(Game);
addSplitFunc(Game);

module.exports = Game;