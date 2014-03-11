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

