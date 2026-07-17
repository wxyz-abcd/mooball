module.exports = function (API) {
  const { Library, Utils } = API;

  Object.setPrototypeOf(this, Library.prototype);
  Library.call(this, "animations", {
    version: 0.1,
    author: "el cono guardiola & abc",
    description: "A library to create animations",
  });

  const thisLibrary = this;
  const animations = [];
  let lastID;
  var scale;
  var angle;
  var radius;
  var color;

  this.initialize = () => {
    lastID = 1;
  };

  this.register = (data) => {
    const animationID = lastID++;
    animations.push({
      id: animationID,
      animationProps: data,
      triggered: false,
      discsArray: [],
    });
    return animationID;
  };

  this.unregister = (animationID) => {
    const index = animations.findIndex((e) => e.id === animationID);
    if (index > -1) animations.splice(index, 1);
  };

  this.triggerAnimation = (animationID) => {
    const animationElement = animations.find((e) => e.id === animationID);
    if (animationElement) {
      animationElement.triggered = true;
      animationElement.animationProps.t = 0;
    }
  };
  this.pauseAnimation = (animationID) =>
    console.log(`Animation (${animationID}) paused`);

  this.addDiscs = (mapObject) => {
    animations.forEach((e) => {
      for (let i = 0; i < e.animationProps.discsAmount; i++) {
        const discId =
          mapObject.discs.push({
            pos: [-99999999, 0],
            radius: 10,
            invMass: 0.5,
            color: "FFFFFF",
            cMask: [""],
          }) - 1;
        e.discsArray.push({
          discId,
          animationID: e.id,
        });
      }
    });
    return Utils.parseStadium(JSON.stringify(mapObject));
  };

  this.onGameTick = (originX, originY, stopper) => {
    Utils.runAfterGameTick(() => {
      animations.forEach((animation) => {
        if (!animation.triggered) return;
        animation.discsArray.forEach((d, index) => {
          scale = animation.animationProps.scale(
            animation.animationProps.t,
            index
          );
          angle = animation.animationProps.angle(
            animation.animationProps.t,
            index
          );
          radius = animation.animationProps.radius(
            animation.animationProps.t,
            index
          );
          color = animation.animationProps.color(
            animation.animationProps.t,
            index
          );

          var x = animation.animationProps.x(animation.animationProps.t, index),
            y = animation.animationProps.y(animation.animationProps.t, index),
            s = Math.sin(angle),
            c = Math.cos(angle),
            rx = x * c - y * s,
            ry = x * s + y * c;
          x = scale * rx + originX;
          y = scale * ry + originY;

          this.room.setDiscProperties(d.discId, {
            x: x,
            y: y,
            radius: radius,
            color: color,
          });
        });
        animation.animationProps.t += 1;
        if (animation.animationProps.t >= animation.animationProps.tLimit) {
          stopper.value = false;
          hideDiscs(animation.discsArray);
          scale = undefined;
          angle = undefined;
          radius = undefined;
          color = undefined;
        }
      });
    });
  };

  function hideDiscs(discsArray) {
    Utils.runAfterGameTick(() => {
      discsArray.forEach((e) => {
        thisLibrary.room.setDiscProperties(e.discId, { x: NaN, y: NaN });
      });
    }, 5);
  }
};
