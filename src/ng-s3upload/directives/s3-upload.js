angular.module('ngS3upload.directives', []).
  directive('s3Upload', ['$parse', 'S3Uploader', 'ngS3Config', function ($parse, S3Uploader, ngS3Config) {
    return {
      restrict: 'AC',
      require: '?ngModel',
      replace: true,
      transclude: false,
      scope: true,
      controller: ['$scope', '$element', '$attrs', '$transclude', function ($scope, $element, $attrs, $transclude) {
        $scope.attempt = false;
        $scope.success = false;
        $scope.uploading = false;

        $scope.barClass = function () {
          return {
            "bar-success": $scope.attempt && !$scope.uploading && $scope.success
          };
        };
      }],
      compile: function (element, attr, linker) {
        return {
          //----------------------------------------
          // [remove]
          // get bucket name from service instead of attribute
          //----------------------------------------
          // pre: function ($scope, $element, $attr) {
          //   if (angular.isUndefined($attr.bucket)) {
          //     throw Error('bucket is a mandatory attribute');
          //   }
          // },
          // [end remove] -----------------------------
          post: function (scope, element, attrs, ngModel) {
            // Build the opts array
            var opts = angular.extend({}, scope.$eval(attrs.s3UploadOptions || attrs.options));
            opts = angular.extend({
              submitOnChange: true,
              getOptionsUri: '/getS3Options',
              acl: 'public-read',
              uploadingKey: 'uploading',
              folder: '',
              enableValidation: true,
              targetFilename: null
            }, opts);
            //----------------------------------------
            // [remove]
            // get bucket name from service instead of attribute
            //----------------------------------------
            // var bucket = scope.$eval(attrs.bucket);
            // [end remove] -----------------------------

            // Bind the button click event

            //----------------------------------------
            // [edit]
            // button may be not first element, find it first
            // if not found fallback to first child
            //----------------------------------------
            var button = element.find("button")[0];
            if(button){
              button = angular.element(button);
            }
            else{
            // [end edit] ----------------------------
              button = angular.element(element.children()[0]);
            // ---------------------------------------
            // [edit] 
            }
            // [end edit] ----------------------------

            var file = angular.element(element.find("input")[0]);
            button.bind('click', function (e) {
              file[0].click();
            });

            // Update the scope with the view value
            ngModel.$render = function () {
              scope.filename = ngModel.$viewValue;
            };

            var uploadFile = function () {
              //----------------------------------------
              // [edit]
              // upload next time need to clear data first
              // remove filename and progress
              //----------------------------------------
              delete scope.filename;
              delete scope.progress;
              // [end edit] ----------------------------
              var selectedFile = file[0].files[0];
              var filename = selectedFile.name;
              var ext = filename.split('.').pop();

              S3Uploader.getUploadOptions(opts.getOptionsUri).then(function (s3Options) {
                if (opts.enableValidation) {
                  ngModel.$setValidity('uploading', false);
                }

                //----------------------------------------
                // [edit]
                // get bucket name from service instead of attribute
                //----------------------------------------
                var s3Uri = 'https://' + s3Options.bucket + '.s3.amazonaws.com/';
                // [end edit] ----------------------------
                var key = opts.targetFilename ? scope.$eval(opts.targetFilename) : opts.folder + (new Date()).getTime() + '-' + S3Uploader.randomString(16) + "." + ext;
                S3Uploader.upload(scope,
                    s3Uri,
                    key,
                    opts.acl,
                    selectedFile.type,
                    s3Options.key,
                    s3Options.policy,
                    s3Options.signature,
                    selectedFile
                  ).then(function () {
                    ngModel.$setViewValue(s3Uri + key);
                    scope.filename = ngModel.$viewValue;

                    if (opts.enableValidation) {
                      ngModel.$setValidity('uploading', true);
                      ngModel.$setValidity('succeeded', true);
                    }
                  }, function () {
                    scope.filename = ngModel.$viewValue;

                    if (opts.enableValidation) {
                      ngModel.$setValidity('uploading', true);
                      ngModel.$setValidity('succeeded', false);
                    }
                  });

              }, function (error) {
                throw Error("Can't receive the needed options for S3 " + error);
              });

            };

            element.bind('change', function (nVal) {
              if (opts.submitOnChange) {
                scope.$apply(function () {
                  uploadFile();
                });
              }
            });

            if (angular.isDefined(attrs.doUpload)) {
              scope.$watch(attrs.doUpload, function(value) {
                if (value) uploadFile();
              });
            }
          }
        };
      },
      templateUrl: function(elm, attrs) {
        var theme = attrs.theme || ngS3Config.theme;
        return 'theme/' + theme + '.html';
      }
    };
  }]);