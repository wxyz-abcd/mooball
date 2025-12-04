[![GitHub package.json version](https://img.shields.io/github/package-json/v/wxyz-abcd/mooball?style=flat-square)](https://github.com/wxyz-abcd/mooball) [![NPM Version](https://img.shields.io/npm/v/mooball?style=flat-square)](https://www.npmjs.com/package/mooball) [![NPM Monthly Downloads](https://img.shields.io/npm/dm/mooball?style=flat-square)](https://npmjs.org/package/mooball) [![WebServer Status](https://img.shields.io/endpoint?label=web%20server&style=flat-square&url=https%3A%2F%2Fmoo-hoo.com%2Fstatus)](https://moo-hoo.com/mooball)

[![License](https://img.shields.io/github/license/wxyz-abcd/mooball?style=flat-square)](LICENSE) [![Last Commit](https://img.shields.io/github/last-commit/wxyz-abcd/mooball?style=flat-square)](https://github.com/wxyz-abcd/mooball/commits/) ![Language Most Used](https://img.shields.io/github/languages/top/wxyz-abcd/mooball?style=flat-square) ![Repository Size](https://img.shields.io/github/repo-size/wxyz-abcd/mooball?style=flat-square)

[![Forks](https://img.shields.io/github/forks/wxyz-abcd/mooball?style=social)](https://github.com/wxyz-abcd/mooball/network/members) [![Stars](https://img.shields.io/github/stars/wxyz-abcd/mooball?style=social)](https://github.com/wxyz-abcd/mooball/stargazers) [![Watches](https://img.shields.io/github/watchers/wxyz-abcd/mooball?style=social)](https://github.com/wxyz-abcd/mooball/watchers)

<h1 id="title" align="center">mooball</h1>

<h4 align="center">The official API for MooBall.</h4>

- <a href="https://github.com/wxyz-abcd/mooball">Here</a> is the Github repository for this project.
- Detailed documentation is <a href="https://raw.githack.com/wxyz-abcd/mooball/main/docs/index.html">here</a>. 
- We are also inviting you to our <a href="https://discord.gg/HbvHGak6">discord server</a>. See you there!

### 🔖 Table Of Contents

- 🤔 [How To Use](#how-to-use)
- 💡 [How To Contribute](#how-to-contribute)
- 🤗 [Contributors](#contributors)
- 🔏 [License](#license)

---

<h2 id="how-to-use">🤔 How To Use</h2>

#### 💻 Installing & importing as a node.js/CommonJS module:

```sh
npm install mooball
```
```js
const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = require("mooball")();
// Use example code here.
```

#### 💻 Usage on Browser

```html
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/json5@2.2.3/dist/index.min.js"></script> <!-- json5 library -->
    <script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script> <!-- pako library -->
    <script src="https://cdn.jsdelivr.net/gh/wxyz-abcd/mooball@latest/src/api.js"></script> <!-- this file comes from this repo -->
  </head>
  <body>
    <script>
      var { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = poyoCoreAPI(window); 
      // You do not need a proxy server if you use browser's extension mechanism.
      // Use example code here.
    </script>
  </body>
</html>
```

#### 💻 Example code using the library:

Joining a room:

```js

Utils.generateAuth().then(([authKey, authObj])=>{
  Room.join({
    id: "ZzZzZzZzZzZzZzZzZz",
    authObj: authObj
  }, {
    storage: {
      player_name: "wxyz-abcd",
      avatar: "👽"
    }, 
    onOpen: (room)=>{
      room.sendChat("Hello " + room.name);
    }
  });
});
```

Creating a room:

```js

Room.create({
  name: "room123", 
  password: "password", 
  showInRoomList: true, 
  maxPlayerCount: 8,
  token: "thr1.NS3Ah4d3as_h1aS1DH4FAh3aZsdAgD.01J_eSDruujs4dA"
}, {
  storage: {
    player_name: "wxyz-abcd",
    avatar: "👽"
  }, 
  onOpen: (room)=>{
    room.sendChat("Hello " + room.name);
    room.onAfterRoomLink = (roomLink)=>{
      console.log("room link:", roomLink);
    };
  }
});
```

<h2 id="how-to-contribute">💡 How To Contribute</h2>

- Make a fork of this repository
- Clone to you machine and entry on respective paste
- Create a branch with your resource: `git checkout -b my-feature`
- Commit your changes: `git commit -m 'feat: My new feature'`
- Push your branch: `git push origin my-feature`
- A green button will appear at the beginning of this repository
- Click to open and fill in the pull request information

<p align="center">
<i>Contributions, issues and features requests are welcome!</i><br />
<i>📮 Submit PRs to help solve issues or add features</i><br />
<i>🐛 Find and report issues</i><br />
<i>🌟 Star the project</i><br />
</p>

[Back To The Top](#title)

---

<h2 id="contributors">🤗 Contributors</h2>

<p>

<div> - Lots of testing and various plugins by <a href="https://github.com/jerryoldson">JerryOldson <img width="20" src="https://avatars.githubusercontent.com/u/140029469?v=4"/></a></div>
<div> - Lots of testing and various plugins by <a href="https://github.com/mtkcnl">mtkcnl (0x00) <img width="20" src="https://avatars.githubusercontent.com/u/96322566?v=4"/></a></div>
<div> - Lots of testing and renderer improvement by <a href="https://github.com/dfg">Dfg <img width="20" src="https://avatars.githubusercontent.com/u/56932?v=4"/></a></div>
<div> - joystick plugin improved by <a href="https://github.com/jafkc2">jafkc2 <img width="20" src="https://avatars.githubusercontent.com/u/150557443?v=4"/></a></div>
<div></div>
<div>We will continue to add all contributors to this list.</div>

</p>

[Back To The Top](#title)

---

<h2 id="license">🔏 License</h2>

MIT License, all rights reserved. Copyright © 2022-2026 [abc](https://github.com/wxyz-abcd)

We do not take any responsibility on potential harm caused by this code. Use at your own risk, and be creative. :)

[Back To The Top](#title)
