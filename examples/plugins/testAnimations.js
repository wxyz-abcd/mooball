module.exports = function (API) {
  const { AllowFlags, OperationType, Utils, Plugin } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "testAnimations", true, {
    version: "0.1",
    author: "el cono guardiola & abc",
    description: "Animations plugin.",
    allowFlags: AllowFlags.CreateRoom | AllowFlags.JoinRoom,
  });
  let shouldTrigger = {};
  let circleAnimationID = null;
  let discsArray = null;
  let lastPlayerKickBall = null;
  var f_x = (t) => -1 * (16 * Math.sin(t) ** 3);
  var f_y = (t) =>
    -1 *
    (13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t));
  var fy = (t, index) => f_y(index * ((2 * Math.PI) / 50) + t * 0.003);
  var minRadius = 10,
    maxRadius = 15;

  this.initialize = () => {
    console.log("testAnimations initiated");
    //circle
    circleAnimationID = this.room.librariesMap.animations.register({
      discsAmount: 10,
      x: (t) => Math.cos(t),
      y: (t) => Math.sin(t),
      scale: (t, index) => 15,
      angle: (t, index) => 0,
      t: 0,
      tLimit: 200 * Math.PI,
      color: (t, index) =>
        (Math.floor(150 + 100 * Math.sin(t * 0.5)) << 16) |
        (Math.floor(150 + 100 * Math.sin(index * 0.5)) << 0),
      //radius: (t, index) => 10+Math.sin(0.01*t)*5
      radius: (t, index) => 10 + ((-fy(t, index) + 17) * 5) / 29,
    });

    //heart
    heartAnimationID = this.room.librariesMap.animations.register({
      discsAmount: 50,
      x: (t, index) => f_x(index * ((2 * Math.PI) / 50) + t * 0.003),
      y: fy,
      //scale: (t, index)=>(2*25/50)*Math.abs(((t-50/2)%50)-50/2)-25+40,
      scale: (t, index) => 15,
      angle: (t, index) => 0,
      t: 0,
      tLimit: 200 * Math.PI,
      color: (t, index) =>
        (Math.floor(150 + 100 * Math.sin(t * 0.5)) << 16) |
        (Math.floor(150 + 100 * Math.sin(index * 0.5)) << 0),
      //radius: (t, index) => 10+Math.sin(0.01*t)*5
      radius: (t, index) => 10 + ((-fy(t, index) + 17) * 5) / 29,
    });
  };

  this.finalize = () => {
    discsArray = null;
    circleAnimationID = null;
    console.log("testAnimations initiated");
    this.room.librariesMap.animations.unregister(circleAnimationID);
    this.room.librariesMap.animations.unregister(heartAnimationID);
  };

  this.onTeamGoal = () => {
    shouldTrigger = { value: true };
    this.room.librariesMap.animations.triggerAnimation(heartAnimationID);
    this.room.librariesMap.animations.triggerAnimation(circleAnimationID);
  };

  this.onPlayerBallKick = (playerId) => {
    lastPlayerKickBall = playerId;
  };

  this.onOperationReceived = (type, msg) => {
    if (type === OperationType.SetStadium) {
      msg.stadium = this.room.librariesMap.animations.addDiscs(
        JSON.parse(Utils.exportStadium(msg.stadium))
      );
    }
    return true;
  };

  this.onGameTick = () => {
    if (shouldTrigger.value) {
      const playerProperties = this.room.getPlayerDisc(lastPlayerKickBall);
      this.room.librariesMap.animations.onGameTick(
        playerProperties.pos.x,
        playerProperties.pos.y,
        shouldTrigger
      );
    }
  };
};
