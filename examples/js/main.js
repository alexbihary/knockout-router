require.config({
  baseUrl: '/knockout-router/examples',
  paths: {
    'knockout': 'lib/knockout-3.1.0.min',
    'knockout-amd-helpers': 'lib/knockout-amd-helpers-0.6.1',
    'knockout-history': '../dist/knockout-history',
    'knockout-router': '../dist/knockout-router',

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
      deps: ['knockout', 'knockout-history', 'knockout-amd-helpers']
    }
  }
});

define(['js/app'], function(app) {
  app.run();
});