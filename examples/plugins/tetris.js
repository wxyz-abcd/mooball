module.exports = function(API){
  const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "tetris", true, { // "tetris" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
    version: "0.1",
    author: "abc",
    description: `This plugin sets up a Tetris game.`,
    allowFlags: AllowFlags.CreateRoom // We allow this plugin to be activated on CreateRoom only.
  });
  
  this.defineVariable({
    name: "gridWidth",
    type: VariableType.Integer,
    value: 10,
    range: {
      min: 6,
      max: 42,
      step: 1
    },
    description: "Width(number of cells) of the grid."
  });
  
  this.defineVariable({
    name: "gridHeight",
    type: VariableType.Integer,
    value: 20,
    range: {
      min: 6,
      max: 42,
      step: 1
    },
    description: "Height(number of cells) of the grid."
  });

  this.defineVariable({
    name: "boxSize",
    type: VariableType.Integer,
    value: 30,
    range: {
      min: 10,
      max: 2000,
      step: 1
    },
    description: "Edge length of each square of the board in map units."
  });
  
  this.defineVariable({
    name: "backgroundColor",
    type: VariableType.Color,
    value: "#333333",
    description: "Background of the stadium."
  });

  this.defineVariable({
    name: "borderColor",
    type: VariableType.Color,
    value: "#ab9f2e",
    description: "Border color."
  });

  this.defineVariable({
    name: "initialSpeed",
    type: VariableType.Number,
    value: 0.5,
    description: "The initial speed of falling pieces."
  });

  this.defineVariable({
    name: "speedUpCoeff",
    type: VariableType.Number,
    value: 1.15,
    description: "The current speed of falling pieces is multiplied by this number each time you level up."
  });

  this.defineVariable({
    name: "levelUpPoints",
    type: VariableType.Integer,
    value: 3000,
    description: "Points required for leveling up."
  });

  const kUsableBricks = 0.5, numDiscs = 221, explosionColors = [0xffffff, 0x000000], pointsByExplosionCount = (n)=>(40+n*(n+1)*50);
  var thisPlugin = this, bricksArray = null, gameState, autoStart = false, freeDiscIds = null, explodingDiscIds = null, explosionAnimCounter = null, points = 0, pointsTillNextLevel = 0, fallingBrick = null, yspeedOrig = null, yspeed = null, level = 1;

  var selectRandomBrick = ()=>{
    var activeBricks = bricksArray.filter((x)=>x.active), obj = activeBricks[Math.floor(Math.random()*activeBricks.length)];
    return { 
      obj, 
      rot: Math.floor(Math.random()*obj.rotations.length),
      pos: null 
    };
  };
  
  var Tetris = (function(){
    function Board(){
      this.cells = [];
      this.nextBrick = null;
    }
    Board.prototype = {
      setupStartingPosition: function(){
        this.cells = [];
        for (var i=0;i<thisPlugin.gridHeight;i++){
          var a = [];
          for (var j=0;j<thisPlugin.gridWidth;j++)
            a.push(null);
          this.cells.push(a);
        }
        this.nextBrick = Object.assign(selectRandomBrick(), {discIds: []});
      },
      placeBrick: function(useableBrick, constructCell, initiateExplosion){
        if (!useableBrick.pos)
          return false;
        var { x, y } = useableBrick.pos, grid = useableBrick.obj.rotations[useableBrick.rot], cells = this.cells, gw = thisPlugin.gridWidth, gh = thisPlugin.gridHeight;
        x -= useableBrick.pivot.x;
        y -= useableBrick.pivot.y;
        if (grid.find((row, i)=>(row.find((cell, j)=>{
          if (cell!=1)
            return false;
          var xx = x+j, yy = y+i;
          if (xx<0 || xx>=gw || yy<0 || yy>=gh || cells[yy][xx]!=null)
            return true;
        })!=null)))
          return false;
        grid.forEach((row, i)=>{
          row.forEach((cell, j)=>{
            if (cell==1)
              cells[y+i][x+j] = constructCell(j, i);
          });
        });
        var explosions = {
          row: []
        };
        for (var i=0;i<gh;i++){
          var exp = true;
          for (var j=0;j<gw;j++)
            if (!cells[i][j]){
              exp = false;
              break;
            }
          if (exp)
            explosions.row.push(i);
        }
        explosions.row.forEach((idx)=>initiateExplosion(idx));
        return true;
      },
    };
    return {
      Board
    };
  })();

  function rotateFallingBrick(){
    var { obj, rot, discIds, pos } = fallingBrick;
    rot++;
    if (rot>=obj.rotations.length)
      rot = 0;
    return {
      obj,
      rot,
      discIds,
      pos,
      pivot: {
        x: (obj.rotations[rot].width/2)|0,
        y: (obj.rotations[rot].height/2)|0
      }
    };
  }

  function placeFallingBrickDiscs(deltaY, yspeed){
    var boxSize = parseInt(thisPlugin.boxSize), gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    var { obj, rot, discIds, pos, pivot } = fallingBrick, grid = obj.rotations[rot], i = 0;
    //Utils.runAfterGameTick(()=>{
      thisPlugin.room.setDiscProperties(0, {
        x: -boxSize*gw/2+pos.x*boxSize+boxSize/2,
        y: -(boxSize*(gh+gs)+20)/2+pos.y*boxSize+boxSize/2+deltaY,
        yspeed: yspeed
      });
      for (var y=0;y<gs;y++)
        for (var x=0;x<gs;x++)
          if (grid[y][x]){
            var discId = discIds[i++];
            thisPlugin.room.setDiscProperties(discId, {
              x: -boxSize*gw/2+(x+pos.x-pivot.x)*boxSize+boxSize/2,
              y: -(boxSize*(gh+gs)+20)/2+(y+pos.y-pivot.y)*boxSize+boxSize/2+deltaY,
              radius: boxSize/2,
              color: obj.color,
              yspeed: yspeed
            });
          }
    //});
  }

  function placeNewDiscs(){
    //Utils.runAfterGameTick(()=>{
    var boxSize = parseInt(thisPlugin.boxSize), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    var { obj, rot, discIds } = gameState.nextBrick, grid = obj.rotations[rot];
    for (var y=0;y<gs;y++)
      for (var x=0;x<gs;x++)
        if (grid[y][x]){
          var discId = freeDiscIds.splice(0, 1)[0];
          discIds.push(discId);
          thisPlugin.room.setDiscProperties(discId, {
            x: -boxSize*kUsableBricks*gs/2+x*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
            y: -(boxSize*(gh+gs)+20)/2+boxSize*gh+20+y*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
            radius: boxSize*kUsableBricks/2,
            color: obj.color
          });
        }
    //});
    placeFallingBrickDiscs(0, yspeed);
  }

  function nextFallingBrick(){
    var gw = parseInt(thisPlugin.gridWidth);
    fallingBrick = gameState.nextBrick;
    fallingBrick.pivot = {
      x: (fallingBrick.obj.rotations[fallingBrick.rot].width/2)|0,
      y: (fallingBrick.obj.rotations[fallingBrick.rot].height/2)|0
    };
    fallingBrick.pos = {
      x: (gw/2)|0,
      y: fallingBrick.pivot.y
    };
    gameState.nextBrick = Object.assign(selectRandomBrick(), {discIds: []});
    placeNewDiscs();
  }

  function restart(stopgame=true){
    var boxSize = parseInt(thisPlugin.boxSize), gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize), bc = thisPlugin.borderColor.slice(1);
    bricksArray = thisPlugin.room.librariesMap.bricks?.array;
    yspeedOrig = yspeed = parseFloat(thisPlugin.initialSpeed);
    pointsTillNextLevel = parseInt(thisPlugin.levelUpPoints);
    points = 0;
    level = 1;
    explodingDiscIds = null;
    explosionAnimCounter = null;
    freeDiscIds = [];
  	gameState = new Tetris.Board();
    gameState.setupStartingPosition();
  	if (stopgame)
      thisPlugin.room?.stopGame?.();
    var stadiumJson = {
    	"name" : "Tetris",
    	"width" : 0,
    	"height" : 0,
    	"cameraWidth" : 0,
    	"cameraHeight" : 0,
    	"maxViewWidth" : 0,
    	"cameraFollow" : "ball",
    	"spawnDistance" : 0,
    	"redSpawnPoints" : [],
    	"blueSpawnPoints" : [],
    	"canBeStored" : true,
    	"kickOffReset" : "partial",
    	"bg" : { "color" : thisPlugin.backgroundColor.slice(1) },
    	"vertexes" : [],
    	"segments" : [],
    	"goals" : [],
    	"discs" : [],
    	"planes" : [],
    	"joints" : [],
    	"traits" : {},
    	"playerPhysics" : {
    		"radius" : 4,
    		"cMask" : [],
    		"cGroup" : [],
    		"damping" : 0,
    		"kickingAcceleration" : 0,
    		"kickingDamping" : 0,
    		"kickStrength" : 0,
    		"kickback" : 0
    	},
    	"ballPhysics" : {
    		"radius" : 0,
    		"cMask" : [],
    		"cGroup" : [],
        "damping": 1
    	}
    };
    var v = 0;
    for (var i=0;i<numDiscs-1;i++)
      stadiumJson.discs.push({
        "pos": [0, 0],
        "radius": boxSize/2,
        "color": "000000",
        "cMask": [],
        "cGroup": [],
        "damping": 1
      });
    for (var i=0, d=-boxSize*gw/2;i<=gw;i++, d+=boxSize){
      stadiumJson.vertexes.push({"x": d, "y": -(boxSize*(gh+gs)+20)/2, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": d, "y": boxSize*gh-(boxSize*(gh+gs)+20)/2, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v, "v1": v+1, "color": bc, "cGroup": [], "cMask": []});
      v+=2;
    }
    for (var i=0, d=-(boxSize*(gh+gs)+20)/2;i<=gh;i++, d+=boxSize){
      stadiumJson.vertexes.push({"x": -boxSize*gw/2, "y": d, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": boxSize*gw/2, "y": d, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v, "v1": v+1, "color": bc, "cGroup": [], "cMask": []});
      v+=2;
    }
    
    var offsetX = -boxSize*kUsableBricks*gs/2, offsetY = boxSize*gh+20-(boxSize*(gh+gs)+20)/2;
    boxSize = boxSize*kUsableBricks;

    for (var i=0, d=offsetX;i<=1;i++, d+=boxSize*gs){
      stadiumJson.vertexes.push({"x": d, "y": offsetY, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": d, "y": offsetY+boxSize*gs, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v, "v1": v+1, "color": bc, "cGroup": [], "cMask": []});
      v+=2;
    }
    stadiumJson.segments.push({"v0": v-4, "v1": v-2, "color": bc, "cGroup": [], "cMask": []});
    stadiumJson.segments.push({"v0": v-3, "v1": v-1, "color": bc, "cGroup": [], "cMask": []});

    var stadium;
    try{
      stadium = Utils.parseStadium(JSON.stringify(stadiumJson));
    }catch(e){
      console.log(e.toString());
    }
    if (!stadium)
      return;
    thisPlugin.room.setCurrentStadium(stadium);
    if (stopgame){
      autoStart = true;
      thisPlugin.room.startGame();
      autoStart = false;
    }
    for (var i=0;i<numDiscs;i++)
      thisPlugin.room.setDiscProperties(i, {
        x: NaN,
        y: NaN
      });
    offsetX += boxSize/2;
    offsetY += boxSize/2;
    var idx = 1, { obj, rot, discIds } = gameState.nextBrick, grid = obj.rotations[rot];
    for (var y=0;y<gs;y++)
      for (var x=0;x<gs;x++)
        if (grid[y][x]){
          discIds.push(idx);
          thisPlugin.room.setDiscProperties(idx, {
            x: offsetX+x*boxSize,
            y: offsetY+y*boxSize,
            color: obj.color,
            radius: boxSize/2
          });
          idx++;
        }
    while(idx<numDiscs)
      freeDiscIds.push(idx++);
    thisPlugin.room.players.forEach((p)=>{
      if (p.team.id!=0)
        placePlayer(p.id);
    });
    nextFallingBrick();
  }
  
  this.initialize = function(){
    var bricks = thisPlugin.room.librariesMap.bricks?.array;
    if (!bricks){
      console.error("Bricks library is not active.");
      return;
    }
    bricks.forEach((b, i)=>{
      b.active = (i<7);
    });
    setTimeout(restart, 1000);
  };

  this.finalize = function(){
    gameState = null;
    bricksArray = null;
    freeDiscIds = null;
    explodingDiscIds = null;
    explosionAnimCounter = null;
    fallingBrick = null;
  };
  
  this.onGameStart = function(){
    if (autoStart)
      return;
    restart(false);
  };

  function placePlayer(id){
    Utils.runAfterGameTick(()=>{
      thisPlugin.room.setPlayerDiscProperties(id, {x:NaN, y:NaN});
    });
  }

  function animateExplosion(fNextPiece){
    var color = explosionColors[explosionAnimCounter%explosionColors.length];
    explodingDiscIds.forEach((discId)=>thisPlugin.room.setDiscProperties(discId, { color }));
    explosionAnimCounter--;
    if (explosionAnimCounter<=0){
      explodingDiscIds.forEach((discId)=>{
        thisPlugin.room.setDiscProperties(discId, {
          x: NaN,
          y: NaN
        });
        freeDiscIds.push(discId);
      });
      fNextPiece();
      explosionAnimCounter = null;
      explodingDiscIds = null;
    }
    else
      setTimeout(()=>animateExplosion(fNextPiece), 50);
  }
 
  this.onPlayerTeamChange = function(playerId, teamId){
    if (teamId==0)
      return;
    placePlayer(playerId);
  };

  function placeFallingBrick(){
    var explosions = [], { obj, rot, discIds, pivot } = fallingBrick, dIdx = 0, boxSize = parseInt(thisPlugin.boxSize);
    if (!gameState.placeBrick(fallingBrick, (x, y)=>({ discId: discIds[dIdx++] }), (index)=>{
      if (!explodingDiscIds)
        explodingDiscIds=[];
      var gw = parseInt(thisPlugin.gridWidth);
      for (var i=0;i<gw;i++)
        explodingDiscIds.push(gameState.cells[index][i].discId);
      explosions.push(index);
    }))
      return false;
    placeFallingBrickDiscs(0, 0);
    yspeed = yspeedOrig;
    if (explosions.length==0)
      nextFallingBrick();
    else{
      explosionAnimCounter = 10;
      animateExplosion(()=>{
        var gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), yIncrements = [], discs = thisPlugin.room.gameState.physicsState.discs;
        for (var j=0;j<gh;j++)
          yIncrements.push(0);
        for (var j=explosions.length-1;j>=0;j--){
          var y = explosions[j];
          for (i=0;i<y;i++)
            yIncrements[i]++;
        }
        for (var j=0;j<gh;j++)
          if (!explosions.includes(j)){
            var yInc = yIncrements[j];
            if (yInc==0)
              continue;
            for (var i=0;i<gw;i++){
              var cell = gameState.cells[j][i];
              if (!cell)
                continue;
              thisPlugin.room.setDiscProperties(cell.discId, {
                y: discs[cell.discId].pos.y+yInc*boxSize
              });
            }
          }
        for (var j=explosions.length-1;j>=0;j--)
          gameState.cells.splice(explosions[j], 1);
        for (var j=explosions.length-1;j>=0;j--){
          var a = [];
          for (var x=0;x<gw;x++)
            a.push(null);
          gameState.cells.splice(0, 0, a);
        }
        var p = pointsByExplosionCount(explosions.length);
        points += p;
        pointsTillNextLevel -= p;
        if (pointsTillNextLevel<0){
          thisPlugin.room.sendAnnouncement("New level reached: "+(++level), null, 0xff0000, 0, 0);
          pointsTillNextLevel += parseInt(thisPlugin.levelUpPoints);
          var coeff = parseFloat(thisPlugin.speedUpCoeff);
          yspeedOrig *= coeff;
          yspeed *= coeff;
        }
        thisPlugin.room.sendAnnouncement("Current points: "+points+", points till next level: "+pointsTillNextLevel, null, 0xff0000, 0, 0);
        nextFallingBrick();
      });
    }
    return true;
  }

  function canBrickExistAt(px, py){
    var gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    var { obj, rot, pivot } = fallingBrick, grid = obj.rotations[rot], canExist = true;
    for (var y=0;(y<gs)&&canExist;y++)
      for (var x=0;(x<gs)&&canExist;x++)
        if (grid[y][x]){
          var ix = px-pivot.x+x, iy = py-pivot.y+y;
          if (ix<0 || iy<0 || ix>=gw || iy>=gh || gameState.cells[iy][ix])
            canExist = false;
        }
    return canExist;
  }

  function tryMoveBrick(deltaX){
    if (deltaX==0)
      return;
    var b = thisPlugin.room.getBall();
    if (!b)
      return;
    var { pos } = fallingBrick;
    if (!canBrickExistAt(pos.x+deltaX, pos.y))
      return;
    pos.x += deltaX;
    var boxSize = parseInt(thisPlugin.boxSize), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    placeFallingBrickDiscs(b.pos.y-(-(boxSize*(gh+gs)+20)/2+pos.y*boxSize+boxSize/2), yspeed);
  }

  function tryRotateBrick(){
    var b = thisPlugin.room.getBall();
    if (!b)
      return;
    var oldFB = fallingBrick, { pos } = fallingBrick;
    fallingBrick = rotateFallingBrick();
    if (!canBrickExistAt(pos.x, pos.y)){
      fallingBrick = oldFB;
      return;
    }
    var boxSize = parseInt(thisPlugin.boxSize), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    placeFallingBrickDiscs(b.pos.y-(-(boxSize*(gh+gs)+20)/2+pos.y*boxSize+boxSize/2), yspeed);
  }

  function alterYSpeed(speed){
    if (yspeed==speed)
      return;
    yspeed = speed;
    var { discIds } = fallingBrick;
    thisPlugin.room.setDiscProperties(0, {
      yspeed
    });
    discIds.forEach((discId)=>{
      thisPlugin.room.setDiscProperties(discId, {
        yspeed
      });
    });
  }

  this.onGameTick = function(){
    var b = thisPlugin.room.getBall();
    if (!b)
      return;
    var boxSize = parseInt(thisPlugin.boxSize), gh = parseInt(thisPlugin.gridHeight), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    var newY = Math.floor((b.pos.y-boxSize/2+(boxSize*(gh+gs)+20)/2)/boxSize), { pos } = fallingBrick;
    if (newY!=pos.y){
      pos.y = newY;
      if (!canBrickExistAt(pos.x, newY+1) && !placeFallingBrick()){
        thisPlugin.room.sendAnnouncement("Game over.", null, 0xff0000, 0, 0);
        thisPlugin.room.stopGame();
      }
    }
  };
 
  this.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo){
    if (type!=OperationType.SendInput || !gameState)
      return true;
    if (explodingDiscIds)
      return false;
    var player = thisPlugin.room.getPlayer(msg.byId);
    if (player.team.id==0) // spectator
      return true;
    var { dirX, dirY, kick } = Utils.reverseKeyState(msg.input);
    tryMoveBrick(dirX);
    if (dirY==-1)
      tryRotateBrick();
    else if (dirY==1)
      alterYSpeed(15.0);
    else
      alterYSpeed(yspeedOrig);
    return false;
  };
  this.onVariableValueChange = function(addonObject){
    if (addonObject!=thisPlugin)
      return;
    restart();
  };
}