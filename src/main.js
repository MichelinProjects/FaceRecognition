$(function() {
  var api = new FacePP(API_KEY, API_SECRET, {apiURL: API_URL});
  api.request('group/delete', {
    group_name: 'people'
  }, function(err, result) {
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
