module.exports = function(API){
  const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = API;

  Object.setPrototypeOf(this, Plugin.prototype);
  Plugin.call(this, "CMD_backgammon", true, { // "CMD_backgammon" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
    version: "0.1",
    author: "abc",
    description: `This plugin sets up a backgammon game.`,
    allowFlags: AllowFlags.CreateRoom // We allow this plugin to be activated on CreateRoom only.
  });
  
  this.defineVariable({
    name: "boxSize",
    type: VariableType.Integer,
    value: 60,
    range: {
      min: 10,
      max: 2000,
      step: 1
    },
    description: "Edge length of each square of the board in map units."
  });
  
  this.defineVariable({
    name: "pieceSpaceCoeff",
    type: VariableType.Number,
    value: 0.36,
    range: {
      min: 0,
      max: 1,
      step: 0.0001
    },
    description: "Space coefficient for pieces."
  });
  
  this.defineVariable({
    name: "backgroundColor",
    type: VariableType.Color,
    value: "#f7ecc8",
    description: "1st alternating color of the triangles inside the board."
  });

  this.defineVariable({
    name: "borderColor",
    type: VariableType.Color,
    value: "#ab752e",
    description: "1st alternating color of the triangles inside the board."
  });
  
  this.defineVariable({
    name: "boardTriangleColor1",
    type: VariableType.Color,
    value: "#854e23",
    description: "1st alternating color of the triangles inside the board."
  });
  
  this.defineVariable({
    name: "boardTriangleColor2",
    type: VariableType.Color,
    value: "#6b4a35",
    description: "2nd alternating color of the triangles inside the board."
  });

  var Backgammon = (function(){
    var Color = {
      Black: -1,
      Empty: 0,
      White: 1
    };
    var State = {
      WaitingForDice: 0,
      WaitingForMove: 1,
  	  Ended: 2
    };
    const barPos = {
      "-1": 25, 
      "1": 0
    };
    function Board(){ // we will be assuming the gamestate is represented from white player's perspecetive.
      this.cells = []; // positive values represent white, negative values represent black.
	    this.outCells = {"-1": 0, "1": 0};
      this.turn = Color.Empty;
      this.movesLeft = [];
      this.state = State.WaitingForDice;
    }
    Board.prototype = {
      setupStartingPosition: function(){
        this.cells = [0, 2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5, -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2, 0]; // positions are always from white player's perspective.
    		this.outCells = {"-1": 0, "1": 0};
        this.turn = Color.White;
        this.movesLeft = [];
        this.state = State.WaitingForDice;
      },
      inputDice: function(dice1, dice2){ // returns 1 if we are not expecting a dice roll yet, 2 if no move is possible, 0 otherwise.
        if (this.state!=State.WaitingForDice)
          return 1;
        if (dice1==dice2)
          this.movesLeft = [dice1, dice1, dice1, dice1];
        else
          this.movesLeft = [Math.max(dice1,dice2), Math.min(dice1,dice2)];
        if (this.noMovesLeft()){
          this.turn = -this.turn;
          this.state = State.WaitingForDice;
          return 2;
        }
        this.state = State.WaitingForMove;
        return 0;
      },
      testColor: function(pos, coeff){ // coeff=1 -> same colors, coeff=0 -> empty, coeff=-1 -> opposite colors
        return (coeff==0 && this.cells[pos]==0) || ((coeff*(this.turn*this.cells[pos]))>0);
      },
      canBearOff: function(){
        if (this.testColor(barPos[this.turn], 1))
          return false;
        var finishCheckPos = barPos[-this.turn]-this.turn*6;
        for (var i=1;i<25;i++)
          if (this.turn*this.cells[i]>0 && this.turn*i<this.turn*finishCheckPos)
            return false;
        return true;
      },
      noMovesLeft: function(){
        if (this.movesLeft.length==0)
          return true;
        var bp = barPos[this.turn];
        if (this.testColor(bp, 1))
          return !this.movesLeft.reduce((x, m)=>{
            x|=-this.turn*this.cells[bp+this.turn*m]<=1;
            return x;
          }, false);
        var bearOff = this.canBearOff();
        for (var i=1;i<25;i++)
          if (this.turn*this.cells[i]>0)
            for (var j=0;j<this.movesLeft.length;j++){
      			  var ii = i+this.turn*this.movesLeft[j];
              if ((ii>0 && ii<25 && -this.turn*this.cells[ii]<=1) || (bearOff && this.turn*ii>=this.turn*barPos[-this.turn]))
                return false;
			      }
        return true;
      },
      makeMove: function(pos1, pos2, num=1){ // tries to move num pieces from pos1 to pos2 where pos1 and pos2 are positions from white player's perspective. returns 0 if it fails, 1 if successful, 2 if successful and switched turns (no moves left), 3: game over and white won, 4: game over and black won.
        if (this.state!=State.WaitingForMove)
          return 0;
        if (!this.testColor(pos1, 1))
          return 0;
        var delta = this.turn*(pos2-pos1); // (this.turn==Color.White)?(pos1-pos2):(pos2-pos1)
        if (pos2==barPos[-this.turn]){
          if (!this.canBearOff())
            return 0;
          var moveIndices = this.movesLeft.map((m, i)=>(m==delta?i:-1)).filter((x)=>(x>=0));
          if (moveIndices.length<num){
            moveIndices = this.movesLeft.map((m, i)=>(m>delta?i:-1)).filter((x)=>(x>=0));
            if (moveIndices.length<num)
              return 0;
            for (var idx = barPos[-this.turn]-this.turn*6; this.turn*idx<this.turn*pos1; idx+=this.turn)
              if (this.testColor(idx, 1))
                return 0;
          }
          var piecesLeft = this.cells[pos1]-this.turn*num;
          if (this.turn*piecesLeft<0)
            return 0;
          this.cells[pos1] = piecesLeft;
          this.outCells[this.turn] += num;
          if (this.outCells[this.turn]==15){
            this.state = State.Ended;
            return 3+(1-this.turn)/2;
          }
          for (var i=num-1;i>=0;i--)
            this.movesLeft.splice(moveIndices[i], 1);
        }
        else{
          var moveIndices = this.movesLeft.map((m, i)=>(m==delta?i:-1)).filter((x)=>(x>=0)), bp = barPos[this.turn];
          if (moveIndices.length<num || !((this.turn*this.cells[pos2])>=-1) || (this.testColor(bp, 1) && pos1!=bp))
            return 0;
          var piecesLeft = this.cells[pos1]-this.turn*num;
          if (this.turn*piecesLeft<0)
            return 0;
          this.cells[pos1] = piecesLeft;
          if (this.testColor(pos2, -1)){
            this.cells[barPos[-this.turn]]-=this.turn;
            this.cells[pos2]=this.turn*num;
          }
          else
            this.cells[pos2]+=this.turn*num;
          for (var i=num-1;i>=0;i--)
            this.movesLeft.splice(moveIndices[i], 1);
        }
        if (this.noMovesLeft()){
          this.movesLeft = [];
          this.turn = -this.turn;
          this.state = State.WaitingForDice;
          return 2;
        }
        return 1;
      },
      dump: function(console_log){
        console_log("State: "+this.state+"\r\n",
					"Turn: "+this.turn+"\r\n",
					"Moves Left: "+this.movesLeft+"\r\n",
					"Cells: ", this.cells, "\r\n",
					"Out Cells: ["+this.outCells[-1]+", "+this.outCells[1]+"]");
      }
    };
    return {
      Color,
      State,
      Board
    };
  })();

  var Board = Backgammon.Board, State = Backgammon.State;
  var that = this, gameState, permissionCtx, permissionIds, autoStart = false, positions = null, outPositions = null, dices = null, moves = null, turn = null, turnPlayerId = null, lastPlayerIdxs = [], playerPos = null, moveMode = 0, selectedPos = null, selectedDiscIds = null;
  
  function Position(x, y, yDir){
    this.x = x;
    this.y = y;
    this.yDir = yDir;
    this.discIds = [];
  }
  
  function movePieces(){
    if (!gameState)
      return;
    var discIds = {"-1": 1, "1": 16};
    for (var x=0;x<26;x++){
      var count = gameState.cells[x];
      if (count==0)
        continue;
      var p = positions[x], s = Math.sign(count);
      for (var i=0;i<Math.abs(count);i++){
        p.discIds.push(discIds[s]);
        that.room.setDiscProperties(discIds[s]++, {
          x: p.x,
          y: p.y+p.yDir*i*that.boxSize*(1-that.pieceSpaceCoeff)
        });
      }
    }
  }

  function restart(stopgame=true){
    var boxSize = parseFloat(that.boxSize);
  	gameState = new Board();
    gameState.setupStartingPosition();
  	if (stopgame)
      that.room?.stopGame?.();
    var stadiumJson = {
    	"name" : "Backgammon",
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
    	"bg" : { "color" : that.backgroundColor.slice(1) },
    	"vertexes" : [],
    	"segments" : [],
    	"goals" : [],
    	"discs" : [],
    	"planes" : [],
    	"joints" : [],
    	"traits" : {},
    	"playerPhysics" : {
    		"radius" : boxSize/3+4,
    		"cMask" : [],
    		"cGroup" : [],
    		//"gravity" : [0, 0],
    		//"acceleration" : 0,
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
    var v = 0, offsetX=-6.5*boxSize, offsetY=2*boxSize;
    positions = [];
    positions.push(new Position(0, 0, 1));
    for (var i=0;i<6;i++)
      positions.push(new Position(offsetX+boxSize/2+(12-i)*boxSize, offsetY+2.5*boxSize+boxSize*(0.5-that.pieceSpaceCoeff), -1));
    for (var i=0;i<6;i++)
      positions.push(new Position(offsetX-boxSize/2+(6-i)*boxSize, offsetY+2.5*boxSize+boxSize*(0.5-that.pieceSpaceCoeff), -1));
    for (var i=0;i<6;i++)
      positions.push(new Position(offsetX+boxSize/2+i*boxSize, offsetY-6.5*boxSize-boxSize*(0.5-that.pieceSpaceCoeff), 1));
    for (var i=0;i<6;i++)
      positions.push(new Position(offsetX+7.5*boxSize+i*boxSize, offsetY-6.5*boxSize-boxSize*(0.5-that.pieceSpaceCoeff), 1));
    positions.push(new Position(0, 0, 1));
    outPositions = [null];
    var p = new Position(offsetX+13.5*boxSize, offsetY-6.5*boxSize-boxSize*(0.5-that.pieceSpaceCoeff), 1);
    p.active = false;
    p.rect = [offsetX+13.275*boxSize, offsetY-7*boxSize, boxSize*0.45, boxSize*4.8];
    outPositions.push(p);
    p = new Position(offsetX+13.5*boxSize, offsetY+2.5*boxSize+boxSize*(0.5-that.pieceSpaceCoeff), -1);
    p.active = false;
    p.rect = [offsetX+13.275*boxSize, offsetY-1.775*boxSize, boxSize*0.45, boxSize*4.8];
    outPositions.push(p);
    for (var l=0;l<2;l++){
      for (var k=0;k<2;k++){
        for (var j=0;j<6;j++){
          var vtop = v;
          stadiumJson.vertexes.push({"x": offsetX+boxSize/2+j*boxSize, "y": offsetY+3*boxSize*l, "cGroup": [], "cMask": []});
          v++;
          for (var i=0;i<=8;i++,v++){
            stadiumJson.vertexes.push({"x": offsetX+i*boxSize*(1-that.pieceSpaceCoeff)/8+j*boxSize+that.pieceSpaceCoeff*boxSize/2, "y": offsetY+3*boxSize*(1-l)});
            stadiumJson.segments.push({"v0": vtop, "v1": v, "cGroup": [], "cMask": [], "color": that["boardTriangleColor"+(j%2+1)].slice(1)});
          }
        }
        offsetX+=boxSize*7;
      }
      offsetX-=boxSize*14;
      offsetY-=boxSize*7;
    }
    offsetX-=boxSize;
    offsetY+=boxSize*6;
    for (var i=0;i<30;i++)
      stadiumJson.discs.push({
        "radius": boxSize*(1-that.pieceSpaceCoeff)/2,
        "color": (i<15)?"000000":"ffffff",
        "cMask": [],
        "cGroup": []
      });
    function drawRect(x,y,w,h,color){
      stadiumJson.vertexes.push({"x": x, "y": y, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": x+w, "y": y, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": x+w, "y": y+h, "cGroup": [], "cMask": []});
      stadiumJson.vertexes.push({"x": x, "y": y+h, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v, "v1": v+1, "color": color, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v+1, "v1": v+2, "color": color, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v+2, "v1": v+3, "color": color, "cGroup": [], "cMask": []});
      stadiumJson.segments.push({"v0": v+3, "v1": v, "color": color, "cGroup": [], "cMask": []});
      v+=4;
    }
    function drawRectJ(x,y,w,h,color){
      var d = stadiumJson.discs.length+1;
      stadiumJson.discs.push({"pos": [x, y], "radius": 0, "cGroup": [], "cMask": []});
      stadiumJson.discs.push({"pos": [x+w, y], "radius": 0, "cGroup": [], "cMask": []});
      stadiumJson.discs.push({"pos": [x+w, y+h], "radius": 0, "cGroup": [], "cMask": []});
      stadiumJson.discs.push({"pos": [x, y+h], "radius": 0, "cGroup": [], "cMask": []});
      stadiumJson.joints.push({"d0": d, "d1": d+1, "length": [0, 2000000000], "strength": 0, "color": color});
      stadiumJson.joints.push({"d0": d+1, "d1": d+2, "length": [0, 2000000000], "strength": 0, "color": color});
      stadiumJson.joints.push({"d0": d+2, "d1": d+3, "length": [0, 2000000000], "strength": 0, "color": color});
      stadiumJson.joints.push({"d0": d+3, "d1": d, "length": [0, 2000000000], "strength": 0, "color": color});
    }
    drawRect(offsetX, offsetY, boxSize*15, boxSize*12, that.borderColor.slice(1));
    drawRect(offsetX+boxSize, offsetY+boxSize, boxSize*6, boxSize*10, that.borderColor.slice(1));
    drawRect(offsetX+8*boxSize, offsetY+boxSize, boxSize*6, boxSize*10, that.borderColor.slice(1));
    drawRectJ(offsetX+14.275*boxSize, offsetY+boxSize, boxSize*0.45, boxSize*4.8, that.borderColor.slice(1));
    drawRectJ(offsetX+14.275*boxSize, offsetY+boxSize*6.2, boxSize*0.45, boxSize*4.8, that.borderColor.slice(1));
    var stadium;
    try{
      stadium = Utils.parseStadium(JSON.stringify(stadiumJson));
    }catch(e){
      console.log(e);
    }
    if (!stadium)
      return;
    that.room.setCurrentStadium(stadium);
    if (stopgame){
      autoStart = true;
      that.room.startGame();
      autoStart = false;
    }
    for (var i=31;i<39;i++)
      that.room.setDiscProperties(i, {
        x: NaN,
        y: NaN
      });
    movePieces();

    /*
    var t = 1;

    var [x,y,w,h] = outPositions[t].rect;
    console.log(t,x,y,w,h);
    that.room.setDiscProperties(31+(2-t)*4, {
      x: x,
      y: y
    });
    that.room.setDiscProperties(32+(2-t)*4, {
      x: x+w,
      y: y
    });
    that.room.setDiscProperties(33+(2-t)*4, {
      x: x+w,
      y: y+h
    });
    that.room.setDiscProperties(34+(2-t)*4, {
      x: x,
      y: y+h
    });
    */
    
    playerPos = null;
    selectedPos = null;
    selectedDiscIds = null;
    moveMode = 0;
    moves = null;
    turn = 1;//1+Math.floor(Math.random()*2);
    that.room.sendAnnouncement(((turn==1)?"White":"Black")+" team has won the initial dice.", null, 0xff0000, 0, 0);
    throwDice();
    for (var i=0;i<that.room.players.length;i++)
      resetPlayer(that.room.players[i]);
    nextPlayer(turn);
  }
  
  function throwDice(){
    dices = [1+Math.floor(Math.random()*6), 1+Math.floor(Math.random()*6)];
    //dices = [1, 1];
    that.room.sendAnnouncement("Dice thrown: ("+dices[0]+","+dices[1]+").", null, 0xff0000, 0, 0);
    var v = gameState.inputDice(dices[0], dices[1]);
    gameState.dump(console.log);
    if (v==2){
      that.room.sendAnnouncement(((turn==1)?"White":"Black")+" team has no moves. Switching turn...", null, 0xff0000, 0, 0);
      turn = 3-turn;
      throwDice();
    }
  }
  
  function announceNextPlayer(player){
    if (!player)
      that.room.sendAnnouncement("Waiting for a player to join "+((turn==1)?"red":"blue")+" team.", null, 0x00ff00, 0, 0);
    else
      that.room.sendAnnouncement("It's your turn to play, ["+player.id+"]"+player.name+".", null, 0x00ff00, 0, 0);
  }
  
  function resetPlayer(player){
    if (player==null)
      return;
    if (typeof player!="number")
      player = player.id;
    that.room.setPlayerDiscProperties(player, {
      x: NaN,
      y: NaN
    });
  }
  
  function placePlayer(){
    var p = playerPos.x==-1?outPositions[turn]:positions[playerPos.x];
    that.room.setPlayerDiscProperties(turnPlayerId, {
      x: p.x,
      y: p.y+p.yDir*playerPos.y*that.boxSize*(1-that.pieceSpaceCoeff)
    });
  }

  function nextPlayer(turn){
    resetPlayer(turnPlayerId);
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
    playerPos = {x: turn==2?24:1, y: 0};
    placePlayer();
  }

  this.initialize = function(){
    permissionCtx = that.room.librariesMap.permissions?.createContext("backgammon");
    if (permissionCtx)
      permissionIds = {
        reset: permissionCtx.addPermission("reset"),
      };
    that.room.librariesMap.commands?.add({
      name: "reset",
      parameters: [],
      minParameterCount: 0,
      helpText: "Restarts the game.",
      callback: ({}, byId) => {
        if (byId!=0 && !permissionCtx?.checkPlayerPermission(byId, permissionIds.reset)){
          that.room.librariesMap.commands?.announcePermissionDenied(byId);
          return;
        }
        restart();
      }
    });
    setTimeout(restart, 1000);
  };

  this.finalize = function(){
    gameState = null;
    that.room.librariesMap.commands?.remove("reset");
    that.room.librariesMap.permissions?.removeContext(permissionCtx);
    permissionCtx = null;
    permissionIds = null;
  };
  
  this.onGameStart = function(){
    if (autoStart)
      return;
    restart(false);
  };

  this.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo, customData){
    if (type!=OperationType.SendInput || !gameState)
      return true;
    if (msg.byId!=turnPlayerId)
      return false;
    var board = gameState.cells;
    function makeMove(selectedPos, playerPos, selectedDiscIds){
      /*var move = Math.abs(playerPos.x-selectedPos),pp = positions[playerPos.x];*/
      function reset(){
        playerPos.x = selectedPos;
        playerPos.y = 0;
        placePlayer();
        var rp = positions[selectedPos];
        selectedDiscIds.forEach((discId)=>{
          rp.discIds.push(discId);
          that.room.setDiscProperties(discId, {
            color: (discId<16)?0x000000:0xffffff
          });
        });
        moveMode = 0;
        selectedDiscIds = null;
      }
      var oldValues = [board[playerPos.x], board[0], board[25], gameState.outCells[-1], gameState.outCells[1], gameState.turn];
      //console.log("0", playerPos, selectedPos, pp, selectedDiscIds);
      var result = gameState.makeMove(selectedPos, (playerPos.x==-1)?((turn==1)?25:0):playerPos.x, selectedDiscIds.length);
      console.log(result, selectedPos, playerPos.x);
      gameState.dump(console.log);
      //console.log(result);
      switch(result){
        case 0:{
          reset();
          break;
        }
        case 1:
        case 2:{
          for (var t=1;t<3;t++){
            if (!outPositions[t].active && gameState.canBearOff()){
              outPositions[t].active = true;
              var [x,y,w,h] = outPositions[t].rect;
              console.log(t,x,y,w,h);
              that.room.setDiscProperties(31+(2-t)*4, {
                x: x,
                y: y
              });
              that.room.setDiscProperties(32+(2-t)*4, {
                x: x+w,
                y: y
              });
              that.room.setDiscProperties(33+(2-t)*4, {
                x: x+w,
                y: y+h
              });
              that.room.setDiscProperties(34+(2-t)*4, {
                x: x,
                y: y+h
              });
            }
          }
          /*
          var discIds;
          if (board[selectedPos]!=oldValues[0]){
            discIds = positions[playerPos.x].discIds.splice(0, oldValues[0]-board[selectedPos]);
            console.log(selectedDiscIds, discIds);
          }
          */
          if (board[playerPos.x]!=oldValues[0]){
            var pp = positions[playerPos.x];
            if (board[playerPos.x]*oldValues[0]<0){
              var discId = positions[playerPos.x].discIds.splice(0, 1)[0];
              var p = positions[(turn==2)?0:25];
              p.discIds.push(discId);
              that.room.setDiscProperties(discId, {
                x: p.x,
                y: p.y+p.yDir*p.discIds.length*that.boxSize*(1-that.pieceSpaceCoeff),
                color: (turn==2)?0xffffff:0x000000
              });
            }
            var num = pp.discIds.length;
            selectedDiscIds.forEach((discId)=>{
              pp.discIds.push(discId);
              that.room.setDiscProperties(discId, {
                x: pp.x,
                y: pp.y+pp.yDir*(num++)*that.boxSize*(1-that.pieceSpaceCoeff),
                color: (turn==1)?0xffffff:0x000000
              });
            });
          }
          if (board[0]!=oldValues[1]){
            console.log(board[0]);
          }
          if (board[25]!=oldValues[2]){
            console.log(board[25]);
          }
          if (gameState.outCells[-1]!=oldValues[3]){
            var pp = outPositions[2];
            var num = pp.discIds.length;
            selectedDiscIds.forEach((discId)=>{
              pp.discIds.push(discId);
              that.room.setDiscProperties(discId, {
                x: pp.x,
                y: pp.y+pp.yDir*(num++)*that.boxSize*0.3,
                radius: that.boxSize*0.15,
                color: 0x000000
              });
            });
          }
          else if (gameState.outCells[1]!=oldValues[4]){
            var pp = outPositions[1];
            var num = pp.discIds.length;
            selectedDiscIds.forEach((discId)=>{
              pp.discIds.push(discId);
              that.room.setDiscProperties(discId, {
                x: pp.x,
                y: pp.y+pp.yDir*(num++)*that.boxSize*0.3,
                radius: that.boxSize*0.15,
                color: 0xffffff
              });
            });
          }
          //that.room.sendAnnouncement("Moved "+selectedDiscIds.length+" discs "+move+" units.", null, 0xffff00, 0, 0);
          moveMode = 0;
          selectedDiscIds = null;
          //console.log(board[playerPos.x]);
          /*
          if (turn==2)
            old = -old;
          var discId = positions[playerPos.x].discIds.splice(0, 1)[0];
          var p = positions[(turn==2)?0:25];
          p.discIds.push(discId);
          that.room.setDiscProperties(discId, {
            x: p.x,
            y: p.y+p.yDir*board[playerPos.x]*that.boxSize*(1-that.pieceSpaceCoeff),
            color: (turn==2)?0xffffff:0x000000
          });
          */
          break;
        }
        case 3:
        case 4:{
          var pp = outPositions[result-2];
          var num = pp.discIds.length;
          selectedDiscIds.forEach((discId)=>{
            pp.discIds.push(discId);
            that.room.setDiscProperties(discId, {
              x: pp.x,
              y: pp.y+pp.yDir*(num++)*that.boxSize*0.3,
              radius: that.boxSize*0.15,
              color: (turn==1)?0xffffff:0x000000
            });
          });
          moveMode = 0;
          selectedDiscIds = null;
          that.room.sendAnnouncement((result==3?"White":"Black")+" won the game.", null, 0xffff00, 0, 0);
          that.room.stopGame();
          return;
        }
      }
      if (gameState.turn!=oldValues[5]){
        turn = 3-turn;
        throwDice();
        nextPlayer(turn);
      }
      /*
      if ((turn==1 && playerPos.x>selectedPos) || (turn==2 && playerPos.x<selectedPos) || (moves.filter((m)=>m==move).length<selectedDiscIds.length)){
        reset();
        break;
      }
      console.log("1", turn, selectedPos, move);
      if (!gameState.canPlay(turn, (turn==1)?selectedPos:(25-selectedPos), move)){
        reset();
        break;
      }
      console.log("2");
      var num = board.getCheckers()[3-turn][(turn==2)?playerPos.x:(25-playerPos.x)];
      if (num==1){
        var discId = positions[(turn==2)?playerPos.x:(25-playerPos.x)].discIds.splice(0, 1)[0];
        var p = positions[(turn==2)?0:25];
        p.discIds.push(discId);
        that.room.setDiscProperties(discId, {
          x: p.x,
          y: p.y+p.yDir*(num++)*that.boxSize*(1-that.pieceSpaceCoeff),
          color: (turn==2)?0xffffff:0x000000
        });
      }
      num = board.getCheckers()[turn][(turn==1)?playerPos.x:(25-playerPos.x)];
      for (var i=0;i<selectedDiscIds.length;i++)
        gameState.play(turn, (turn==1)?selectedPos:(25-selectedPos), move);
      if (selectedDiscIds.length>0)
        moves.splice(0, selectedDiscIds.length);
      else
        moves.splice(moves.indexOf(move), 1);
      selectedDiscIds.forEach((discId)=>{
        pp.discIds.push(discId);
        that.room.setDiscProperties(discId, {
          x: pp.x,
          y: pp.y+pp.yDir*(num++)*that.boxSize*(1-that.pieceSpaceCoeff),
          color: (turn==1)?0xffffff:0x000000
        });
      });
      that.room.sendAnnouncement("Moved "+selectedDiscIds.length+" discs "+move+" units.", null, 0xffff00, 0, 0);
      moveMode = 0;
      selectedDiscIds = null;
      if (moves.length==0){
        turn = 3-turn;
        throwDice();
        nextPlayer(turn);
        console.log("test1", board.getCheckers()[turn][(turn==2)?0:25]);
        if (board.getCheckers()[turn][(turn==2)?0:25]>0){
          console.log("test2", board.getCheckers()[turn][(turn==1)?dices[0]:(25-dices[0])], board.getCheckers()[turn][(turn==1)?dices[1]:(25-dices[1])]);
          if (board.getCheckers()[turn][(turn==1)?dices[0]:(25-dices[0])]>1 && board.getCheckers()[turn][(turn==1)?dices[1]:(25-dices[1])]>1)
            console.log("no moves");
          else{
            moveMode = 2;
            selectedPos = (turn==1)?0:25;
            //playerPos = {x: turn==1?24:1, y: 0};
            var p = positions[selectedPos];
            console.log("test3", p);
            selectedDiscIds = [p.discIds[0]];
            that.room.setDiscProperties(p.discIds[0], {
              color: 0xffff00
            });
          }
        }
      }
      break;
      */
    }

    switch(msg.input){
      case 0:
        return true;
      case 1:{ // up
        if (moveMode!=1)
          return false;
        playerPos.y--;
        if (playerPos.y<0)
          playerPos.y = Math.abs(board[playerPos.x])-1;
        placePlayer();
        break;
      }
      case 2:{ // down
        if (moveMode!=1)
          return false;
        playerPos.y++;
        if (playerPos.y>=Math.abs(board[playerPos.x]))
          playerPos.y = 0;
        placePlayer();
        break;
      }
      case 4:{ // left
        if (moveMode==1){
          moveMode = 0;
          playerPos.y = 0;
          placePlayer();
        }
        function moveLeftRegular(){
          playerPos.x-=turn==1?1:-1;
          if (playerPos.x<1)
            playerPos.x = 24;
          else if (playerPos.x>24)
            playerPos.x = 1;
        }
        if (moveMode==2 && turn==1 && outPositions[1].active){
          if (playerPos.x==1)
            playerPos.x=-1;
          else if (playerPos.x==-1)
            playerPos.x=24;
          else
            moveLeftRegular();
        }
        else if (moveMode==2 && turn==2 && outPositions[2].active){
          if (playerPos.x==24)
            playerPos.x=-1;
          else if (playerPos.x==-1)
            playerPos.x=1;
          else
            moveLeftRegular();
        }
        else
          moveLeftRegular();
        placePlayer();
        break
      }
      case 8:{ // right
        if (moveMode==1){
          moveMode = 0;
          playerPos.y = 0;
          placePlayer();
        }
        function moveRightRegular(){
          playerPos.x+=turn==1?1:-1;
          if (playerPos.x<1)
            playerPos.x = 24;
          else if (playerPos.x>24)
            playerPos.x = 1;
        }
        if (moveMode==2 && turn==1 && outPositions[1].active){
          if (playerPos.x==24)
            playerPos.x=-1;
          else if (playerPos.x==-1)
            playerPos.x=1;
          else
            moveRightRegular();
        }
        else if (moveMode==2 && turn==2 && outPositions[2].active){
          if (playerPos.x==1)
            playerPos.x=-1;
          else if (playerPos.x==-1)
            playerPos.x=24;
          else
            moveRightRegular();
        }
        else
          moveRightRegular();
        placePlayer();
        break;
      }
      case 16:{ // kick
        var val = Math.abs(board[playerPos.x]);
        if (moveMode==0){
          if (val>0){
            playerPos.y = val-1;
            placePlayer();
            moveMode = 1;
          } 
          if (Math.abs(board[turn==1?0:25])>0){
            var sp = turn==1?0:25;
            selectedDiscIds = positions[sp].discIds.splice(0, 1);
            makeMove(sp, playerPos, selectedDiscIds);
          }
          break;
        }
        if (moveMode==1){
          var n = val-playerPos.y, a = positions[playerPos.x].discIds;
          //console.log(positions, playerPos, n, a);
          selectedDiscIds = a.splice(a.length-n, n);
          if (selectedDiscIds.length==0){
            console.log("cancel");
            break;
          }
          selectedPos = playerPos.x;
          selectedDiscIds.forEach((discId)=>{
            that.room.setDiscProperties(discId, {
              color: 0xffff00
            });
          });
          playerPos.y = 0;
          placePlayer();
          moveMode = 2;
          break;
        }
        if (moveMode==2){
          makeMove(selectedPos, playerPos, selectedDiscIds);
          /*
          if ((turn==1 && playerPos.x>selectedPos) || (turn==2 && playerPos.x<selectedPos) || (moves.filter((m)=>m==move).length<selectedDiscIds.length)){
            reset();
            break;
          }
          console.log("1", turn, selectedPos, move);
          if (!gameState.canPlay(turn, (turn==1)?selectedPos:(25-selectedPos), move)){
            reset();
            break;
          }
          console.log("2");
          var num = board.getCheckers()[3-turn][(turn==2)?playerPos.x:(25-playerPos.x)];
          if (num==1){
            var discId = positions[(turn==2)?playerPos.x:(25-playerPos.x)].discIds.splice(0, 1)[0];
            var p = positions[(turn==2)?0:25];
            p.discIds.push(discId);
            that.room.setDiscProperties(discId, {
              x: p.x,
              y: p.y+p.yDir*(num++)*that.boxSize*(1-that.pieceSpaceCoeff),
              color: (turn==2)?0xffffff:0x000000
            });
          }
          num = board.getCheckers()[turn][(turn==1)?playerPos.x:(25-playerPos.x)];
          for (var i=0;i<selectedDiscIds.length;i++)
            gameState.play(turn, (turn==1)?selectedPos:(25-selectedPos), move);
          if (selectedDiscIds.length>0)
            moves.splice(0, selectedDiscIds.length);
          else
            moves.splice(moves.indexOf(move), 1);
          selectedDiscIds.forEach((discId)=>{
            pp.discIds.push(discId);
            that.room.setDiscProperties(discId, {
              x: pp.x,
              y: pp.y+pp.yDir*(num++)*that.boxSize*(1-that.pieceSpaceCoeff),
              color: (turn==1)?0xffffff:0x000000
            });
          });
          that.room.sendAnnouncement("Moved "+selectedDiscIds.length+" discs "+move+" units.", null, 0xffff00, 0, 0);
          moveMode = 0;
          selectedDiscIds = null;
          if (moves.length==0){
            turn = 3-turn;
            throwDice();
            nextPlayer(turn);
            console.log("test1", board.getCheckers()[turn][(turn==2)?0:25]);
            if (board.getCheckers()[turn][(turn==2)?0:25]>0){
              console.log("test2", board.getCheckers()[turn][(turn==1)?dices[0]:(25-dices[0])], board.getCheckers()[turn][(turn==1)?dices[1]:(25-dices[1])]);
              if (board.getCheckers()[turn][(turn==1)?dices[0]:(25-dices[0])]>1 && board.getCheckers()[turn][(turn==1)?dices[1]:(25-dices[1])]>1)
                console.log("no moves");
              else{
                moveMode = 2;
                selectedPos = (turn==1)?0:25;
                //playerPos = {x: turn==1?24:1, y: 0};
                var p = positions[selectedPos];
                console.log("test3", p);
                selectedDiscIds = [p.discIds[0]];
                that.room.setDiscProperties(p.discIds[0], {
                  color: 0xffff00
                });
              }
            }
          }
          break;
          */
        }
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
    /*
    wallPlaceMode = 0;
    tempCoord = null;
    that.room.setDiscProperties(0, {
      x: NaN,
      y: NaN
    });
    */
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