(async () => {
  try {
    const path = require('path');
    const auth = require(path.join(__dirname, '..', 'dist', 'controllers', 'auth.controller.js')).authController;
    const playerModel = require(path.join(__dirname, '..', 'dist', 'models', 'player.model.js'));

    // Stub Player.create
    const originalCreate = playerModel.Player.create;
    playerModel.Player.create = async (obj) => {
      console.log('Stubbed Player.create called with:', obj);
      return {
        _id: 'stubbed_guest_id',
        ...obj,
        battingStyle: null,
        bowlingStyle: null,
        teams: [],
        guestLimitations: obj.guestLimitations
      };
    };

    const req = { body: { name: 'Guest Tester' } };

    const res = {
      status(code) {
        this._status = code; return this;
      },
      json(payload) {
        console.log('Response status:', this._status || 200);
        console.log('Response payload:', JSON.stringify(payload, null, 2));
      }
    };

    await auth.guestLogin(req, res);

    // Restore
    playerModel.Player.create = originalCreate;

    console.log('Stubbed guest login test complete');
  } catch (e) {
    console.error('Error running guest login test:', e);
    process.exit(1);
  }
})();