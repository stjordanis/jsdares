/*jshint node:true jquery:true*/
"use strict";

module.exports = function(dares) {
	dares.AnimatedConsole = function() { return this.init.apply(this, arguments); };
	dares.AnimatedConsole.prototype = {
		init: function($div) {
			this.$div = $div || null;
			this.fullText = '';
			this.queue = [];
			this.next = 0;
			this.timeout = null;
		},
		remove: function() {
			this.clearTimeout();
		},
		push: function(text) {
			this.fullText += '' + text;
			this.queue.push(this.fullText);
		},
		getFullText: function() {
			return this.fullText;
		},
		run: function(delay) {
			this.clearTimeout();
			if (delay <= 0) {
				this.$div.text(this.fullText);
			} else {
				this.delay = delay;
				this.next = 0;
				this.animateNext();
			}
		},
		/// INTERNAL FUNCTIONS ///
		clearTimeout: function() {
			if (this.timeout !== null) {
				clearTimeout(this.timeout);
				this.timeout = null;
			}
		},
		animateNext: function() {
			this.clearTimeout();
			this.$div.text(this.queue[this.next++]);
			if (this.next < this.queue.length) {
				this.timeout = setTimeout($.proxy(this.animateNext, this), this.delay);
			}
		}
	};

	dares.ConsoleMatchDare = function() { return this.init.apply(this, arguments); };
	dares.ConsoleMatchDare.prototype = dares.addCommonDareMethods({
		init: function(delegate, ui, options) {
			this.delegate = delegate;
			this.ui = ui;
			this.options = options;

			this.fullText = this.options.original(new dares.AnimatedConsole()).getFullText();
			this.previewAnim = null;
			this.animation = null;

			this.editor = this.ui.addEditor(this.options.editor);

			this.$div = this.ui.addTab('dare');
			this.ui.loadOutputs(this.options.outputOptions);
			this.ui.selectTab('dare');

			this.$div.addClass('dare dare-consolematch');
			this.console = this.ui.getOutput('console');
			this.console.makeTargetConsole(this.fullText);

			this.$description = $('<div class="dare-description"></div>');
			this.$div.append(this.$description);
			this.$description.append('<h2>' + this.options.name + '</h2><div class="dare-text">' + this.options.description + '</div>');

			this.$submit = $('<div class="btn btn-success dare-submit">Submit solution</div>');
			this.$submit.on('click', $.proxy(this.submit, this));
			this.$description.append(this.$submit);

			this.$originalConsoleContainer = $('<span class="dare-consolematch-original-container"></span>');
			this.$originalConsoleContainer.on('click', $.proxy(this.animateConsole, this));
			this.$div.append(this.$originalConsoleContainer);

			this.$resultConsole = $('<canvas class="dare-consolematch-result"></canvas>');
			this.$originalConsoleContainer.append(this.$resultConsole);
			this.resultContext = this.$resultConsole[0].getContext('2d');

			this.$originalConsoleContainer.append('<div class="dare-consolematch-original-refresh"><i class="icon-repeat icon-white"></i></div>');
			this.$originalConsole = $('<span class="dare-consolematch-original-console"></span>');
			this.$originalConsoleContainer.append(this.$originalConsole);

			this.originalAnim = new dares.AnimatedConsole(this.$originalConsole);
			this.options.original(this.originalAnim);
			this.initOffsets();

			this.$originalConsole.text(this.fullText);
			this.width = this.$originalConsole.width() + this.charWidth;
			this.height = this.$originalConsole.height();
			this.$originalConsole.width(this.width); // fix width and height
			this.$originalConsole.height(this.height);
			this.$resultConsole.attr('width', this.width);
			this.$resultConsole.attr('height', this.height + this.lineHeight);

			this.$points = $('<div class="dare-points"></div>');
			this.$div.append(this.$points);

			this.matchPoints = new dares.MatchPoints(this.$points, this.options.minPercentage, 'console');
			if (this.options.maxLines !== undefined) {
				this.linePoints = new dares.LinePoints(this.$points, this.options.maxLines, this.options.lineReward);
			}

			this.$score = $('<div class="dare-score"></div>');
			this.$div.append(this.$score);
			this.drawScore();

			if (this.options.user.text !== undefined) {
				this.editor.setText(this.options.user.text);
			}
			this.editor.setTextChangeCallback($.proxy(this.delegate.updateCode, this.delegate));

			this.animateConsole();
		},

		remove: function() {
			this.animationFinish();
			this.$submit.remove();
			this.$originalConsoleContainer.remove();
			this.ui.removeAll();
		},

		animateConsole: function() {
			this.animationFinish();
			this.drawConsole(this.speed);
		},

		drawConsole: function(speed) {
			this.resultContext.clearRect(0, 0, this.width, this.height+this.lineHeight);
			this.originalAnim.run(speed);
		},

		submit: function() {
			if (this.error) return;
			this.animationFinish();

			var userText = this.console.getText();
			this.animationRects = [];
			var matching = 0, x = 0, y = 0, maxX = 0, percentage = 0;

			for (var i=0; i<this.fullText.length; i++) {
				var orig = this.fullText.charAt(i);
				var match = orig === userText.charAt(i);
				if (match) matching++;
				percentage = Math.floor(100*matching/this.fullText.length);

				if (orig === '\n') {
					this.animationRects.push({x1: x, x2: x+1, y: y, match: match, points: percentage});
					x = 0; y++;
				} else {
					var prevX = x, prevY = y;
					if (orig === '\t') {
						// tab width: 8
						x += 8-(x%8);
					} else {
						x++;
					}
					this.animationRects.push({x1: prevX, x2: x, y: y, match: match, points: percentage});
					maxX = Math.max(x, maxX);
				}
			}

			var surplus = userText.length - this.fullText.length;
			maxX += 2; // account for last character and endline marker
			if (surplus > 0) {
				var origMatching = matching;
				var parts = Math.min(surplus, 30);
				for (i=0; i<parts; i++) {
					matching = Math.max(Math.floor(origMatching - (i+1)/parts*surplus), 0);
					percentage = Math.floor(100*matching/this.fullText.length);
					this.animationRects.push({x1: maxX*i/parts, x2: maxX*(i+1)/parts, y: y, match: false, points: percentage});
				}
				matching = origMatching - surplus;
			}

			percentage = Math.floor(100*matching/this.fullText.length);
			var points = percentage;

			this.animation = new dares.SegmentedAnimation();
			this.animation.addSegment(1, 500, $.proxy(this.animationMatchingStartCallback, this));

			this.animationSteps = Math.min(this.animationRects.length, 100);
			this.animation.addSegment(this.animationSteps, Math.max(1500/this.animationSteps, 50), $.proxy(this.animationMatchingCallback, this));
			this.animation.addRemoveSegment(500, $.proxy(this.animationMatchingFinishCallback, this));
			if (this.options.maxLines !== undefined) {
				points += this.addLineAnimation();
			}

			if (percentage >= this.options.minPercentage && this.hasValidNumberOfLines()) {
				this.updateHighScore(points);
			}

			this.animation.addSegment(1, 50, $.proxy(this.animationFinish, this));
			this.animation.run();
		},

		initOffsets: function() {
			// setting up mirror
			var $mirror = $('<span class="dare-consolematch-mirror"></span>');
			this.$originalConsoleContainer.append($mirror);

			$mirror.text('a');
			var textOffset = {x: $mirror.outerWidth(), y: $mirror.outerHeight()};

			// this trick of measuring a long string especially helps Firefox get an accurate character width
			$mirror.text('a' + new Array(100+1).join('a'));
			this.charWidth = ($mirror.outerWidth() - textOffset.x)/100;

			$mirror.text('a\na');
			this.lineHeight = $mirror.outerHeight() - textOffset.y;
			
			// this works assuming there is no padding on the right or bottom
			textOffset.x -= this.charWidth;
			textOffset.y -= this.lineHeight;

			this.$resultConsole.css('left', textOffset.x);
			this.$resultConsole.css('top', textOffset.y);
			$mirror.remove();
		},

		animationMatchingStartCallback: function() {
			this.matchPoints.setValue(0);
			this.drawConsole(0);
		},

		animationMatchingCallback: function(i) {
			var rectangle = null;

			var steps = Math.ceil(this.animationRects.length/this.animationSteps);
			for (var j=0; j<steps && steps*i+j < this.animationRects.length; j++) {
				rectangle = this.animationRects[steps*i+j];
				if (rectangle.match) {
					this.resultContext.fillStyle = '#060';
				} else {
					this.resultContext.fillStyle = '#600';
				}
				this.resultContext.fillRect(rectangle.x1*this.charWidth, rectangle.y*this.lineHeight, (rectangle.x2-rectangle.x1)*this.charWidth, this.lineHeight);
			}
			
			if (rectangle !== null) {
				this.matchPoints.setValue(rectangle.points);
			}
		},

		animationMatchingFinishCallback: function() {
			this.matchPoints.endAnimation();
		}
	});
};