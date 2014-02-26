;(function(factory) {
    //CommonJS
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        factory(require('knockout'), exports);
    //AMD
    } else if (typeof define === 'function' && define.amd) {
        define(['knockout', 'exports'], factory);
    //normal script tag
    } else {
        factory(ko, ko.router = {});
    }
})(function(ko, exports, undefined) {
  
  var routes = [],
      settings = {
        debug: false,
        hashPrefix: '#'
      },
      onHashChangeSupported = 'onhashchange' in window;
  
  if (!onHashChangeSupported) console.error('knockout-router: onhashchange event is not supported.');
  
  exports.init = function(customSettings) {
    ko.utils.extend(settings, customSettings || {});
    if (settings.debug) console.debug('knockout-router: debug mode enabled.');
    
    //listen for future hashchange events
    window.addEventListener('hashchange', handleHashChange, false);
    
    if (window.location.hash === '') { //if no hash set, set to initial value
      window.location.hash = settings.hashPrefix = settings.hashPrefix || '#';
    } else { //otherwise, trigger the logic to parse and execute the current route
      var newURL = window.location.href;
      var oldURL = newURL.substr(0, newURL.indexOf('#'));
      change(newURL, oldURL);
    }
  }
  
  function handleHashChange(e) {
    change(e.newURL, e.oldURL);
  }
  
  function change(newURL, oldURL) {
    if (settings.debug) console.debug({ newURL: newURL, oldURL: oldURL });
    var hash = newURL.substr(newURL.indexOf(settings.hashPrefix) + settings.hashPrefix.length);
    if (settings.debug) console.debug(hash);
    
    ko.utils.arrayForEach(routes, function(r) {
      var pattern = r.settings.pattern;
      if (pattern === hash || pattern.substr(settings.hashPrefix.length) === hash) {
        r.activate();
      } else {
        r.deactivate();
      }
    });
  }
  
  function Route(element, settings) {
    if (typeof settings === 'string') {
      settings = {
        pattern: settings
      };
    }
    this.settings = settings;
    this.element = element;
  }
  
  Route.prototype.activate = function() {
    this.element.style.display = 'block';
    this.active = true;
  }
  Route.prototype.deactivate = function() {
    this.element.style.display = 'none';
    this.active = false;
  }
  
  ko.bindingHandlers.route = {
    init: function(element, valueAccessor, allBindingsAccessor, data, context) {
      var settings = ko.utils.unwrapObservable(valueAccessor());
      routes.push(new Route(element, settings));
    }
  };
  
  ko.router = exports;
});