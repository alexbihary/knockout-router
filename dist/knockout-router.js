// knockout-router
// ----------------
// Ported from Backbone.Router (and some influence from Durandal's Router)
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
  
  var routes = ko.observableArray([]),
      visitedRoutes = ko.observableArray([]),
      noop = function(){},
      settings = ko.observable({
        debug: false,
        handleRelativeAnchors: true,
        hashPrefix: '#',
        notify: noop,
        root: '/'
      }),
      routeNotFound = { route: '*notfound', name: 'notfound', callback: noop, nav: false },
      startsWithRoot = ko.computed(function() {
        return new RegExp('^' + settings().root.replace(/\//g, '\\/'));
      }),
      optionalParam = /\((.*?)\)/g,
      namedParam = /(\(\?)?:\w+/g,
      splatParam = /\*\w+/g,
      escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g,
      trailingSlash = /\/$/,
      findParams = /:(\w+)/g,
      queryString = /^([a-zA-Z_$][0-9a-zA-Z_$]*=[^&]*&?)+$/,
      jsVariable = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/,
      // Cached regex for stripping leading and trailing slashes.
      rootStripper = /^\/+|\/+$/g;
  
  // Shim console.debug
  if (!console.debug) console.debug = console.log;
  if (!console.group) console.group = console.groupEnd = console.log;
  
  function Route(config, element) {
    if (typeof config === 'string') {
      config = {
        route: config
      };
    }
    this.config = config;
    this.element = element;
    this.isActive = ko.observable(false);
    
    configureRoute(this.config);
  }
  
  Route.prototype.activate = function(args, fragment) {
    if (this.element) this.element.style.display = '';
    if (this.subscribers) {
      ko.utils.arrayForEach(this.subscribers(), function(subscriber) {
        subscriber.element.style.display = '';
      });
    }
    this.isActive(true);
    this.args = args;
    this.data = putArgsIntoDataObject(args, this.config.route);
    this.fragment = fragment;
    return this;
  }
  Route.prototype.deactivate = function() {
    if (this.element) this.element.style.display = 'none';
    if (this.subscribers) {
      ko.utils.arrayForEach(this.subscribers(), function(subscriber) {
        subscriber.element.style.display = 'none';
      });
    }
    this.isActive(false);
    return this;
  }
  Route.prototype.subscribe = function(config, element) {
    this.subscribers = this.subscribers || ko.observableArray([]);
    this.subscribers.push({ config: config, element: element });
  }
  
  function putArgsIntoDataObject(argsArray, route) {
    var data = {}, idx = 0, match, value;
    while ((match = findParams.exec(route)) !== null) {
      value = match[1];
      if (jsVariable.test(value) && argsArray[idx]) {
        data[value] = argsArray[idx];
      }
      idx++;
    }
    if (argsArray[idx] && queryString.test(argsArray[idx])) {
      var pairs = argsArray[idx].split('&');
      pairs.forEach(function(pair, i) {
        var parts = pair.split('=');
        if (parts[1]) data[parts[0]] = parts[1];
      });
    }
    
    return data;
  }
  
  function configureRoute(config) {
    config.title = config.title || convertRouteToTitle(config.route);
    config.module = config.module; // || convertRouteToModuleId(config.route);
    config.hash = config.hash || convertRouteToHash(config.route);
    config.href = config.href || convertRouteToHref(config.route);
    config.name = config.name || convertRouteToName(config.route);
    config.routePattern = routeToRegExp(config.route);
    config.callback = isTypeOf(config.callback, 'function') && config. callback || noop;
  }
  
  function convertRouteToTitle(route) {
    var value = stripParametersFromRoute(route);
    return value.substring(0, 1).toUpperCase() + value.substring(1);
  }
  function convertRouteToModuleId(route) {
    return stripParametersFromRoute(route);
  }
  function convertRouteToHash(route) {
    if (route.indexOf(settings().hashPrefix) === 0) {
      return route;
    }
    return settings().hashPrefix + route;
  }
  function convertRouteToHref(route) {
    return settings().root + route;
  }
  function convertRouteToName(route) {
    var value = stripParametersFromRoute(route);
    return value.replace(/\//g, '-');
  }
  function stripParametersFromRoute(route) {
    var colonIndex = route.indexOf(':');
    var length = colonIndex > 0 ? colonIndex - 1 : route.length;
    return route.substring(0, length);
  }
  function isTypeOf(theObject, type) {
    if (typeof(theObject) === 'undefined') return 'undefined' === type.toLowerCase();
    var regex = new RegExp('\\[object ' + type + '\\]', 'i');
    return regex.test(Object.prototype.toString.call(theObject));
  }
  
  // Bind all defined routes to `knockout-history`. Pass 'true' for parameter 'appendToEnd' to
  // ensure that the more general route handlers are checked last.
  function bindRoutes() {
    routes.push(new Route(routeNotFound));
    ko.utils.arrayForEach(routes(), function(r) {
      ko.history.route(r.config.routePattern, function(fragment) {
        var args = extractParameters(r.config.routePattern, fragment);
        
        r.activate(args, fragment);
        
        exports.vm.activeRoute(r);
        if (r.config.callback) r.config.callback.apply(r, args);
        if (settings().notify) settings().notify.apply(r, args);
        
        if (settings().debug) {
          console.group('knockout-router: navigated');
          console.debug('route: "%s" (%s)', r.config.route, r.config.name);
          console.debug('fragment: "%s"', fragment);
          console.debug('args: ', args);
          console.debug('instance: %O', r);
          console.groupEnd();
        }
      }, r.config.name, true);
    });
  }
  
  
  // Convert a route string into a regular expression, suitable for matching
  // against the current location hash.
  function routeToRegExp(route) {
    route = route.replace(escapeRegExp, '\\$&')
    .replace(optionalParam, '(?:$1)?')
    .replace(namedParam, function(match, optional) {
      return optional ? match : '([^/?]+)';
    })
    .replace(splatParam, '([^?]*?)');
    return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
  }
  
  // Given a route, and a URL fragment that it matches, return the array of
  // extracted decoded parameters. Empty or unmatched parameters will be
  // treated as `null` to normalize cross-browser behavior.
  function extractParameters(route, fragment) {
    var params = route.exec(fragment).slice(1);
    return ko.utils.arrayMap(params, function(param, idx) {
      // Don't decode the search params.
      if (idx === params.length - 1) return param || null;
      return param ? decodeURIComponent(param) : null;
    });
  }
  
  // Add a cross-platform `addEventListener` shim for older browsers.
  var addEvent = (function () {
    var filter = function(el, type, fn) {
      for ( var i = 0, len = el.length; i < len; i++ ) {
        addEvent(el[i], type, fn);
      }
    };
    if (document.addEventListener) {
      return function (el, type, fn) {
        if ( el && el.nodeName || el === window ) {
          el.addEventListener(type, fn, false);
        } else if (el && el.length) {
          filter(el, type, fn);
        }
      };
    }
 
    return function (el, type, fn) {
      if ( el && el.nodeName || el === window ) {
        el.attachEvent('on' + type, function () { return fn.call(el, window.event); });
      } else if ( el && el.length ) {
        filter(el, type, fn);
      }
    };
  })();
 
  // usage
  //addEvent( document.getElementsByTagName('a'), 'click', fn);
  
  //var addEventListener = window.addEventListener || function (eventName, listener) {
  //  return attachEvent('on' + eventName, listener);
  //};
  
  function handleRelativeAnchors() {
    // All navigation that is relative should be passed through the navigate
    // method, to be processed by the router.  If the link has a data-bypass
    // attribute, bypass the delegation completely.
    addEvent(document, 'click', function(e) {
      var target = e.target || e.srcElement;
      if (target && target.nodeName === 'A' && !target.getAttribute('data-bypass')) {
        // Get the anchor href and protcol
        var href = target.getAttribute('href');
        var protocol = target.protocol + '//';
        
        // Ensure the protocol is not part of URL, meaning its relative.
        if (href && href.slice(0, protocol.length) !== protocol && href.indexOf('javascript:') !== 0) {
          // Stop the default event to ensure the link will not cause a page refresh.
          e.preventDefault();
          
          // Remove/replace leading root path if present
          href = startsWithRoot().test(href) ? href.replace(startsWithRoot(), '/') : href;
          
          // Call 'navigate' to allow knockout-router/history to handle the route.
          exports.navigate(href, true);
        }        
      }
    }, false);
  }
  
  // Configure the router settings.
  exports.configure = function(customSettings) {
    settings(ko.utils.extend(settings(), customSettings || {}));
    return exports;
  }
  
  // Bind the routes and Start the Router/History.
  exports.init = function(options) {
    settings(ko.utils.extend(settings(), options || {}));
    bindRoutes();
    
    if (settings().debug) {
      console.group('knockout-router: started');
      console.debug('settings: %O', settings());
      console.debug('debug mode: enabled');
      console.groupEnd();
      window.ko = window.ko || ko;
      window.vm = window.vm || exports.vm;
    }
    
    ko.history.start(settings());
    if (settings().handleRelativeAnchors) handleRelativeAnchors();
    return exports;
  }
  
  // Exposes a view model to assist in binding routes to the UI.
  exports.vm = {
    settings: settings,
    navRoutes: ko.computed(function() {
      return ko.utils.arrayFilter(routes(), function(route) {
        return route.config.nav;
      });
    }),
    routes: routes,
    activeRoute: ko.observable(),
    isNavigating: ko.observable(false)
  };
  
  exports.vm.activeRoute.subscribe(function(route) {
    if (route) {
      ko.utils.arrayForEach(visitedRoutes(), function(vr) {
        if (vr && vr !== route) {
          visitedRoutes.remove(vr.deactivate());
        }
      });
      visitedRoutes.push(route);
    }
  });
  
  // Define route mappings
  exports.map = function(routesConfig) {
    if (isTypeOf(routesConfig, 'array')) {
      routesConfig.forEach(function(config, idx) {
        routes.push(new Route(config));
      });
    }
    return exports;
  }
  
  exports.mapNotFound = function(config) {
    ko.utils.extend(routeNotFound, config || {});
    return exports;
  }
  
  // Simple proxy to `knockout-history` to save a fragment into the history.
  exports.navigate = function(fragment, options) {
    ko.history.navigate(fragment, options);
    return exports;
  }
  
  
  
  
  ko.bindingHandlers.router = {
    init: function(element, valueAccessor, allBindings, bindingContext) {
      return { controlsDescendantBindings: true };      
    },
    update: function(element, valueAccessor, allBindings, bindingContext) {
      //var settings = ko.utils.unwrapObservable(valueAccessor());
      var value = valueAccessor(),
        route, options, moduleBinding, templateBinding;
      
      ko.computed(function() {
        options = ko.utils.unwrapObservable(value);
        moduleBinding = {}; templateBinding = {};
        route = exports.vm.activeRoute();
        if (!route) return; // disable existing module/template bindings?
        
        if (route.config.module) {
          moduleBinding.name = route.config.module;
          moduleBinding.template = route.config.template || route.config.module;
          moduleBinding.data = route.args;
          
          ko.applyBindingsToNode(element, { module: moduleBinding });
        } else if (route.config.template) {
          templateBinding.name = route.config.template;
          templateBinding.data = route.data;
          
          ko.applyBindingsToNode(element, { template: templateBinding });
        }
      });
    }
  };
  
  ko.bindingHandlers.route = {
    init: function(element, valueAccessor, allBindings, bindingContext) {
      var route, routeValue, settings = ko.utils.unwrapObservable(valueAccessor());
      
      if (isTypeOf(settings, 'string')) settings = { route: settings };
      routeValue = settings.route || settings.name;

      route = ko.utils.arrayFirst(routes(), function(r) {
        return r.config.name === routeValue || r.config.route === routeValue || r.config.routePattern === routeToRegExp(routeValue);
      });
      
      if (route) {
        route.subscribe(settings, element);
      } else {
        routes.push(new Route(settings, element));
      }
    }
  };
  
  if (ko.virtualElements) {
    ko.virtualElements.allowedBindings.router = true;
    ko.virtualElements.allowedBindings.route = true;
  }
  
  ko.router = exports;
});