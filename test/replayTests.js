const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, Impl } = require("../src/index")();
const fs = require("fs");

var rr = Replay.read(fs.readFileSync("./test/replay.mr", null), {
   onPlayerInputChange: (id, value)=>console.log(id, value)
});
rr.setSpeed(1);
