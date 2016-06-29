$(function() {
  var $spinner = $('.spinner');
  var $loadComplete = $('.load-complete');
  var $personListTable = $('.person-list-table');
  var $groupDeleted = $('.group-deleted');

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

  var statusClear = function() {
    $spinner.hide();
    $groupDeleted.hide();
    $loadComplete.hide();
  };

  statusClear();

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
    statusClear();

    var $personPhoto = $('#upload-person-photo');

    if ($personPhoto.val()) {
      console.log("Photo added");
    } else {
      return alert("Please upload a person's photo");
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
          mode: 'oneface',
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
                    $personListTable.append('<tr><td>' + newPersonName + '</td></tr>');
                    namesList.push(newPersonName);
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
    
  });

  $('.lock-group').on('submit', function(event) {
    event.preventDefault();
    $spinner.show();

    api.request('train/identify', {
      group_name: 'people'
    }, function(err, result) {
      if (err) {
        return onUnknownFailure(err);
      } else {
        var sessionId = result.session_id
        setTimeout(function checkTrainStatus() {
          api.request('info/get_session', {
            session_id: sessionId
          }, function(err, result) {
            if (err) {
              return onUnknownFailure(err);
            } else {
              if (result.status === 'SUCC') {
                $spinner.hide();
                $loadComplete.show();
              } else {
                setTimeout(checkTrainStatus, 3000);
              }
            }
          });
        }, 3000);
      }
    });
  });

  $('.clear-group').on('submit', function(event) {
    event.preventDefault();
    $personListTable.empty();
    $personListTable.append($('<tr><th>Names</th></tr>'));

    api.request('group/delete', {
      group_name: 'people'
    }, function(err, result) {
      api.request('info/get_person_list', {},function(err, result) {
        var personList = result.person.map(function(person) {
          return person.person_name;
        });
        api.request('person/delete', {
          person_name: personList
        }, function(err, result) {
          if (err) {
            console.log('error deleting', err, result);
          } else {
            console.log('successful delete', result);
          }
        });  
      });
      $groupDeleted.show();
    });
  });

  $('.upload-face-reg').on('submit', function(event) {
    event.preventDefault();
    statusClear();

    var $faceRecResult = $('.face-rec-result');
    var $faceReg = $('#upload-face-reg-photo');

    if ($faceReg.val()) {
      api.request('recognition/identify', {
        mode: 'oneface',
        group_name: 'people',
        img: $faceReg[0].files[0]
      }, function(err, result) {
        if (err) {
          return onUnknownFailure(err);
        } else {
          $faceRecResult.empty();
          var candidates = result.face[0].candidate;
          var $candidateDiv;

          for (var i = 0; i < candidates.length; i++) {
            $candidateDiv = $('<div></div');
            $candidateDiv.text(candidates[i].person_name + ' : ' + candidates[i].confidence + "%");

            $faceRecResult.append($candidateDiv);
          }
        }
      });
    } else {
      console.log('Please select a photo');
    }
  });

});