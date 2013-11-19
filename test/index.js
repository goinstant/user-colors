/*jshint browser:true, node: false*/
/*global require, describe, it, beforeEach*/
'use strict';

window.goinstant = {
  errors: {
    CollisionError: function(msg){
      this.message = msg;
    }
  }
};

describe('User Colors Component', function() {
  var UserColors = require('user-colors');
  var userColors;

  var USER_PROPERTY = UserColors.USER_PROPERTY;
  var DEFAULT_COLORS = UserColors.DEFAULT_COLORS;

  var assert = window.assert;
  var sinon = window.sinon;

  var fakeRoom;
  var fakeUser;
  var fakeUserKey;

  var fakeUsers; // TODO: Not needed
  var fakeUsersKey;
  var fakeUserKeys;

  var fakeLockedKey;
  var lockedMap;

  var goinstant = window.goinstant;

  var TAKEN_BY_USERS = [
    UserColors.DEFAULT_COLORS[0],
    UserColors.DEFAULT_COLORS[1]
  ];

  function createFakeKey(name) {
    return {
      name: name,
      get: sinon.stub().yields(),
      set: sinon.stub().yields(),
      key: createFakeKey,
      remove: sinon.stub().yields()
    };
  }

  beforeEach(function() {
    fakeRoom = {};
    fakeRoom._platform = {};

    fakeUser = {
      displayName: 'Guest',
      id: '1234',
    };
    fakeUser[USER_PROPERTY] = TAKEN_BY_USERS[0];

    fakeUserKey = createFakeKey('guest1');
    fakeUserKey.get = sinon.stub().yields(null, fakeUser, {});
    fakeRoom.self = sinon.stub().returns(fakeUserKey);

    fakeRoom._platform._user = fakeUser;

    fakeUsers = [
      {
        displayName: 'Guest',
        id: '1234',
        get: function(cb) {
          return cb(null, fakeUsers[0]);
        },
        set: function(value, opts, cb) {
          return cb(null, value);
        },
        key: function() {
          return fakeUsers[0];
        }
      },
      {
        displayName: 'Guest',
        id: '5678',
        get: function(cb) {
          return cb(null, fakeUsers[1]);
        },
        set: function(value, opts, cb) {
          return cb(null, value);
        },
        key: function() {
          return fakeUsers[1];
        }
      }
    ];

    fakeUsers[0][USER_PROPERTY] = TAKEN_BY_USERS[0];
    fakeUsers[1][USER_PROPERTY] = TAKEN_BY_USERS[1];

    fakeUserKeys = [
      createFakeKey(),
      createFakeKey()
    ];

    fakeUsersKey = createFakeKey('/.users');

    fakeLockedKey = createFakeKey('locked');
    var fakeContext = {};
    lockedMap = {};

    lockedMap[UserColors.DEFAULT_COLORS[5].substring(1)] = 'fake id';
    lockedMap[UserColors.DEFAULT_COLORS[11].substring(1)] = 'another fake id';

    fakeLockedKey.get = sinon.stub().yields(null, lockedMap, fakeContext);

    fakeRoom.key = sinon.stub();
    fakeRoom.key.returns(createFakeKey());
    fakeRoom.key.withArgs('/.users/' + fakeUsers[0].id).returns(fakeUsers[0]);

    fakeRoom.key.withArgs(UserColors.KEY_NAMESPACE).returns(fakeLockedKey);
  });

  describe('constructor', function() {
    it('returns a new instance of UserColors', function() {
      var options = {
        room: fakeRoom
      };

      userColors = new UserColors(options);

      assert.isObject(userColors);
    });

    describe('errors', function() {
      it('throws if not passed options argument', function() {
        assert.exception(function() {
          userColors = new UserColors();
        }, 'UserColors: Options was not found or invalid');
      });

      it('throws if options passed is not an object', function() {
        assert.exception(function() {
          var options = 'options';

          userColors = new UserColors(options);
        }, 'UserColors: Options was not found or invalid');
      });

      it('throws if passed a invalid arugment', function() {
        assert.exception(function() {
          var options = {
            room: fakeRoom,
            foo: 'bar'
          };

          userColors = new UserColors(options);
        }, 'UserColors: Invalid argument passed');
      });

      it('throws if not passed a room', function() {
        assert.exception(function() {
          userColors = new UserColors({});
        }, 'UserColors: Room was not found or invalid');
      });

      it('throws if passed room is not an object', function() {
        assert.exception(function() {
          var options = {
            room: 'room'
          };

          userColors = new UserColors(options);
        }, 'UserColors: Room was not found or invalid');
      });

      it('throws error if optional colors aren\'t passed as array', function() {
        assert.exception(function() {
          var options = {
            room: fakeRoom,
            colors: {}
          };

          userColors = new UserColors(options);
        }, 'UserColors: Colors must be passed as an array');
      });

      it('throws error if colors in array aren\'t strings', function() {
        assert.exception(function() {
          var options = {
            room: fakeRoom,
            colors: ['red', 'green', 'blue', true]
          };

          userColors = new UserColors(options);
        }, 'UserColors: A color must be passed as a string');
      });
    });
  });

  describe('choose', function() {
    beforeEach(function() {
      var options = {
        room: fakeRoom
      };

      userColors = new UserColors(options);

      userColors.room.key.withArgs(USER_PROPERTY + '/locks').returns(
                                                              fakeLockedKey);
    });

    it('returns an existing color for the current user', function(done) {
      lockedMap[TAKEN_BY_USERS[0].substr(1)] = fakeUsers[0].id;

      userColors.choose(function(err, color) {
        assert.ifError(err);
        assert.equal(color, TAKEN_BY_USERS[0]);

        // Assert did not re-assigned the color to the user or try to lock a
        // color.
        sinon.assert.notCalled(fakeUserKey.set);
        sinon.assert.notCalled(fakeLockedKey.set);

        done();
      });
    });

    it('returns a new color for the current user', function(done) {
      // Remove the mocked color on the current user,
      // Update another user to have their original color so it is taken.
      fakeUsers[0][USER_PROPERTY] = null;
      lockedMap[TAKEN_BY_USERS[0].substr(1)] = fakeUsers[1].id;

      userColors.choose(function(err, color) {
        assert.ifError(err);
        assert.notEqual(color, TAKEN_BY_USERS[0]);
        assert.include(DEFAULT_COLORS, color);

        done();
      });
    });

    it('returns default color when all others are taken', function(done) {
      // Remove the mocked color on the current user
      fakeUsers[0][USER_PROPERTY] = null;

      // Overwrite the locked map and fill it so we can't get a "free" color
      for(var i = 0; i < DEFAULT_COLORS.length; i++) {
        var color = DEFAULT_COLORS[i];
        lockedMap[color.substr(1)] = 'taken';
      }

      userColors.choose(function(err, color) {
        assert.ifError(err);
        assert.equal(UserColors.DEFAULT_COLOR, color);
        done();
      });
    });

    it('gets new color when first attempt is taken', function(done) {
      fakeUsers[0][USER_PROPERTY] = null;

      var fakeColorKey = createFakeKey();
      var collisionError = new goinstant.errors.CollisionError();

      fakeColorKey.set = sinon.stub().yields(collisionError);

      sinon.stub(fakeLockedKey, 'key', function() {
        if (fakeLockedKey.key.callCount === 1) {
          // On first call return the key that will cause a collision error
          return fakeColorKey;
        } else {
          // Any other time return mock key as usual
          return createFakeKey();
        }
      });

      userColors.choose(function(err, color) {
        assert.ifError(err);
        assert.equal(fakeLockedKey.key.callCount, 2);
        assert.notEqual(color, DEFAULT_COLORS[0]);
        assert.include(DEFAULT_COLORS, color);

        done();
      });
    });

    it('re-fetches the locks if all colors are exhausted', function(done) {
      var collisionError = new goinstant.errors.CollisionError();
      var collisionKey = {
        set: sinon.stub().yields(collisionError)
      };

      sinon.stub(fakeLockedKey, 'key').returns(collisionKey);

      fakeLockedKey.get = sinon.spy(function(cb) {
        // On the second call return the filled lock map to simulate that all
        // the colors have been taken in the meantime.
        if (fakeLockedKey.get.callCount === 2) {
          for (var i = 0; i < DEFAULT_COLORS.length; ++i) {
            lockedMap[DEFAULT_COLORS[i].substr(1)] = 'taken';
          }
        }

        cb(null, lockedMap);
      });

      userColors.choose(function(err, color) {
        assert.ifError(err);
        // All colors were taken, so should have returned the default color.
        assert.equal(color, UserColors.DEFAULT_COLOR);
        // Should have fetched the locks twice: once initially (returned lockMap
        // with available locks) and once after failing to acquire any of the
        // locks (returns a full map)
        sinon.assert.callCount(fakeLockedKey.get, 2);
        done();
      });
    });

    describe('errors', function() {
      it('throws an error if no arguments are passed', function() {
        assert.exception(function() {
          userColors.choose();
        }, 'choose: Callback was not found or invalid');
      });

      it('throws an error if an non-function is passed', function() {
        assert.exception(function() {
          userColors.choose('1234');
        }, 'choose: Callback was not found or invalid');
      });

      it('returns an error when failing to retrieve user', function(done) {
        fakeUserKey.get = sinon.stub().yields(new Error());
        userColors.choose(function(err, color) {
          assert.isDefined(err);
          assert.isUndefined(color);
          done();
        });
      });

      it('returns an error when failing to retrieve locks', function(done) {
        fakeLockedKey.get = sinon.stub().yields(new Error());
        userColors.choose(function(err, color) {
          assert.isDefined(err);
          assert.isUndefined(color);
          done();
        });
      });

      it('returns an error when failing to set color in user', function(done) {
        var badKey = { set: sinon.stub().yields(new Error()) };
        fakeUserKey.key = sinon.stub().returns(badKey);

        userColors.choose(function(err, color) {
          assert.isDefined(err);
          assert.isUndefined(color);
          done();
        });
      });

      it('returns an error when failing to set lock', function(done) {
        var firstColorKeyName = DEFAULT_COLORS[0].substring(1);

        var failingKey = createFakeKey();
        failingKey.set = sinon.stub().yields(new Error());

        fakeLockedKey.key = sinon.stub();
        fakeLockedKey.key.withArgs(firstColorKeyName)
                         .returns(failingKey);

        userColors.choose(function(err, color) {
          assert.isDefined(err);
          assert.isUndefined(color);
          done();
        });
      });
    });

    describe('optional color override', function() {
      var colors;

      beforeEach(function() {
        colors = [
          'red',
          'green',
          'blue',
          'yellow'
        ];

        var options = {
          room: fakeRoom,
          colors: colors
        };

        userColors = new UserColors(options);
      });

      it('Assigns from the custom colors', function(done) {
        fakeUser[USER_PROPERTY] = null;
        fakeUsers[0][USER_PROPERTY] = null;

        userColors.choose(function(err, color) {
          assert.ifError(err);
          assert.equal(color, colors[0]);
          done();
        });
      });
    });
  });
});
