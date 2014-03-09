define(['knockout'], function(ko) {
  
  var initialize = function(articleId) {
    article('article' + articleId);
  }
  var article = ko.observable();
  
  return {
    article: article,
    initialize: initialize
  };
});