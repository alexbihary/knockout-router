/*!
 * knockout-router v0.2.0 http://alexbihary.github.com/knockout-router
 * Copyright 2014 Alexander Bihary
 * Licensed under MIT (https://github.com/alexbihary/knockout-router/blob/master/LICENSE)
 */
// knockout-history
// ----------------
// Ported from Backbone.History
// 
// Handles cross-browser history management, based on either
// [pushState](http://diveintohtml5.info/history.html) and real URLs, or
// [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
// and URL fragments. If the browser supports neither (old IE, natch),
// falls back to polling.
;(function(factory) {
    //CommonJS
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        factory(require('knockout'), exports);
    //AMD
    } else if (typeof define === 'function' && define.amd) {
        define(['knockout', 'exports'], factory);
    //normal script tag
    } else {
        factory(ko, ko.history = {});
    }
})(function(ko, exports, undefined) {
  
  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;
  
  
  // Environment and session
  var env = {
    
    location: window.location,
    history: window.history,
    
    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,
    
    // Has the history handling already been started?
    historyStarted: false,
    
    options: { root: '/' },
    root: '/',
    
    wantsHashChange: false,
    hasHashChange: false,
    wantsPushState: false,
    hasPushState: false,
    
    // Store all the route handlers here
    handlers: []
  };
  
  
  exports.getEnv = function() {
    return ko.utils.extend({}, env);
  }
  
  // Are we at the app root?
  exports.atRoot = function() {
    return env.location.pathname.replace(/[^\/]$/, '$&/') === env.root;
  }

  // Gets the true hash value. Cannot use location.hash directly due to bug
  // in Firefox where location.hash will always be decoded.
  exports.getHash = function(window) {
    var match = (window || env).location.href.match(/#(.*)$/);
    return match ? match[1] : '';
  }

  // Get the cross-browser normalized URL fragment, either from the URL,
  // the hash, or the override.
  exports.getFragment = function(fragment, forcePushState) {
    if (fragment == null) {
      if (env.hasPushState || !env.wantsHashChange || forcePushState) {
        fragment = decodeURI(env.location.pathname + env.location.search);
        var root = env.root.replace(trailingSlash, '');
        if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
      } else {
        fragment = exports.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  }

  // Start the hash change handling, returning `true` if the current URL matches
  // an existing route, and `false` otherwise.
  exports.start = function(options) {
    if (env.historyStarted) throw new Error("knockout-history has already been started");
    env.historyStarted = true;

    // Figure out the initial configuration. Do we need an iframe?
    // Is pushState desired ... is it available?
    ko.utils.extend(env.options, options);
    env.root            = env.options.root;
    env.wantsHashChange = env.options.hashChange !== false;
    env.hasHashChange   = 'onhashchange' in window;
    env.wantsPushState  = !!env.options.pushState;
    env.hasPushState    = !!(env.options.pushState && env.history && env.history.pushState);
    var fragment        = exports.getFragment();

    // Add a cross-platform `addEventListener` shim for older browsers.
    var addEventListener = window.addEventListener || function (eventName, listener) {
      return attachEvent('on' + eventName, listener);
    };

    // Normalize root to always include a leading and trailing slash.
    env.root = ('/' + env.root + '/').replace(rootStripper, '/');

    // Proxy an iframe to handle location events if the browser doesn't
    // support the `hashchange` event, HTML5 history, or the user wants
    // `hashChange` but not `pushState`.
    if (!env.hasHashChange && env.wantsHashChange && (!env.wantsPushState || !env.hasPushState)) {
      var iframe = document.createElement('iframe');
      iframe.src = 'javascript:0';
      iframe.style.display = 'none';
      iframe.tabIndex = -1;
      var body = document.body;
      // Using `appendChild` will throw on IE < 9 if the document is not ready.
      env.iframe = body.insertBefore(iframe, body.firstChild).contentWindow;
      exports.navigate(fragment);
    }

    // Depending on whether we're using pushState or hashes, and whether
    // 'onhashchange' is supported, determine how we check the URL state.
    if (env.hasPushState) {
      addEventListener('popstate', exports.checkUrl, false);
    } else if (env.wantsHashChange && env.hasHashChange && !env.iframe) {
      addEventListener('hashchange', exports.checkUrl, false);
    } else if (env.wantsHashChange) {
      exports._checkUrlInterval = setInterval(exports.checkUrl, env.interval);
    }

    // Determine if we need to change the base url, for a pushState link
    // opened by a non-pushState browser.
    env.fragment = fragment;

    // Transition from hashChange to pushState or vice versa if both are
    // requested.
    if (env.wantsHashChange && env.wantsPushState) {

      // If we've started off with a route from a `pushState`-enabled
      // browser, but we're currently in a browser that doesn't support it...
      if (!env.hasPushState && !exports.atRoot()) {
        env.fragment = exports.getFragment(null, true);
        env.location.replace(env.root + '#' + env.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
      } else if (env.hasPushState && exports.atRoot() && env.location.hash) {
        env.fragment = exports.getHash().replace(routeStripper, '');
        env.history.replaceState({}, document.title, env.root + env.fragment);
      }

    }

    if (!env.options.silent) return exports.loadUrl();
  }

  // Disable knockout-history, perhaps temporarily. Not useful in a real app,
  // but possibly useful for unit testing Routers.
  exports.stop = function() {
    // Add a cross-platform `removeEventListener` shim for older browsers.
    var removeEventListener = window.removeEventListener || function (eventName, listener) {
      return detachEvent('on' + eventName, listener);
    };

    if (env.hasPushState) {
      removeEventListener('popstate', exports.checkUrl, false);
    } else if (env.wantsHashChange && env.hasHashChange && env.iframe) {
      removeEventListener('hashchange', exports.checkUrl, false);
    }
    // Some environments will throw when clearing an undefined interval.
    if (exports._checkUrlInterval) clearInterval(exports._checkUrlInterval);
    env.historyStarted = false;
  }

  // Add a route to be tested when the fragment changes. Routes added later
  // may override previous routes.
  exports.route = function(route, callback, name, appendToEnd) {
    env.handlers[appendToEnd ? 'push' : 'unshift']({route: route, callback: callback, name: name});
  }

  // Checks the current URL to see if it has changed, and if it has,
  // calls `loadUrl`, normalizing across the hidden iframe.
  exports.checkUrl = function(e) {
    var current = exports.getFragment();
    if (current === env.fragment && env.iframe) {
      current = exports.getFragment(exports.getHash(env.iframe));
    }
    if (current === env.fragment) return false;
    if (env.iframe) exports.navigate(current);
    exports.loadUrl();
  }

  // Attempt to load the current URL fragment. If a route succeeds with a
  // match, returns `true`. If no defined routes matches the fragment,
  // returns `false`.
  exports.loadUrl = function(fragment) {
    fragment = env.fragment = exports.getFragment(fragment);
    return ko.utils.arrayFirst(env.handlers, function(handler) {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);
        return true;
      }
    });
  }

  // Save a fragment into the hash history, or replace the URL state if the
  // 'replace' option is passed. You are responsible for properly URL-encoding
  // the fragment in advance.
  //
  // The options object can contain `trigger: true` if you wish to have the
  // route callback be fired (not usually desirable), or `replace: true`, if
  // you wish to modify the current URL without adding an entry to the history.
  exports.navigate = function(fragment, options) {
    if (!env.historyStarted) return false;
    if (!options || options === true) options = {trigger: !!options};

    var url = env.root + (fragment = exports.getFragment(fragment || ''));

    // Strip the hash for matching.
    fragment = fragment.replace(pathStripper, '');

    if (env.fragment === fragment) return;
    env.fragment = fragment;

    // Don't include a trailing slash on the root.
    if (fragment === '' && url !== '/') url = url.slice(0, -1);

    // If pushState is available, we use it to set the fragment as a real URL.
    if (env.hasPushState) {
      env.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

    // If hash changes haven't been explicitly disabled, update the hash
    // fragment to store history.
    } else if (env.wantsHashChange) {
      exports.updateHash(env.location, fragment, options.replace);
      if (env.iframe && (fragment !== exports.getFragment(exports.getHash(env.iframe)))) {
        // Opening and closing the iframe tricks IE7 and earlier to push a
        // history entry on hash-tag change.  When replace is true, we don't
        // want this.
        if(!options.replace) env.iframe.document.open().close();
        exports.updateHash(env.iframe.location, fragment, options.replace);
      }

    // If you've told us that you explicitly don't want fallback hashchange-
    // based history, then `navigate` becomes a page refresh.
    } else {
      return env.location.assign(url);
    }
    if (options.trigger) return exports.loadUrl(fragment);
  }

  // Update the hash location, either replacing the current entry, or adding
  // a new one to the browser history.
  exports.updateHash = function(location, fragment, replace) {
    if (replace) {
      var href = location.href.replace(/(javascript:|#).*$/, '');
      location.replace(href + '#' + fragment);
    } else {
      // Some browsers require that `hash` contains a leading #.
      location.hash = '#' + fragment;
    }
  }

  ko.history = exports;  
});


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
          
          // Call 'navigate' to allow knockout-router/history to handle the route.
          exports.navigate(href, true);
        }        
      }
    }, false);
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
    
    ko.history.start(ko.utils.extend(settings(), options || {}));
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