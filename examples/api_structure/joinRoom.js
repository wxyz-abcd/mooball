// node.js / CommonJS initialization:
const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = API = require("../../src/index")();
const EnglishLanguage = require("../languages/englishLanguage");
API.Language.current = new EnglishLanguage(API); // if you want to use error.toString()

// For initialization on browsers, read the documentation here: https://github.com/wxyz-abcd/mooball#-usage-on-browser

Utils.generateAuth().then(([authKey, authObj])=>{
  Room.join({
    id: "Olnit_iGRWs",
    password: "password",
    authObj: authObj
  }, {
    storage: {
      player_name: "wxyz-abcd",
      avatar: "👽",
      player_auth_key: authKey
    }, 
    libraries: [], // example library usage: [new commands(API)] // look at examples/libraries folder for related examples.
    config: null, // example roomConfig usage: new autoPlay_followBall(API) // look at examples/roomConfigs folder for related examples.
    renderer: null, // example renderer usage: new defaultRenderer(API, {canvas: ..., images: {grass: ..., concrete: ..., concrete2: ..., typing: ...}, paintGame: true})
    plugins: [], // example plugin usage: [new autoPlay_followBall(API)] // look at examples/plugins folder for related examples.
    onOpen: roomCallbacks,
    onClose: (msg)=>{
      console.log("Bot has left the room:", msg.toString());
      //process.exit(0); // maybe close the application? in node.js
    }
  });
});

function roomCallbacks(room){
  console.log("joined room");
}
