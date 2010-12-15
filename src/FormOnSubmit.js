/*!
 Prototype based override of form.submit
 http://tfluehr.com
 
 Copyright (c) 2010 Timothy Fluehr tim@tfluehr.com
 
 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:
 
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 
 If you do choose to use this,
 please drop me an email at tim@tfluehr.com
 I would like to see where this ends up :)
 */
(function(){
  var REQUIRED_PROTOTYPE = '1.6.1';
  var checkRequirements = function(){
    function convertVersionString(versionString){ // taken from script.aculo.us
      var v = versionString.replace(/_.*|\./g, '');
      v = parseInt(v + '0'.times(4 - v.length), 10);
      return versionString.indexOf('_') > -1 ? v - 1 : v;
    }
    if ((typeof Prototype == 'undefined') ||
    (typeof Element == 'undefined') ||
    (typeof Element.Methods == 'undefined') ||
    (convertVersionString(Prototype.Version) <
    convertVersionString(REQUIRED_PROTOTYPE))) {
      throw ("ProtoCloud requires the Prototype JavaScript framework >= " +
      REQUIRED_PROTOTYPE +
      " from http://prototypejs.org/");
    }
  };
  checkRequirements();
  var wrapSubmit = function(form){
    form.store('CustomOriginalSubmit', form.submit);
    form.submit = function(){
      var args = $A(arguments);
      var ev = form.fire('Custom:Submit', args);
      if (!ev.stopped) {
        unwrapSubmit(form);
        var ev2 = form.fire('before:submit');
        if (!ev2.stopped) {
          form.submit();
          return true;
        }
        else{
          return false;
        }
      }
      else {
        return false;
      }
    };
  };
  var unwrapSubmit = function(form){
    var s = form.retrieve && form.retrieve('CustomOriginalSubmit');
    if (s) {
      form.store('CustomOriginalSubmit', null);
      form.submit = s;
    }
  };
  var runSubmit = function(ev){
    try {
      var form = ev.element();
      var ev2 = form.fire('before:submitHandlers');
      if (!ev2.stopped) {
        var handlers = this.retrieve('CustomSubmitRegistry');
        handlers.each((function(handler){
          if (!ev.stopped) {
            handler.call(this, ev);
          }
        }).bind(this));
        if (!ev.stopped) {
          ev2 = form.fire('after:submitHandlers');
          if (ev2.stopped) {
            ev.stop();
          }
        }
      }
      else {
        ev.stop();
      }
    } catch (e){
      // there was an error so stop the submit and throw the error in a defer so it gets out.
      ev.stop();
      (function(){
        throw e;
      }).defer();
    }
  };
  var customObserve = function(proceed, form, eventName, handler){
    var params = $A(arguments);
    params.shift();
    form = $(form);
    if (eventName == "submit" && !form.retrieve('CustomSubmitObserving')) {
      var reg = form.retrieve('CustomSubmitRegistry');
      if (!reg) {
        reg = [];
        wrapSubmit(form);
        form.store('CustomSubmitObserving', true);
        form.observe('submit', runSubmit.bind(form));
        form.observe('Custom:Submit', runSubmit.bind(form));
        form.store('CustomSubmitObserving', null);
      }
      if (typeof(handler) == 'function') {
        reg.push(handler);
      }
      form.store('CustomSubmitRegistry', reg);
      reg = null;
      return form;
    }
    else {
      return proceed.apply(this.prototype, params);
    }
  };
  var customStopObserving = function(proceed, form, eventName, handler){
    var params = $A(arguments);
    params.shift();
    form = $(form);
    if (!eventName) {
      unwrapSubmit(form);
      (form.store && form.store('CustomSubmitRegistry', null));
      return proceed.apply(this.prototype, params);
    }
    else if (eventName == "submit") {
      var reg;
      if ((reg = form.retrieve('CustomSubmitRegistry'))) {
        if (handler) {
          reg = reg.without(handler);
        }
        else {
          reg = [];
        }
        form.store('CustomSubmitRegistry', reg);
        reg = null;
      }
    }
    else {
      return proceed.apply(this.prototype, params);
    }
  };
  Element.addMethods('form', {
    observe: Element.observe.wrap(customObserve),
    stopObserving: Element.stopObserving.wrap(customStopObserving)
  });
  Event.observe = Event.observe.wrap(customObserve);
  Event.stopObserving = Event.stopObserving.wrap(customStopObserving);
})();
