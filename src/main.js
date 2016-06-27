$(function() {
  var onFailure = function(message) {
    var $main = $('.main');
    // empties all objects from the main div
    $main.empty();

    // then, adds a failure message
    $main.append('<div>'+ message +'</div>');
  };
  
  var onCredentialFailure = function() {
    onFailure('Failed to authorize API key and Secret Key');
  };

  var onCreateGroupFailure = function() {
    onFailure('Failed to create the photos group');
  }

  /** 
   * index.html expects a file called "apiData.js" in the src folder 
   * with three global variables: API_KEY (a string), API_SECRET (a string), 
   * and API_URL (a URL in string form). These can be obtained by signing up
   * at faceplusplus.com
   */ 
  var api = new FacePP(API_KEY, API_SECRET, {apiURL: API_URL});

  // First we delete any existing group from a prior instance
  api.request('group/delete', {
    group_name: 'people'
  }, function(err, result) {
    // if the error is 1003, then authentication failed
    if (err === 1003) {
      return onCredentialFailure();
    }
    // otherwise, we create a new group
    api.request('group/create', {
      group_name: 'people'
    }, function(err, result) {
      if (err) {
        console.log('Error:', err);
      } else {
        console.log('Success!', result);
      }
    });
  });
});
