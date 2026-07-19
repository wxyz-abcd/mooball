# Mooball Headless API Documentation

This documentation covers some of the basics for hosting a room for MooBall using the official MooBall Headless website. The website itself is only using the [official mooball API](https://www.npmjs.com/package/mooball) for all its operations.
Therefore, you should refer to the complete [mooball npm package documentation](https://raw.githack.com/wxyz-abcd/mooball/main/docs/index.html) or the [typescript definition file](https://github.com/wxyz-abcd/mooball/blob/main/src/index.d.ts) for more details.

---

## `API.version`

Current version string of the API.

---

## Enums

### `API.CollisionFlags`
Used in physics engine for `collisionMask` and `collisionGroup` bitwise operations.

| Value | Name | Description |
|-------|------|-------------|
| 1 | `ball` | Accept collisions with ball |
| 2 | `red` | Accept collisions with red team |
| 4 | `blue` | Accept collisions with blue team |
| 8 | `redKO` | Red kickoff barrier |
| 16 | `blueKO` | Blue kickoff barrier |
| 32 | `wall` | Acts as a wall |
| 64 | `kick` | Becomes kickable |
| 128 | `score` | Scores a goal if passes goal line |
| 256+ | `free1`-`free20` | Free for custom use |
| 268435456+ | `c0`-`c3` | Free for custom use |

Collision logic: `(discA.cMask & discB.cGroup) > 0 && (discB.cMask & discA.cGroup) > 0`

### `API.Direction`

| Value | Name |
|-------|------|
| -1 | `Backward` |
| 0 | `Still` |
| 1 | `Forward` |

### `API.GamePlayState`

| Value | Name | Description |
|-------|------|-------------|
| 0 | `BeforeKickOff` | Game started, kickoff not happened yet |
| 1 | `Playing` | Game active |
| 2 | `AfterGoal` | Goal scored, counting down |
| 3 | `Ending` | Team won, counting down to stop |

### `API.ConnectionState`
Used in `commonParams.onConnInfo`.

| Value | Name |
|-------|------|
| -1 | `TryingReverseConnection` |
| 0 | `ConnectingToMaster` |
| 1 | `ConnectingToPeer` |
| 2 | `AwaitingState` |
| 3 | `Active` |
| 4 | `ConnectionFailed` |

---

## [API.Room](https://raw.githack.com/wxyz-abcd/mooball/main/docs/types/_internal_.Room.html)

### `API.Room.create(createParams, commonParams)`

Creates a new room with given parameters.

**`createParams`:**
| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Room name |
| `password?` | `string \| null` | Room password |
| `token` | `string` | Recaptcha token from `https://moo-hoo.com/mooball/headlesstoken` |
| `noPlayer?` | `boolean` | Remove host player |
| `geo` | `GeoLocation` | Geolocation |
| `playerCount?` | `int \| null` | Fixed player count |
| `maxPlayerCount` | `int` | Max players (backend caps at 30) |
| `unlimitedPlayerCount?` | `boolean` | Bypass player count check |
| `fakePassword?` | `boolean \| null` | Fake password-protected status |
| `showInRoomList` | `boolean` | Show in room list |
| `tintColor` | `int` | Background tint |
| `thumbnail` | `string \| null` | Thumbnail url |
| `endpoint` | `string \| null` | Custom endpoint |
| `hideIdentity` | `boolean` | Hide owner identity |
| `onError?` | `Function(error, playerId)` | Called on client exception |

**`commonParams`:**
| Property | Type | Description |
|----------|------|-------------|
| `storage` | `Storage` | Player preferences (`player_name`, `avatar`, `geo`, `crappy_router`, `player_auth_key`) |
| `noPluginMechanism?` | `boolean` | Disable plugin mechanism (default false) |
| `version?` | `int` | Version (default 9) |
| `proxyAgent?` | `ProxyAgentLike` | Custom proxy agent |
| `identityToken?` | `string` | Identity token |
| `debugDesync?` | `true \| Function` | Desync checking |
| `preInit?(room)` | `void` | Called before addon init |
| `onOpen?(room)` | `void` | Called on successful open |
| `onClose?(reason)` | `void` | Called on close |
| `onConnInfo?(state, extraInfo?)` | `void` | Connection state changes |

**Returns:** `{ cancel(): void, useRecaptchaToken(token: string): void }`

---

## [Stadium Class](https://raw.githack.com/wxyz-abcd/mooball/main/docs/classes/_internal_.IStadium.html)

The `Stadium` class contains all information about the stadium and some helpful functions.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | The name of this Stadium. |
| `width` | `number` | The width of this Stadium. |
| `height` | `number` | The height of this Stadium. |
| `spawnDistance` | `number` | The spawn distance of players for this Stadium. |
| `canBeStored` | `boolean` | Whether this Stadium can be stored or not. |
| `cameraFollow` | `CameraFollow` | Whether the camera will follow the player or not. Used in Renderers. |
| `maxViewWidth` | `number` | The maximum view width for this Stadium. Used in Renderers. |
| `fullKickOffReset` | `boolean` | Whether the disc positions other than the ball are reset or not after a goal is scored. |
| `playerPhysics` | `PlayerPhysics` | The physics properties of all players for this Stadium. |
| `defaultStadiumId` | `number` | The id(index) of this Stadium in the default stadiums array. This value will be 255 in custom Stadiums. |
| `isCustom` | `boolean` | Whether this is a custom Stadium or a default Stadium. |
| `vertices` | `Vertex[]` | All vertices of this Stadium. |
| `segments` | `Segment[]` | All segments of this Stadium. |
| `planes` | `Plane[]` | All planes of this Stadium. |
| `discs` | `Disc[]` | All discs of this Stadium. |
| `goals` | `Goal[]` | All goals of this Stadium. |
| `joints` | `Joint[]` | All joints of this Stadium. |
| `redSpawnPoints` | `Point[]` | All spawn points of this Stadium for the red team. |
| `blueSpawnPoints` | `Point[]` | All spawn points of this Stadium for the blue team. |
| `fonts` | `string[]` | All fonts of this Stadium. |
| `images` | `StadiumImage[]` | All images of this Stadium. |
| `texts` | `StadiumText[]` | All texts of this Stadium. |
| `textures` | `Texture[]` | All textures of this Stadium. |
| `bgType` | `number` | The background type of this Stadium. |
| `bgWidth` | `number` | The width for the background of this Stadium. |
| `bgHeight` | `number` | The height for the background of this Stadium. |
| `bgStripeColor1` | `number` | The first stripe color of the background tiles. |
| `bgStripeColor2` | `number` | The second stripe color of the background tiles. |
| `bgColor` | `number` | The background color of this Stadium. |
| `bgKickOffRadius` | `number` | The kick-off circle's radius for the background of this Stadium. |
| `bgCornerRadius` | `number` | The radius of the corners for the background of this Stadium. |
| `bgGoalLine` | `number` | The goal line's horizontal distance from the default goal positions for the background of this Stadium. |
| `bgInnerRectHeight` | `number` | The height of the smaller rectangle inside the penalty box. |
| `bgInnerRectWidth` | `number` | The width of the smaller rectangle inside the penalty box. |
| `bgOuterRectHeight` | `number` | The height of the penalty box. |
| `bgOuterRectWidth` | `number` | The width of the penalty box. |
| `bgPenaltyBoxArcRadius` | `number` | The radius of the arc that exists next to the penalty box. |
| `bgPenaltyDistance` | `number` | The distance between the penalty spot and the goal line. |
| `bgSpotIndicatorRadius` | `number` | The radius of indicators that indicate the spots. |
| `bgBufferWidth` | `number` | The width of the vertical buffer zones that exists at the left/right edges of the stadium. |
| `bgBufferHeight` | `number` | The height of the horizontal buffer zones that exists at the top/bottom edges of the stadium. |

### Methods

#### `calculateChecksum(): string | null`
Returns the checksum string of this Stadium object, or null for default stadiums.

#### `calculateHash(): number`
Returns the hash value for this Stadium object.

#### `copy(): Stadium`
Returns a new copy of this Stadium object.

---

## [Room Instance](https://raw.githack.com/wxyz-abcd/mooball/main/docs/interfaces/_internal_.IRoom.html)

The `room` object is available as soon as `onOpen(room)` callback is called.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `room.isHost` | `boolean` | `true` for host |
| `room.currentPlayerId` | `uint16` | Current player's id |
| `room.currentPlayer` | `Player` | Current player object |
| `room.state` | `RoomState` | Full room state (see below) |
| `room.stateExt` | `RoomState \| null` | Extrapolated room state |
| `room.gameState` | `GameState \| null` | Game state (null if inactive) |
| `room.gameStateExt` | `GameState \| null` | Extrapolated game state |
| `room.name` | `string` | Room name |
| `room.gui` | `Gui` | GUI data |
| `room.link` | `string` | Room link |
| `room.timeLimit` | `int` | Time limit |
| `room.scoreLimit` | `int` | Score limit |
| `room.stadium` | `Stadium` | Current stadium |
| `room.players` | `Player[]` | Player list |
| `room.redScore` | `int \| null` | Red score |
| `room.blueScore` | `int \| null` | Blue score |
| `room.timeElapsed` | `int \| null` | Elapsed time |
| `room.currentFrameNo` | `int` | Current frame number |
| `room.banList` | `BanEntry[]` | Banned players (host) |
| `room.password` | `string` | Room password (host) |
| `room.geo` | `object` | Geolocation (host) |
| `room.maxPlayerCount` | `int16` | Max players (host) |
| `room.fakePassword` | `boolean \| null` | Fake password status (host) |
| `room.fixedPlayerCount` | `int16 \| null` | Fixed player count (host) |
| `room.showInRoomList` | `boolean` | Room list visibility (host) |
| `room.unlimitedPlayerCount` | `boolean` | Unlimited players (host) |
| `room.hideIdentity` | `boolean` | Hide owner (host) |
| `room.token` | `string` | Recaptcha token (host, writable) |
| `room.requireRecaptcha` | `boolean` | Join recaptcha (host, writable) |

### `room.state` properties

| Property | Type | Description |
|----------|------|-------------|
| `room.state.stadium` | `Stadium` | Current stadium |
| `room.state.kickRate_min` | `int` | Kick rate min |
| `room.state.kickRate_rate` | `int` | Kick rate rate |
| `room.state.kickRate_max` | `int` | Kick rate burst |
| `room.state.timeLimit` | `int` | Time limit (-1 = no limit) |
| `room.state.scoreLimit` | `int` | Score limit (0 = no limit) |
| `room.state.overtimeLimit` | `int` | Overtime limit |
| `room.state.teamsLocked` | `boolean` | Teams lock |
| `room.state.directionActive` | `boolean` | Direction active |
| `room.state.runDefaultGameLogic` | `boolean` | Default game logic |
| `room.state.clockPaused` | `boolean` | Clock paused |
| `room.state.goalTicksMax` | `int` | Max goal ticks |
| `room.state.pauseTicksMax` | `int` | Max pause ticks |
| `room.state.endTicksMax` | `int` | Max end ticks |
| `room.state.gameState` | `object \| null` | Current game state |
| `room.state.players` | `Player[]` | Player list |
| `room.state.name` | `string` | Room name |
| `room.state.teamColors` | `TeamColors[]` | Team colors |
| `room.state.gui` | `Gui` | GUI data |

### `room.gameState` properties (null if game inactive)

| Property | Type | Description |
|----------|------|-------------|
| `room.gameState.pauseGameTickCounter` | `int` | Ticks left to resume |
| `room.gameState.timeElapsed` | `number` | Elapsed time in ms |
| `room.gameState.blueScore` | `int` | Blue score |
| `room.gameState.redScore` | `int` | Red score |
| `room.gameState.state` | `GamePlayState` | Gameplay state |
| `room.gameState.goalTickCounter` | `int` | Ticks left to reset (150 after goal) |
| `room.gameState.physicsState` | `World` | Physical state |
| `room.gameState.timeLimit` | `int` | Time limit |
| `room.gameState.scoreLimit` | `int` | Score limit |
| `room.gameState.overtimeLimit` | `int` | Overtime limit |
| `room.gameState.clockPaused` | `boolean` | Clock paused |
| `room.gameState.goalTicksMax` | `int` | Max goal ticks |
| `room.gameState.pauseTicksMax` | `int` | Max pause ticks |
| `room.gameState.endTicksMax` | `int` | Max end ticks |
| `room.gameState.stadium` | `Stadium` | Current stadium |
| `room.gameState.goalConcedingTeam` | `Team` | Team that conceded |
| `room.gameState.paused` | `boolean` | Whether paused |

### `room.players[n]` (Player object) properties

| Property | Type | Description |
|----------|------|-------------|
| `.id` | `int` | Player id |
| `.name` | `string` | Player name |
| `.team` | `Team` | Player team |
| `.flag` | `string` | Country code |
| `.avatar` | `string \| null` | Client avatar |
| `.headlessAvatar` | `string \| null` | Headless avatar |
| `.isAdmin` | `boolean` | Admin status |
| `.avatarNumber` | `int` | Avatar number |
| `.conn` | `string \| null` | Connection string |
| `.auth` | `string \| null` | Auth string |
| `.ping` | `int` | Ping |
| `.input` | `int` | Key state |
| `.isKicking` | `boolean` | Kicking state |
| `.sync` | `boolean` | Sync status |
| `.disc` | `MovableDisc \| null` | Player disc |
| `.identity` | `IdentityData \| null` | Identity data |
| `.energy` | `number` | Energy (0-1) |
| `.kEnergyGain` | `number` | Energy gain |
| `.kEnergyDrain` | `number` | Energy drain |
| `.direction` | `number` | Direction |
| `.skin` | `Texture \| null` | Player texture |
| `.cssVar` | `string \| null` | CSS variable |

### Methods

### `room.leave(): void`
Leaves the current room and releases resources.

### `room.sendChat(msg, targetId?): void`
Sends a chat message. `msg` max 140 chars. If `targetId` is null, sends to everyone.
- `msg: string` — Chat message
- `targetId?: uint16 | null` — Target player

### `room.sendAnnouncement(msg, targetId?, color?, style?, sound?): void`
Sends a host announcement. `msg` max 1000 chars.
- `msg: string` — Announcement text
- `targetId?: uint16` — null = everyone
- `color?: int` — -1 to 16777215 (default -1)
- `style?: string` — `"normal"`, `"bold"`, `"italic"`, `"small"`, `"small-bold"`, `"small-italic"`
- `sound?: int` — 0=none, 1=chat, 2=highlight (default 1)

### `room.startGame(): void`
Starts the game.

### `room.stopGame(): void`
Stops the game.

### `room.pauseGame(): void`
Pauses or resumes the game.

### `room.isGamePaused(): boolean`
Returns `true` if game is paused.

### `room.setScoreLimit(value): void`
Sets score limit (0-99, 0 = unlimited). Game must be stopped.

### `room.setTimeLimit(value): void`
Sets time limit (0-99, 0 = unlimited). Game must be stopped.

### `room.addVertex(data): void`
Creates a vertex object and adds it to the current stadium.

`data: AddVertexParams`

`AddVertexParams` accepts: x, y, bCoeff, cMask, cGroup.

### `room.addSegment(data): void`
Creates a segment object using vertex indices and adds it to the current stadium. The vertices must exist at the given indices in the `vertices` array of the current room.

`data: AddSegmentParams`

`AddSegementsParams` accepts: v0, v1, color, bias, curve, curveF, vis, bCoef, cMask, cGroup.

### `room.addGoal(data): void`
Creates a goal object and adds it to the current stadium.

`data: AddGoalParams`

`AddGoalParams` accepts: p0, p1, team ("red"|"blue")

### `room.addPlane(data): void`
Creates a plane object and adds it to the current stadium.

`data: AddPlaneParams`

`AddPlaneParams` accepts: normal, dist, bCoef, cMask, cGroup

### `room.addDisc(data): void`
Creates a disc object and adds it to the current stadium.

`data: AddDiscParams`

`AddDiscParams` accepts: pos, speed, gravity, radius, invMass, damping, color, bCoef, cMask, cGroup

### `room.addJoint(data): void`
Creates a joint object and adds it to the current stadium.

`data: AddJointParams`

`AddJointParams` accepts: d0, d1, color, strength, length

### `room.addSpawnPoint(data): void`
Adds a spawn point with given coordinate to the given team in the current stadium.

`data: AddSpawnPointParams`

`AddSpawnPointParams` accepts: x, y, team ("red"|"blue")

### `room.updateVertex(idx, data): void`
Updates the `idx`th vertex's only the given values.

`idx: int`
`data: UpdateVertexParams`

`UpdateVertexParams` accepts: x, y, bCoef, cMask, cGroup.

### `room.updateSegment(idx, data): void`
Updates the `idx`th segment's only the given values.

`idx: int`
`data: UpdateSegmentParams`

`UpdateSegmentParams` accepts: v0, v1, color, bias, curve, curveF, vis, bCoef, cMask, cGroup.

### `room.updateGoal(idx, data): void`
Updates the `idx`th goal's only the given values.

`idx: int`
`data: UpdateGoalParams`

`UpdateGoalParams` accepts: p0, p1, team ("red"|"blue")

### `room.updatePlane(idx, data): void`
Updates the `idx`th plane's only the given values.

`idx: int`
`data: UpdatePlaneParams`

`UpdatePlaneParams` accepts: normal, dist, bCoef, cMask, cGroup.

### `room.updateDisc(idx, data): void`
Updates the `idx`th disc's only the given values.

`idx: int`
`data: UpdateDiscParams`

`UpdateDiscParams` accepts: pos, speed, gravity, radius, invMass, damping, color, bCoef, cMask, cGroup.

### `room.updateDiscObj(discObj, data): void`
Updates the given disc object(`discObj`)'s only the given values.

`discObj: Disc`
`data: UpdateDiscObjParams`

`UpdateDiscObjParams` accepts: pos, speed, gravity, radius, invMass, damping, color, bCoef, cMask, cGroup.

### `room.updateJoint(idx, data): void`
Updates the `idx`th joint's only the given values.

`idx: int`
`data: UpdateJointParams`

`UpdateJointParams` accepts: d0, d1, color, strength, length.

### `room.updateSpawnPoint(idx, team, data): void`
Updates the `idx`th spawn point in team(`team`) using only the given values.

`idx: int`
`team: UnparsedTeam2`
`data: UpdateSpawnPointParams`

`UpdateSpawnPointParams` accepts: x, y, team ("red"|"blue")

### `room.updatePlayer(playerId, data): void`
Updates the player(`playerId`)'s only the given values.

`playerId: uint16`
`data: UpdatePlayerParams`

`UpdatePlayerParams` accepts: name, avatar, flag, team, pos, speed, gravity, radius, invMass, damping, bCoef, cMask, cGroup

### `room.removeVertex(idx): void`
Removes a vertex from the current room.

`idx: int`

### `room.removeSegment(idx): void`
Removes a segment from the current room.

`idx: int`

### `room.removeGoal(idx): void`
Removes a goal from the current room.

`idx: int`

### `room.removePlane(idx): void`
Removes a plane from the current room.

`idx: int`

### `room.removeDisc(idx): void`
Removes a disc from the current room.

`idx: int`

### `room.removeJoint(idx): void`
Removes a joint from the current room.

`idx: int`

### `room.removeSpawnPoint(idx, team): void`
Removes a spawn point from the current room.

`idx: int`
`team: UnparsedTeam2`

### `room.removePlayer(playerId): void`
Removes a player from the current room.

`playerId: uint16`

### `room.updateStadiumPlayerPhysics(data): void`
Updates the current stadium's only the given player physics values.

`data: UpdateStadiumPlayerPhysicsParams`

### `room.updateStadiumBg(data): void`
Updates the current stadium's only the given background values.

`data: UpdateStadiumBgParams`

### `room.updateStadiumGeneral(data): void`
Updates the current stadium's only the given general values.

`data: UpdateStadiumGeneralParams`

### `room.playerDirection(value): void`
Sets the player's current direction. room.state.directionActive must be true for this to work.

`value: number`

### `room.setRunDefaultGameLogic(value): void`
Sets whether to use default game logic or not.

`value: boolean`

### `room.sendText(type, msg, cssVar?, sound?, targetId?): void`
Sends an chat/announcement message using the improved announcement api.

`type: uint8`
`msg: string`
`cssVar: string`
`sound: string`
`targetId: uint32`

### `room.setPlayerSkin(id, skin): void`
Updates the current skin(textureId) of a player.

`id: uint32`
`skin: Texture|null`

### `room.setPlayerCssVar(id, cssVar): void`
Sets the cssVar attribute of a player to change its appearance in the room gui.

`id: uint32`
`cssVar: string|null`

### `room.addStadiumObject(type, value): void`
Adds a new stadium object.

`type: uint8`
`value: object`

### `room.updateStadiumObject(type, id, value): void`
Updates an existing stadium object.

`type: uint8`
`id: uint16`
`value: object`

### `room.removeStadiumObject(type, id): void`
Removes an existing stadium object.

`type: uint8`
`id: uint16`

### `room.setOvertimeLimit(value): void`
Sets the overtime limit.

`value: uint32`

### `room.setPlayerEnergy(id, data): void`
Manually changes the energy of an individual player.

`id: uint32`
`data: number[]`

### `room.setPlayerDirection(id, value): void`
Manually change the direction of an individual player. room.state.directionActive must be true for this to work.

`id: uint32`
`value: number`

### `room.addControl(name, keys): void`
Introduces a new game input control and assigns it to the next bit of player.input value.

`name: string`
`keys: int16[]`

### `room.removeControl(name): void`
Remove an existing game input control. This function might break the game input logic completely.

`name: string`

### `room.updateCssVar(name, value): void`
Updates the current contents of a css variable.

`name: string`
`value: string`

### `room.playCustomSound(soundName): void`
Plays a custom sound.

`soundName: string`

### `room.setRoomName(name): void`
Changes the name of the room.

`name: string`

### `room.setElapsedTime(value): void`
Manually sets the current elapsed time.

`value: number`

### `room.setMaxGoalTicks(value): void`
Manually sets the current max goal ticks.

`value: number`

### `room.setMaxPauseTicks(value): void`
Manually set the current max pause ticks.

`value: number`

### `room.setMaxEndTicks(value): void`
Manually set the current max end ticks.

`value: number`

### `room.setClockPaused(value): void`
Manually pause/resume the game clock.

`value: number`

### `room.setDirectionActive(value): void`
Manually set whether direction is active or not.

`value: number`

### `room.setTeamScore(teamId, value): void`
Manually set the current team scores.

`teamId: uint8`
`value: number`

### `room.sendDirection(value): void`
Sets the player's current direction. room.state.directionActive must be true for this to work.

`value: number`

### `room.lockTeams(): void`
Locks/unlocks non-admin players from changing teams while game is inactive.

### `room.resetTeams(): void`
Moves every player to spectators.

### `room.randTeams(): void`
Randomly assigns players to consecutive teams.

### `room.resetTeam(teamId): void`
Moves all players in a team to spectators.
- `teamId: int` — Team id

### `room.setPlayerTeam(playerId, teamId): void`
Moves a player to a different team.
- `playerId: uint16`
- `teamId: int`

### `room.autoTeams(): void`
Adds last 2 spectators to consecutive teams.

### `room.setPlayerAdmin(playerId, isAdmin): void`
Gives/takes away admin rights.
- `playerId: uint16`, `isAdmin: boolean`

### `room.kickPlayer(playerId, reason, isBanning): void`
Kicks or bans a player. If `reason` is null, interpreted as player leaving.
- `playerId: uint16`, `reason: string|null`, `isBanning: boolean`

### `room.changeTeam(teamId): void`
Moves current player to a team.
- `teamId: int`

### `room.setPlayerAvatar(id, value, headless): void`
Sets the avatar for a player. host-only.
- `id: uint16`, `value: string`, `headless: boolean`

### `room.setAvatar(avatar): void`
Sets current player's client avatar.
- `avatar: string` — max 2 chars

### `room.setChatIndicatorActive(active): void`
Sets current player's chat indicator on/off.

### `room.setTeamColors(teamId, angle, ...colors): void`
Sets team colors (2-4 color values).
- `teamId: int` (1=red,2=blue), `angle: int`, `colors: int[]`

### `room.getPlayer(id): Player`
Returns the Player object for the given id.
- `id: uint16`

### `room.getBall(extrapolated?): Disc`
Returns the ball disc.
- `extrapolated?: boolean` (default false)

### `room.getDiscs(extrapolated?): Disc[]`
Returns all discs in the room.

### `room.getDisc(discId, extrapolated?): Disc`
Returns a specific disc by id.
- `discId: int`

### `room.getPlayerDisc(playerId, extrapolated?): Disc`
Returns the disc belonging to a player.
- `playerId: uint16`

### `room.setDiscProperties(discId, properties): void`
Sets disc properties (omitted keys unchanged). host-only.
- `discId: int`, `properties: object`

### `room.setPlayerDiscProperties(playerId, properties): void`
Sets a player's disc properties. host-only.
- `playerId: uint16`, `properties: object`

`properties` accepts: `x, y, xspeed, yspeed, xgravity, ygravity, radius, bCoeff, invMass, damping, color, cMask, cGroup` (all nullable).

### `room.startRecording(): boolean`
Starts replay recording. Returns `true` if succeeded.

### `room.stopRecording(): Uint8Array | null`
Stops recording and returns the recorded data, or null.

### `room.isRecording(): boolean`
Returns `true` if recording is active.

### `room.startStreaming(params?): StartStreamingReturnValue | null`
Starts streaming the game. Recording must be stopped first.

### `room.stopStreaming(): void`
Stops game streaming.

### `room.sendCustomEvent(type, data, targetId?): void`
Creates and sends a custom event. Data is JSON-serialized.
- `type: uint32`, `data: object`

### `room.sendBinaryCustomEvent(type, data, targetId?): void`
Creates and sends a binary custom event.
- `type: uint32`, `data: Uint8Array`

### `room.setProperties(properties): void`
Sets room properties: `name, password, geo, playerCount, maxPlayerCount, fakePassword, unlimitedPlayerCount, showInRoomList, tintColor, thumbnail, hideIdentity`.

### `room.setKickRateLimit(min, rate, burst): void`
Sets kick rate limit. admin-only.

### `room.setHandicap(handicap): void`
Sets current player's handicap (0-300ms).

### `room.setKeyState(state, instant?): void`
Sets current player's key state (0-31). `instant` sends immediately (default true).

### `room.getKeyState(): int`
Returns current player's key state (0-31).

### `room.setCurrentStadium(stadium): void`
Sets the stadium. Game must be stopped. admin-only.

### `room.reorderPlayers(playerIdList, moveToTop): void`
Reorders players in the player list. host-only.

### `room.addPlayerBan(playerId): BanEntryId | null`
Bans a player by id. Returns ban entry id or null.

### `room.addIpBan(...ips): (BanEntryId | null)[]`
Bans IP ranges. Returns array of ban entry ids.

### `room.addAuthBan(...auths): (BanEntryId | null)[]`
Bans auth strings. Returns array of ban entry ids.

### `room.removeBan(id): boolean`
Removes a ban entry by id. Returns true if removed.

### `room.clearBans(): void`
Clears all bans.

### `room.clearBan(id): void`
Clears a player's ban by player id.

### `room.executeEvent(event, byId): void`
Executes any event inside this room.
- `event: MooballEvent`, `byId: uint16`

### `room.executeEventWithTarget(event, targetId): void`
Sends an event to a specific player (may cause desync).

### `room.clearEvents(): void`
Clears the event queue (useful if engine is stuck).

### `room.takeSnapshot(): RoomState`
Returns a snapshot of the current room state.

### `room.extrapolate(milliseconds, ignoreMultipleCalls): RoomState`
Extrapolates the room state for rendering. Use `true` for `ignoreMultipleCalls` inside renderers.

### Callbacks

Callbacks are assigned directly to the room object. 

**Game:**

### `room.onPlayerBallKick = function(playerId) { }`
Called just after the ball has been kicked.
```js
room.onPlayerBallKick = function(playerId) {
  console.log(playerId + " kicked the ball");
};
```

### `room.onTeamGoal = function(teamId, goalId, goal, ballDiscId, ballDisc) { }`
Called just after a goal has been scored.
```js
room.onTeamGoal = function(teamId, goalId, goal, ballDiscId, ballDisc) {
  console.log("Team " + teamId + " scored!");
};
```

### `room.onGameEnd = function(winningTeamId) { }`
Called just after the game has ended.
```js
room.onGameEnd = function(winningTeamId) {
  console.log("Team " + winningTeamId + " wins!");
};
```

### `room.onGameTick = function() { }`
Called every game tick (60 times/sec). Avoid heavy calculations here.
```js
room.onGameTick = function() {
  // per-frame logic
};
```

### `room.onKickOff = function() { }`
Called just after a kick-off event has occurred.

### `room.onTimeIsUp = function() { }`
Called just after the game has ended by timeout.

### `room.onPositionsReset = function() { }`
Called just after player positions have been reset (after new game or goal).

### `room.onCollisionDiscVsDisc = function(discId1, discPlayerId1, discId2, discPlayerId2) { }`
Called after a collision between two discs. `discPlayerId` is null if the disc is not a player's disc.

### `room.onCollisionDiscVsSegment = function(discId, discPlayerId, segmentId) { }`
Called after a collision between a disc and a segment.

### `room.onCollisionDiscVsPlane = function(discId, discPlayerId, planeId) { }`
Called after a collision between a disc and a plane.

**Player:**

### `room.onPlayerJoin = function(playerObj) { }`
Called just after a player has joined the room.
```js
room.onPlayerJoin = function(playerObj) {
  console.log(playerObj.name + " joined!");
};
```

### `room.onPlayerLeave = function(playerObj, reason, isBanned, byId) { }`
Called just after a player has left the room. `reason` is null if the player left by themselves.
```js
room.onPlayerLeave = function(playerObj, reason, isBanned, byId) {
  console.log(playerObj.name + " left");
};
```

### `room.onPlayerChat = function(id, message) { }`
Called just after a chat message has been received.
```js
room.onPlayerChat = function(id, message) {
  console.log(id + ": " + message);
};
```

### `room.onPlayerTeamChange = function(id, teamId, byId) { }`
Called after a player has been moved to a different team.
```js
room.onPlayerTeamChange = function(id, teamId, byId) {
  console.log("Player " + id + " moved to team " + teamId);
};
```

### `room.onPlayerAdminChange = function(id, isAdmin, byId) { }`
Called after a player's admin rights have changed.

### `room.onPlayerAvatarChange = function(id, value) { }`
Called after a player has changed their avatar.

### `room.onPlayerSyncChange = function(playerId, value) { }`
Called after a player's sync status has changed.

### `room.onPlayerInputChange = function(id, value) { }`
Called after a player's input has changed.

### `room.onPlayerChatIndicatorChange = function(id, value) { }`
Called after a player activates/deactivates their chat indicator.

### `room.onPlayerObjectCreated = function(playerObj) { }`
Called after a Player object has been created. Use this to set custom player properties.

### `room.onPlayerDiscCreated = function(playerObj) { }`
Called after a disc has been assigned to a player.

### `room.onPlayerDiscDestroyed = function(playerObj) { }`
Called after a disc has been removed from a player.

**Game Control:**

### `room.onGameStart = function(byId) { }`
Called just after the game has been started.

### `room.onGameStop = function(byId) { }`
Called just after the game has been stopped.

### `room.onGamePauseChange = function(isPaused, byId) { }`
Called after the game has been paused or resumed.

### `room.onScoreLimitChange = function(value, byId) { }`
Called after the score limit has changed.

### `room.onTimeLimitChange = function(value, byId) { }`
Called after the time limit has changed.

### `room.onOvertimeLimitChange = function(value) { }`
Called after the overtime limit has changed.

### `room.onStadiumChange = function(stadium, byId) { }`
Called after the stadium has changed.

### `room.onTeamsLockChange = function(value, byId) { }`
Called after teams have been locked/unlocked.

### `room.onAutoTeams = function(playerId1, teamId1, playerId2, teamId2, byId) { }`
Called after auto-teams moves players from spectators to teams.

### `room.onTeamColorsChange = function(teamId, value, byId) { }`
Called after a team's colors have changed.

### `room.onKickRateLimitChange = function(min, rate, burst, byId) { }`
Called after the kick rate limit has changed.

### `room.onPlayerDirectionChange = function(id, value) { }`
Called after an individual player's direction has changed. `room.state.directionActive` must be true.

**Host:**

### `room.onRoomLink = function(link) { }`
Called when the room link is received from the backend. Also called when the connection is re-established.
```js
room.onRoomLink = function(link) {
  console.log("Room is ready at: " + link);
};
```

### `room.onBansClear = function() { }`
Called just after all bans have been cleared.

### `room.onBanClear = function(id) { }`
Called just after a specific player's ban has been cleared.

### `room.onRoomRecaptchaModeChange = function(on) { }`
Called after the room's recaptcha mode has changed.

### `room.onRoomTokenChange = function(token) { }`
Called after the room's token has changed.

### `room.onAnnouncement = function(msg, color, style, sound) { }`
Called just after an announcement was made by the host.

### `room.onText = function(type, msg, cssVar, sound, targetId) { }`
Called just after an improved announcement was sent.

### `room.onRoomPropertiesChange = function(props) { }`
Called after room properties have changed. `props` contains only the changed keys.

### `room.onRunDefaultGameLogicChange = function(value) { }`
Called after `runDefaultGameLogic` has changed.

### `room.onClockPausedChange = function(value) { }`
Called after the game clock has been paused or resumed.

### `room.onRoomNameChange = function(name) { }`
Called after the room name changes.

### `room.onPlayerHeadlessAvatarChange = function(id, value) { }`
Called after a player's headless avatar changes.

### `room.onPlayersOrderChange = function(idList, moveToTop) { }`
Called after the player order has been changed.

### `room.onSetDiscProperties = function(id, type, data1, data2) { }`
Called after disc properties have been modified.

### `room.onPingData = function(array) { }`
Called after ping values for all players have been updated.

### `room.onPlayerSkinChange = function(id, skin) { }`
Called after a player's skin has changed.

### `room.onPlayerCssVarChange = function(id, cssVar) { }`
Called after a player's cssVar has changed.

### `room.onHandicapChange = function(value) { }`
Called after the local ping handicap value has changed.

### `room.onRoomRecordingChange = function(value) { }`
Called after recording has started (`true`) or stopped (`ArrayBuffer` with recorded data).

### `room.onStadiumAddObject = function(type, value) { }`
Called after a new stadium object has been added.

### `room.onStadiumUpdateObject = function(type, id, value) { }`
Called after an existing stadium object has been updated.

### `room.onStadiumRemoveObject = function(type, id) { }`
Called after an existing stadium object has been removed.

### `room.onDirectionActiveChange = function(value) { }`
Called after `directionActive` has changed.

### `room.onPlayerEnergyChange = function(id, data) { }`
Called after a player's energy values have been manually altered.

### `room.onControls = function(type, params) { }`
Called after game input controls have been modified.

### `room.onUpdateCssVar = function(name, value) { }`
Called after a CSS variable has been updated.

### `room.onPlayCustomSound = function(soundName) { }`
Called after a custom sound has been played.

### `room.onElapsedTimeChange = function(value) { }`
Called after the elapsed time has changed.

### `room.onMaxGoalTicksChange = function(value) { }`
Called after max goal ticks has changed.

### `room.onMaxPauseTicksChange = function(value) { }`
Called after max pause ticks has changed.

### `room.onMaxEndTicksChange = function(value) { }`
Called after max end ticks has changed.

### `room.onTeamScoreChange = function(teamId, value) { }`
Called after a team's score has changed.

### `room.onPingChange = function(instantPing, averagePing, maxPing) { }`
Called after the current player's ping has been calculated.

### `room.onCustomEvent = function(type, data, byId) { }`
Called when a custom event is received.
```js
room.onCustomEvent = function(type, data, byId) {
  console.log("Custom event " + type + " from " + byId);
};
```

### `room.onBinaryCustomEvent = function(type, data, byId) { }`
Called when a binary custom event is received.

### `room.onIdentityEvent = function(id, data, byId) { }`
Called when an identity event is received.

**Modifiers:**

### `room.modifyPlayerData = function(playerId, name, flag, avatar, conn, auth) { }`
Called just before a player joins. Return `null` to block, or `[name, flag, avatar]` to modify.
```js
room.modifyPlayerData = function(playerId, name, flag, avatar, conn, auth) {
  if (name == "abc") return null;
  return ["[" + playerId + "] " + name, "tr", avatar];
};
```

### `room.modifyPlayerPing = function(playerId, ping) { }`
Modifies a player's ping value (host only, excludes host player). Return the new ping.
```js
room.modifyPlayerPing = function(playerId, ping) {
  return ping * 2;
};
```

### `room.modifyClientPing = function(ping) { }`
Modifies the local ping value (client only). Return the new ping.

### `room.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo) { }`
Intercept all network operations. Return `true` to accept, `false` to block.
```js
room.onOperationReceived = function(type, msg, globalFrameNo, clientFrameNo) {
  return true;
};
```
---

## [GUI](https://raw.githack.com/wxyz-abcd/mooball/main/docs/interfaces/_internal_.Gui.html)

The `room.gui` object holds serializable GUI data.

| Property | Type | Description |
|----------|------|-------------|
| `room.gui.controls` | `GuiControl[]` | Input controls |
| `room.gui.sounds` | `{[name]: {url}}` | Registered sounds |
| `room.gui.cssVars` | `{[name]: {value}}` | CSS variables |
| `room.gui.styles` | `{[id]: {css}}` | CSS styles |
| `room.gui.popups` | `{[id]: GuiPopup}` | Popups |
| `room.gui.components` | `{[id]: GuiComponent}` | UI components |

| Method | Description |
|--------|-------------|
| `room.gui.addControl(name, keys)` | Add a new input control (host, before join) |
| `room.gui.removeControl(name)` | Remove an input control (host, before join) |
| `room.gui.createStyle(css)` | Add a CSS style |
| `room.gui.registerSound(name, url)` | Register a sound by name and URL |
| `room.gui.defineCssVar(name, initialValue)` | Define a CSS variable |
| `room.gui.createPopup(props)` | Create a popup |

Exported via `API.GUI`:
- `GUI.Style` — `Style` class
- `GUI.COMPONENT_TYPE` — `CONTAINER`(0), `LABEL`(1), `BUTTON`(2), `TEXTBOX`(3), `SPINBOX`(4)
- `GUI.EVENT_TYPE` — `CLICK`(0)
- `GUI.FUNCTION_TYPE` — `SET_POPUP_VISIBLE`(0), `SEND_MESSAGE_TO_HOST`(1)
- `GUI.TEXTURE_TYPE` — `SOLID`(0), `LINEAR_GRADIENT`(1), `RADIAL_GRADIENT`(2), `CONIC_GRADIENT`(3), `PATTERN`(4)

---

## [Utils](https://raw.githack.com/wxyz-abcd/mooball/main/docs/interfaces/_internal_.Utils.html)

### `API.Utils.generateAuth(): Promise<[string, Auth]>`
Generates a new auth key and companion auth object for `Room.join`.

### `API.Utils.authFromKey(authKey): Promise<Auth>`
Recreates the auth object from a previously stored auth key.
- `authKey: string`

### `API.Utils.getRoomList(): Promise<RoomData[]>`
Retrieves the current list of open public rooms from the backend.

### `API.Utils.calculateAllRoomDistances(geo, list): void`
Calculates distances from a GeoLocation to all rooms and stores them in each room's `dist` property.
- `geo: GeoLocation`, `list: RoomData[]`

### `API.Utils.numberToColor(number): string`
Converts a number (0-16777215) to an rgba color string.
- `number: int`

### `API.Utils.colorToNumber(color): int`
Converts an rgba color string back to a number.
- `color: string`

### `API.Utils.keyState(dirX, dirY, kick): int`
Combines directions and kick state into a key state integer (0-31) for `room.setKeyState`.
- `dirX/Y: Direction`, `kick: boolean`

### `API.Utils.reverseKeyState(state): {dirX, dirY, kick}`
Explains a key state integer as its component directions and kick state.
- `state: int` (0-31)

### `API.Utils.runAfterGameTick(callback, ticks?): void`
Runs a callback function after a specified number of game ticks.
- `callback: () => void`, `ticks?: int` (default 1)

### `API.Utils.getGeo(): Promise<GeoLocation>`
Gets the current geolocation from the backend based on IP address.

### `API.Utils.parseGeo(geoStr?, fallback?, retNull?): GeoLocation`
Parses a string or object into a GeoLocation object with optional fallback values.

### `API.Utils.parseStadium(text): Stadium | undefined`
Parses a .hbs file string into a stadium object. Returns undefined on error.
- `text: string`

### `API.Utils.exportStadium(stadium): string`
Converts a stadium object back to a .hbs file string.
- `stadium: Stadium`

### `API.Utils.getDefaultStadiums(): Stadium[]`
Returns an array of all default stadiums.

### `API.Utils.refreshRoomToken(params): Promise<{code, value}>`
Refreshes the room token. Returns `{code, value}` where code 0=accepted, 1=rejected, 2=error.

### `API.Utils.generateRoomId(params): Promise<{roomId, newToken}>`
Generates a room id from a room token. Also refreshes the token.