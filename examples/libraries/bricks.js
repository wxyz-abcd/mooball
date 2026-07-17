module.exports = function(API){
  const { Library, VariableType, Utils } = API;

  Object.setPrototypeOf(this, Library.prototype);
  Library.call(this, "bricks", {
    version: 0.1,
    author: "abc & JerryOldson",
    description: "A library to manage brick structures that can be used in games like tetris, bricks classic, etc.",
  });

  this.defineVariable({
    name: "gridSize",
    description: "The interval value in milliseconds", 
    type: VariableType.Integer,
    value: 4,
    range: {
      min: 3,
      max: 5,
      step: 1
    }
  });

  this.defineVariable({
    name: "bricks",
    description: "Click to edit bricks",
    type: VariableType.Void,
    value: ()=>{
      const gui = that.room.librariesMap.gui;
      if (!gui)
        return;
      const headHtml = `
      <title>Bricker Editor</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css"/>
      <style>
      .container {
        width: 20em;
        display: flex;
        flex-direction: column;
      }
      .brickContainer {
        display: grid;
        grid-template: auto / ${Array(that.gridSize).fill("1fr").join(" ")};
        margin: 10px 0;
      }
      .brickPiece {
        aspect-ratio: 1 / 1;
        height: auto;
        border: 1px solid #ccc;
        border-radius: 3px;
        background-color: white;
        cursor: pointer;
      }
      .brickControls {
        margin-top: 10px;
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        width: 20em;
      }
      .brickControls > div > button {
        line-height: 20px;
      }
      .brickControls > div > span {
        font-size: 1.5em;
        vertical-align: middle;
      }
      .tooltip {
        position: relative;
        display: inline-block;
      }

      .tooltip .tooltiptext {
        visibility: hidden;
        background-color: black;
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 5px 6px;
        position: absolute;
        z-index: 1;
        top: 120%;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
      }

      .tooltip:hover .tooltiptext {
        visibility: visible;
      }
      
      .b1 {
        width: 2.4em;
      }

      .b2 {
        width: 3.2em;
      }
      </style>
      `;
      const bodyHtml = `
      <div class="container">
        <div class="brickControls">
          <div style="display: flex">
            <div class="tooltip" style="display: flex">
              <input type="checkbox" id="active">
              <span class="tooltiptext">Whether the brick is active</span>
            </div>
            <div class="pickrEl"></div>
          </div>
          <div>
            <button class="tooltip b1" id="prevBrick">◀
              <span class="tooltiptext">Previous brick</span>
            </button>
            <span id="brickInfo"></span>
            <button class="tooltip b1" id="nextBrick">▶
              <span class="tooltiptext">Next brick</span>
            </button>
          </div>
          <div>
            <button class="tooltip b2" id="addBrick">➕
              <span class="tooltiptext">Add brick</span>
            </button>
            <button class="tooltip b2" id="removeBrick">🗑
              <span class="tooltiptext">Remove brick</span>
            </button>
          </div>
        </div>
        <div id="brickContainer" class="brickContainer"></div>
      </div>
      `;
      const script = `
      let brickIndex = 0;
      const pickr = new Pickr({
        el: '.pickrEl',
        theme: 'nano',
        components: {
          preview: true,
          hue: true,
          interaction: {
            hex: true,
            rgba: false,
            input: true,
            clear: false,
            save: true
          }
        }
      });

      (function addTooltipToColorPicker(){
        const pickerEl = document.querySelector('.pickr');
        pickerEl.classList.add("tooltip");
        const spanEl = document.createElement('span');
        spanEl.className = 'tooltiptext';
        spanEl.innerText = 'Color of the brick';
        pickerEl.appendChild(spanEl);
      })();

      let rendererChangingPickr = false;
      pickr.on('change', (color, evt, instnace) => {
        if (rendererChangingPickr) return;
        const rgbaArray = color.toRGBA();
        const rgbaString = 'rgb('+rgbaArray[0].toFixed(0)+','+rgbaArray[1].toFixed(0)+','+rgbaArray[2].toFixed(0)+')';
        bricks[brickIndex].color = colorToNumber(rgbaString);
        pickr.setHSVA(color.h, color.s, color.v, color.a);
        renderBrick();
      });

      pickr.on('init', () => {
        renderBrick();
      });

      const active = document.getElementById('active');
      active.onchange = ()=>{
        const brick = bricks[brickIndex];
        brick.active = active.checked;
      };

      function renderBrick() {
        const brick = bricks[brickIndex];
        const brickContainer = document.querySelector('.brickContainer');
        active.checked = brick.active;
        brickContainer.innerHTML = '';
        const color = numberToColor(brick.color);
        rendererChangingPickr = true;
        pickr.setColor(brick.color.toString(16));
        rendererChangingPickr = false;
        document.querySelector('#brickInfo').innerText = brickIndex+1;
        brick.grid.forEach((pieces, row) => {
          for (let col = 0; col < pieces.length; col++) {
            const piece = pieces[col]
            const pieceEl = document.createElement('div');
            pieceEl.className = 'brickPiece';
            if (piece == 1) {
              pieceEl.style.backgroundColor = color;
            } else {
              pieceEl.style.backgroundColor = 'white';
            }
            pieceEl.addEventListener('click', () => {
              if (pieceEl.style.backgroundColor === 'white') {
                pieceEl.style.backgroundColor = color;
                brick.grid[row][col] = 1;
              } else {
                pieceEl.style.backgroundColor = 'white';
                brick.grid[row][col] = 0;
              }
              brick.init();
            })
            brickContainer.appendChild(pieceEl);
          }
        });
      };

      document.querySelector('#prevBrick').addEventListener('click', () => {
        if (brickIndex == 0) {
          brickIndex = bricks.length-1;
          renderBrick();
          return;
        }
        brickIndex--;
        renderBrick();
      });

      document.querySelector('#nextBrick').addEventListener('click', () => {
        if (brickIndex == bricks.length-1) {
          brickIndex = 0;
          renderBrick();
          return;
        }
        brickIndex++;
        renderBrick();
      });

      document.querySelector('#addBrick').addEventListener('click', () => {
        const newBrick = getBlankBrick();
        bricks.push(newBrick);
        brickIndex = bricks.length-1;
        renderBrick();
      });

      document.querySelector('#removeBrick').addEventListener('click', () => {
        bricks.splice(brickIndex, 1);
        if (bricks.length === 0) {
          brickContainer.innerHTML = "<p>No bricks left</p>";
          return;
        }
        brickIndex = Math.max(0, brickIndex - 1);
        renderBrick();
      });
      `;

      var win = gui.newWindowFromContent(headHtml, bodyHtml, 200, 200);
      win.bricks = array;
      win.numberToColor = Utils.numberToColor;
      win.colorToNumber = Utils.colorToNumber;
      win.getBlankBrick = ()=>new Brick([[0, 0, 0, 0],
                                         [0, 0, 0, 0],
                                         [0, 0, 0, 0],
                                         [0, 0, 0, 0]], Utils.colorToNumber("rgb(230,230,0)"), false);
      gui.addScriptFromURLToWindow(win, "https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js", () => {
        gui.addScriptFromContentToWindow(win, script)
      });
    }
  });

  var that = this;

  function calculateSize(grid){
    var maxx = -1, maxy = -1;
    for (var i=0;i<that.gridSize;i++)
      for (var j=0;j<that.gridSize;j++)
        if (grid[i][j]){
          if (i>maxy)
            maxy=i;
          if (j>maxx)
            maxx=j;
        }
    grid.width = maxx+1;
    grid.height = maxy+1;
  }

  function Brick(grid, color, active=true){
    this.active = active;
    this.grid = grid;
    this.color = color;
    this.rotations = null;
    this.init();
  }

  Brick.prototype = {
    init: function(){
      this.rotations = [this.grid];
      calculateSize(this.grid);
      var oldGrid = this.grid;
      for (var r=0;r<3;r++){
        var newGrid = [], minx = that.gridSize, miny = that.gridSize;
        for (var i=0;i<that.gridSize;i++){
          var a = [];
          for (var j=0;j<that.gridSize;j++){
            a[j] = oldGrid[j][that.gridSize-i-1];
            if (a[j]){
              if (j<minx)
                minx=j;
              if (i<miny)
                miny=i;
            }
          }
          newGrid.push(a);
        }
        if (minx>0 || miny>0)
          for (var i=0;i<that.gridSize;i++)
            for (var j=0;j<that.gridSize;j++)
              newGrid[i][j] = ((i+miny)>=that.gridSize||(j+minx)>=that.gridSize)?0:newGrid[i+miny][j+minx];
        if (this.rotations.find((rotation)=>{
          for (var i=0;i<that.gridSize;i++)
            for (var j=0;j<that.gridSize;j++)
              if (rotation[i][j]!=newGrid[i][j])
                return false;
          return true;
        }))
          break;
        calculateSize(newGrid);
        this.rotations.push(newGrid);
        oldGrid = newGrid;
      }
    }
  };

  var array = [
    new Brick([[1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [1, 0, 0, 0]], Utils.colorToNumber("rgb(230,230,0)"), true),
    new Brick([[1, 1, 0, 0], 
               [1, 1, 0, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(58,122,196)"), true),
    new Brick([[1, 1, 0, 0], 
               [0, 1, 1, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(255,50,50)"), true),
    new Brick([[0, 1, 1, 0], 
               [1, 1, 0, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(255,50,50)"), true),
    new Brick([[1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [1, 1, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(50,170,50)"), true),
    new Brick([[0, 1, 0, 0], 
               [0, 1, 0, 0], 
               [1, 1, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(50,170,50)"), true),
    new Brick([[1, 0, 0, 0], 
               [1, 1, 0, 0], 
               [1, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(255,50,50)"), true),
    new Brick([[1, 0, 0, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(255,125,0)"), true),
    new Brick([[1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(200,50,200)"), true),
    new Brick([[1, 1, 0, 0], 
               [1, 0, 0, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(100,100,255)"), true),
    new Brick([[1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(255,50,50)"), true),
    new Brick([[1, 1, 1, 0], 
               [1, 0, 0, 0], 
               [1, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(50,170,50)"), true),
    new Brick([[1, 0, 1, 0], 
               [1, 1, 1, 0], 
               [0, 0, 0, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(50,170,50)"), true),
    new Brick([[1, 1, 1, 0], 
               [1, 1, 1, 0], 
               [1, 1, 1, 0], 
               [0, 0, 0, 0]], Utils.colorToNumber("rgb(255,50,50)"), true),
  ];

  Object.assign(this, {
    Brick,
    array
  });
};