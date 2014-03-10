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
        hashPrefix: '#',
        notify: noop
      }),
      optionalParam = /\((.*?)\)/g,
      namedParam = /(\(\?)?:\w+/g,
      splatParam = /\*\w+/g,
      escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g,
      trailingSlash = /\/$/,
      onHashChangeSupported = 'onhashchange' in window;
  
  if (!onHashChangeSupported) console.error('knockout-router: onhashchange event is not supported.');
  
  function handleHashChange(e) {
    change(e.newURL, e.oldURL);
  }
  
  function change(newURL, oldURL) {
    var hash = newURL.substr(newURL.indexOf(settings().hashPrefix) + settings().hashPrefix.length);
    var activatedRoute;
    ko.utils.arrayForEach(routes(), function(r) {
      var pattern = r.config.pattern || r.config.route;
      if (pattern === hash || pattern.substr(settings().hashPrefix.length) === hash) {
        r.activate();
        settings().notify.call(null, r);
        activatedRoute = r;
      } else {
        r.deactivate();
      }
    });
    
    if (settings().debug) {
      console.group('knockout-router: navigated');
      console.debug('urls: %O', { newURL: newURL, oldURL: oldURL });
      console.debug("hashUrl: '%s'", settings().hashPrefix + hash);
      console.debug('route: %O', activatedRoute);
      console.groupEnd();
    }
  }
  
  function Route(config, element) {
    if (typeof config === 'string') {
      config = {
        route: config
      };
    }
    this.config = config;
    this.element = element;
    
    configureRoute(this.config);
  }
  
  Route.prototype.activate = function(args, fragment) {
    if (this.element) this.element.style.display = '';
    if (this.subscribers) {
      ko.utils.arrayForEach(this.subscribers(), function(subscriber) {
        subscriber.element.style.display = '';
      });
    }
    this.active = true;
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
    this.active = false;
    return this;
  }
  Route.prototype.subscribe = function(config, element) {
    this.subscribers = this.subscribers || ko.observableArray([]);
    this.subscribers.push({ config: config, element: element });
  }
  
  function putArgsIntoDataObject(argsArray, route) {
    var data = {}, idx = 0, findParams = /:(\w+)/g, match, value;
    while ((match = findParams.exec(route)) !== null) {
      value = match[1];
      if (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(value) && argsArray[idx]) {
        data[value] = argsArray[idx];
      }
      idx++;
    }
    if (argsArray[idx] && /^([a-zA-Z_$][0-9a-zA-Z_$]*=[^&]*&?)+$/.test(argsArray[idx])) {
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
  
  // Bind all defined routes to `knockout-history`. We have to reverse the
  // order of the routes here to support behavior where the most general
  // routes can be defined at the bottom of the route map.
  function bindRoutes() {
    if (!routes().length) return;
    routes().forEach(function(r, idx) {
      ko.history.route(r.config.routePattern, function(fragment) {
        var args = extractParameters(r.config.routePattern, fragment);
        
        r.activate(args, fragment);
        
        exports.vm.activeRoute(r);
        if (r.config.callback) r.config.callback.apply(r, args);
        if (settings().notify) settings().notify.apply(r, args);
        
        if (settings().debug) {
          console.group('knockout-router: navigated');
          console.debug('route: "%s"', r.config.route);
          console.debug('fragment: "%s"', fragment);
          console.debug('args: ', args);
          console.debug('instance: %O', r);
          console.groupEnd();
        }
      });
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
  
  // Configure the router settings.
  exports.configure = function(customSettings) {
    ko.utils.extend(settings(), customSettings || {});
    return exports;
  }
  
  // Bind the routes and Start the Router/History.
  exports.init = function(options) {
    bindRoutes();
    
    if (settings().debug) {
      console.group('knockout-router: started');
      console.debug('settings: %O', settings());
      console.debug('debug mode: enabled');
      console.groupEnd();
      window.ko = window.ko || ko;
      window.vm = window.vm || exports.vm;
    }
    
    ko.history.start(options);
    return exports;
  }
      
  exports.init_old = function() {
    //listen for future hashchange events
    window.addEventListener('hashchange', handleHashChange, false);
    
    if (settings().debug) {
      console.group('knockout-router: start listening');
      console.debug('settings: %O', settings());
      console.debug('debug mode: enabled');
      console.groupEnd();
      window.ko = window.ko || ko;
      window.vm = window.vm || exports.vm;
    }
    
    if (window.location.hash === '') { //if no hash set, set to initial value
      window.location.hash = settings().hashPrefix = settings().hashPrefix || '#';
    } else { //otherwise, trigger the logic to parse and execute the current route
      var newURL = window.location.href;
      var oldURL = newURL.substr(0, newURL.indexOf('#'));
      change(newURL, oldURL);
    }
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
    activeRoute: ko.observable()
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
        }
      });
    }
  };
  ko.virtualElements.allowedBindings.router = true;
  
  
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
  ko.virtualElements.allowedBindings.route = true;
  
  ko.router = exports;
});