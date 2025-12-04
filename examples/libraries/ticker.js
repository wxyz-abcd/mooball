module.exports = function(API){
  const { Library, VariableType } = API;

  Object.setPrototypeOf(this, Library.prototype);
  Library.call(this, "ticker", {
    version: 0.1,
    author: "Dfg & abc",
    description: "A library to manage tick tasks in a single interval easily",
  });

  this.defineVariable({
    name: "tickRate",
    description: "The interval value in milliseconds", 
    type: VariableType.Integer,
    value: 10,
    range: {
      min: 0,
      max: Infinity,
      step: 1
    }
  });

  var that = this, tick = 0, tasks = null, interval = null;

  function Task(task, startTick, endTick=null, step=1, condition=()=>true){
    this.task = task;
    this.lastTick = startTick;
    this.endTick = endTick;
    this.step = step;
    this.condition = condition;
  }

  function startTicker(){
    if (interval)
      return;
    interval = setInterval(()=>{
      let toRemove = [];
      for (let i=0;i<tasks.length;i++){
        let task = tasks[i];
        if ((tick>=task.lastTick) && (task.endTick==null || tick<=task.endTick) && task.condition()){
          do{
            task.task();
            task.lastTick+=task.step;
          } while(tick>=task.lastTick && (task.endTick==null || tick<=task.endTick) && task.condition());
        }
        else if (task.endTick!=null && tick>=task.endTick)
          toRemove.push(i);
      }
      for(let i=toRemove.length-1;i>=0;i--){
        let tR = toRemove[i];
        removeTickTaskByIndex(tR);
      }
      tick++;
    }, that.tickRate);
  }

  function stopTicker(){
    if (!interval)
      return;
    clearInterval(interval);
    interval = null;
  }

  function addTickTask(task){
    tasks.push(task);
    startTicker();
  }

  function runAfterTicks(func, tCount){
    addTickTask(new Task(func, tick+tCount, tick+tCount, 1));
  }

  function removeTickTaskByIndex(index){
    tasks.splice(index,1);
    if (tasks.length===0)
      stopTicker();
  }

  function removeTickTask(fn){
    var i = tasks.indexOf(fn);
    if (i>=0)
      removeTickTaskByIndex(i);
  }

  this.initialize = function(){
    tasks = [];
    tick = 0;
  };

  this.finalize = function(){
    stopTicker();
    tasks = null;
  };

  this.onVariableValueChange = function(addonObject, variableName, oldValue, newValue){
    if (addonObject==that && variableName=="tickRate" && interval!=null) {
      stopTicker();
      startTicker();
    }
  };

  Object.assign(this, {
    Task,
    runAfterTicks,
    start: startTicker,
    stop: stopTicker,
    addTask: addTickTask,
    removeTask: removeTickTask,
    currentTicks: ()=>tick
  });
};