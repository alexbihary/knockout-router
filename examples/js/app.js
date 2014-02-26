(function(ko, undefined) {
  
  var vm = {};
  ko.applyBindings(vm);
  ko.router.init({ hashPrefix: '#/', debug: true });
  
})(ko);