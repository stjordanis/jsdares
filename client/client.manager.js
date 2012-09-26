/*jshint node:true jquery:true*/
"use strict";

var applet = require('../jsmm-applet');
var dares = require('../dares');

var pageConstructors = [
	{regex: /^dare/, type: 'PageHome'},
	{regex: /^edit/, type: 'PageHome'},
	{regex: /^full/, type: 'PageHome'},
	{regex: /^create/, type: 'PageCreate'},
	{regex: /^superheroes$/, type: 'PageUsersList'},
	{regex: /^superheroes/, type: 'PageUsersSingle'}
];

module.exports = function(client) {
	client.Manager = function() { return this.init.apply(this, arguments); };
	client.Manager.prototype = {
		init: function() {
			this.$div = $('#content');
			this.menu = new client.MenuHeader(this);
			this.login = new client.Login(this);
			this.sync = new client.Sync(this);
			this.history = window.History;
			this.history.Adapter.bind(window, 'statechange', this.stateChange.bind(this));
			this.loginData = {};

			this.modalUI = new applet.UI();
			this.modalUI.setCloseCallback(this.closeDareCallback.bind(this));

			this.page = null;
			this.urlChange(window.location.pathname);
		},

		getSync: function() {
			return this.sync;
		},

		getLoginData: function() {
			return this.loginData;
		},

		navigateTo: function(url) {
			this.addHistory(url);
		},

		removePage: function() {
			if (this.page !== null) {
				this.page.remove();
				this.page = null;
			}
		},

		connectionError: function(error) {
			this.login.showConnectionError();
			if (console) {
				console.error('Connection error: ' + error);
			}
		},

		connectionSuccess: function(response) {
			this.login.hideConnectionError();
			if (response.loginData) {
				this.loginData = response.loginData;
				this.login.update(this.loginData);
				this.menu.showLocks(!this.loginData.loggedIn);
			}
		},

		addHistory: function(url) {
			this.history.pushState(null, null, url);
			/*global _gaq*/
			_gaq.push(['_trackPageview', url]); // Google Analytics
		},

		stateChange: function() {
			var state = this.history.getState();
			this.urlChange(state.hash);
		},

		urlChange: function(url) {
			this.modalUI.closeModal();

			url = (url || '/').substring(1);

			var type = null;
			for (var i=0; i<pageConstructors.length; i++) {
				if (pageConstructors[i].regex.test(url)) {
					type = pageConstructors[i].type;
					break;
				}
			}
			
			if (type === null) {
				type = 'PageHome';
				url = '';
			}
			this.splitUrl = url.split('/');

			if (this.page === null || this.page.type !== type) {
				this.removePage();
				this.page = new client[type](this, this.$div);
			}
			this.page.navigateTo(this.splitUrl);
			this.menu.navigateTo(this.splitUrl);
			this.navigateDare(this.splitUrl);
		},

		navigateDare: function(splitUrl) {
			if (this.splitUrl[this.splitUrl.length-2] === 'dare') {
				this.viewDare(this.splitUrl[this.splitUrl.length-1]);
			} else if (this.splitUrl[this.splitUrl.length-2] === 'edit') {
				this.editDare(this.splitUrl[this.splitUrl.length-1]);
			}
		},

		viewDare: function(id) {
			this.dareId = id;
			this.getSync().getDareAndInstance(id, (function(dare) {
				if (dare._id === this.dareId) {
					this.instance = dare.instance;
					this.modalUI.openModal();
					new dares[dare.type + 'Dare'](this, this.modalUI, dare);
				}
			}).bind(this));
		},

		editDare: function(id) {
			this.dareId = id;
			this.getSync().getDareEdit(id, (function(dare) {
				if (dare._id === this.dareId) {
					this.instance = dare.instance;
					this.modalUI.openModal();
					new dares.Editor(this, this.modalUI, dare);
				}
			}).bind(this));
		},

		closeDareCallback: function() {
			if (['dare', 'edit'].indexOf(this.splitUrl[this.splitUrl.length-2] >= 0)) {
				this.navigateTo('/' + this.splitUrl.slice(0, -2).join('/'));
			}
		}
	};
};