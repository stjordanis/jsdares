/*jshint node:true jquery:true*/
"use strict";

module.exports = function(output) {
	output.Console.prototype.getCommands = function() {
		return [
			{
				name: 'console.log(text)',
				id: 'console.log',
				outputs: ['console'],
				makeContent: function($content) {
					$content.html('<p>Use <var>console.log</var> to write a string or number to the console, for example to write <em>Hello World!</em> to the console, you can type <var>console.log("Hello World!");</var></p> <p>More examples:<dfn><samp>Hello World!\n42\nSquare of 5 is 25\n[object]</samp><code>console.log("Hello World!");\nconsole.log(7*6);\nconsole.log("Square of 5 is " + (5*5));\nconsole.log(console);</code></dfn></p>');
				}
			},
			{
				name: 'console.clear()',
				id: 'console.clear',
				outputs: ['console'],
				makeContent: function($content) {
					$content.html('<p>This command is used to clear the contents of the console. Everything that has been logged before <var>console.clear();</var> will just be thrown away.</p> <p>Example:<dfn><samp>3</br>4</samp><code>console.log(1);\nconsole.log(2);\nconsole.clear();\nconsole.log(3);\nconsole.log(4);</code></dfn></p>');
				}
			},
			{
				name: 'console.setColor(color)',
				id: 'console.setColor',
				outputs: ['console'],
				makeContent: function($content) {
					$content.html('<p>This command changes the color of the next lines of the console. You can use all HTML color formats; please search online to find out how the different formats work.</p> <p>Example:<dfn><samp><span style="color: #a00">we</span></br><span style="color: rgb(200, 170, 0)">can</span></br><span style="color: hsl(120, 100%, 50%)">make</span></br><span style="color: hsla(200, 100%, 50%, 0.7)">colors!</span></br></samp><code>console.setColor("#a00");\nconsole.log("we");\nconsole.setColor("rgb(200, 170, 0)");\nconsole.log("can");\nconsole.setColor("hsl(120, 100%, 50%)");\nconsole.log("make");\nconsole.setColor("hsla(200, 100%, 50%, 0.7)");\nconsole.log("colors!");</code></dfn></p>');
				}
			}
		];
	};
};
