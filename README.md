knockout-router
===============

a router for knockout (a port of Backbone.Router with influences from Durandal)


### How to Use

1. Include `knockout.js`
2. Include `knockout-amd-helpers.js` (optionally - https://github.com/rniemeyer/knockout-amd-helpers) to take advantage of external module/template loading.
3. Include `knockout-history.js` and `knockout-router.js` (supports commonjs, amd, or global)
4. Add `route` and/or `router` bindings to HTML markup
5. Call `ko.router.map(routeConfig)` and pass in an array of routes.
6. Call `ko.applyBindings(vm)` // add `router` property to your view model and set it to `ko.router.vm`
7. Call `ko.router.init()`    // starts history tracking


### Simple example - route binding
Simply define routes using the `route` binding and the elements will be displayed/hidden when the route is active/inactive.

```
<!-- Nav links assume that hashPrefix is set to '#/', see custom settings below. -->
<nav>
  <a href="/">Root route</a>
  <a href="/article">Show Article</a>
</nav>

<div style="display:none;" data-bind="route: '' ">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sit in!</div>
<div style="display:none;" data-bind="route: 'article' ">
  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Suscipit nostrum id hic consectetur. 
  Cumque ab fuga ex enim tenetur porro qui totam dignissimos dicta explicabo.
</div>

/* Optionally configure router settings */
ko.router.configure({
  debug: true,
  hashPrefix: '#/',
  notify: function(fragment, query) { console.log(fragment, query); },
  pushState: true
});

var viewModel = {};
viewModel.router = ko.router.vm;
ko.applyBindings(vm);

/* Start the router */
ko.router.init();
```

---

### Router Binding
```
<!-- show list of routes (where `nav === true`) -->
<nav>
  <ul data-bind="foreach: router.navRoutes">
    <li data-bind="css: { active: isActive }"><a data-bind="text: config.title, attr: { href: config.href }"></a></li>
  </ul>
</nav>

<!-- routes defined in viewmodel -->
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

var vm = { router: ko.router.vm };
ko.applyBindings(vm);

ko.router.init();
```



## ToDo

* Add observable property to notify when nagivating. (for progress bars/spinners)
* Use the `visible` binding for toggling `route` bounded elements
* Transition animations
* Add option to cache views
* Add ability to define child routes/routers

## License
MIT https://github.com/alexbihary/knockout-router/blob/master/LICENSE
