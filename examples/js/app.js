define(['knockout', 'knockout-router'], function(ko) {

  function run() {
    var vm = {
      router: ko.router.vm,
      moduleToShow: ko.observable()
    };

    // Can attach a global subscription to be notified for all route changes.
    function notify() {
      console.log(arguments, new Date());
    }

    // Can attach a 'route not found' handler, which will be passed a url fragment and query string.
    function notFoundHandler(fragment, query) {
      console.log(fragment, query);
    }

    // Configure routing options before defining routes
    ko.router.configure({ hashPrefix: '#/', debug: true, notify: notify, pushState: true, root: '/knockout-router/' });

    // Configure module loader
    ko.bindingHandlers.module.baseDir = 'js';

    // Define the routes before ko.applyBindings()
    ko.router.map([
      { route: '', name: 'home', template: 'home', title: 'Welcome', nav: true },
      { route: 'who-we-are', name: 'about', title: 'About Us', nav: true },
      { route: 'contact-us', name: 'contact', title: 'Contact Us', nav: true },
      { route: 'content/news/:articleId', module: 'news' }
      //{ route: 'blog(/:slug)', name: 'blog', title: 'Crazy Blog' },
      //{ route: '*notfound', name: 'notfound', callback: notFoundHandler }
    ]).mapNotFound({ callback: notFoundHandler }); // can specify a module/template/callback/title

    // Bind the view model
    ko.applyBindings(vm);

    // Should call ko.router.init() after ko.applyBindings() when using
    // the route bindingHandler. otherwise could safely call ko.router.init()
    // once the routes have been defined.
    ko.router.init(); //calls ko.history.start() behind the scenes
  }

  return {
    run: run
  };

});
