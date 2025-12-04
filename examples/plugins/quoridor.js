module.exports = function(API){
  var { AllowFlags, Plugin, VariableType, OperationType, Utils } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "quoridor", true, { // "quoridor" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
    version: "0.1",
    author: "abc",
    description: `This is a plugin that allows us to play Quoridor with our friends`,
    allowFlags: AllowFlags.CreateRoom // We allow this plugin to be activated on CreateRoom only.
  });
  
  this.defineVariable({
    name: "width",
    type: VariableType.Integer,
    value: 9,
    range: {
      min: 3,
      max: 100,
      step: 1
    },
    description: "Width of the map."
  });
  
  this.defineVariable({
    name: "height",
    type: VariableType.Integer,
    value: 9,
    range: {
      min: 5,
      max: 100,
      step: 1
    },
    description: "Height of the map."
  });
  
  this.defineVariable({
    name: "wallSize",
    type: VariableType.Integer,
    value: 2,
    range: {
      min: 1,
      max: 10,
      step: 1
    },
    description: "The size of walls."
  });
  
  this.defineVariable({
    name: "wallLimitPerPlayer",
    type: VariableType.Integer,
    value: 7,
    range: {
      min: 0,
      max: 60,
      step: 1
    },
    description: "Number of walls that each team can place."
  });
  
  var that = this, autoStart = false, turn = null, boxSize = 20, wallPlaceMode = 0, gameState = null, tempCoord = null, wallCount = 0, turnPlayerId = null, lastPlayerIdxs = [], wallCounts = [];
  
  function restart(stopgame=true){
    function createArray(w, h){
      var a = [];
      for (var i=0;i<w;i++){
        var b = [];
        for (var j=0;j<h;j++)
          b.push(false);
        a.push(b);
      }
      return a;
    }
    var stadiumJson = {
    	"name" : "Quoridor",
    	"width" : 0,
    	"height" : 0,
    	"cameraWidtwh" : 0,
    	"cameraHeight" : 0,
    	"maxViewWidth" : 0,
    	"cameraFollow" : "player",
    	"spawnDistance" : 0,
    	"redSpawnPoints" : [],
    	"blueSpawnPoints" : [],
    	"canBeStored" : true,
    	"kickOffReset" : "partial",
    	"bg" : { "color" : "007700" },
    	"vertexes" : [],
    	"segments" : [],
    	"goals" : [],
    	"discs" : [],
    	"planes" : [],
    	"joints" : [],
    	"traits" : {
    	  "blackSeg": {
      		"cMask" : ["none"],
      		"cGroup" : ["c0"],
    	    "color": "000000"
    	  },
    	  "whiteSeg": {
      		"cMask" : ["none"],
      		"cGroup" : ["c0"],
    	    "color": "ffffff"
    	  },
    	  "borderSeg": {
      		"cMask" : ["none"],
      		"cGroup" : ["c0"],
    	    "color": "44cc44"
    	  }
    	},
    	"playerPhysics" : {
    		"radius" : boxSize/3,
    		"cMask" : ["none"],
    		"cGroup" : ["c0"],
    		"gravity" : [0, 0],
    		"acceleration" : 0,
    		"damping" : 0,
    		"kickingAcceleration" : 0,
    		"kickingDamping" : 0,
    		"kickStrength" : 0,
    		"kickback" : 0
    	},
    	"ballPhysics" : {
    		"cMask" : ["none"],
    		"cGroup" : ["c0"]
    	}
    };
    var offsetX = -that.width*boxSize/2, offsetY = -that.height*boxSize/2;
    for (var i=0;i<=that.width;i++){
      stadiumJson.vertexes.push({x: i*boxSize+offsetX, y: -offsetY});
      stadiumJson.vertexes.push({x: i*boxSize+offsetX, y: offsetY});
      stadiumJson.segments.push({v0: 2*i, v1: 2*i+1});
    }
    for (var i=0;i<=that.height;i++){
      stadiumJson.vertexes.push({x: -offsetX, y: i*boxSize+offsetY});
      stadiumJson.vertexes.push({x: offsetX, y: i*boxSize+offsetY});
      stadiumJson.segments.push({v0: 2*i+2+2*that.width, v1: 2*i+3+2*that.width});
    }
    stadiumJson.discs.push({radius: boxSize/3, color: "FF0000", cMask: ["none"], cGroup: ["none"]});
    stadiumJson.discs.push({radius: boxSize/3, color: "0000FF", cMask: ["none"], cGroup: ["none"]});
    for (var i=0;i<120;i++){
      stadiumJson.discs.push({radius: 0, cMask: ["none"], cGroup: ["none"]});
      stadiumJson.discs.push({radius: 0, cMask: ["none"], cGroup: ["none"]});
      stadiumJson.joints.push({color: "855E42", d0: 2*i+3, d1: 2*i+4, length: [0, 20000000000]});
    }
    var stadium;
    try{
      stadium = Utils.parseStadium(JSON.stringify(stadiumJson));
    }catch(e){
      console.log(e.toString());
      return;
    }
    if (stopgame)
      that.room.stopGame();
    that.room.setCurrentStadium(stadium);
    if (stopgame){
      autoStart = true;
      that.room.startGame();
      autoStart = false;
    }
    that.room.setDiscProperties(0, {
      x: NaN,
      y: NaN
    });
    that.room.setDiscProperties(1, {
      x: (1-that.width%2)*boxSize/2,
      y: offsetY+boxSize/2
    });
    that.room.setDiscProperties(2, {
      x: (1-that.width%2)*boxSize/2,
      y: -(offsetY+boxSize/2)
    });
    for (var i=3;i<=103;i++)
      that.room.setDiscProperties(i, {
        x: NaN,
        y: NaN
      });
    wallPlaceMode = 0;
    tempCoord = null;
    wallCount = 0;
    gameState = {
      playerPos1: {
        x: (that.width/2)|0,
        y: 0
      },
      playerPos2: {
        x: (that.width/2)|0,
        y: that.height-1
      },
      walls: [createArray(that.width+1, that.height+1), createArray(that.width+1, that.height+1)]
    };
    that.room.players.forEach((p)=>{
      that.room.setPlayerDiscProperties(p.id, {
        x: NaN,
        y: NaN
      });
    });
  	lastPlayerIdxs = [];
    wallCounts = [0, 0];
    turn = 1;
    turnPlayerId = null;
    nextPlayer(turn);
  }

  function announceNextPlayer(player){
    if (!player)
      that.room.sendAnnouncement("Waiting for a player to join "+((turn==1)?"red":"blue")+" team.", null, 0x00ff00, 0, 0);
    else
      that.room.sendAnnouncement("It's your turn to play, ["+player.id+"]"+player.name+". ("+wallCounts[turn-1]+"/"+that.wallLimitPerPlayer+" walls placed.)", null, 0x00ff00, 0, 0);
  }

  function nextPlayer(turn){
    var nextPlayerIdx = lastPlayerIdxs[turn-1];
    if (nextPlayerIdx==null)
      nextPlayerIdx = -1;
    nextPlayerIdx++;
    var idx = -1, currentPlayer;
    for (var i=0;i<that.room.players.length;i++){
      var p = that.room.players[i];
      if (p.team.id==turn){
        if ((++idx)==nextPlayerIdx){
          currentPlayer = p;
          break;
        }
      }
    }
    if (idx>=0 && !currentPlayer){
      nextPlayerIdx = 0;
      for (var i=0;i<that.room.players.length;i++){
        var p = that.room.players[i];
        if (p.team.id==turn){
          currentPlayer = p;
          break;
        }
      }
    }
    if (!currentPlayer){
      turnPlayerId = null;
      announceNextPlayer();
      return;
    }
    lastPlayerIdxs[turn-1] = nextPlayerIdx;
    turnPlayerId = currentPlayer.id;
    announceNextPlayer(currentPlayer);
  }
  
  function canPlayerFinish(turn){
    var a = [], goalY = (2-turn)*(that.height-1);
    for (var i=0;i<that.width;i++){
      var b = [];
      for (var j=0;j<that.height;j++)
        b.push(0);
      a.push(b);
    }
    function check(x,y){
      if (y==goalY)
        return true;
      if (a[x][y]>0)
        return false;
      a[x][y]=1;
      if (x>0 && !gameState.walls[1][x][y] && check(x-1, y))
        return true;
      if (x<that.width-1 && !gameState.walls[1][x+1][y] && check(x+1, y))
        return true;
      if (y>0 && !gameState.walls[0][x][y] && check(x, y-1))
        return true;
      if (y<that.height-1 && !gameState.walls[0][x][y+1] && check(x, y+1))
        return true;
      return false;
    }
    return check(gameState["playerPos"+turn].x, gameState["playerPos"+turn].y);
  }

  this.initialize = function(){
    restart();
  };
  this.finalize = function(){
    
  };
  this.onGameStart = function(byId, customData){
    if (autoStart)
      return;
    restart(false);
  };
  const zs = {
    1: 16, // 0 0 1 0 0 0 0
    2: 57, // 0 1 1 1 0 0 1
    4: 12, // 0 0 0 1 1 0 0 
    8: 94  // 1 0 1 1 1 1 0
  };
  this.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo, customData){
    if (type!=OperationType.SendInput)
      return true;
    if (msg.byId!=turnPlayerId)
      return false;
    /*
    var p = that.room.getPlayer(msg.byId);
    if (p.team.id!=turn)
      return false;
    */
    if (msg.input==0)
      return true;
    var {dirX, dirY, kick} = Utils.reverseKeyState(msg.input);
    var playerPos = gameState["playerPos"+turn];
    if (kick){
      wallPlaceMode = (wallPlaceMode+1)%3;
      if (wallPlaceMode==0){
        that.room.setDiscProperties(0, {
          x: NaN,
          y: NaN
        });
      }
      else if (wallPlaceMode==1){
        if (wallCount>=120 || wallCounts[turn-1]>=that.wallLimitPerPlayer){
          that.room.sendAnnouncement("Can't place wall because maximum number of walls has been reached.", turnPlayerId, 0xff0000, 0, 0);
          wallPlaceMode = 0;
          return false;
        }
        var xx = ((that.width-that.wallSize)/2)|0, yy = ((that.height-that.wallSize)/2)|0;
        if (xx+that.wallSize>=that.width)
          xx=that.width-that.wallSize;
        if (yy+that.wallSize>=that.height)
          yy=that.height-that.wallSize;
        tempCoord = { x: xx, y: yy };
        that.room.setDiscProperties(0, {
          x: xx*boxSize-that.width*boxSize/2+that.wallSize*boxSize/2,
          y: yy*boxSize-that.height*boxSize/2+that.wallSize*boxSize/2,
          radius: boxSize*(that.wallSize-1)/2+boxSize/3,
        });
      }
      else{
        var {x,y} = tempCoord;
        if (gameState.walls[0][x][y] && gameState.walls[0][x][y+1] && gameState.walls[1][x][y] && gameState.walls[1][x+1][y]){
          that.room.sendAnnouncement("Can't place wall there since it is completely surrounded by walls.", turnPlayerId, 0xff0000, 0, 0);
          wallPlaceMode = 1;
        }
      }
      return false;
    }
    if (dirX*dirY!=0)
      return false;
    switch (wallPlaceMode){
      case 0:{
        var pp = zs[msg.input];
        if (!pp)
          return true;
        if (gameState.walls[((pp>>2)&1)][playerPos.x+((pp>>1)&1)][playerPos.y+(pp&1)])
          return false;
        var opponentPos = gameState["playerPos"+(3-turn)], f = (k)=>(playerPos.x+=k*dirX, playerPos.y+=k*dirY);
        f(1);
        if (playerPos.x<0 || playerPos.y<0 || playerPos.x>=that.width || playerPos.y>=that.height){
          f(-1);
          return false;
        }
        if (playerPos.x==opponentPos.x && playerPos.y==opponentPos.y){
          f(1);
          if (gameState.walls[((pp>>2)&1)][opponentPos.x+((pp>>1)&1)][opponentPos.y+(pp&1)] || playerPos.x<0 || playerPos.y<0 || playerPos.x>=that.width || playerPos.y>=that.height){
            f(-1);
            var dir = ((msg.input<3) ? [4, 8] : [1, 2]).find((d)=>{
              var pp2 = zs[d];
              if (!gameState.walls[((pp2>>2)&1)][opponentPos.x+((pp2>>1)&1)][opponentPos.y+(pp2&1)]){
                var {dirX: dirX2, dirY: dirY2} = Utils.reverseKeyState(d), xx = playerPos.x+dirX2, yy = playerPos.y+dirY2;
                if (xx>=0 && yy>=0 && xx<that.width && yy<that.height)
                  return true;
              }
              return false;
            });
            if (!dir){
              f(-1);
              that.room.sendAnnouncement("Can't jump over player since the other side is completely blocked.", turnPlayerId, 0xff0000, 0, 0);
              return false;
            }
            var {dirX: dirX2, dirY: dirY2} = Utils.reverseKeyState(dir);
            playerPos.x+=dirX2;
            playerPos.y+=dirY2;
          }
        }
        that.room.setDiscProperties(turn, {
          x: playerPos.x*boxSize-that.width*boxSize/2+boxSize/2,
          y: playerPos.y*boxSize-that.height*boxSize/2+boxSize/2
        });
        if (playerPos.y==(2-turn)*(that.height-1) || playerPos.y==(2-turn)*that.height){
          that.room.sendAnnouncement((turn==1?"Red":"Blue")+" has won.", null, 0xff0000, 0, 0);
          that.room.stopGame();
          return false;
        }
        turn = 3-turn;
        nextPlayer(turn);
        break;
      }
      case 1: {
        var f = (k)=>(tempCoord.x+=k*dirX, tempCoord.y+=k*dirY);
        f(1);
        if (tempCoord.x<0 || tempCoord.y<0 || tempCoord.x>that.width-that.wallSize || tempCoord.y>that.height-that.wallSize){
          f(-1);
          return false;
        }
        that.room.setDiscProperties(0, {
          x: tempCoord.x*boxSize-that.width*boxSize/2+that.wallSize*boxSize/2,
          y: tempCoord.y*boxSize-that.height*boxSize/2+that.wallSize*boxSize/2,
          radius: boxSize*(that.wallSize-1)/2+boxSize/3,
        });
        break;
      }
      case 2: {
        var z = zs[msg.input], v = ((z>>2)&1), m = ((z>>1)&1)*that.wallSize, n = (z&1)*that.wallSize, dx = v?0:1, dy = 1-dx;
        for (var i=0;i<that.wallSize;i++)
          if (gameState.walls[v][tempCoord.x+m+i*dx][tempCoord.y+n+i*dy]){
            that.room.sendAnnouncement("Can't place wall there since it is occupied by another wall.", turnPlayerId, 0xff0000, 0, 0);
            return false;
          }
        for (var i=1;i<that.wallSize;i++)
          if (gameState.walls[1-v][tempCoord.x+m+i*dx][tempCoord.y+n+i*dy] && gameState.walls[1-v][tempCoord.x+m+i*dx-dy][tempCoord.y+n+i*dy-dx]){
            that.room.sendAnnouncement("Can't place wall there since it is intersecting another wall.", turnPlayerId, 0xff0000, 0, 0);
            return false;
          }
        for (var i=0;i<that.wallSize;i++)
          gameState.walls[v][tempCoord.x+m+i*dx][tempCoord.y+n+i*dy] = true;
        if (!canPlayerFinish(turn) || !canPlayerFinish(3-turn)){
          for (var i=0;i<that.wallSize;i++)
            gameState.walls[v][tempCoord.x+m+i*dx][tempCoord.y+n+i*dy] = false;
          that.room.sendAnnouncement("Can't place wall there since it is putting one of the players completely out of the game.", turnPlayerId, 0xff0000, 0, 0);
          return false;
        }
        that.room.setDiscProperties(2*wallCount+3, {x: tempCoord.x*boxSize-that.width*boxSize/2+boxSize*that.wallSize*((z>>6)&1), y: tempCoord.y*boxSize-that.height*boxSize/2+boxSize*that.wallSize*((z>>5)&1)});
        that.room.setDiscProperties(2*wallCount+4, {x: tempCoord.x*boxSize-that.width*boxSize/2+boxSize*that.wallSize*((z>>4)&1), y: tempCoord.y*boxSize-that.height*boxSize/2+boxSize*that.wallSize*((z>>3)&1)});
        wallCounts[turn-1]++;
        wallCount++;
        wallPlaceMode = 0;
        that.room.setDiscProperties(0, {
          x: NaN,
          y: NaN
        });
        turn = 3-turn;
        nextPlayer(turn);
        break;
      }
    }
    return false;
  };
  function resetPlayerAndSetNextPlayer(playerId){
    that.room.setPlayerDiscProperties(playerId, {
      x: NaN,
      y: NaN
    });
    if (turnPlayerId==null)
      nextPlayer(turn);
  }
  function removeInGameRemnants(){
    wallPlaceMode = 0;
    tempCoord = null;
    that.room.setDiscProperties(0, {
      x: NaN,
      y: NaN
    });
  }
  this.onVariableValueChange = function(addonObject){
    if (addonObject!=that)
      return;
    restart();
  };
  this.onPlayerTeamChange = function(playerId, teamId){
    if (turnPlayerId==playerId/* && teamId==0*/){
      removeInGameRemnants();
      turnPlayerId = null;
    }
    resetPlayerAndSetNextPlayer(playerId);
  }
  this.onPlayerJoin = function(playerObj, customData){
    resetPlayerAndSetNextPlayer(playerObj.id);
  };
  this.onPlayerLeave = function(playerObj, reason, isBanned, byId, customData){
    if (turnPlayerId==playerObj.id){
      removeInGameRemnants();
      turnPlayerId = null;
    }
    resetPlayerAndSetNextPlayer(playerObj.id);
  };
}