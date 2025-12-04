module.exports = function (API) {
    var { AllowFlags, Plugin, Utils, VariableType } = API;

    Object.setPrototypeOf(this, Plugin.prototype);
    Plugin.call(this, "gamepad", true, { // "gamepad" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
        version: "0.2.1",
        author: "mtkcnl & jafkc2",
        description: `This is a plugin which helps you to play with a controller/gamepad.`,
        allowFlags: AllowFlags.CreateRoom | AllowFlags.JoinRoom // We allow this plugin to be activated on both CreateRoom and JoinRoom.
    });

    this.defineVariable({
        name: "vibrateOnBallKick",
        description: "Vibrate the gamepad after kicking the ball",
        type: VariableType.Boolean,
        value: true
    });

    this.defineVariable({
        name: "vibrateOnGoal",
        description: "Vibrate the gamepad after a team scores",
        type: VariableType.Boolean,
        value: true
    });

    this.defineVariable({
        name: "intervalDelay",
        description: "Delay value of the gamepadPoll interval.",
        type: VariableType.Number,
        range:{
            min:0,
            max:Infinity,
            step:1
        },
        value:16.666666666666668
    })

    /**@type {Gamepad | null}*/ let gamepad = null;

    // /**@type {String[]}*/
    // const buttons = [
    //     "A (X)",
    //     "B (Circle)",
    //     "X (square)",
    //     "Y (Triangle)",
    //     "LB (L1)",
    //     "RB (R1)",
    //     "LT (L2)",
    //     "RT (R2)",
    //     "BACK (SELECT)",
    //     "START (OPTIONS)",
    //     "Left Stick",
    //     "Right Stick",
    //     "DPAD-UP",
    //     "DPAD-DOWN",
    //     "DPAD-LEFT",
    //     "DPAD-RIGHT",

    let interval_id = null;
    /**
     * @param {GamepadEvent} event
     */
    function gamepad_connected(event) {
        console.log(`Gamepad connected.\nIndex: ${event.gamepad.index}`);
        gamepad ??= event.gamepad;
        gamepad?.vibrationActuator?.playEffect("dual-rumble", { duration: 250, strongMagnitude: .8 }); // Little vibration to notice user about gamepad has found.
    }
    /**
     * @param {GamepadEvent} event
     */
    function gamepad_disconnected(event) {
        console.log("disconnected")
        event.gamepad === gamepad ? (gamepad = null, console.log("Gamepad disconnected.")) : void (0);
    }

    this.initialize = function () {
        window.addEventListener("gamepadconnected", (e) => {
            gamepad_connected(e);
            console.log(`Gamepad connected`);
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            gamepad_disconnected(e);
            console.log(`Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}.`);
        });
        console.log("initialize");
        const gamepads = navigator.getGamepads();
        if (gamepads.length) gamepad ??= gamepads.find(v => v !== null)

        console.log(gamepads);
        interval_id = setInterval(pollGamepad.bind(this), this.intervalDelay);

    };
    this.finalize = function () {
        window.ongamepadconnected = null;
        window.ongamepaddisconnected = null;
        interval_id && (clearInterval(interval_id),interval_id = null)
    };

        this.onPlayerBallKick = (playerId, data) => {
            if (this.vibrateOnBallKick && gamepad && playerId == this.room.currentPlayerId) {
                gamepad.vibrationActuator.playEffect("dual-rumble", { duration: 150, strongMagnitude: 0.6 })
            }
        };

        this.onTeamGoal = (teamId, data) => {
            if (this.vibrateOnGoal && gamepad) {
                gamepad.vibrationActuator.playEffect("dual-rumble", { duration: 800, strongMagnitude: 1 })
            }
        }
        this.onPluginActiveChange = (plugin,customData) => {
            if(plugin == this)
            {
                if(!this.active)
                    interval_id && (clearInterval(interval_id), interval_id = null);
                else
                    interval_id == null && (interval_id = setInterval(pollGamepad.bind(this), this.intervalDelay));
            }
        }

        this.onVariableValueChange = (addonObject, variableName, oldValue, newValue, customData) =>
        {
            if(this == addonObject)
            {
                if(variableName == "intervalDelay" && interval_id)
                {
                    clearInterval(interval_id);
                    interval_id = setInterval(pollGamepad.bind(this), newValue);
                }
            }   
        }

        function pollGamepad() {
            if (gamepad) {
                gamepad = navigator.getGamepads()[gamepad?.index];
                if (!gamepad) return;
                const btns = gamepad.buttons;
                const axes = gamepad.axes;
                const DEADZONE = 0.15;

                let dirX = btns[14].pressed ? -1 : btns[15].pressed ? 1 : 0,
                dirY = btns[12].pressed ? -1 : btns[13].pressed ? 1 : 0

                // stick movement. Only used if the D-pad is not being used
                if (dirX === 0 && dirY === 0) {
                    const x = axes[0];
                    const y = -axes[1];
                    const magnitude = Math.sqrt(x * x + y * y);

                    if (magnitude > DEADZONE) {
                        const angle = Math.atan2(y, x);

                        const snapAngles = [
                            [1, 0],
                            [1, -1],
                            [0, -1],
                            [-1, -1],
                            [-1, 0],
                            [-1, 1],
                            [0, 1],
                            [1, 1]
                        ];

                        const sector = Math.round(angle / (Math.PI / 4)) & 7;
                        dirX = snapAngles[sector][0];
                        dirY = snapAngles[sector][1];
                    }
                }

                const kick = btns[0].pressed;
                this?.room.setKeyState(Utils.keyState(dirX, dirY, kick));
            }
        }
}
