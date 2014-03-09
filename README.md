knockout-router
===============

A simple take on routing for knockout applications.


### How to Use

1. Include knockout.js library
2. Include knockout-router.js library (supports commonjs, amd, or global)
3. Add `route` bindings to HTML markup
4. Call ko.router.init() after ko.applyBindings()


### Example bindings

```
<!-- Nav links assume that hashPrefix is set to '#/', see custom settings below. -->
<nav>
  <a href="#/">Root route</a>
  <a href="#/article">Show Article</a>
  <a href="#/another-article">2nd article</a>
</nav>

<div class="view" data-bind="route: '' ">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sit in!</div>
<div class="view" data-bind="route: 'article' ">
  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Suscipit nostrum id hic consectetur. 
  Cumque ab fuga ex enim tenetur porro qui totam dignissimos dicta explicabo.
</div>
<div class="view" data-bind="route: { pattern: '#/another-article' }">
  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quam quas quod excepturi. Ipsam in nemo pariatur 
  dolore optio suscipit itaque architecto repellat iusto esse rem voluptatum quia numquam tempore magnam 
  perspiciatis nam impedit officia! Et.
</div>
```



### Example CSS and JS

```
/* 
    CSS: good idea to intitially hide all blocks controlled by the router.
    The router will set display:block when the route is active.
*/
.view { display: none; }
```

```
/* 
    JS: 
*/
var viewModel = {}; //the view model
ko.applyBindings(vm);

//default settings
ko.router.init();

//custom settings
ko.router.init({
  hashPrefix: '#!/',
  debug: true
});
```

---

## Router Binding
```
<!-- routes defined in viewmodel -->
<div data-bind="router: { transition: 'entrance', cacheViews: true }"></div>
```
```
/* define routes */

ko.router.map([

  // name: 'home,' template: 'home'
  { route: ['', 'home'], module: 'home', title: 'Welcome', nav: true },
  
  // name: 'about', template: 'about'
  { route: 'who-we-are', module: 'about', title: 'About Us', nav: true },
  
  // name: 'contact', template: 'contact', title: 'Contact'
  { route: 'contact', module: 'contact', nav: true },
  
  // name: 'news', template: 'news', data: [':id']
  { route: 'content/news/:id', module: 'news', title: 'The News' }
  
]);

ko.router.map({
  parentRoute: 'contact',
  routes: [
    { route: 'video-landing-page', redirect: '' }
  ]
});

```



## ToDo

* Allow routes to be defined on the ko.router instead of in the binding
* Route parameters
* Load in external templates and/or modules
* Transition animations
* Add option to cache views

## License
MIT https://github.com/alexbihary/knockout-router/blob/master/LICENSE
