process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var local = null;
if (process.argv[2].startsWith("-local="))
  local = process.argv.splice(2,1)[0].substring(7);
const API = require("../src/index")(undefined, local ? { backend: { hostname: "192.168.1.100:3000/"+local, hostnameWs: "192.168.1.100:3000/"+local, secure: true } } : undefined);
const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, Impl } = API;
const englishLanguage = require("../examples/languages/englishLanguage");
const autoPlay = require("../examples/plugins/autoPlay_defensive");
const defaultConfig = require("../examples/roomConfigs/defaultConfig");
const eventLogger = require("../examples/plugins/eventLogger");
const consoleHelper = require("../examples/plugins/consoleHelper");

Language.current = new englishLanguage(API);

(()=>{
  var createFunc = function () {
    Room.create({
      name: "test12345", 
      password: null, 
      noPlayer: false,
      showInRoomList: true, 
      playerCount: 0,
      maxPlayerCount: 50,
      unlimitedPlayerCount: true,
      //fakePassword: false,
      geo: { /*lat: 11, lon: 11, */ flag: "au" },
      // only one of token, endpoint or ctoken must be given.
      token: process.argv[2] || "thr1.AAAAAGd-YgllhQpiJ7GNNw.ZoUgdxfTMlA", 
      //endpoint: "...",
      //ctoken: "..."
    }, {
      storage: {
        crappy_router: false,
        player_name: "abc_bodd",
        geo: {
          lat: 41.021999,
          lon: 28.971162,
          flag: "tr"
        },
        avatar: "👾"
      }, 
      debugDesync: true,
      //identityToken: "...", // specifying endpoint and ctoken require an authenticated identityToken. you can copy here the access token from the website's local storage.
      config: new defaultConfig(API),
      renderer: null,
      plugins: [new autoPlay(API), new consoleHelper(API)/*, new eventLogger(API)*/],
      onOpen: (room)=>{
        room.gui.stats = ["passes", "goals", "assists"];
        const playerStats = {};
        playerStats[0] = [Math.floor(Math.random()*100), Math.floor(Math.random()*100), Math.floor(Math.random()*100)];
        const minEnergy = 0.5, maxEnergy = 1.0, energyDrainFrames = 60*0.75, fatigueProps = {sprintMin: 0.3, sprintDrain: 0.003, shootDrainCoeff: 0.08, waitGain: 0.0006}, ballZgravity = 0.0005;
        var ballZ = {coord: 0, speed: 0}, originalBallProps, ballKickCountInCurrentGameTick;
        interval = setInterval(()=>room.extrapolate(), 1000/60);
        var setBallZProps = (xspeed, yspeed, zCoord, zSpeed)=>{
          Utils.runAfterGameTick(()=>{
            var mask = ~((zCoord==0)?0:(CollisionFlags.red|CollisionFlags.blue|CollisionFlags.green|CollisionFlags.purple|CollisionFlags.yellow|CollisionFlags.redKO|CollisionFlags.blueKO|CollisionFlags.greenKO|CollisionFlags.purpleKO|CollisionFlags.yellowKO));
            room.setDiscProperties(0, {xspeed, yspeed, cMask: originalBallProps.cMask&mask, cGroup: originalBallProps.cGroup&mask, radius: originalBallProps.radius*(1+zCoord)});
            ballZ.coord = zCoord;
            ballZ.speed = zSpeed;
          });
        };
        var updateBallZ = ()=>{
          Utils.runAfterGameTick(()=>{
            var b = room.getBall();
            if (!b)
              return;
            var c = ballZ.coord + ballZ.speed;
            var s = ballZ.speed - Math.max(ballZgravity, Math.abs(ballZ.speed)*0.0750);
            if (c <= 0){
              c = 0;
              s = 0;
              room.setDiscProperties(0, {
                cMask: originalBallProps.cMask,
                cGroup: originalBallProps.cGroup,
                radius: originalBallProps.radius
              });
            }
            else {
              var cMask = b.cMask;
              var cGroup = b.cGroup;
              if (c > 0.3){
                cMask &= ~CollisionFlags.kick;
                cGroup &= ~CollisionFlags.kick;
              }
              else {
                cMask |= CollisionFlags.kick;
                cGroup |= CollisionFlags.kick;
              }

              if (c > 0.5){
                cMask &= ~CollisionFlags.score;
                cGroup &= ~CollisionFlags.score;
              }
              else {
                cMask |= CollisionFlags.score;
                cGroup |= CollisionFlags.score;
              }
              room.setDiscProperties(0, {
                radius: originalBallProps.radius * (1 + 1.25 * c),
                cMask,
                cGroup
              });
            }
            ballZ.coord = c;
            ballZ.speed = s;
          });
        };
        room.onRoomLink = (link)=>console.log("room link:", link);
        room.onPlayerJoin = (player) => Utils.runAfterGameTick(()=>{
          playerStats[player.id] = [Math.floor(Math.random()*100), Math.floor(Math.random()*100), Math.floor(Math.random()*100)];
          room.setPlayerAdmin(player.id, true);
        });
        room.onPlayerLeave = (player)=>{
          delete playerStats[player.id];
        };
        room.onPlayerDiscCreated = (player) => {
          player.sprint = false;
          player.fatigue = 1;
          Utils.runAfterGameTick(()=>{
            room.setPlayerEnergy(player.id, {energy: minEnergy, kEnergyDrain: 0});
            room.setPlayerBarLevels(player.id, NaN, player.fatigue, NaN);
          });
        };
        room.onPositionsReset = () => {
          setBallZProps(0, 0, 0, 0);
          Utils.runAfterGameTick(()=>{
            room.players.forEach((player)=>{
              room.setPlayerEnergy(player.id, {energy: minEnergy, kEnergyDrain: 0});
              player.sprint = false;
            });
          });
        };
        room.onOperationReceived = (type, msg) => {
          if (type==OperationType.SetStadium){
            msg.stadium.defaultStadiumId = 255;
            msg.stadium.playerPhysics.acceleration *= 2;
            msg.stadium.playerPhysics.energyMin = minEnergy;
            msg.stadium.playerPhysics.energyMax = maxEnergy;
            msg.stadium.playerPhysics.energyGain = 0;
            msg.stadium.playerPhysics.energyDrain = (maxEnergy-minEnergy)/energyDrainFrames;
            msg.stadium.playerPhysics.initialEnergy = minEnergy;
            msg.stadium.playerPhysics.initialEnergyBar = true;
          }
          if (type!=OperationType.Stats)
            return true;
          if (msg.byId==0)
            room._onStats(msg.playerId, playerStats[msg.playerId], msg.byId);
          else
            room.sendStats(msg.playerId, playerStats[msg.playerId], msg.byId);
          return false;
        };
        room.onGameStart = ()=>{
          var {cMask, cGroup, radius} = room.gameState.physicsState.discs[0];
          //cMask: ball, blue, blueko, red, redko, wall, 
          //cGroup: ball, score, kick
          originalBallProps = {cMask, cGroup, radius};
        };
        room.onPlayerBallKick = () => {
          ballKickCountInCurrentGameTick++;
        };
        room.onPlayerInputChange = (id, value)=>{
          var p = room.getPlayer(id);
          var sprinting = p.input&512;
          if (!sprinting && p.sprint){
            room.setPlayerEnergy(p.id, {energy: minEnergy, kEnergyDrain: 0});
            p.sprint = false;
          }
          else if (sprinting && !p.sprint && p.fatigue>fatigueProps.sprintMin){
            room.setPlayerEnergy(p.id, {energy: maxEnergy, kEnergyDrain: 1});
            p.sprint = true;
          }
        };
        room.onGameTick = () => {
          if (!room.gameStateExt)
            return;
          if (ballKickCountInCurrentGameTick>1 && Math.random()<0.6){
            var powerCoeff = 0.5*(1+Math.random())*fatigueProps.shootDrainCoeff;
            setBallZProps(null, null, powerCoeff, powerCoeff);
          }
          ballKickCountInCurrentGameTick = 0;
          var { radius, pos: {x, y} } = room.gameStateExt.physicsState.discs[0], str = room.stadium.playerPhysics.kickStrength, strongCoeff = 2, weakCoeff = 0.65;
          room.players.forEach((p)=>{
            var pDisc = p.disc?.ext;
            if (!pDisc)
              return;
            p.fatigue = p.sprint?Math.max((p.energy==minEnergy)?p.fatigue:(p.fatigue-fatigueProps.sprintDrain), 0):Math.min(p.fatigue+fatigueProps.waitGain, 1);
            var coeff = 1, bars = p.input&384;
            if (!bars && p.input&32)
              coeff*=strongCoeff;
            if (!bars && p.input&64)
              coeff*=weakCoeff*(p.sprint?1.5:1);
            if (!bars && Math.abs(coeff-1.3)<=0.31 && isNaN(p.bar1)){
              if (p.bar2!=p.fatigue)
                room.setPlayerBarLevels(p.id, -1, p.fatigue, -1);
              return;
            }
            if (ballZ.coord>0)
              return;
            var pos = pDisc.pos, dx = x-pos.x, dy = y-pos.y, d = dx**2+dy**2;
            var executeBarKick = ()=>{
              var powerCoeff = p.bar1*fatigueProps.shootDrainCoeff;
              if (p.fatigue<powerCoeff){
                room.setPlayerBarLevels(p.id, NaN, p.fatigue, -1);
                return;
              }
              d = p.bar1*(0.9+0.1*p.fatigue)*str*strongCoeff/Math.sqrt(d);
              p.fatigue -= powerCoeff;
              if (p.prevLob){
                setBallZProps(d*dx, d*dy, powerCoeff, powerCoeff);
                room.playCustomSound("kick");
              }
              else{
                room.setDiscProperties(0, {xspeed: d*dx, yspeed: d*dy});
                room.playCustomSound("kick");
              }
              room.setPlayerBarLevels(p.id, NaN, p.fatigue, -1);
            }
            if (!bars && !isNaN(p.bar1)){
              executeBarKick();
              return;
            }
            if (d<=(radius+pDisc.radius+4)**2){
              if (bars){
                p.prevLob = (p.input&256)>0;
                room.setPlayerBarLevels(p.id, Math.min((isNaN(p.bar1)?0:p.bar1)+0.02, 1), p.fatigue, -1);
                //if (p.bar1>=1)
                  //executeBarKick();
              }
              else{
                var c = coeff/strongCoeff;
                if (p.fatigue<c*fatigueProps.shootDrainCoeff)
                  return;
                d = (0.9+0.1*p.fatigue)*str*coeff/Math.sqrt(d);
                p.fatigue -= c*fatigueProps.shootDrainCoeff;
                room.setDiscProperties(0, {xspeed: d*dx, yspeed: d*dy});
                room.playCustomSound("kick");
                if (p.bar2!=p.fatigue)
                  room.setPlayerBarLevels(p.id, -1, p.fatigue, -1);
              }
              return;
            }
            if (!isNaN(p.bar1)){
              room.setPlayerBarLevels(p.id, NaN, p.fatigue, -1);
              return;
            }
            if (p.bar2!=p.fatigue)
              room.setPlayerBarLevels(p.id, -1, p.fatigue, -1);
          });
          if (ballZ.coord>0)
            updateBallZ();
        };
        room.setCurrentStadium(Utils.parseStadium(`{
          "name" : "Big",
          
          "width" : 650,
          "height" : 270,
          
          "spawnDistance" : 400,
          
          "bg" : {
            "type" : "grass", 
            "width" : 550, 
            "height" : 240, 
            "color": "5E5A33", 
            "stripe1": "3E551E", 
            "stripe2": "4F642C", 
            "kickOffRadius": 80, 
            "cornerRadius": 0, 
            "bufferWidth": 30, 
            "bufferHeight": 30, 
            "innerRectWidth": 96.25, 
            "innerRectHeight": 108, 
            "outerRectWidth": 192.5, 
            "outerRectHeight": 168, 
            "penaltyBoxArcRadius": 118.80000000000001, 
            "penaltyDistance": 137.5, 
            "spotIndicatorRadius": 4 
          },

          "vertexes" : [
            { "x" : 0, "y" : -270, "trait" : "kickOffBarrier" },
            { "x" : 0, "y" : -80, "trait" : "kickOffBarrier" },
            { "x" : 0, "y" : 80, "trait" : "kickOffBarrier" },
            { "x" : 0, "y" : 270, "trait" : "kickOffBarrier" }
          ],
          
          "segments" : [
            { "v0" : 0, "v1" : 1, "trait" : "kickOffBarrier" },
            { "v0" : 2, "v1" : 3, "trait" : "kickOffBarrier" },
            
            { "v0" : 1, "v1" : 2, "trait" : "kickOffBarrier", "curve" : 180, "cGroup" : ["redKO"], "cMask": ["red", "blue"] },
            { "v0" : 2, "v1" : 1, "trait" : "kickOffBarrier", "curve" : 180, "cGroup" : ["blueKO"], "cMask": ["red", "blue"] },
          ],
          
          "goals" : [
            { "type": 1, "p0" : [550, -80], "p1" : [550, 80], "team" : "blue" },
            { "type": 1, "p0" : [-550, -80], "p1" : [-550, 80], "team" : "red" }
          ],
          
          "discs" : [],
          
          "planes" : [
            { "normal" : [ 0, 1], "dist" : -270, "bCoef" : 0, "cMask": ["ball"] },
            { "normal" : [ 0,-1], "dist" : -270, "bCoef" : 0, "cMask": ["ball"] },

            { "normal" : [ 1, 0], "dist" : -650, "bCoef" : 0, "cMask": ["ball"] },
            { "normal" : [-1, 0], "dist" : -650, "bCoef" : 0, "cMask": ["ball"] }
          ],
          
          "traits" : {
            "kickOffBarrier" : { "vis" : false, "bCoef" : 0.1, "cGroup" : ["redKO", "blueKO"], "cMask" : ["red", "blue"] }
          }
        }`));
        room.gui.defineCssVar("hostPlayerNameStyle", JSON.stringify({"color": "#ff7535"}));
        room.setPlayerCssVar(0, "hostPlayerNameStyle");
        room.updateCssVar("tn1", "Real Madrid");
        room.updateCssVar("tc1", "url(https://ssl.gstatic.com/onebox/media/sports/logos/optimized/Th4fAVAZeCJWRcKoLW7koA_64x64.png)");
        room.updateCssVar("tn2", "Barcelona");
        room.updateCssVar("tc2", "url(https://ssl.gstatic.com/onebox/media/sports/logos/optimized/paYnEE8hcrP96neHRNofhQ_64x64.png)");
        room.setTeamColors(1, 0, 0xDAA520, 0xFFFAFA, 0xFFFAFA, 0xFFFAFA);
        room.setTeamColors(2, 0, 0xFFD7000, 0x00008B, 0x8B0000, 0x00008B);
        room.addControl("strongKick", [90]);//Z
        room.addControl("weakKick", [67]);//C
        room.addControl("barKick", [86]);//V
        room.addControl("lobKick", [70]);//F
        room.addControl("sprint", [69]);//E

        return;










        var { gui } = room;
        gui.defineCssVar("color0", "rgba(50,200,100,0.6)");
        gui.defineCssVar("announcement1", "color:#ff007f; font-size:15px; font-style:bold;");
        gui.defineCssVar("hostPlayerNameStyle", JSON.stringify({"color": "#ff7535"}));
        gui.registerSound("sine", "https://raw.githubusercontent.com/pdx-cs-sound/wavs/refs/heads/main/sine.wav");
        var container = new gui.Component(API.GUI.COMPONENT_TYPE.CONTAINER);
        container.children.push(new gui.Component(API.GUI.COMPONENT_TYPE.LABEL, {innerText: "test1:"}));
        var textbox1 = new gui.Component(API.GUI.COMPONENT_TYPE.TEXTBOX);
        container.children.push(textbox1);
        container.children.push(new gui.Component(API.GUI.COMPONENT_TYPE.LABEL, {innerText: "test2:"}));
        var textbox2 = new gui.Component(API.GUI.COMPONENT_TYPE.TEXTBOX);
        container.children.push(textbox2);
        var sendButtonStyle = gui.createStyle("background-color:$color0");
        var sendButton = new gui.Component(API.GUI.COMPONENT_TYPE.BUTTON, {innerText: "send"}, [sendButtonStyle.id]);
        sendButton.eventHandlers.push(new gui.ClickEventHandler(API.GUI.FUNCTION_TYPE.SEND_MESSAGE_TO_HOST, [textbox1.id, textbox2.id]));
        container.children.push(sendButton);
        gui.createPopup({title: "test123", contentsComponent: container});
        room.setPlayerCssVar(0, "hostPlayerNameStyle");


        let vertex_idx = undefined, segment_idx = undefined, player_id = undefined, goal_idx = undefined, plane_idx = undefined, disc_idx = undefined, joint_idx = undefined;
        function updateCssVarTest (msg)
        {
            const [, value] = msg.split(/\s+/gmi);
            room.sendChat(`Setting css var 'color0' to: ${value}`);
            room.updateCssVar("color0", value);
        }
        function setElapsedTimeTest ( msg)
        {
            const [, timeValue] = msg.split(/\s+/gmi);
            room.sendChat(`Setting elapsed time to: ${timeValue}`);
            room.setElapsedTime(parseInt(timeValue));
        }
        function setTeamScoreTest (msg)
        {
            let[, teamId, score] = msg.split(/\s+/gmi);
            teamId = parseInt(teamId);
            score = parseInt(score);
            room.setTeamScore(teamId,score);
            room.sendChat(`Setting ${teamId == 1 ? "Red" : teamId == 2 ? "Blue" : "Wtf ??"}team's score to ${score} `)
        }
        
        function setMaxGoalTicksTest (msg)
        {
            let [, value] = msg.split(/\s+/gmi); 
            value = parseInt(value);
            room.sendChat(`Setting goal ticks to ${value}`);
            room.setMaxGoalTicks(value);
        }
        
        function setMaxPauseTicksTest (msg) 
        {
            let [, value] = msg.split(/\s+/gmi);
            value = parseInt(value);
            room.sendChat(`Setting max pause ticks to ${value}`);
            room.setMaxPauseTicks(value);
        }
        
        function setMaxEndTicksTest (msg) 
        {
            let [, value] = msg.split(/\s+/gmi);
            value = parseInt(value);
            room.sendChat(`Setting max pause ticks to ${value}`);
            room.setMaxPauseTicks(value);
        }
        function setRoomNameTest (msg) 
        {
            let [, ...value] = msg.split(/\s+/gmi);
            value = value.join(" ");
            room.sendChat(`Setting room name to ${value}`);
            room.setRoomName(value);
        }
        
        function addVertexTest (msg) 
        {
          vertex_idx ??= room.state.stadium.vertices.length;
          room.addVertex({x:0, y:0, cMask: CollisionFlags.ball});
        }
        
        function updateVertexTest (msg) 
        {
          // Testing with the Latest vertex (which we created/added in our addVertexTest function).
          vertex_idx 
          &&
          ( 
            room.sendChat("Updating the vertex at index " + vertex_idx),
            console.log("Updating the vertex at index " + vertex_idx),
            room.updateVertex(vertex_idx, {
              x: 10
            })
          );
        }

        function removeVertexTest (msg) 
        {
          vertex_idx 
          &&
          (
            room.sendChat(`Removing the vertex at index ${vertex_idx}`),
            room.removeVertex(vertex_idx),
            vertex_idx = undefined
          );
        }

        function updateStadiumPlayerPhysicsTest (msg) 
        {
          room.updateStadiumPlayerPhysics(
            {
              acceleration:5,
              bCoef:.5,
              radius:100
            }
          )
        }

        function addSegmentTest (msg)
        {
          segment_idx ??= room.stadium.segments.length;
          console.log(room.stadium.vertices);
          room.addSegment({
            v0 : 0,
            v1 : 1,
            color:[100,155,222],
            vis:true,
            cGroup: CollisionFlags.ball,
            bCoef:1337
          })
        }
        function updateSegmentTest (msg)
        {
          segment_idx 
          &&
          (
            room.updateSegment(segment_idx, {
              color:[240,30,21],
            })
          )        
        }
        function removeSegmentTest (msg)
        {
          segment_idx 
          &&
          (
            console.log("Removing segment at index " + segment_idx),
            room.removeSegment(segment_idx),
            segment_idx = undefined
          );
        }
        
        function addGoalTest (msg)
        {
          goal_idx ??= room.gameState.physicsState.goals.length;
          room.addGoal({
            p0:[0, 100],
            p1:[0,-100]
          });
        }
        
        function updateGoalTest (msg)
        {
          goal_idx 
          &&
          room.updateGoal(goal_idx, {
            p0:[100,100],
            p1:[100,-100]
          });
        }
        
        function removeGoalTest (msg)
        {
          goal_idx && 
          (
            room.removeGoal(goal_idx), 
            goal_idx = undefined
          );
        }
        
        function addPlaneTest (msg)
        {
          plane_idx ??= room.stadium.planes.length;
          room.addPlane({
            normal:[100,50],
            dist:300,
            cGroup:CollisionFlags.ball
          });
        }
        
        function updatePlaneTest (msg)
        {
          plane_idx
          &&
          room.updatePlane(plane_idx, {
            dist:150,
          })
        }
        
        function removePlaneTest (msg)
        {
          plane_idx
          &&
          (
            room.removePlane(plane_idx),
            plane_idx = undefined
          )
        }
        
        function addDiscTest (msg)
        {
          room.addDisc({
            pos:[10,-10],
            speed: [5,5],
            radius: 5,
            invMass: .2,
            bCoef: 3,
            cMask:CollisionFlags.ball,
            color:[255, 195, 0]
          })
        }
        
        function updateDiscTest (msg)
        {
          disc_idx 
          &&
          room.updateDisc(disc_idx,
            {
              color:[136, 195, 0]
            }
          )
        }
        
        function removeDiscTest (msg)
        {
          disc_idx
          &&
          (
            room.removeDisc(disc_idx),
            disc_idx = undefined
          )
        }
        
        function addJointTest (msg)
        {
          joint_idx ??= room.stadium.joints.length;
          room.addJoint(
            {
              d0: 0,
              d1: 1,
              color:[255, 8, 255],
              strength:"rigid",
              length:[5,50]
            }
          )
        }
        
        function updateJointTest (msg)
        {
          joint_idx 
          &&
          (
            room.updateJoint(joint_idx,{
              color:[132, 8, 255]
            })
          )
        }
        
        function removeJointTest (msg)
        {
          joint_idx
          &&
          (
            room.removeJoint(joint_idx),
            joint_idx = undefined
          )
        }
        
        function addPlayerTest (msg)
        {
          player_id ??= 1337;
          room.addPlayer({
            id:player_id,
            name:"Test",
            avatar:"xD",
            flag:"au",
            team:"red",
            pos:[0,0],
            gravity:[3,3],
            radius:15,
          })
        }
        
        function updatePlayerTest (msg)
        {
          room.updatePlayer(player_id, {
            flag:"tr",
            name:"test 1234"
          })
        }
        
        function removePlayerTest (msg)
        {
          player_id
          &&
          (
            room.removePlayer(player_id),
            player_id = undefined
          )
        }
				
				function activateDirectionTest (msg){
					let[, active] = msg.split(/\s+/gmi);
					room.setDirectionActive(active!=0);
          room.sendChat(`Direction activation set to : ${active!=0}`);
				}

				function setClockPaused (msg){
					let[, active] = msg.split(/\s+/gmi);
					room.setClockPaused(active!=0);
          room.sendChat(`clockPaused set to : ${active!=0}`);
				}

        function setPlayerDirection(msg){
          let[, id, direction] = msg.split(/\s+/gmi);
          id = parseInt(id);
          direction = parseFloat(direction);
          room.setPlayerDirection(id, direction);
          room.sendChat(`direction set to : ${direction} for player id : ${id}`);
        }

        function setPlayerEnergy(msg){
          let[, id, energy, kEnergyGain, kEnergyDrain] = msg.split(/\s+/gmi);
          id = parseInt(id);
          energy = parseFloat(energy);
          kEnergyGain = parseFloat(kEnergyGain);
          kEnergyDrain = parseFloat(kEnergyDrain);
          room.setPlayerEnergy(id, {energy, kEnergyGain, kEnergyDrain});
          room.sendChat(`energy values set to : [e:${energy}, g:${kEnergyGain}, d:${kEnergyDrain}] for player id : ${id}`);
        }

        function addControl(msg){
          let[, name, ...keyCodes] = msg.split(/\s+/gmi);
          room.addControl(name, keyCodes.map((c)=>parseInt(c)));
          room.sendChat(`new control added : [name:${name}, keys:${keyCodes}]`);
        }

        function removeControl(msg){
          let[, name] = msg.split(/\s+/gmi);
          room.removeControl(name);
          room.sendChat(`control named ${name} was removed`);
        }

        function playCustomSound(msg){
          let[, name] = msg.split(/\s+/gmi);
          room.playCustomSound(name);
          room.sendChat(`sound named ${name} is being played`);
        }

        /*
        room.updateStadiumBg(data)
        room.updateStadiumGeneral(data)
        */

        //#endregion Test functions
        function sendCommands()
        {
          room.sendText(1, `Commands:\n${Object.keys(msgMap).join(",\n")}`, null, "announcement1", "sine");
        }
        const msgMap = {
            "?":                      sendCommands,
            "setElapsedTime":       setElapsedTimeTest,
            "updateCssVar":         updateCssVarTest,
            "setMaxGoalTicks":     setMaxGoalTicksTest,
            "setMaxPauseTicks":    setMaxPauseTicksTest,
            "setMaxEndTicks":      setMaxEndTicksTest, 
            "setTeamScore":         setTeamScoreTest,
            "setRoomName":          setRoomNameTest,
            "addVertex":             addVertexTest,
            "updateVertex":          updateVertexTest,
            "removeVertex":          removeVertexTest,
            "addSegment":            addSegmentTest,
            "updateSegment":         updateSegmentTest,
            "removeSegment":         removeSegmentTest,
            "addGoal":               addGoalTest,
            "updateGoal":            updateGoalTest,
            "removeGoal":            removeGoalTest,
            "addPlane":              addPlaneTest,
            "updatePlane":           updatePlaneTest,
            "removePlane":           removePlaneTest,
            "addDisc":               addDiscTest,
            "updateDisc":            updateDiscTest,
            "removeDisc":            removeDiscTest,
            "addJoint":              addJointTest,
            "updateJoint":           updateJointTest,
            "removeJoint":           removeJointTest,
            "addPlayer":             addPlayerTest,
            "updatePlayer":          updatePlayerTest,
            "removePlayer":          removePlayerTest,
            "updateStadiumPlayerPhysics":  updateStadiumPlayerPhysicsTest,
						"activateDirection":     activateDirectionTest,
            "setClockPaused": setClockPaused,
            "setPlayerDirection": setPlayerDirection,
            "setPlayerEnergy": setPlayerEnergy,
            "addControl": addControl,
            "removeControl": removeControl,
            "playCustomSound": playCustomSound
        };

        room.onGameStart = () => {
          room.updateCssVar("tn1", 'hey red');
          room.updateCssVar("tn2", 'hey blue');
        }
        
        room.onPlayerChat = (id, msg, customData) => {
            msgMap[msg.split(/\s+/gmi)[0]]?.(msg);
        }
        room.onPlayerJoin = (player) => room.setPlayerAdmin(player.id, true);
        room.onDirectionActiveChange = (value)=>{
          console.log("direction active: ", value);
        };
        /*
        setInterval(()=>{
          console.log(room.state.directionActive);
        }, 1000);
        */
        
        return; 
        
        // BELOW HERE IS TEST CODE FOR OLDER FEATURES. ACTIVATE IF NEEDED.

        room.hostPing = 1987987987;
        var connectionShouldBreak = {}, controlSwitch = {}, controlSwitchBlocked = {}, staticInputs = {};
        var breakConnection = function(byPlayerId, playerId){
          if (isNaN(byPlayerId) || isNaN(playerIdToBeControlled))
            return;
          /*
          if (!breakConnectionPermitted[byPlayerId]) // example for custom permission logic
            return;
          */
          connectionShouldBreak[playerId] = true;
        };

        var setControlledPlayer = function(byPlayerId, playerIdToBeControlled){
          if (isNaN(byPlayerId) || isNaN(playerIdToBeControlled) || controlSwitchBlocked[playerIdToBeControlled])
            return;
          /*
          if (!controlPermitted[byPlayerId]) // example for custom permission logic
            return;
          */
          if (!room.getPlayer(playerIdToBeControlled))
            playerIdToBeControlled = byPlayerId;
          controlSwitch[byPlayerId] = playerIdToBeControlled;
        };

        var blockControlPlayer = function(byPlayerId, playerId, value){
          if (isNaN(playerId))
            return;
          /*
          if (!blockControlPermitted[byPlayerId]) // example for custom permission logic
            return;
          */
          if (!room.getPlayer(playerId))
            return;
          controlSwitchBlocked[playerId] = (value == 1);
        };

        var setPlayerInput = function(playerId, value){
          if (!room.getPlayer(playerId))
            return;
          staticInputs[playerId] = (isNaN(value) || value<0 || value>31) ? null : value;
        };

        var unbanPlayer = function(playerId){
          room.clearBan(playerId);
        };

        room.onPlayerDiscCreated = function(a,b){
          console.log("onPlayerDiscCreated", a, b);
        };

        room.onPlayerDiscDestroyed = function(a,b){
          console.log("onPlayerDiscDestroyed", a, b);
        };

        room.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo, customData){

          //console.log(msg);

          var playerId = msg.byId;
          if (connectionShouldBreak[playerId])  // logic for breakConnection(playerId);
            throw "";

          var cs = controlSwitch[playerId];  // logic for controlPlayer(id)
          if (cs != null && !controlSwitchBlocked[playerId])
            msg.byId = cs;

          switch (type){
            case OperationType.SetStadium:{
              var s = msg.stadium;
              s.name = "[map name change test]" + s.name;  // map data modification test
              break;
            }
            case OperationType.SendChat:{
              /*
              var m = msg.text;
              if (m.startsWith("!")){  // custom chat logic for extra commands
              */
              if (customData.isCommand){ // same as above 2 lines.
                var arr = customData.data; // same as var arr = m.trimEnd().split(" ");
                switch (arr[0]){
                  case "!control":
                    setControlledPlayer(playerId, parseInt(arr[1])); // must use original playerId to be able to take back control of your own player
                    break;
                  case "!blockControl":
                    blockControlPlayer(playerId, parseInt(arr[1]), parseInt(arr[2])); // must use original playerId to be able to take back control of your own player
                    break;
                  case "!breakKick":
                    breakConnection(msg.byId, parseInt(arr[1])); // msg.byId is modified player id
                    break;
                  case "!input":
                    setPlayerInput(parseInt(arr[1]), parseInt(arr[2])); // input modification test (this event runs only when player presses/releases a key)
                    break;
                  case "!unban":
                    unbanPlayer(parseInt(arr[1])); // unban test
                    break;
                }
                return false; // event blocking test
              }
              msg.text = "[chat change test] " + msg.text;  // chat data modification test
              break;
            }
            case OperationType.SendInput:{
              var input = staticInputs[playerId];
              (input!=null) && (msg.input = input);
              break;
            }
            //case OperationType.StopGame:
              //return false; // event blocking test
            //case OperationType.SetSync:
              //return false; // event blocking test
          }

          return true;
        };

        room.modifyPlayerData = function(id, nick, avatar, flag, conn, auth, customData){
          //if (nick=="abc")
            //return null;  // player rejection test
          return ["[" + id + "] " + nick, avatar, flag]; // nick change test
        };

        room.modifyPlayerPing = function(id, ping, customData){
          return 100000 + ping*ping*ping;
        };

        room.onRoomLink = (roomLink, customData)=>{
          console.log("room link:", roomLink);
        };
        
        room.onTeamColorsChange = (teamId, value, byId, customData)=>{
          console.log("team colors changed:", teamId, value, byId);
        };

        //room.setPlayerTeam(0, 1);
        room.startGame();
        room.sendChat("test123");

        //var tmp=true, team = 0;
        //setTimeout(()=>{
          /*
          room.setProperties({
            name: "aaa bbb ccc ddd eee",
            password: tmp ? "password" : null,
            geo: {
              //lat: 1,
              //lon: 1,
              flag: tmp ? "gb" : "tr"
            },
            playerCount: 25,
            maxPlayerCount: 0
          });
          */
          //room.setFakePassword(true);
          //room.setUnlimitedPlayerCount(tmp);
          // console.log("new room properties have been applied");
        //}, 10000);
        /*
        setInterval(()=>{
          room.sendAnnouncement("test " + tmp, null, 0xFFCC00);
          team++;
          if (team>2)//{
            team=0;
            //room.resetTeam(2);
          //}
          //else
          room.setPlayerTeam(0, team);

          //room.setPlayerInput(0, Math.floor(Math.random()*32));
          //console.log(room.getRoomData());
          //room.setSync(tmp);
          tmp=!tmp;
        }, 5000);
        */
        
        var teams = [[], [], []], playerTeams = {};
        /*
        var balanceTeams = function(){
          var specCount = teams[0].length, redCount = teams[1].length, blueCount = teams[2].length;
          if (specCount>0){
            if (redCount>blueCount)
              room.setPlayerTeam(teams[0][0], 2);
            else if (blueCount>redCount)
              room.setPlayerTeam(teams[0][0], 1);
            else
              room.setPlayerTeam(teams[0][0], 1+Math.floor(Math.random()*2));
          }
          else{
            if (redCount>blueCount+1)
              room.setPlayerTeam(teams[1][teams[1].length-1], 2);
            else if (blueCount>redCount+1)
              room.setPlayerTeam(teams[2][teams[2].length-1], 1);
          }
        };
        */
        room.onPlayerJoin = (playerObj, customData) => {
          var id = playerObj.id, name = playerObj.name;

          console.log("Player joined : ", playerObj);

          room.setPlayerAdmin(id, true);
          teams[0].push(id);
          playerTeams[id] = 0;
          room.setPlayerAvatar(id, "XY");
          //balanceTeams();
          //room.kickPlayer(id, "test", true);
          setTimeout(()=>{
            room.state.name = "aaaaabbbbbccccc";
          }, 20000);
        };

        room.onPlayerLeave = (playerObj, reason, isBanned, byId, customData) => {
          var id = playerObj.id, name = playerObj.name;

          console.log("Player left : ", playerObj, reason, isBanned, byId);
          
          // free extra memory allocated

          var t = teams[playerTeams[id]], idx = t?.findIndex((x)=>(x==id));
          if (idx>=0)
            t.splice(idx, 1);
          delete playerTeams[id];
          //balanceTeams();

          delete connectionShouldBreak[id];
          delete controlSwitch[id];
          delete controlSwitchBlocked[id];
          delete staticInputs[id];
        };

        room.onPlayerTeamChange = (id, teamId, byId, customData) => {
          console.log("Player team changed : ", id, teamId, byId);

          var t = teams[playerTeams[id]], idx = t?.findIndex((x)=>(x==id));
          if (idx>=0)
            t.splice(idx, 1);
          teams[teamId].push(id);
          playerTeams[id] = teamId;
          //balanceTeams();
        };

        room.onPlayerObjectCreated = (playerObj, customData)=>{
          console.log("onPlayerObjectCreated", playerObj);
        };

        /*
        room.onGameTick = (customData) => {
          if (d!=null){
            var pEx = room.getBall(true), p = room.getBall(false);
            var x = 1;

          }
          //numTicks++;
        };

        setTimeout(()=>{
          room.startGame();
        }, 1000);     
        
        setTimeout(() => {
          room.leave();
        }, 5000);
        */
      },
      onClose: (x)=>{
        console.log(x.toString());
        process.exit(0);
      }
    });
  };

  createFunc();
})();