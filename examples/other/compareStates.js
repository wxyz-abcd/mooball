function compareStates(s1, s2){
  var checkNumber = (a,b) => ((a===b) || (isNaN(a) && isNaN(b)));
  var checkPoint = (a,b) => (checkNumber(a.x, b.x) && checkNumber(a.y, b.y))
  var checkTeam = (a,b) => (a?.id==b?.id);
  var checkDiscPlayerId = (a,b) => (a?.playerId==b?.playerId);
  var checkStadium = (a,b) => (a?.calculateChecksum()==b?.calculateChecksum());
  var checkOther = (a,b) => (a==b);
  const keysToCheck = {
    "name": checkOther,
    "teamsLocked": checkOther,
    "scoreLimit": checkNumber, 
    "timeLimit": checkNumber, 
    "kickRate_max": checkNumber,
    "kickRate_rate": checkNumber,
    "kickRate_min": checkNumber,
    "stadium": checkStadium, 
    "gameState": {
      "blueScore": checkNumber, 
      "redScore": checkNumber, 
      "state": checkNumber, 
      "timeElapsed": checkNumber, 
      "timeLimit": checkNumber, 
      "scoreLimit": checkNumber, 
      "stadium": checkStadium, 
      "goalTickCounter": checkNumber, 
      "pauseGameTickCounter": checkNumber, 
      "goalConcedingTeam": checkTeam,
      "physicsState": {
        "discs": [{
          "pos": checkPoint, 
          "speed": checkPoint, 
          "gravity": checkPoint, 
          "radius": checkNumber, 
          "damping": checkNumber, 
          "invMass": checkNumber, 
          "bCoef": checkNumber, 
          "cGroup": checkNumber, 
          "cMask": checkNumber, 
          "color": checkNumber
        }]
      }
    },
    "players": [{
      "isAdmin": checkOther, 
      "avatarNumber": checkNumber,
      "avatar": checkOther, 
      "headlessAvatar": checkOther, 
      "sync": checkOther, 
      "flag": checkOther,
      "name": checkOther,
      "input": checkNumber, 
      "id": checkNumber, 
      "isKicking": checkOther, 
      "kickRateMaxTickCounter": checkNumber,
      "kickRateMinTickCounter": checkNumber,
      "team": checkTeam,
      "disc": checkDiscPlayerId
    }],
    "teamColors": [{
      "angle": checkNumber,
      "text": checkNumber,
      "inner": [checkNumber]
    }]
  };
  function compare(obj1, obj2, keysObj, stack, result){
    if (typeof keysObj=="function"){
      if (!keysObj(obj1, obj2))
        result.push(JSON.parse(JSON.stringify(stack)));
    }
    else if (typeof keysObj=="object"){
      if (keysObj.constructor.name=="Array"){
        keysObj = keysObj[0];
        if (!checkNumber(obj1.length, obj2.length)){
          stack.push("length");
          result.push(JSON.parse(JSON.stringify(stack)));
          stack.pop();
        }
        for (var i=0;i<obj1.length;i++){
          stack.push(i);
          var o1 = obj1[i], o2 = obj2[i];
          if (o1==null || o2==null){
            if (o1!=o2)
              result.push(JSON.parse(JSON.stringify(stack)));
          }
          else{
            if (typeof keysObj=="function"){
              if (!keysObj(o1, o2))
                result.push(JSON.parse(JSON.stringify(stack)));
            }
            else if (typeof keysObj=="object")
              Object.keys(keysObj).forEach((key)=>{
                stack.push(key);
                compare(o1[key], o2[key], keysObj[key], stack, result);
                stack.pop();
              });
          }
          stack.pop();
        }
      }
      else{
        if (obj1==null || obj2==null){
          if (obj1!=obj2)
            result.push(JSON.parse(JSON.stringify(stack)));
          return;
        }
        Object.keys(keysObj).forEach((key)=>{
          stack.push(key);
          compare(obj1[key], obj2[key], keysObj[key], stack, result);
          stack.pop();
        });
      }
    }
  }
  function stringifyResult(res){
    var o1 = s1, o2 = s2, str = "";
    for(var name of res){
      o1 = o1[name];
      o2 = o2[name];
      if (typeof name=="number")
        str+="["+name+"]";
      else
        str+="."+name;
    }
    return "state1"+str+"="+o1+" vs state2"+str+"="+o2;
  }
  var result = [];
  compare(s1, s2, keysToCheck, [], result);
  for (var i=0;i<result.length;i++)
    result[i] = stringifyResult(result[i]);
  console.log("compareStates results: ", result.join("\r\n"));
}