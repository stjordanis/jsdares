/*jshint node:true jquery:true*/
"use strict";

module.exports = function(output) {
	output.Input = function() { return this.init.apply(this, arguments); };
	output.Input.prototype = {
		init: function(editor) {
			this.editor = editor;

			this.$keyDown = $.proxy(this.keyDown, this);
			this.$keyUp = $.proxy(this.keyUp, this);
			$(document).on('keydown', this.$keyDown);
			$(document).on('keyup', this.$keyUp);

			this.events = [];
			this.$mouseElements = {};
			this.mouseHandlers = {};
			this.mouseFuncs = {};
			this.intervalId = null;
			this.start = true;
			this.outputClearAllEvents();
		},

		remove: function() {
			this.clearState();
			$(document).off('keydown', this.$keyDown);
			$(document).off('keyup', this.$keyUp);
		},

		addMouseEvents: function($element, type, obj) {
			this.$mouseElements[type] = $element;

			obj.properties.onmousemove = this.getMouseObject(type, 'mousemove', 'mouseMove');
			obj.properties.onmousedown = this.getMouseObject(type, 'mousedown', 'mouseDown');
			obj.properties.onmouseup = this.getMouseObject(type, 'mouseup', 'mouseUp');
		},

		getMouseObject: function(current, type, funcName, niceFuncName) {
			var fullName = 'on' + funcName;
			return {
				name: fullName,
				info: 'events.' + type + '.' + fullName,
				type: 'variable',
				example: fullName + ' = ' + niceFuncName,
				get: (function(name) { return this.handleMouseGet(type, niceFuncName, fullName); }).bind(this),
				set: (function(context, name, value) { this.handleMouseSet(type, niceFuncName, context, fullName, value); }).bind(this)
			};
		},

		getAugmentedDocumentObject: function() {
			return {
				type: 'object',
				string: '[object document]',
				properties: {
					onkeydown: {
						name: 'onkeydown',
						info: 'events.document.onkeydown',
						type: 'variable',
						example: 'onkeydown = keyDown',
						get: this.handleKeyboardGet.bind(this),
						set: this.handleKeyboardSet.bind(this)
					},
					onkeyup: {
						name: 'onkeyup',
						info: 'events.document.onkeyup',
						type: 'variable',
						example: 'onkeyup = keyUp',
						get: this.handleKeyboardGet.bind(this),
						set: this.handleKeyboardSet.bind(this)
					}
				}
			};
		},

		getAugmentedWindowObject: function() {
			return {
				type: 'object',
				string: '[object window]',
				properties: {
					setInterval: {
						name: 'setInterval',
						info: 'events.window.setInterval',
						type: 'function',
						example: 'setInterval(func, 30)',
						string: '[function window.setInterval]',
						func: this.handleTimeCall.bind(this)
					}
				}
			};
		},

		handleKeyboardGet: function(name) {
			return this[name];
		},

		handleKeyboardSet: function(context, name, value) {
			if (value.type !== 'internalFunction') {
				throw 'You can only set <var>' + name + '</var> to a function declared by you';
			}
			this[name] = value;
			this.editor.makeInteractive();
		},

		handleMouseGet: function(type, niceFuncName, name) { // TODO
			if (this.mouseFuncs[type] === undefined) return undefined;
			return this.mouseFuncs[type][niceFuncName];
		},

		handleMouseSet: function(type, niceName, context, name, value) { // TODO
			if (value.type !== 'internalFunction') {
				throw 'You can only set <var>' + type + '</var> to a function declared by you';
			}
			if (this.mouseFuncs[type] === undefined) {
				this.mouseFuncs[type] = {};
			}
			this.mouseFuncs[type][niceName] = value;
			this.attachMouseHandler(type, niceName);
			this.editor.makeInteractive();
		},

		handleTimeCall: function(context, name, args) {
			if (args.length !== 2) {
				throw '<var>setInterval</var> takes exactly <var>2</var> arguments';
			} else if (args[0].type !== 'internalFunction') {
				throw 'First argument to <var>setInterval</var> must be the name of a function declared by you';
			} else if (typeof args[1] !== 'number' || args[1] < 25) {
				throw 'Second argument to <var>setInterval</var> must be a number specifying the time in milliseconds, and cannot be smaller than 25';
			}

			this.clearInterval();
			this.interval = args[0];
			this.intervalId = setInterval($.proxy(this.doInterval, this), args[1]);
			this.editor.makeInteractive();
		},

		keyDown: function(event) {
			// 17 == CTRL, 18 == ALT, (17, 91, 93, 224) == COMMAND, 27 == ESC
			// block these as they are only keyboard shortcuts
			if ([17, 18, 91, 93, 224, 27].indexOf(event.keyCode) >= 0) {
				return;
			}
			if (this.onkeydown !== null) {
				this.editor.addEvent('keyboard', this.onkeydown.name, [{
					type: 'object',
					string: '[object event]',
					properties: {keyCode: event.keyCode}
				}]);
			}
		},

		keyUp: function(event) {
			// 17 == CTRL, 18 == ALT, (17, 91, 93, 224) == COMMAND, 27 == ESC
			// block these as they are only keyboard shortcuts
			if ([17, 18, 91, 93, 224, 27].indexOf(event.keyCode) >= 0) {
				return;
			}
			if (this.onkeyup !== null) {
				this.editor.addEvent('keyboard', this.onkeyup.name, [{
					type: 'object',
					string: '[object event]',
					properties: {keyCode: event.keyCode}
				}]);
			}
		},

		doInterval: function() {
			this.editor.addEvent('interval', this.interval.name, []);
		},

		clearInterval: function() {
			if (this.intervalId !== null) {
				clearInterval(this.intervalId);
			}
		},

		mouseMove: function(num, event) {
			var onmousemove = this.onmousemove[num];
			if (this.onmousemove[num].timer !== null) {
				onmousemove.lastEvent = event;
			} else {
				this.fireMouseEvent(this.onmousemove[num], event);
				onmousemove.lastEvent = null;
				onmousemove.timer = setTimeout($.proxy(function() {
					onmousemove.timer = null;
					if (onmousemove.lastEvent !== null) {
						this.mouseMove(num, onmousemove.lastEvent);
					}
				}, this), 24);
			}
		},

		mouseDown: function(type, event) {
			this.fireMouseEvent(type, 'mouseDown', event);
		},

		mouseUp: function(type, event) {
			this.fireMouseEvent(type, 'mouseUp', event);
		},

		fireMouseEvent: function(type, name, event) {
			var offset = this.$mouseElements[type].offset();
			var func = this.mouseFuncs[type][name];
			this.editor.addEvent('mouse', func.name, [{
				type: 'object',
				string: '[object event]',
				properties: {
					layerX: Math.round(event.pageX-offset.left),
					layerY: Math.round(event.pageY-offset.top),
					pageX: event.pageX,
					pageY: event.pageY
				}
			}]);
		},

		clearMouse: function() {
			for (var i=0; i<this.onmousemove.length; i++) {
				this.onmousemove[i].$element.off('mousemove', this.onmousemove[i].handle);
				if (this.onmousemove[i].timer !== null) clearTimeout(this.onmousemove[i].timer);
				this.onmousemove[i].func = this.onmousemove[i].handle = this.onmousemove[i].timer = null;
				this.onmousedown[i].$element.off('mousedown', this.onmousedown[i].handle);
				this.onmousedown[i].func = this.onmousedown[i].handle = null;
				this.onmouseup[i].$element.off('mouseup', this.onmouseup[i].handle);
				this.onmouseup[i].func = this.onmouseup[i].handle = null;
			}
		},

		outputStartEvent: function() {
			this.currentEvent = {
				state: this.getState()
			};
			this.events.push(this.currentEvent);
		},
		
		outputClearAllEvents: function() {
			this.clearState();
			this.events = [];
		},

		outputPopFirstEvent: function() {
			this.events.shift();
		},

		outputClearEventsFrom: function(eventNum) {
			this.currentEvent = this.events[eventNum];
			this.setState(this.currentEvent.state);
			this.events.slice(0, eventNum);
		},

		outputClearEventsToEnd: function() {
			this.setState(this.currentEvent.state);
			this.events = [];
		},

		/// INTERNAL FUNCTIONS ///
		getState: function() {
			var mouseFuncs = {};
			for (var type in this.mouseFuncs) {
				mouseFuncs[type] = {};
				for (var name in this.mouseFuncs[type]) {
					mouseFuncs[type][name] = this.mouseFuncs[type][name];
				}
			}
			return {
				mouseFuncs: mouseFuncs,
				onkeydown: this.onkeydown,
				onkeyup: this.onkeyup,
				intervals: this.intervals.slice(0)
			};
		},

		setState: function(state) {
			this.clearState();
			this.onkeydown = state.onkeydown;
			this.onkeyup = state.onkeyup;
			this.intervals = state.intervals.slice(0);

			this.mouseFuncs = {};
			for (var type in state.mouseFuncs) {
				this.mouseFuncs[type] = {};
				for (var name in state.mouseFuncs[type]) {
					this.mouseFuncs[type][name] = state.mouseFuncs[type][name];
					this.attachMouseHandler(type, name);
				}
			}
		},

		clearState: function() {
			for (var type in this.mouseHandlers) {
				var mouseHandler = this.mouseHandlers[type];
				for (var name in mouseHandler) {
					this.$mouseElements[type].off(type.toLowerCase(), mouseHandler[name]);
				}
			}
			this.mouseHandlers = {};
		},

		attachMouseHandler: function(type, name) {
			if (this.mouseHandlers[type] === undefined) {
				this.mouseHandlers[type] = {};
			}
			if (this.mouseHandlers[type][name] === undefined) {
				this.mouseHandlers[type][name] = (function(event) { this[type](name, event); }).bind(this);
				this.$mouseElements[type].on(name.toLowerCase(), this.mouseHandlers[type][name]);
			}
		}
	};
};
