require.config({
  baseUrl: 'examples',
  paths: {
    'knockout': 'lib/knockout-3.0.0',
    'knockout-amd-helpers': 'lib/knockout-amd-helpers-0.6.1',
    'knockout-router': '../dist/knockout-router',
    
    'text': 'lib/require-text-2.0.10'
  },
  shim: {
    'knockout-amd-helpers': {
      deps: ['knockout']
    },
    'knockout-router': {
      deps: ['knockout']
    }
  }
});

define(['js/app'], function(app) {
  app.run();
});