module.exports = function(API){
  const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "CMD_brickClassic", true, { // "CMD_brickClassic" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
    version: "0.1",
    author: "abc",
    description: `This plugin sets up a "Brick Classic" game that exists in phone app stores.`,
    allowFlags: AllowFlags.CreateRoom // We allow this plugin to be activated on CreateRoom only.
  });
  
  this.defineVariable({
    name: "gridWidth",
    type: VariableType.Integer,
    value: 8,
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
    value: 8,
    range: {
      min: 6,
      max: 42,
      step: 1
    },
    description: "Height(number of cells) of the grid."
  });

  this.defineVariable({
    name: "autoReleaseBrick",
    type: VariableType.Boolean,
    value: true,
    description: "If true, releases the brick when you try to put it in an already full place; otherwise you need to use !release command to release the brick."
  });

  this.defineVariable({
    name: "numUseableBricks",
    type: VariableType.Integer,
    value: 3,
    range: {
      min: 1,
      max: 5,
      step: 1
    },
    description: "Number of selectable bricks."
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

  const kUsableBricks = 0.5, numDiscs = 221, explosionColors = [0xffffff, 0x000000], pointsByExplosionCount = (n)=>(40+n*(n+1)*50);
  var thisPlugin = this, bricksArray = null, gameState, autoStart = false, freeDiscIds = null, explodingDiscIds = null, playerPos = {}, explosionAnimCounter = null, points = 0;

  var BrickClassic = (function(){
    var selectRandomBrick = ()=>{
      var activeBricks = bricksArray.filter((x)=>x.active), obj = activeBricks[Math.floor(Math.random()*activeBricks.length)];
      return { 
        obj, 
        rot: Math.floor(Math.random()*obj.rotations.length),
        pos: null 
      };
    };
    function Board(){
      this.cells = [];
      this.useableBricks = [];
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
        this.useableBricks = [];
        for (var i=0;i<thisPlugin.numUseableBricks;i++)
          this.useableBricks.push(Object.assign(selectRandomBrick(), {index: i, discIds: []}));
      },
      selectBrick: function(i){
        var b = this.useableBricks[i];
        if (!b)
          return;
        this.useableBricks[i] = null;
        return b;
      },
      unselectBrick: function(useableBrick){
        this.useableBricks[useableBrick.index] = useableBrick;
      },
      placeBrick: function(useableBrick, constructCell, initiateExplosion){
        if (!useableBrick.pos)
          return false;
        var { x, y } = useableBrick.pos, grid = useableBrick.obj.rotations[useableBrick.rot], cells = this.cells, gw = thisPlugin.gridWidth, gh = thisPlugin.gridHeight;
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
          row: [],
          column: []
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
        for (var i=0;i<gw;i++){
          var exp = true;
          for (var j=0;j<gh;j++)
            if (!cells[j][i]){
              exp = false;
              break;
            }
          if (exp)
            explosions.column.push(i);
        }
        explosions.row.forEach((idx)=>initiateExplosion(idx, 0));
        explosions.column.forEach((idx)=>initiateExplosion(idx, 1));
        this.useableBricks[useableBrick.index] = Object.assign(selectRandomBrick(), {index: useableBrick.index, discIds: []});
        return true;
      },
    };
    return {
      Board
    };
  })();

  function restart(stopgame=true){
    var boxSize = parseInt(thisPlugin.boxSize), gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), nb = parseInt(thisPlugin.numUseableBricks), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize), bc = thisPlugin.borderColor.slice(1);
    bricksArray = thisPlugin.room.librariesMap.bricks?.array;
    explodingDiscIds = null;
    explosionAnimCounter = null;
    playerPos = {};
    points = 0;
    freeDiscIds = [];
  	gameState = new BrickClassic.Board();
    gameState.setupStartingPosition();
  	if (stopgame)
      thisPlugin.room?.stopGame?.();
    var stadiumJson = {
    	"name" : "Brick Classic",
    	"width" : 0,
    	"height" : 0,
    	"cameraWidth" : 0,
    	"cameraHeight" : 0,
    	"maxViewWidth" : 0,
    	"cameraFollow" : "player",
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
    		"cGroup" : []
    	}
    };
    var v = 0;
    for (var i=0;i<numDiscs-1;i++)
      stadiumJson.discs.push({
        "pos": [0, 0],
        "radius": boxSize/2,
        "color": "000000",
        "cMask": [],
        "cGroup": []
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

    var offsetX = -boxSize*kUsableBricks*nb*gs/2, offsetY = boxSize*gh+20-(boxSize*(gh+gs)+20)/2;
    boxSize = boxSize*kUsableBricks;

    for (var i=0, d=offsetX;i<=nb;i++, d+=boxSize*gs){
      stadiumJson.vertexes.push({"x": d, "y": offsetY, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": d, "y": offsetY+boxSize*gs, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v, "v1": v+1, "color": bc, "cGroup": [], "cMask": []});
      v+=2;
    }
    stadiumJson.segments.push({"v0": v-2*nb-2, "v1": v-2, "color": bc, "cGroup": [], "cMask": []});
    stadiumJson.segments.push({"v0": v-2*nb-1, "v1": v-1, "color": bc, "cGroup": [], "cMask": []});
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
    var idx = 1;
    for (var i=0;i<nb;i++){
      var b = gameState.useableBricks[i];
      if (!b)
        continue;
      var { obj, rot, discIds } = b;
      var grid = obj.rotations[rot];
      for (var y=0;y<gs;y++)
        for (var x=0;x<gs;x++)
          if (grid[y][x]){
            discIds.push(idx);
            thisPlugin.room.setDiscProperties(idx, {
              x: offsetX+(i*gs+x)*boxSize,
              y: offsetY+y*boxSize,
              color: obj.color,
              radius: boxSize/2
            });
            idx++;
          }
    }
    while(idx<numDiscs)
      freeDiscIds.push(idx++);
    thisPlugin.room.players.forEach((p)=>{
      if (p.team.id!=0){
        playerPos[p.id] = 0;
        placePlayer(p.id);
      }
    });
  }
  
  this.initialize = function(){
    var bricks = thisPlugin.room.librariesMap.bricks?.array;
    if (!bricks){
      console.error("Bricks library is not active.");
      return;
    }
    bricks.forEach((b, i)=>{
      b.active = (i!=2 && i!=3);
    });
    thisPlugin.room.librariesMap.commands?.add({
      name: "release",
      parameters: [],
      minParameterCount: 0,
      helpText: "Releases the currently selected brick.",
      callback: ({}, byId) => {
        unplacePlayer(byId);
        playerPos[byId] = 0;
        placePlayer(byId);
      }
    });
    setTimeout(restart, 1000);
  };

  this.finalize = function(){
    gameState = null;
    bricksArray = null;
    freeDiscIds = null;
    explodingDiscIds = null;
    explosionAnimCounter = null;
    playerPos = null;
    thisPlugin.room.librariesMap.commands?.remove("release");
  };
  
  this.onGameStart = function(){
    if (autoStart)
      return;
    restart(false);
  };

  function checkGameOver(){
    var gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), cells = gameState.cells;
    function checkBrick(b){
      var grid = b.obj.rotations[b.rot], w = grid.width, h = grid.height;
      for (var yy=0;yy<=gh-h;yy++)
        for (var xx=0;xx<=gw-w;xx++){
          var blocked = false;
          for (var y=0;(!blocked)&&(y<h);y++)
            for (var x=0;(!blocked)&&(x<w);x++)
              if (grid[y][x]==1 && cells[yy+y][xx+x])
                blocked = true;
          if (!blocked)
            return false;
        }
      return true;
    }
    for (var i=0;i<gameState.useableBricks.length;i++){
      var b = gameState.useableBricks[i];
      if (!b)
        continue;
      if (!checkBrick(b))
        return;
    }
    var k = Object.keys(playerPos);
    for (var i=0;i<k.length;i++){
      var pp = playerPos[k[i]];
      if (typeof pp!="object")
        continue;
      if (!checkBrick(pp.brick))
        return;
    }
    thisPlugin.room.sendAnnouncement("Game over.", null, 0xff0000, 0, 0);
    thisPlugin.room.stopGame();
  }
  
  function placeNewDiscs(){
    var boxSize = parseInt(thisPlugin.boxSize), gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), nb = parseInt(thisPlugin.numUseableBricks), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    for (var i=0;i<thisPlugin.numUseableBricks;i++){
      var b = gameState.useableBricks[i];
      if (!b)
        continue;
      var { obj, rot, discIds } = b;
      if (discIds.length==0){
        var grid = obj.rotations[rot];
        for (var y=0;y<gs;y++)
          for (var x=0;x<gs;x++)
            if (grid[y][x]){
              var discId = freeDiscIds.splice(0, 1)[0];
              discIds.push(discId);
              thisPlugin.room.setDiscProperties(discId, {
                x: -boxSize*kUsableBricks*nb*gs/2+i*gs*boxSize*kUsableBricks+x*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
                y: -(boxSize*(gh+gs)+20)/2+boxSize*gh+20+y*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
                radius: boxSize*kUsableBricks/2,
                color: obj.color
              });
            }
      }
    }
    setTimeout(checkGameOver, 50);
  }

  function placePlayer(id){
    var boxSize = parseInt(thisPlugin.boxSize), gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), nb = parseInt(thisPlugin.numUseableBricks), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    var p = playerPos[id], props;
    if (p==null)
      props = {x:NaN, y:NaN};
    else if (typeof p=="number")
      props = {
        x: -boxSize*kUsableBricks*nb*gs/2+p*gs*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
        y: -(boxSize*(gh+gs)+20)/2+boxSize*gh+20+boxSize*kUsableBricks/2
      };
    else{
      props = {
        x: -boxSize*gw/2+p.x*boxSize+boxSize/2,
        y: -(boxSize*(gh+gs)+20)/2+p.y*boxSize+boxSize/2
      };
      var dIdx = 0, {obj, rot, discIds} = p.brick;
      obj.rotations[rot].forEach((row, y)=>{
        row.forEach((cell, x)=>{
          if (cell==1)
            thisPlugin.room.setDiscProperties(discIds[dIdx++], {
              x: -boxSize*gw/2+(p.x+x)*boxSize+boxSize/2,
              y: -(boxSize*(gh+gs)+20)/2+(p.y+y)*boxSize+boxSize/2
            });
        });
      });
    }
    thisPlugin.room.setPlayerDiscProperties(id, props);
  }
  
  function unplacePlayer(id){
    var boxSize = parseInt(thisPlugin.boxSize), gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight), nb = parseInt(thisPlugin.numUseableBricks), gs = parseInt(thisPlugin.room.librariesMap.bricks?.gridSize);
    var p = playerPos[id];
    if (typeof p=="object"){
      var dIdx = 0, {obj, rot, discIds, index} = p.brick;
      obj.rotations[rot].forEach((row, y)=>{
        row.forEach((cell, x)=>{
          if (cell==1)
            thisPlugin.room.setDiscProperties(discIds[dIdx++], {
              x: -boxSize*kUsableBricks*nb*gs/2+(index*gs+x)*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
              y: -(boxSize*(gh+gs)+20)/2+boxSize*gh+20+y*boxSize*kUsableBricks+boxSize*kUsableBricks/2,
              radius: boxSize*kUsableBricks/2
            });
        });
        gameState.unselectBrick(p.brick);
      });
    }
    delete playerPos[id];
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
    unplacePlayer(playerId);
    if (teamId==0)
      return;
    playerPos[playerId] = 0;
    placePlayer(playerId);
  };
  
  this.onPlayerLeave = function(playerObj, reason, isBanned, byId){
    unplacePlayer(playerObj.id);
  };

  this.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo){
    if (type!=OperationType.SendInput || !gameState)
      return true;
    if (explodingDiscIds)
      return false;
    var player = thisPlugin.room.getPlayer(msg.byId);
    if (player.team.id==0) // spectator
      return true;
    var pos = playerPos[msg.byId], tpos = typeof pos;
    switch(msg.input){
      case 0:
        return true;
      case 1:{ // up
        if (tpos=="object"){
          pos.y--;
          if (pos.y<0)
            pos.y = thisPlugin.gridHeight-pos.brick.obj.rotations[pos.brick.rot].height;
          placePlayer(msg.byId);
        }
        break;
      }
      case 2:{ // down
        if (tpos=="object"){
          pos.y++;
          if (pos.y+pos.brick.obj.rotations[pos.brick.rot].height-1>=thisPlugin.gridHeight)
            pos.y = 0;
          placePlayer(msg.byId);
        }
        break;
      }
      case 4:{ // left
        if (tpos=="number"){
          pos--;
          if (pos<0)
            pos = thisPlugin.numUseableBricks-1;
          playerPos[msg.byId] = pos;
          placePlayer(msg.byId);
        }
        else if (tpos=="object"){
          pos.x--;
          if (pos.x<0)
            pos.x = thisPlugin.gridWidth-pos.brick.obj.rotations[pos.brick.rot].width;
          placePlayer(msg.byId);
        }
        break
      }
      case 8:{ // right
        if (tpos=="number"){
          pos++;
          if (pos>=thisPlugin.numUseableBricks)
            pos = 0;
          playerPos[msg.byId] = pos;
          placePlayer(msg.byId);
        }
        else if (tpos=="object"){
          pos.x++;
          if (pos.x+pos.brick.obj.rotations[pos.brick.rot].width-1>=thisPlugin.gridWidth)
            pos.x = 0;
          placePlayer(msg.byId);
        }
        break;
      }
      case 16:{ // kick
        if (tpos=="number" && gameState.useableBricks[pos]){
          var brick = gameState.selectBrick(pos);
          playerPos[msg.byId] = {
            brick,
            x: 0,
            y: 0
          };
          placePlayer(msg.byId);
        }
        else if (tpos=="object"){
          var explosions = [], { obj, rot, discIds } = pos.brick, dIdx = 0, boxSize = parseInt(thisPlugin.boxSize);
          pos.brick.pos = { x: pos.x, y: pos.y };
          if (!gameState.placeBrick(pos.brick, (x, y)=>({ discId: discIds[dIdx++] }), (index, orientation)=>{
            if (!explodingDiscIds)
              explodingDiscIds=[];
            var gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight);
            if (orientation==0)
              for (var i=0;i<gw;i++){
                var discId = gameState.cells[index][i].discId;
                if (explodingDiscIds.indexOf(discId)<0)
                  explodingDiscIds.push(discId);
              }
            else
              for (var i=0;i<gh;i++){
                var discId = gameState.cells[i][index].discId;
                if (explodingDiscIds.indexOf(discId)<0)
                  explodingDiscIds.push(discId);
              }
            explosions.push({index, orientation});
          })){
            if (thisPlugin.autoReleaseBrick){
              unplacePlayer(msg.byId);
              playerPos[msg.byId] = 0;
              placePlayer(msg.byId);
            }
            else
              pos.brick.pos = null;
            return;
          }
          var fNextPiece = ()=>{
            placeNewDiscs();
            playerPos[msg.byId] = 0;
            placePlayer(msg.byId);
          };
          dIdx = 0;
          obj.rotations[rot].forEach((row)=>{
            row.forEach((cell)=>{
              if (cell==1)
                thisPlugin.room.setDiscProperties(discIds[dIdx++], {
                  radius: boxSize/2
                });
            });
          });
          if (explosions.length==0)
            fNextPiece();
          else{
            explosionAnimCounter = 10;
            animateExplosion(()=>{
              var gw = parseInt(thisPlugin.gridWidth), gh = parseInt(thisPlugin.gridHeight);
              explosions.forEach(({index, orientation})=>{
                if (orientation==0)
                  for (var i=0;i<gw;i++)
                    gameState.cells[index][i] = null;
                else
                  for (var i=0;i<gh;i++)
                    gameState.cells[i][index] = null;;
              });
              points+=pointsByExplosionCount(explosions.length);
              thisPlugin.room.sendAnnouncement("Current points: "+points, null, 0xff0000, 0, 0);
              fNextPiece();
            });
          }
        }
        break;
      }
    }
    return false;
  };
  
  this.onVariableValueChange = function(addonObject){
    if (addonObject!=thisPlugin)
      return;
    restart();
  };
}