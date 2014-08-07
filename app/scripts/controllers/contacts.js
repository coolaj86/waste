'use strict';

angular.module('yololiumApp')
  .controller('ContactsCtrl', function (StContacts) {
    var C = this
      ;

    C.nodes = [];

    StContacts.fetch().then(function (nodes) {
      C.nodes = nodes;
    });

    C.updateNode = function (node) {
      StContacts.update(node).then(function (newNode) {
        angular.copy(newNode, node);
      });
    };

    C.addNode = function () {
      StContacts.create({ type: C.nodeType, node: C.nodeValue }).then(function (node) {
        C.nodes.push(node);
      });
    };

    C.removeNode = function (node) {
      StContacts.delete(node).then(function () {
        // remove the node from the list
        // in the future we should setup an efficient system for just fetching
        // and re-rendering the table... but that's too much to setup right now
        C.nodes.forEach(function (n, i) {
          if (n.uuid === node.uuid) {
            C.nodes.splice(i, i + 1);
          }
        });
      });
    };
  });
