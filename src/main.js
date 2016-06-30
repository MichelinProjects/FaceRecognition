$(function() {
  var $spinner = $('.spinner');
  var $loadComplete = $('.load-complete');
  var $personListTable = $('.person-list-table');
  var $groupDeleted = $('.group-deleted');
  var $personPhoto = $('#upload-person-photo');
  var $uploadPersonPreview = $('.upload-person-preview');
  var $uploadFacePreview = $('.upload-face-preview');

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

  var generatePreview = function(fileSrc) {
    var $preview = $('<img class="col-xs-6 col-sm-4" src="'+ fileSrc + '">');
    return $preview;
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

  $personPhoto.on('change', function(event) {
    var files = $personPhoto[0].files;
    var filesLength = files.length;
    $uploadPersonPreview.empty();

    var reader = new FileReader();
    var index = 0;

    reader.onload = function(event) {
      $uploadPersonPreview.append(generatePreview(event.target.result));
      index++;
      if (files[index]) {
        reader.readAsDataURL(files[index]);
      }
    }
    reader.readAsDataURL(files[index]);
  });

  //Event listener for "Add Person" button
  $('.upload-person').on('submit', function(event) {
    event.preventDefault();
    statusClear();

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

    var addFaces = function(photoList, personName, index) {
      if (photoList.length === index) return;
      api.request('detection/detect', {
          mode: 'oneface',
          img: photoList[index]
        }, function(err, result) {
          if (err) {
            return onUnknownFailure(err);
          } else {
            if (result.face[0]) {
              var faceId = result.face[0].face_id;
              api.request('person/add_face', {
                person_name: personName,
                face_id: faceId
              }, function(err, result) {
                if (err) {
                  return onUnknownFailure(err);
                } else {
                  if (namesList.indexOf(personName) === -1 ) {
                    console.log('Added', personName);
                    $personListTable.append('<tr><td>' + personName + '</td></tr>');
                    namesList.push(personName);
                  } else {
                    console.log('Did not add', personName);
                  }
                  addFaces(photoList, personName, index + 1);
                }
              });
            } else {
              alert('No faces were detected');
              addFaces(photoList, personName, index + 1);
            }
          }
        });
    }

    api.request('person/create', {
      person_name: newPersonName,
      group_name: 'people'
    }, function(err, result) {
      if (err && err !== 1503) {
        return onUploadFailure();
      } else {
        addFaces($personPhoto[0].files, newPersonName, 0);
      }
    });
    
  });

  // Event Listener for "Prepare Group" button
  $('.lock-group').on('submit', function(event) {
    event.preventDefault();
    $spinner.show();

    api.request('train/identify', {
      group_name: 'people'
    }, function(err, result) {
      if (err) {
        return onUnknownFailure(err);
      } else {
        var sessionId = result.session_id;
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

  // Event Listener for "Clear Group" button
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
      api.request('group/create', {
        group_name: 'people'
      },function(err, result) {
        if (err) {
          onUnknownFailure(err);
        } else {
          console.log('recreated group');
        }
      });
      $groupDeleted.show();
    });
  });

  $('#upload-face-photo').on('change', function(event) {

  });

  // Event Listener for "Analyze this Photo" button
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