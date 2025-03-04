"use strict";

var util = require('../util');
var $ = util.$;

var Util = require('./util');

function evaluateXPath(xp, root, nsResolver) {
  var exception, idx, name, node, step, steps, _i, _len, _ref;
  if (root == null) {
    root = document;
  }
  if (nsResolver == null) {
    nsResolver = null;
  }
  try {
    return document.evaluate('.' + xp, root, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  } catch (_error) {
    exception = _error;
    console.log("XPath evaluation failed.");
    console.log("Trying fallback...");
    steps = xp.substring(1).split("/");
    node = root;
    for (_i = 0, _len = steps.length; _i < _len; _i++) {
      step = steps[_i];
      _ref = step.split("["), name = _ref[0], idx = _ref[1];
      idx = idx != null ? parseInt((idx != null ? idx.split("]") : void 0)[0]) : 1;
      node = findChild(node, name.toLowerCase(), idx);
    }
    return node;
  }
};

function simpleXPathJQuery($el, relativeRoot) {
  var jq;
  jq = $el.map(function() {
    var elem, idx, path, tagName;
    path = '';
    elem = this;
    while ((elem != null ? elem.nodeType : void 0) === Util.NodeTypes.ELEMENT_NODE && elem !== relativeRoot) {
      tagName = elem.tagName.replace(":", "\\:");
      idx = $(elem.parentNode).children(tagName).index(elem) + 1;
      idx = "[" + idx + "]";
      path = "/" + elem.tagName.toLowerCase() + idx + path;
      elem = elem.parentNode;
    }
    return path;
  });
  return jq.get();
};

function simpleXPathPure($el, relativeRoot) {
  var getPathSegment, getPathTo, jq, rootNode;
  getPathSegment = function(node) {
    var name, pos;
    name = getNodeName(node);
    pos = getNodePosition(node);
    return "" + name + "[" + pos + "]";
  };
  rootNode = relativeRoot;
  getPathTo = function(node) {
    var xpath;
    xpath = '';
    while (node !== rootNode) {
      if (node == null) {
        throw new Error("Called getPathTo on a node which was not a descendant of @rootNode. " + rootNode);
      }
      xpath = (getPathSegment(node)) + '/' + xpath;
      node = node.parentNode;
    }
    xpath = '/' + xpath;
    xpath = xpath.replace(/\/$/, '');
    return xpath;
  };
  jq = $el.map(function() {
    var path;
    path = getPathTo(this);
    return path;
  });
  return jq.get();
};

function findChild(node, type, index) {
  var child, children, found, name, _i, _len;
  if (!node.hasChildNodes()) {
    throw new Error("XPath error: node has no children!");
  }
  children = node.childNodes;
  found = 0;
  for (_i = 0, _len = children.length; _i < _len; _i++) {
    child = children[_i];
    name = getNodeName(child);
    if (name === type) {
      found += 1;
      if (found === index) {
        return child;
      }
    }
  }
  throw new Error("XPath error: wanted child not found.");
};

function getNodeName(node) {
  var nodeName;
  nodeName = node.nodeName.toLowerCase();
  switch (nodeName) {
    case "#text":
      return "text()";
    case "#comment":
      return "comment()";
    case "#cdata-section":
      return "cdata-section()";
    default:
      return nodeName;
  }
};

function getNodePosition(node) {
  var pos, tmp;
  pos = 0;
  tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos += 1;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
};

function fromNode($el, relativeRoot) {
  var exception, result;
  try {
    result = simpleXPathJQuery($el, relativeRoot);
  } catch (_error) {
    exception = _error;
    console.log("jQuery-based XPath construction failed! Falling back to manual.");
    result = simpleXPathPure($el, relativeRoot);
  }
  return result;
};

function toNode(path, root) {
  var customResolver, namespace, node, segment;
  if (root == null) {
    root = document;
  }
  if (!$.isXMLDoc(document.documentElement)) {
    return evaluateXPath(path, root);
  } else {
    customResolver = document.createNSResolver(document.ownerDocument === null ? document.documentElement : document.ownerDocument.documentElement);
    node = evaluateXPath(path, root, customResolver);
    if (!node) {
      path = ((function() {
        var _i, _len, _ref, _results;
        _ref = path.split('/');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          segment = _ref[_i];
          if (segment && segment.indexOf(':') === -1) {
            _results.push(segment.replace(/^([a-z]+)/, 'xhtml:$1'));
          } else {
            _results.push(segment);
          }
        }
        return _results;
      })()).join('/');
      namespace = document.lookupNamespaceURI(null);
      customResolver = function(ns) {
        if (ns === 'xhtml') {
          return namespace;
        } else {
          return document.documentElement.getAttribute('xmlns:' + ns);
        }
      };
      node = evaluateXPath(path, root, customResolver);
    }
    return node;
  }
};

exports.fromNode = fromNode;
exports.toNode = toNode;
