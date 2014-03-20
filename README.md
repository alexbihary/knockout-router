knockout-router
===============  

a router for knockout spa applications (a port of Backbone.Router with influences from Durandal)


## How to Use

1. Include `knockout.js`.
2. Optionally include `knockout-amd-helpers.js` (https://github.com/rniemeyer/knockout-amd-helpers) to take advantage of external module/template loading.
3. Include `knockout-history.js` and `knockout-router.js` from this repo (supports commonjs, amd, or global).
4. Add `route` and/or `router` bindings to HTML markup.
5. Optionally call `ko.router.configure(options)` and pass in custom an options hash object.
6. Call `ko.router.map(routeConfig)` and pass in an array of routes.
7. Call `ko.applyBindings(vm)`, add `router` property to your view model and set it to `ko.router.vm` if using the router to render your navigation links.
8. Call `ko.router.init()`, which starts the router and history tracking.

## How to Define Routes

When calling `ko.router.map` you will pass in an array of route objects. 

Required properties: `route` (string) defines the route or route pattern

Optional properties: 
* `module` (string) will tell the router to add a module binding (requires knockout-amd-helpers)
* `template` (string) will tell the router to add a template binding (or override the module's template option)
* `name` (string) will give this route a name (if possible, name is generated from the route pattern)
* `href` (string) will set the route's href property, which can be used later for rendering a navigation layout
* `nav` (bool) when set to `true` will cause this route to appear in navigation using `ko.router.vm.navRoutes`
* `callback` (function) will be called with any route parameters when the route is activated

Examples of routes:
* `{ route: '' }`
* `{ route: 'about-us', module: 'about', nav: true }`
* `{ route: 'content(/:id)', module: 'content', href: 'content', nav: true }`  (optional parameter :id)
* `{ route: 'content/:id/deep-page', template: 'deep-page' }` (required parameter :id)

## Configuring the Router

Before defining the routes, make a call to `ko.router.configure(options)` and pass in custom options.

Options available:
* debug (bool), if `true` will log router events to console.debug.
* notify (callback function(fragment, query)) if specified will be called for every navigation event.
* pushState (bool) tell the router to use HTML5 pushState if supported, otherwise use hash-based url's. 
* root (string) defaults to '/', set to alternate root if desired.


## Using the `Route` binding
You can define new routes or hook to existing routes (if previously defined) using the `route` binding.

The elements will be displayed/hidden when the route is active/inactive. 

```
<div style="display:none;" data-bind="route: '' ">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sit in!</div>
<div style="display:none;" data-bind="route: 'article' ">
  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Suscipit nostrum id hic consectetur. 
  Cumque ab fuga ex enim tenetur porro qui totam dignissimos dicta explicabo.
</div>

/* Optionally configure router settings */
ko.router.configure({
  debug: true,
  notify: function(fragment, query) { console.log(fragment, query); },
  pushState: true
});

var viewModel = {};
viewModel.router = ko.router.vm;
ko.applyBindings(vm);

/* Start the router */
ko.router.init();
```


## Dynamic Navigation Links

Add a `router` property to your view model and set it to `ko.router.vm`.

Set `nav` property to `true` for all routes you want to appear in the `navRoutes` property of the router view model.

For complex route patterns, add a `href` property to the route to specific the location

```
<!-- show list of routes (where `nav === true`) -->
<nav>
  <ul data-bind="foreach: router.navRoutes">
    <li data-bind="css: { active: isActive }"><a data-bind="text: config.title, attr: { href: config.href }"></a></li>
  </ul>
</nav>
```



## Using the `Router` Binding
```
<!-- add router binding to view -->
<div data-bind="router: {}"></div>

/* configure router */
ko.router.configure(options);

/* define routes */
ko.router.map([
  { route: '', module: 'home', title: 'Welcome', nav: true },
  { route: 'who-we-are', module: 'about', title: 'About Us', nav: true },
  { route: 'contact', module: 'contact', nav: true },
  { route: 'content/news/:id', module: 'news', title: 'The News' }
]);

/* handle unknown routes */
ko.router.mapNotFound({ callback: function(fragment, query) { console.log(fragment, query); } });

var vm = { router: ko.router.vm };
ko.applyBindings(vm);

ko.router.init();
```



## ToDo

* Add ability for router binding to empty its contents when a route does not match
* Add observable property to notify when nagivating. (for progress bars/spinners)
* Use the `visible` binding for toggling `route` bounded elements
* Transition animations
* Add option to cache views
* Add ability to define child routes/routers

## License
MIT https://github.com/alexbihary/knockout-router/blob/master/LICENSE
