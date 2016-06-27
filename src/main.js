$(function() {
  var namesList = [];
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
    onFailure('Failed to create the photos group, already exists');
  };

  var onUploadFailure = function () {
    onFailure('Failed to upload');
  };

  var onUnknownFailure = function (error) {
    onFailure('Unknown error', error);
  };

  /** 
   * index.html expects a file called "apiData.js" in the src folder 
   * with three global variables: API_KEY (a string), API_SECRET (a string), 
   * and API_URL (a URL in string form). These can be obtained by signing up
   * at faceplusplus.com
   */ 
  var api = new FacePP(API_KEY, API_SECRET, {apiURL: API_URL});

  // create a new group
  api.request('group/create', {
    group_name: 'people'
  }, function(err, result) {
    if (err === 1503) {
      //return onCreateGroupFailure();
    } else if (err === 1003) {
      return onCredentialFailure();
    } else if (err) {
      return onUnknownFailure(err);
    }

    api.request('group/get_info', {
      group_name: 'people'
    }, function(err, result) {
      if (err) {
        return onUnknownFailure();
      } else {
        var groupPersonName;
        for (var i = 0; i < result.person.length; i++) {
          groupPersonName = result.person[i].person_name;
          $('.person-list-table').append('<tr><td>' + groupPersonName + '</td></tr>');
          namesList.push(groupPersonName);
        }
      }
    }
    )
  });

  //Event listener for adding a person
  $('.upload-person').on('submit', function(event) {
    event.preventDefault();

    var $personPhoto = $('#upload-person-photo');

    if ($personPhoto.val()) {
      console.log("Photo added");
    } else {
      return alert("Please enter a person's photo");
    }

    var newPersonName = $.trim($('#upload-person-name').val());

    if (newPersonName !== "") {
      console.log("Name added");
    } else {
      return alert("Please enter a person's name");
    }

    api.request('person/create', {
      person_name: newPersonName,
      group_name: 'people'
    }, function(err, result) {
      if (err && err !== 1503) {
        return onUploadFailure();
      } else {
        api.request('detection/detect', {
          img: $personPhoto[0].files[0]
        }, function(err, result) {
          if (err) {
            return onUnknownFailure(err);
          } else {
            if (result.face[0]) {
              var faceId = result.face[0].face_id;
              api.request('person/add_face', {
                person_name: newPersonName,
                face_id: faceId
              }, function(err, result) {
                if (err) {
                  return onUnknownFailure(err);
                } else {
                  if (namesList.indexOf(newPersonName) === -1 ) {
                    console.log('Added', newPersonName);
                    $('.person-list-table').append('<tr><td>' + newPersonName + '</td></tr>');
                  } else {
                    console.log('Did not add', newPersonName);
                  }
                }
              });
            } else {
              alert('No faces were detected');
            }
          }
        });
      }
    });
    
  })

});
