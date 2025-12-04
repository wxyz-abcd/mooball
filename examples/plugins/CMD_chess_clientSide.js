module.exports = function(API){
  const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "CMD_chess_clientSide", true, { // "CMD_chess_clientSide" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
    version: "0.1",
    author: "abc",
    description: `This plugin allows mouse clicks on the client side while playing chess using custom clients.`,
    allowFlags: AllowFlags.JoinRoom // We allow this plugin to be activated on JoinRoom only.
  });

  var mouseRightClickPos = null, that = this;

  this.onGameStart = function(){
    mouseRightClickPos = null;
  };

  this.onMouseDown = function(e){
    var f = that.room?.renderer?.transformPixelCoordToMapCoord;
    if (!f){
      mouseRightClickPos = null;
      return;
    }
    var {x,y} = f(e.offsetX, e.offsetY);
    if (e.button==2){
      mouseRightClickPos = {x, y};
      return;
    }
    mouseRightClickPos = null;
    that.room.sendCustomEvent(60, {t: 1, x, y});
  };

  this.onMouseUp = function(e){
    var f = that.room?.renderer?.transformPixelCoordToMapCoord;
    if (!f || e.button!=2){
      mouseRightClickPos = null;
      return;
    }
    that.room.sendCustomEvent(60, {t: 0, p1: mouseRightClickPos, p2: f(e.offsetX, e.offsetY)});
    mouseRightClickPos = null;
  };
}