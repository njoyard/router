# Simple javascript router

This is a simple router for javascript SPAs.  It works with hashes and uses the browser history API, and is quite straightforward to use.

## Usage & License

This library is an AMD module, and needs an AMD loader to function (such as [requirejs](requirejs.org)).  It is released under the terms of the MIT license.

## Route definitions

Routes are simply string patterns to match against `location.hash`.  Those patterns can contain both fixed strings and variable parts, separated by forward slashes.  Variables are prefixed by colons.  For example:

* `"home"` would match `#home`
* `"articles/:id"` would match `#articles/162` or `#articles/you-wont-believe-what-that-guy-did`
* `"articles/:id/comments/:cid/remove"`... well, you get the idea.

Route matching is done on the whole hash, ignoring any initial slash.  For example, `"home"` would not match `#home/`, `#home/news` nor `#homer` but would match `#/home`.

Routes must be unique, and routes differing only by their variable names are considered identical.  For example `"articles/:id"` and `"articles/:articleID"` are the same route.

## Handlers

Each route is associated with a handler by calling `router.on()`.  Route handlers receive a "request" object with data from the matched route as a parameter.

```js
router.on('articles/:id', function(req) {
  alert('Here is article #' + req.id);
});
```

The request object contains a key for each route variable (in the example above, when matching `#articles/162`, `req.id` would equal `"162"`), and the following additional keys:

* `_path`: the complete hash matched, with any leading slash removed (`"articles/162"` for example)
* `_link`: the link (`<a>` element) that triggered the route, or null if the route was not triggered by a link
* `_mod`: when the route was triggered by a link, this is an object with three boolean values `ctrl`, `shift` and `alt` indicating modifier keys that were depressed when the link was clicked.

You should avoid using variables prefixed with underscores in your routes.

## History handling

Routes are pushed on the browser history whenever called.  This allows the user to trigger the handler for previous routes again by using her browser's back/forward controls.

From the handler's point of view, there is no difference between a 'normal' call and a call from the browser's history. 

## Action routes

When the first character of a route is `!`, the route is called an **action route**.  Action routes work exactly the same, except they are never pushed on the navigator history.  You should use 'normal' routes for navigation, when the user may come back to a route later (eg. `article/:id` shows the article), and action routes for... well, actions you don't want the user to repeat by hitting the back button (eg. `!article/:id/remove` removes the article).

Note that you may not define an action route with the same pattern as a normal route (that is, `articles/:id` and `!articles/:id` for example).

## Calling routes

Routes may be triggered by clicking links in the document.  To enable this feature, you must call `router.start()` first.  Links trigger the router when they have a `href` attribute that starts with a hash.

```html
<!-- Triggers the router (when router.start() has been called) -->
<a href="#articles/167">Show article 167</a>

<!-- Does not trigger the router -->
<a href="/legal.html">Privacy policy</a>
```

Calling `router.stop()` stops the router listening for clicks on links.  You may call `router.start()` again at any time to re-enable links.

Note that click events are listened to on the document in event bubbling mode.  Clicking on any child of a correctly set up `<a>` element will trigger the router, unless you set a `click` handler that stops the event propagation.

Routes can also be triggered programmatically by calling `router.navigate()` (which pushes the new route on the browser history, unless asked otherwise) or `router.replace()` (which replaces the current history item).  See the documentation for those methods in the [API section](#API) below.

## Holders: preventing navigation

You can prevent the user from navigating away from a route by using a **holder**.  A holder is a function that will be called before the router calls any other normal route (action routes still work as usual) and can decide whether navigation can proceed or not, possibly after prompting the user.  This may be used for example to warn the user about unsaved changes.

You may use synchronous holders by simply returning `true` when you want to enable navigation, and anything else otherwise.

```js
var unsavedChanges = true;

router.hold(function() {
  if (!unsavedChanges || confirm('There are unsaved changes, do you still want to switch pages?')) {
    return true;
  }
});
```

You may also use asynchronous holders by calling a callback if you want to allow navigation.

```js
var unsavedChanges = true;

router.hold(function(accept) {
  if (!unsavedChanges) return accept();
  showConfirmPopup({ onOK: accept });
});
```

You may even use both synchronous/asynchronous behaviour:

```js
var unsavedChanges = true;

router.hold(function(accept) {
  if (!unsavedChanges) return true;
  showConfirmPopup({ onOK: accept });
});
```

Notes:
* Holders may be unset by calling `router.hold()` without any parameters.
* When accepting navigation, the holder is unset.  You must set it again if you need it.
* If a holder returns `true`, calling the callback later has no effect.

## API

### `router.on(route, handler)`

Registers `handler` to be called for `route`.  See ["Handlers"](#Handlers) above.

Routes may be only registered once, and variable names are ignored when comparing routes.  An exception is thrown when the same route has already been registered.

### `router.off(route[, handler])`

Unregisters a route handler.  When `handler` is specified, the route is only unregistered if the handler matches.  An exception is thrown when the route was not registered.

### `router.reset()`

Unregisters all routes.

### `router.navigate(hash[, link[, modifiers[, noHistory]]])`

Navigates to `hash`, that is try to find a matching route and call its handler.  An exception is thrown when no matching route was defined.

If `link` or `modifiers` are specified, they are used as values for the `_link` and `_mod` keys for the request object passed to the handler.

If `noHistory` is specified and truthy, navigation is not pushed onto the navigator history.

### `router.replace(hash[, link[, modifiers]])`

Works identical to `router.navigate()` but replaces the current navigator history state item instead of pushing a new one.

### `router.hold([holder])`

Sets a holder function to prevent navigating away from the current route.  If `holder` is unspecified, removes any previously set holder.

When set, a holder will be called when attempting to navigate to a normal (non-action) route.  It will receive a callback as a parameter.  The holder should either return `true` or call the callback (with no arguments) to accept the navigation, or return anything else and not call the callback to prevent navigation.  When accepting navigation, the holder is removed and must be set again if needed.

Note: setting a holder only prevents navigation from the router.  It does not prevent navigating to an other page.

### `router.start()`

Starts listening for clicks on links in the document.

### `router.stop()`

Stops listening for clicks on links in the document.

### `router.url(route[, args...])`

Builds and returns a URL string to use as an `href` attribute.  It URL-encodes each additional argument and uses it to replace a variable in the route.

```js
router.url('home', 'foo'); // "home"
router.url('articles/:id/comments/:cid', 123); // "articles/123/comments/:cid"
router.url('articles/:id/comments/:cid', 123, 456); // "articles/123/comments/456"
router.url('articles/:id', '123/comments') // "articles/123%2Fcomments"

// Variable names are optional
router.url('articles/:/comments/:', 123, 456); // "articles/123/comments/456"
```
