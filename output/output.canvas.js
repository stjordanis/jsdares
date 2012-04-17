/*jshint node:true jquery:true*/
"use strict";

module.exports = function(output) {
	output.Canvas = function() { return this.init.apply(this, arguments); };

	output.Canvas.prototype = {
		init: function($div, editor) {
			this.$div = $div;
			this.$div.addClass('canvas');

			this.$canvas = $('<canvas class="canvas-canvas"></canvas>');
			this.$div.append(this.$canvas);
			this.size = this.$canvas.css('max-width').replace('px', '');
			this.$canvas.attr('width', this.size);
			this.$canvas.attr('height', this.size);
			this.context = this.$canvas[0].getContext('2d');
			this.context.save();

			var $mirror = $('<canvas class="canvas-mirror"></canvas>');
			this.$div.append($mirror);
			$mirror.attr('width', this.size);
			$mirror.attr('height', this.size);
			this.mirrorContext = $mirror[0].getContext('2d');
			this.mirrorContext.save();

			//this.debugToBrowser = true;
			this.highlighting = false;
			this.highlightNextShapes = false;
			this.highlightCallTarget = 0;
			this.editor = editor;
			this.editor.addOutput(this);

			this.clear();
		},

		functions: {
			clearRect: {type: 'method', argsMin: 4, argsMax: 4, example: 'clearRect(100, 100, 100, 100)', draws: true, mirror: true},
			fillRect: {type: 'method', argsMin: 4, argsMax: 4, example: 'fillRect(100, 100, 100, 100)', draws: true, mirror: true},
			strokeRect: {type: 'method', argsMin: 4, argsMax: 4, example: 'strokeRect(100, 100, 100, 100)', draws: true, mirror: true},
			beginPath: {type: 'method', argsMin: 0, argsMax: 0, example: 'beginPath()', draws: false, mirror: true},
			closePath: {type: 'method', argsMin: 0, argsMax: 0, example: 'closePath()', draws: false, mirror: true},
			fill: {type: 'method', argsMin: 0, argsMax: 0, example: 'fill()', draws: true, mirror: true},
			stroke: {type: 'method', argsMin: 0, argsMax: 0, example: 'stroke()', draws: true, mirror: true},
			clip: {type: 'method', argsMin: 0, argsMax: 0, example: 'clip()', draws: false, mirror: true},
			moveTo: {type: 'method', argsMin: 2, argsMax: 2, example: 'moveTo(100, 100)', draws: false, mirror: true},
			lineTo: {type: 'method', argsMin: 2, argsMax: 2, example: 'lineTo(100, 100)', draws: false, mirror: true},
			quadraticCurveTo: {type: 'method', argsMin: 4, argsMax: 4, example: 'quadraticCurveTo(30, 80, 100, 100)', draws: false, mirror: true},
			bezierCurveTo: {type: 'method', argsMin: 6, argsMax: 6, example: 'bezierCurveTo(30, 80, 60, 40, 100, 100)', draws: false, mirror: true},
			arcTo: {type: 'method', argsMin: 5, argsMax: 5, example: 'arcTo(20, 20, 100, 100, 60)', draws: false, mirror: true},
			arc: {type: 'method', argsMin: 5, argsMax: 6, example: 'arc(100, 100, 30, 0, 360)', draws: false, mirror: true},
			rect: {type: 'method', argsMin: 4, argsMax: 4, example: 'rect(100, 100, 100, 100)', draws: false, mirror: true},
			isPointInPath: {type: 'method', argsMin: 2, argsMax: 2, example: 'isPointInPath(150, 150)', draws: false, mirror: true},
			fillStyle: {type: 'attribute', example: 'fillStyle = "#a00"', draws: false, mirror: false},
			strokeStyle: {type: 'attribute', example: 'strokeStyle = "#a00"', draws: false, mirror: false}
		},

		getAugmentedObject: function() {
			var obj = {};
			for (var name in this.functions) {
				var func = this.functions[name];
				if (func.type === 'method') {
					obj[name] = {
						name: name,
						augmented: 'function',
						func: $.proxy(this.handleMethod, this),
						example: func.example
					};
				} else if (func.type === 'attribute') {
					obj[name] = {
						name: name,
						augmented: 'variable',
						get: $.proxy(this.handleAttributeGet, this),
						set: $.proxy(this.handleAttributeSet, this),
						example: func.example
					};
				}
			}
			return obj;
		},

		handleMethod: function(node, name, args) {
			if (this.highlighting) this.highlight(node, name, args);
			return this.context[name].apply(this.context, args);
		},

		handleAttributeGet: function(node, name) {
			return this.context[name];
		},

		handleAttributeSet: function(node, name, value) {
			// for now there are no attributes that can cause a highlight
			this.context[name] = value;
			if (name === 'strokeStyle') {
				this.actualStrokeStyle = this.context.strokeStyle;
			} else {
				this.actualFillStyle = this.context.fillStyle;
			}
		},

		startHighlighting: function() {
			this.highlightNextShapes = true;
			this.actualStrokeStyle = this.context.strokeStyle;
			this.actualFillStyle = this.context.fillStyle;
		},

		stopHighlighting: function() {
			this.highlightNextShapes = false;
			this.context.strokeStyle = this.actualStrokeStyle;
			this.context.fillStyle = this.actualFillStyle;
		},

		enableHighlighting: function() {
			this.highlighting = true;
			this.$div.addClass('canvas-highlighting');
			this.$div.on('mousemove', $.proxy(this.mouseMove, this));
			this.editor.outputRequestsRerun();
		},

		disableHighlighting: function() {
			this.highlighting = false;
			this.highlightCallTarget = 0;
			this.$div.removeClass('canvas-highlighting');
			this.$div.off('mousemove');
			this.editor.outputRequestsRerun();
		},

		startRun: function() {
			this.stopHighlighting();
			this.clear();
		},

		endRun: function() {

		},

		clear: function() {
			this.context.restore();
			this.context.save();
			this.context.clearRect(0, 0, this.size, this.size);
			this.context.beginPath();

			if (this.highlighting) {
				this.mirrorContext.restore();
				this.mirrorContext.save();
				this.mirrorContext.clearRect(0, 0, this.size, this.size);
				this.mirrorContext.beginPath();
				this.highlightCallCounter = 1;
			}
		},

		/// INTERNAL FUNCTIONS ///
		highlight: function(node, name, args) {
			if (this.functions[name].draws) {
				// some spread is needed between the numbers as borders are blurred, and colour information is thus not 100% reliable
				// therefore we use calculation modulo prime, so that eventually all numbers are used, and this also introduces a nice cycle,
				// so that colours can be used again; the assumption is that whenever there are so many elements on the screen, the ones
				// that introduced faulty colours, or the original ones in case of reusing colours, are most likely overwritten already
				this.highlightCallCounter = (this.highlightCallCounter + 464651) % 16777213;
				var color = 'rgba(' + (~~(this.highlightCallCounter/65536)%256) + ',' + (~~(this.highlightCallCounter/256)%256) + ',' + (this.highlightCallCounter%256) + ', 1)';
				this.mirrorContext.strokeStyle = color;
				this.mirrorContext.fillStyle = color;
			}
			if (this.functions[name].mirror) this.mirrorContext[name].apply(this.mirrorContext, args);
			if (this.highlightNextShapes || this.highlightCallCounter === this.highlightCallTarget) {
				this.context.strokeStyle = 'rgba(5, 195, 5, 0.85)';
				this.context.fillStyle = 'rgba(5, 195, 5, 0.85)';
				if (this.highlightCallTarget > 0) this.editor.highlightNode(node);
			}
		},

		mouseMove: function(event) {
			if (this.highlighting) {
				var offset = this.$canvas.offset();
				var x = event.pageX - offset.left, y = event.pageY - offset.top;
				var pixel = this.mirrorContext.getImageData(x, y, 1, 1).data;
				// use the alpha channel as an extra safeguard
				var target = (pixel[3] < 255 ? 0 : (pixel[0]*65536 + pixel[1]*256 + pixel[2]) % 16777213);
				console.log(pixel, target);

				if (this.highlightCallTarget !== target) {
					this.highlightCallTarget = target;
					this.editor.outputRequestsRerun();
				}
			}
		}
	};
};