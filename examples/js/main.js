require.config({
  baseUrl: '/examples',
  paths: {
    'knockout': 'lib/knockout-3.0.0',
    'knockout-amd-helpers': 'lib/knockout-amd-helpers-0.6.1',
    'knockout-history': '../src/knockout-history',
    'knockout-router': '../src/knockout-router',
    
    'text': 'lib/require-text-2.0.10'
  },
  shim: {
    'knockout-amd-helpers': {
      deps: ['knockout']
    },
    'knockout-history': {
      deps: ['knockout']
    },
    'knockout-router': {
      deps: ['knockout', 'knockout-amd-helpers', 'knockout-history']
    }
  }
});

define(['js/app'], function(app) {
  app.run();
});