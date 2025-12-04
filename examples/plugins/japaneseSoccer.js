module.exports = function (API) {
  const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, Impl } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "japaneseSoccer", true, {
    version: "0.1",
    author: "abc",
    description: `This plugin sets up a japanese soccer game.`,
    allowFlags: AllowFlags.CreateRoom
  });
  
  this.defineVariable({
    name: "goalSize",
    type: VariableType.Integer,
    value: 100,
    range: {
      min: 10,
      max: 500,
      step: 1
    },
    description: "Length of each goal line in map units."
  });
  
  this.defineVariable({
    name: "goalsPerPlayer",
    type: VariableType.Integer,
    value: 5,
    range: {
      min: 1,
      max: Infinity,
      step: 1
    },
    description: "Number of goals needed to concede in order to knock out a player."
  });

  var that = this, gameState = null, goalConcederPlayerId = null, auto = false;

  function arrangePlayers(kickOffPlayerId){
    var {goals, discs, playerPhysics} = that.room.stadium;
    Object.keys(gameState).forEach((pid)=>{
      pid = parseInt(pid);
      if (kickOffPlayerId==pid){
        var a = 2*gameState[pid].goalId*Math.PI/that.room.players.filter((x)=>(x.team.id==1)).length, kickOffDist = 10+playerPhysics.radius+discs[0].radius;
        that.room.setPlayerDiscProperties(pid, {
          x: kickOffDist*Math.cos(a),
          y: kickOffDist*Math.sin(a)
        });
      }
      else{
        var {p0, p1} = goals[gameState[pid].goalId];
        that.room.setPlayerDiscProperties(pid, {
          x: (p0.x+p1.x)/2,
          y: (p0.y+p1.y)/2
        });
      }
    });
  }

  function refreshStadium(numberOfPlayers){
    var angleInc = Math.PI/numberOfPlayers, r = that.goalSize/(2*Math.sin(angleInc/2)), mapSize = r + 100;
    var stadiumJson = {
      "name": "Japanese Soccer v"+numberOfPlayers,
      "width": mapSize,
      "height": mapSize, 
      "spawnDistance": 50, 
      "bg": {
        "type": "none",
        "width": mapSize, 
        "height": mapSize, 
        "kickOffRadius": 0,
        "cornerRadius": 0,
        "borderRadius": 0, 
        "color": "484848"
      },
      "cameraWidth": 0,
      "cameraHeight": 0,
      "maxViewWidth": 0,
      "cameraFollow": "ball",
      "canBeStored": true,
      "kickOffReset": "partial",
      "playerPhysics": {
        "radius": 15,
        "bCoef": 1.0e-323,
        "invMass": 0.5,
        "damping": 0.96,
        "cGroup": ["red","blue"],
        "acceleration": 0.11,
        "gravity": [0,0],
        "kickingAcceleration": 0.083,
        "kickingDamping": 0.96,
        "kickStrength": 4.545,
        "kickback": 0
      },
      "ballPhysics": {
        "radius": 5.8,
        "bCoef": 0.474,
        "cMask": ["all"],
        "damping": 0.99,
        "invMass": 1.5,
        "gravity": [0,0],
        "color": "FFCC00",
        "cGroup": ["ball"]
      },
      "traits": {
        "goalPost": {
          "radius": 8,
          "invMass": 0,
          "bCoef": 0.5,
          "color": "252525"
        },
        "goalNet": {
          "vis": true,
          "bCoef": 0.1,
          "cMask": ["ball"],
          "color": "003333"
        }
      },
      "redSpawnPoints": [],
      "blueSpawnPoints": [],
      "vertexes": [],
      "segments": [],
      "goals": [],
      "discs": [],
      "planes": [],
      "joints": [],
    };
    var angle = -angleInc/2;
    stadiumJson.vertexes.push({"x": r*Math.cos(angle), "y": r*Math.sin(angle)});
    for (var i=0;i<2*numberOfPlayers;i++){
      angle+=angleInc;
      stadiumJson.vertexes.push({"x": r*Math.cos(angle), "y": r*Math.sin(angle)});
      if (i%2==0){
        var p0 = [stadiumJson.vertexes[i].x, stadiumJson.vertexes[i].y], p1 = [stadiumJson.vertexes[i+1].x, stadiumJson.vertexes[i+1].y];
        stadiumJson.segments.push({"v0": i, "v1": i+1, "curve": 178, "trait": "goalNet"});
        stadiumJson.discs.push({"pos": p0, "trait": "goalPost"});
        stadiumJson.discs.push({"pos": p1, "trait": "goalPost"});
        stadiumJson.goals.push({"p0": p0, "p1": p1, team: "red"});
        //stadiumJson.redSpawnPoints.push([(p0[0]+p1[0])/2, (p0[1]+p1[1])/2]);
      }
      else
        stadiumJson.segments.push({"v0": i, "v1": i+1});
    }
    auto = true;
    that.room.stopGame();
    that.room.setScoreLimit(0);
    that.room.setTimeLimit(0);
    that.room.setCurrentStadium(Utils.parseStadium(JSON.stringify(stadiumJson)));
    that.room.startGame();
    auto = false;
  }

  function knockOutPlayer(id){
    that.room.setPlayerTeam(id, 2);
    var players = that.room.players.filter((x)=>(x.team.id==1));
    var numberOfPlayers = players.length;
    if (numberOfPlayers<2){
      var { id, name } = players[0];
      that.room.sendAnnouncement("Japanese soccer was won by ["+id+"]"+name+" with "+gameState[id].score+" points remaining.", null, 0xff0000);
      auto = true;
      that.room.stopGame();
      auto = false;
      gameState = null;
      goalConcederPlayerId = null;
      return;
    }
    refreshStadium(numberOfPlayers);
    arrangePlayers();
  }

  function restart(){
    var players = that.room.players.filter((x)=>(x.team.id==1));
    var numberOfPlayers = players.length;
    if (numberOfPlayers<2){
      that.room.sendAnnouncement("Cannot start japanese soccer with less than 2 players. Move players to red team and restart...", null, 0xff0000);
      return;
    }
    var pids = [];
    players.forEach((x)=>(Math.random()<0.5)?pids.push(x.id):pids.unshift(x.id));
    goalConcederPlayerId = null;
    gameState = pids.reduce((val, id, idx)=>{
      val[id] = {
        score: that.goalsPerPlayer,
        goalId: idx
      };
      return val;
    }, {});
    pids.forEach((id)=>that.room.setPlayerAvatar(id, ""+that.goalsPerPlayer, true));
    refreshStadium(numberOfPlayers);
    arrangePlayers();
  }

  this.onGameStart = (byId)=>{
    if (auto || gameState)
      return;
    Utils.runAfterGameTick(restart);
  };

  this.onGameStop = (byId)=>{
    if (auto || !gameState)
      return;
    gameState = null;
    goalConcederPlayerId = null;
    that.room.sendAnnouncement("Japanese soccer aborted.", null, 0xff0000);
  };

  this.onTeamGoal = (teamId, goalId, goalObj, discId, discObj)=>{
    if (!gameState)
      return;
    var id = parseInt(Object.keys(gameState).find((id)=>(gameState[id].goalId==goalId)));
    if (isNaN(id))
      return;
    var s = gameState[id].score;
    gameState[id].score = --s;
    Utils.runAfterGameTick(()=>{
      that.room.setPlayerAvatar(id, ""+s, true);
    });
    goalConcederPlayerId = id;
  };

  this.onPositionsReset = ()=>{
    if (!gameState || goalConcederPlayerId==null)
      return;
    Utils.runAfterGameTick(()=>{
      if (gameState[goalConcederPlayerId].score<=0)
        knockOutPlayer(goalConcederPlayerId);
      else
        arrangePlayers(goalConcederPlayerId);
      goalConcederPlayerId = null;
    });
  };

  this.onPlayerLeave = (id)=>{
    if (!gameState?.[id])
      return;
    goalConcederPlayerId = null;
    Utils.runAfterGameTick(()=>{
      knockOutPlayer();
    });    
  };
  /*
  this.onPlayerTeamChange = (id, teamId, byId)=>{
    if (gameState || teamId!=1)
      return;
    Utils.runAfterGameTick(restart);
  };
  */
  this.initialize = ()=>{
    gameState = null;
    goalConcederPlayerId = null;
    //Utils.runAfterGameTick(restart);
  };

  this.finalize = ()=>{
    gameState = null;
    goalConcederPlayerId = null;
  };
}