'use strict';

angular.module('sortinghatApp')
  .service('Data', function Wards($http, $q, $timeout) {
    var shared = { data: {} }
      ;

    // AngularJS will instantiate a singleton by calling "new" on this function
    function get () {
      var d = $q.defer()
        ;

      if (Object.keys(shared.data).length) {
        $timeout(function () {
          d.resolve(shared.data);
        });
      }

      $http.get('./data.json').success(function (_data) {
        var objs = { E: [], W: [], N: [], S: [] }
          , i
          ;

        shared.data = _data;
        d.resolve(shared.data);

        shared.data.qs = shared.data.questions.slice(0);
        shared.data.hemis = [];
        shared.data.nes = [];
        shared.data.sws = [];
        shared.data.questions.forEach(function (q) {
          if (q.E && q.N) {
            shared.data.nes.push(q);
            return;
          }
          if (q.W && q.S) {
            shared.data.sws.push(q);
            return;
          }

          shared.data.hemis.push(q);

          // Isolate hemi questions into
          // N vs E and S vs W questions
          if (q.N) {
            objs.N.push(q.N);
          }
          if (q.S) {
            objs.S.push(q.S);
          }
          if (q.E) {
            objs.E.push(q.E);
          }
          if (q.W) {
            objs.W.push(q.W);
          }
        });

        // Combine hemi isolates into NEs and SWs
        for (i = 0; i < objs.N.length; i += 1) {
          shared.data.nes.push({ number: 'NE' + (shared.data.qs.length + i), N: objs.N.pop(), E: objs.E.pop() });
          shared.data.sws.push({ number: 'SW' + (shared.data.qs.length + i), S: objs.S.pop(), W: objs.W.pop() });
        }

        console.log(shared.data);
      });

      return d.promise;
    }

    return {
      get: get
    };
  });
