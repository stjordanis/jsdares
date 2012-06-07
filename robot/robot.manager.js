/*jshint node:true jquery:true*/
"use strict";

module.exports = function(output) {
	output.RobotAnimationManager = function() { return this.init.apply(this, arguments); };
	output.RobotAnimationManager.prototype = {
		init: function($robot, $maze, blockSize) {
			this.$robot = $robot;
			this.$robot.hide();
			this.$maze = $maze;
			this.blockSize = blockSize;
			this.runningAnimation = null;
			this.insertingAnimation = null;
			this.start = -1;
			this.end = -1;
		},

		newAnimation: function() {
			this.insertingAnimation = new output.RobotAnimation(this.$robot, this.$maze, this.blockSize);
			return this.insertingAnimation;
		},
		
		playAll: function() {
			if (this.useNewAnimation() || this.start !== 0 || this.end !== Infinity) {
				this.start = 0;
				this.end = Infinity;
				this.runningAnimation.play(0, Infinity);
			} else if (!this.runningAnimation.playing) {
				this.runningAnimation.play(this.runningAnimation.number+1, Infinity);
			}
		},

		play: function(start, end) {
			if (this.useNewAnimation() || this.start !== start || this.end !== end) {
				this.start = start;
				this.end = end;
				this.runningAnimation.play(this.start, this.end);
			}
		},

		remove: function() {
			if (this.runningAnimation !== null) {
				this.runningAnimation.remove();
				this.runningAnimation = null;
			}
			if (this.insertingAnimation !== null) {
				this.insertingAnimation.remove();
				this.insertingAnimation = null;
			}
		},

		/// INTERNAL FUNCTIONS ///
		useNewAnimation: function() {
			if (this.insertingAnimation !== null) {
				if (this.runningAnimation === null) {
					this.runningAnimation = this.insertingAnimation;
					this.insertingAnimation = null;
					return true;
				} else if (this.insertingAnimation.animationString !== this.runningAnimation.animationString) {
					this.runningAnimation.remove();
					this.runningAnimation = this.insertingAnimation;
					this.insertingAnimation = null;
					return true;
				}
			}
			return false;
		}
	};
};