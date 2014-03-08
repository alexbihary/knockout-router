define(['knockout', 'knockout-router'], function(ko) {
  
  function run() {
    var vm = { 
      router: ko.router.vm,
      moduleToShow: ko.observable()      
    };
    
    function notify() {
      //console.log(arguments, new Date());
    }
    
    function notFoundHandler(fragment) {
      
    }
    
    // Configure routing options before defining routes
    ko.router.configure({ hashPrefix: '#/', debug: true, notify: notify });
    
    // Define the routes before ko.applyBindings() 
    ko.router.map([
      { route: 'home', module: 'home', title: 'Welcome', nav: true }, // name: 'home,' view: 'home'
      { route: 'who-we-are', module: 'about', title: 'About Us' },          // name: 'about', view: 'about'
      { route: 'blog(/:slug)', title: 'Crazy Blog' },   // name|module|view: 'blog'
      { route: '*default', callback: notFoundHandler }
    ]);
    
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