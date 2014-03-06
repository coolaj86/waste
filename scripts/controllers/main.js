'use strict';

angular.module('sortinghatApp')
  .controller('MainCtrl', function ($timeout, mySession, data) {
    var $scope = this
      , quiz
      ;

    console.log('data');
    console.log(data);

    $scope.data = data;

    quiz = window.Quizomatic.create(data, { randomize: true });

    $scope.outcomes = data.outcomes;

    function presentQuestion(data) {
      var current = data.current
        , remaining = data.remaining
        , total = data.total
        ;

      // TODO put at quiz level
      $scope.total = total;

      $scope.current = current;
      $scope.current.remaining = remaining;
      $scope.current.total = total;
      $scope.current.question = current.question;
      $scope.current.choices = current.choices;
    }

    function interpretAnswer(num) {
      quiz.respond(Number(num));

      if (quiz.hasNext()) {
        presentQuestion(quiz.next());
        return;
      }

      saveResponses();
    }

    function saveResponses() {
      var responses = quiz.responses()
        , totals = quiz.totals()
        , sorted
        ;

      $scope.current = null;
      $scope.results = totals;
      $scope.responses = responses;

      sorted = Object.keys(totals).sort(function (keyA, keyB) {
        return totals[keyB] - totals[keyA];
      });
      $scope.result = sorted[0];
      $scope.confidence1 =
        (100 *
          (totals[sorted[0]] - totals[sorted[1]])
        / (totals[sorted[0]] + totals[sorted[1]])
        ).toFixed(2);
      $scope.confidence2 =
        (100 * (totals[sorted[0]] / ($scope.total / (sorted.length/2)) )).toFixed(2);
    }

    $scope.startQuiz = function () {
      presentQuestion(quiz.next());
    };

    $scope.respond = interpretAnswer;
  });
