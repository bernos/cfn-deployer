var assert = require('chai').assert,
    config = require('../lib/config.js');


describe("Configuration", function() {
  describe("validateConfig", function() {
    it("should return errors for invalid configuration file", function(done) {
      config.validate({}, function(err, config) {
        assert.isNotNull(err);
        done();
      });      
    });

    it("should return null for a valid configuration", function(done) {
      config.validate({
        StackName      : "MyStack",
        Version        : "1.0.1",
        Region         : "ap-southeast-2",
        TemplateFolder : "blah",
        MainTemplate   : "blah",
        Bucket         : "blah"
      }, function(err, config) {
        assert.isNull(err);
        done();
      });
    });
  });
  
});
/* 
describe("StateMachine", function(){
  describe("constructor", function() {
    
    it("should throw when spec is not provided", function(){
      expect(function(){
        new FSM();
      }).to.throw("No spec provided");
    });

    it("should throw when spec does not contain an intial state", function(){
      expect(function(){
        new FSM({});
      }).to.throw("Spec does not include 'initial' state");
    });

    it("should throw when spec does not contain any states", function(){
      expect(function(){
        var fsm = new FiniteStateMachine({
          initial : "waiting"
        });
      }).to.throw();
    });

    it("should throw when initial state does not exist", function() {
      expect(function(){
        var fsm = new FiniteStateMachine({
          initial : "waiting",
          states : {
            one : {}
          }
        });
      }).to.throw();
    });

  });

  describe("when executing a transition", function() 
  {
    it("should trigger the generic events for state exit, entry and change", function(){
      var result = [];

      function logState(e) {
        return function(fsm, state)
        {
          result.push(e + "." + state.name);
        }
      }

      getStateMachine()       
        .bind(FSM.EXIT,    logState("exit"))
        .bind(FSM.ENTER,   logState("enter"))
        .bind(FSM.CHANGE,  logState("change"))
        .run()
        .doAction("close");


      expect(result[0]).to.equal("enter.open");
      expect(result[1]).to.equal("change.open");
      expect(result[2]).to.equal("exit.open");
      expect(result[3]).to.equal("enter.closed");
      expect(result[4]).to.equal("change.closed");
    });

    it("should trigger transition events for each state", function() 
    {
      var result = [];

      function logState(e) {
        return function(fsm, state) {
          result.push(e);
        }
      }

      getStateMachine()
        .bind("open.exit", logState("open.exit"))
        .bind("closed.enter", logState("closed.enter"))
        .bind("closed.change", logState("closed.change"))
        .run()
        .doAction("close");

      expect(result[0]).to.equal("open.exit");
      expect(result[1]).to.equal("closed.enter");
      expect(result[2]).to.equal("closed.change");
    });
  });

  it("should initialize with initial state from spec", function() {
    var initialState = "waiting";
    var fsm = new FSM({
      initial : initialState,
      states : {
        waiting : {}
      }
    }).run();
    expect(fsm.getCurrentState().name).to.equal(initialState);
  })

});*/