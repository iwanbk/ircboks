ircboksApp.directive('scrollItem',function(){
    return{
    restrict: "A",
    link: function(scope, element, attributes) {
        if (scope.$last){
           scope.$emit("Finished");
       }
    }
   };
});

ircboksApp.directive('scrollIf', function() {
return{
    restrict: "A",
    link: function(scope, element, attributes) {
        scope.$on("Finished",function(){
            if (scope.chattab[scope.activeChan].lastScrollPos === undefined || 
              (scope.chattab[scope.activeChan].needScrollBottom !== undefined && 
              scope.chattab[scope.activeChan].needScrollBottom === true)) {
                var scrollHeight = element[0].scrollHeight;
                element.scrollTop(scrollHeight);
                scope.chattab[scope.activeChan].needScrollBottom = false;
            } else {
              element.scrollTop(scope.chattab[scope.activeChan].lastScrollPos);
            }
        });
    }
   };
  });