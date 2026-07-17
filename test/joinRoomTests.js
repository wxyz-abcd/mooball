var local = null;
if (process.argv[2].startsWith("-local="))
  local = process.argv.splice(2,1)[0].substring(7);
const API = require("../src/index")(undefined, local ? { backend: { hostname: "localhost:3000/"+local, hostnameWs: "localhost:3000/"+local, secure: false } } : undefined);
const { OperationType, VariableType, ConnectionState, AllowFlags, CollisionFlags, Callback, Utils, Room, Replay, Query, RoomConfig, Plugin, Renderer, Errors, Language, Impl } = API;
const autoPlay = require("../examples/plugins/autoPlay_defensive");
const eventLogger = require("../examples/plugins/eventLogger");
const { exit } = require("process");
const englishLanguage = require("../examples/languages/englishLanguage");
Language.current = new englishLanguage(API);
(()=>{

Utils.generateAuth().then(([authKey, authObj])=>{
    var nickPostfix = 1, interval;
    var joinFunc = function () {
      var nick = "abc_bodd" + nickPostfix++;
      var tmp = Room.join({
        id: process.argv[2] || "tURKNDmMt3k", 
        password: process.argv[3] || "123",
        //token: process.argv[4] || "tcr1.AAAAAGNlEg0-2dmQtC94og.Z_keIEi1ZRk",
        authObj: authObj
      }, {
        storage: {
          //player_auth_key: authKey,
          crappy_router: false,
          player_name: nick,
          avatar: "👾",
          geo: {
            lat: 40,
            lon: 40,
            flag: "tr"
          }
        }, 
        proxyAgent: null,
        //noPluginMechanism: true,
        renderer: null,
        plugins: [new autoPlay(API), new eventLogger(API)],
        onConnInfo: (state, info)=>{
          /*
          if (state==2){
            console.log(info);
            tmp.cancel();
          }
          */
          console.log(state, info);
        },
        onOpen: (room)=>{
          //setTimeout(()=>{room.leave();}, 5000);

          room.modifyClientPing = (ping)=>{
            return 1000000+ping**6;
          };

          room.onAfterPlayerObjectCreated = (playerObj, customData)=>{
            console.log("onAfterPlayerObjectCreated", playerObj);
          };

          room.onPlayerDiscCreated = (playerObj, customData)=>{
            console.log("onPlayerDiscCreated", playerObj);
          };

          room.onPlayerDiscDestroyed = (playerObj, customData)=>{
            console.log("onPlayerDiscDestroyed", playerObj);
          };
    
          var { currentPlayerId } = room;
    
          room.sendChat("hello, i am a player named " + nick + " with id " + currentPlayerId + ". can we know each other more?");
    
          /*
          var n = 1;
          interval = setInterval(() => {
            room.sendChat("Test number "+(n++)+" to disturb people.");
          }, 500);
          
          setTimeout(() => {
            room.leave();
          }, 15000);
          */
    
          //room.on("gameStop", (byId) => {
            //console.log("Game stopped by player", byId);
            //room.clearKeys();
          //});
    
          //setInterval(()=>{console.log(room.getKeyState())}, 250);
          /*
          room.onAfterGameTick = (customData) => {
    
            var playerDisc = room.getPlayerDiscOriginal(currentPlayerId);
            
            // coordinates: playerDisc.pos.x, playerDisc.pos.y
            // speed: playerDisc.speed.x, playerDisc.speed.y
            // radius: playerDisc.radius
    
            if (!playerDisc) // check or else error occurs after changing a player's team to spectators.
              return;
    
            var ball = room.getBallOriginal();
    
            // coordinates: ball.pos.x, ball.pos.y
            // speed: ball.speed.x, ball.speed.y
            // radius: ball.radius
    
            const minCoordAlignDelta = 2, minKickDistance = 4;
    
            var deltaX = ball.pos.x - playerDisc.pos.x, deltaY = ball.pos.y - playerDisc.pos.y;
    
            // x direction
            if (Math.abs(deltaX) < minCoordAlignDelta)
              dirX = 0;
            else 
              dirX = Math.sign(deltaX);
    
            // y direction
            if (Math.abs(deltaY) < minCoordAlignDelta)
              dirY = 0;
            else
              dirY = Math.sign(deltaY);
    
            // kick
            kick = (deltaX * deltaX + deltaY * deltaY < (playerDisc.radius + ball.radius + minKickDistance) * (playerDisc.radius + ball.radius + minKickDistance));
            
            room.setKeyState(keyState(dirX, dirY, kick));
    
          };
          */
          /*
          setTimeout(()=>{
            room.leave();
          }, 5000);
          */
        },
        onClose: (msg)=>{
          //clearInterval(interval);
          console.log("Bot has left the room:", msg?.toString());
          //setTimeout(joinFunc, 5000);
          //exit(0);
        }
      });
      //setTimeout(()=>tmp.cancel(), 200);
    };
    joinFunc();
  //});
});
})();