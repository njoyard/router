/**
 * @license
 * Simple Javascript router
 *  version 0.0.1
 *  copyright (c) 2012-2015, Nicolas JOYARD <joyard dot nicolas at gmail dot com>
 *  license: MIT
 */

/*jshint browser:true*/
/*global define*/
'use strict';

define([], function() {
  var routes = {};
  var clickHandler;
  var popstateHandler;
  var currentHolder;

  function buildRequest(hash, match, vars, link, modifiers) {
    var req = { _path: hash, _link: link, _mod: modifiers };

    match.forEach(function(value, index) {
      if (index > 0)
        req[vars[index - 1]] = decodeURIComponent(value);
    });

    return req;
  }


  function getCurrentHash() {
    var hash = location.hash;
    if (hash && hash[0] === '#' && hash.length > 1 && hash[1] !== '!') {
      return hash.substr(1);
    }
  }


  function findLink(target) {
    var elem = target;
    while (elem) {
      if (elem.tagName === 'A' && elem.hasAttribute('href')) {
        return elem;
      }

      elem = elem.parentNode;
    }

    return null;
  }


  function handleHolder(isAction, cb) {
    if (isAction || !currentHolder) {
      return cb();
    }

    var called = false;
    function goOn() {
      if (called) return;

      called = true;
      currentHolder = null;
      cb();
    }

    if (currentHolder(goOn) === true) {
      goOn();
    }
  }


  return {
    start: function(defaultRoute) {
      var router = this;

      if (!clickHandler) {
        clickHandler = function(e) {
          var link = findLink(e.target);
          if (!link) {
            return;
          }

          var href = link.getAttribute('href');
          if (href[0] === '#') {
            var path = href.substr(1);
            var modifiers = { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey };

            e.preventDefault();

            if (path.length) {
              router.navigate(path, link, modifiers);
            }

            return false;
          }
        };

        addEventListener('click', clickHandler, true);
      }

      if (!popstateHandler) {
        popstateHandler = function() {
          var hash = getCurrentHash();
          if (hash) {
            router.navigate(hash, null, null, true);
          }
        };

        addEventListener('popstate', popstateHandler, false);
      }

      var initialRoute = getCurrentHash() || defaultRoute;
      history.replaceState(null, null, '#' + initialRoute);

      this.navigate(initialRoute, null, null, true);
    },

    stop: function() {
      if (clickHandler) {
        removeEventListener('click', clickHandler, true);
        clickHandler = null;
      }

      if (popstateHandler) {
        removeEventListener('popstate', popstateHandler, false);
        popstateHandler = null;
      }

      history.pushState(null, null, '#');
    },

    reset: function() {
      this.stop();
      routes = {};
    },

    on: function(route, handler) {
      var isAction = route[0] === '!';
      if (isAction) {
        route = route.substr(1);
      }
      if (route[0] === '/') {
        route = route.substr(1);
      }

      var regexp = route.replace(/:[^\/]+/g, '([^\\/]+)');
      if (regexp in routes) {
        throw new Error('Route already defined: ' + routes[regexp].str);
      }

      var variables = route.match(/:[^\/]+/g);
      routes[regexp] = {
        str: route,
        isAction: isAction,
        handler: handler,
        variables: variables ? variables.map(function(v) { return v.substr(1); }) : [],
        regexp: new RegExp('^' + regexp + '$')
      };
    },

    off: function(route, handler) {
      var regexp = route.replace(/:[^\/]+/g, '([^\\/]+)');

      if (!(regexp in routes)) {
        throw new Error('Route not defined: ' + route);
      }

      if (!handler || routes[regexp].handler === handler) {
        delete routes[regexp];
      }
    },

    replace: function(hash, link, modifiers) {
      if (hash[0] === '!') {
        return this.navigate(hash, link, modifiers);
      }

      history.replaceState(null, null, '#' + hash);
      this.navigate(hash, link, modifiers, true);
    },

    navigate: function(hash, link, modifiers, dontPushState) {
      var isAction = hash[0] === '!';

      handleHolder(function() {
        if (isAction) {
          hash = hash.substr(1);
        } else if (!dontPushState) {
          history.pushState(null, null, '#' + hash);
        }

        if (hash[0] === '/') {
          hash = hash.substr(1);
        }

        var candidates = Object.keys(routes).filter(function(r) { return routes[r].isAction === isAction; });
        while (candidates.length) {
          var candidate = routes[candidates.shift()];
          var match = hash.match(candidate.regexp);

          if (match) {
            var req = buildRequest(hash, match, candidate.variables, link, modifiers);
            candidate.handler.call(null, req);
            return;
          }
        }

        throw new Error('No route matches #' + (isAction ? '!' : '') + hash);
      });
    },

    hold: function(holder) {
      if (holder && currentHolder) {
        throw new Error('A holder is already in place');
      }

      currentHolder = holder;
    },

    url: function(/* route[, args...] */) {
      var args = [].slice.call(arguments);
      var route = args.shift();

      while (args.length) {
        route = route.replace(/:[^/]*/, encodeURIComponent(args.shift()));
      }

      return route;
    }
  };
});