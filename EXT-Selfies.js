/********************
*  EXT-Selfies v1.0 *
*  Bugsounet        *
*  10/2022          *
********************/

/** Warn: use `npm run update` for updating **/

/** todo
 * simplify TB function / move result to EXT-SelfiesSender (@bugsounet)
 * maybe delete session ? (@bugsounet)
**/

Module.register("EXT-Selfies", {
  defaults: {
    debug: false,
    width:1280,
    height:720, // In some webcams, resolution ratio might be fixed so these values might not be applied.
    device: null, // For default camera. Or,
    // device: "USB Camera" <-- See the backend log to get your installed camera name.
    shootMessage: "Smile!",
    shootCountdown: 5,
    displayButton: true,
    buttonStyle: 1, // Set 1, 2, 3, 4 --- can be an array [1,2] for blinking --- 0 for default font-awesome icon (camera)
    buttons: {
      1: "master.png",
      2: "halloween.png",
      3: "birthday.png",
      4: "christmas.png"
    },
    blinkButton: false,
    updateInterval: 7 * 1000,
    animationSpeed: 3000,
    playShutter: true,
    shutterSound: "shutter.mp3",
    resultDuration: 1000 * 10,
    autoValidate: false,
    sendTelegramBot: true
  },

  getStyles: function() {
    return ["EXT-Selfies.css", "font-awesome.css"]
  },

  start: function() {
    this.IsShooting = false
    this.session = {}
    this.sendSocketNotification("INIT", this.config)
    this.lastPhoto = null
    this.resourcesPatch = "/modules/EXT-Selfies/resources/"
    this.logoSelfies = this.resourcesPatch
    this.logo= {
      Validate: this.resourcesPatch + "validate.png",
      Exit: this.resourcesPatch + "exit.png",
      Retry: this.resourcesPatch + "retry.png"
    }
    if (this.config.buttonStyle && this.config.buttons[this.config.buttonStyle]) { // if buttonStyle is a number
      this.logoSelfies += this.config.buttons[this.config.buttonStyle]
    } else if (Array.isArray(this.config.buttonStyle) && this.config.buttons[this.config.buttonStyle[0]]) { // buttonStyle is an array [1,2,3] and verify the first number of the array
      this.logoSelfies += this.config.buttons[this.config.buttonStyle[0]] // select the first number of the array
    } else this.logoSelfies += "master.png" // fallback to master.png
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    var session = {}
    if (this.config.displayButton) {
      var icon // define icon as var
      if (this.config.buttonStyle) { // buttonStyle > 1
        icon = document.createElement("div")
        icon.id = "EXT-SELFIES-BUTTON"
        icon.classList.add("buttonStyle")
        icon.style.backgroundImage = `url(${this.logoSelfies})`

        if (Array.isArray(this.config.buttonStyle)) { // buttonStyle is an array
          icon.classList.add("uniqueFlash")
          let nb = 0
          icon.addEventListener('animationend', () => {
            icon.classList.add("hidden")
            icon.classList.remove("uniqueFlash")
            nb++
            if (nb > this.config.buttonStyle.length-1) nb = 0
            setTimeout(() => {
              icon.classList.add("uniqueFlash")
              icon.style.backgroundImage = `url(${this.resourcesPatch + this.config.buttons[this.config.buttonStyle[nb]]})`
              icon.classList.remove("hidden")
            },1)
          })
        } else {
          if (this.config.blinkButton) icon.classList.add("flash")
        }
      } else { // buttonStyle = 0
        icon = document.createElement("span")
        icon.id = "EXT-SELFIES-BUTTON"
        icon.className = "fa fa-camera fa-large"
        icon.classList.add("large")
        if (this.config.blinkButton) icon.classList.add("flash") // active le flash sur le button unique ?
      }
      icon.addEventListener("click", () => this.shoot(this.config, session))
      wrapper.appendChild(icon)
    } else wrapper.style.display = 'none'
    return wrapper
  },

  prepare: function() {
    /** popup main code **/
    var dom = document.createElement("div")
    dom.id = "EXT-SELFIES"

    var win = document.createElement("div")
    win.classList.add("window")
    var message = document.createElement("div")
    message.classList.add("message")
    message.innerHTML = this.config.shootMessage
    var count = document.createElement("div")
    count.classList.add("count")
    count.innerHTML = this.config.shootCountdown

    win.appendChild(message)
    win.appendChild(count)
    dom.appendChild(win)

    var shutter = document.createElement("audio")
    shutter.classList.add("shutter")
    if (this.config.playShutter) {
      shutter.src = "modules/EXT-Selfies/resources/" + this.config.shutterSound
    }
    dom.appendChild(shutter)

    var validatePannel = document.createElement("div")
    validatePannel.id = "EXT-SELFIES-PANNEL"

      var validateIcon = document.createElement("div")
      validateIcon.id = "EXT-SELFIES-VALIDATE"
      validateIcon.style.backgroundImage = `url(${this.logo.Validate})`
      validatePannel.appendChild(validateIcon)

      var retryIcon = document.createElement("div")
      retryIcon.id = "EXT-SELFIES-RETRY"
      retryIcon.style.backgroundImage = `url(${this.logo.Retry})`
      validatePannel.appendChild(retryIcon)

      var exitIcon = document.createElement("div")
      exitIcon.id = "EXT-SELFIES-EXIT"
      exitIcon.style.backgroundImage = `url(${this.logo.Exit})`
      validatePannel.appendChild(exitIcon)

    dom.appendChild(validatePannel)
    var result = document.createElement("result")
    result.classList.add("result")
    dom.appendChild(result)

    document.body.appendChild(dom)
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "SHOOT_RESULT":
        this.postShoot(payload)
        break
      case "ERROR": // will display error with EXT-Alert
        this.sendNotification("EXT_ALERT", {
          type: "error",
          message: payload,
        })
        this.sendNotification("EXT_SELFIES-END") // inform shoot ended
        this.IsShooting = false
        break
      case "SHOOTS_EMPTY":
        this.sendNotification("EXT_SELFIES-CLEAN_STORE") // inform there is no photos !
        break
      case "FLASH_ON":
        this.sendNotification("EXT_SELFIESFLASH-ON") // send to EXT-SelfiesFlash
        break
      case "FLASH_OFF":
        this.sendNotification("EXT_SELFIESFLASH-OFF") // send to EXT-SelfiesFlash
        break
    }
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        this.prepare()
        break
      case "GAv4_READY": // send HELLO to Gateway ... (mark plugin as present in GW db)
        if (sender.name == "MMM-GoogleAssistant") this.sendNotification("EXT_HELLO", this.name)
        break
      case "EXT_SELFIES-SHOOT":
        if (this.IsShooting) return
        var session = {}
        var pl = {
          option: {},
          callback:null,
        }
        pl = Object.assign({}, pl, payload)
        if (typeof pl.callback == "function") {
          key = Date.now() + Math.round(Math.random() * 1000)
          this.session[key] = pl.callback
          session["key"] = key
          session["ext"] = "CALLBACK"
        }
        this.shoot(pl.option, session)
        break
      case "EXT_SELFIES-EMPTY_STORE":
        if (this.IsShooting) return
        this.sendSocketNotification("EMPTY")
        this.lastPhoto = null
        break
      case "EXT_SELFIES-LAST":
        if (this.IsShooting) return
        this.showLastPhoto(this.lastPhoto, true)
        break
    }
  },

  shoot: function(option={}, session={}) {
    this.sendNotification("EXT_SELFIES-START")
    this.IsShooting = true
    var sound = (option.hasOwnProperty("playShutter")) ? option.playShutter : this.config.playShutter
    var countdown = (option.hasOwnProperty("shootCountdown")) ? option.shootCountdown : this.config.shootCountdown
    var con = document.querySelector("#EXT-SELFIES")
    var win = document.querySelector("#EXT-SELFIES .window")

    if (this.config.displayButton) {
      var button = document.getElementById("EXT-SELFIES-BUTTON")
      button.classList.add("hidden") // cache le boutton
    }
    con.classList.add("shown")
    win.classList.add("shown")

    const loop = (count) => {
      var c = document.querySelector("#EXT-SELFIES .count")
      c.innerHTML = count
      if (count == 0) {
        this.sendSocketNotification("SHOOT", {
          option: option,
          session: session
        })

        var shutter = document.querySelector("#EXT-SELFIES .shutter")
        if (sound) shutter.play()
      } else {
        setTimeout(()=>{
          count--
          loop(count)
        }, 1000)
      }
    }
    loop(countdown)
  },

  postShoot: function(result) {
    if (!this.config.autoValidate && !result.session.ext) this.validateSelfie(result)
    else this.sendSelfieTB(result)
    this.showLastPhoto(result, result.session.ext ? true : this.config.autoValidate)
  },

  showLastPhoto: function(result, autoValidate= false) {
    this.IsShooting = true
    if (this.config.debug) console.log("Showing last photo.")
    var con = document.querySelector("#EXT-SELFIES")
    con.classList.add("shown")
    var rd = document.querySelector("#EXT-SELFIES .result")
    rd.style.backgroundImage = `url(modules/EXT-Selfies/photos/${result.uri})`
    rd.classList.add("shown")

    if (autoValidate) {
      setTimeout(()=>{
        this.lastPhoto = result
        this.sendSelfieTB(result)
        this.sendNotification("EXT_SELFIES-RESULT", result)
        this.closeDisplayer()
      }, this.config.resultDuration)
    }
  },

  validateSelfie: function(result) {
    var pannel = document.getElementById("EXT-SELFIES-PANNEL")
    pannel.classList.add("shown")

    var validateIcon = document.getElementById("EXT-SELFIES-VALIDATE")
    validateIcon.onclick = ()=> {
      this.lastPhoto = result
      this.sendSelfieTB(result) 
      this.sendNotification("EXT_SELFIES-RESULT", result)
      this.closeDisplayer()
    }

    var retryIcon = document.getElementById("EXT-SELFIES-RETRY")
    retryIcon.onclick = ()=> { 
      this.sendSocketNotification("DELETE", result)
      this.closeDisplayer()
      this.shoot(this.config, {})
    }

    var exitIcon = document.getElementById("EXT-SELFIES-EXIT")
    exitIcon.onclick = ()=> {
      this.sendSocketNotification("DELETE", result)
      this.closeDisplayer()
    }
  },

  closeDisplayer: function () {
    var con = document.querySelector("#EXT-SELFIES")
    var rd = document.querySelector("#EXT-SELFIES .result")
    var pannel = document.getElementById("EXT-SELFIES-PANNEL")
    var button = document.getElementById("EXT-SELFIES-BUTTON")
    if (pannel) pannel.classList.remove("shown")
    rd.classList.remove("shown")
    con.classList.remove("shown")
    this.sendNotification("EXT_SELFIES-END")
    if (this.config.displayButton) button.classList.remove("hidden") // montre le boutton
    this.IsShooting = false
  },

 /** TelegramBot function **/
   getCommands: function(commander) {
    commander.add({
      command: 'selfie',
      callback: 'cmdSelfie',
      description: "Take a selfie.",
    })

    commander.add({
      command: 'emptyselfie',
      callback: 'cmdEmptySelfie',
      description: "Remove all selfie photos."
    })

    commander.add({
      command: 'lastselfie',
      callback: 'cmdLastSelfie',
      description: 'Display the last selfie shot taken.'
    })
  },

  cmdSelfie: function(command, handler) {
    if (this.IsShooting) return handler.reply("TEXT", "Not available actually.")
    var countdown = null
    if (handler.args) countdown = handler.args
    if (!countdown) countdown = this.config.shootCountdown
    var session = Date.now()
    this.session[session] = handler
    this.shoot({shootCountdown:countdown}, {key:session, ext:"TELBOT"})
  },

  cmdSelfieResult: function(key, path) {
    var handler = this.session[key]
    handler.reply("PHOTO_PATH", path)
    this.session[key] = null
    delete this.session[key]
  },

  cmdLastSelfie: function(command, handler) {
    if (this.IsShooting) return handler.reply("TEXT", "Not available actually.")
    if (this.lastPhoto) {
      handler.reply("PHOTO_PATH", this.lastPhoto.path)
      this.showLastPhoto(this.lastPhoto, true)
    } else {
      handler.reply("TEXT", "Couldn't find the last selfie.")
    }
  },

  cmdEmptySelfie: function(command, handler) {
    if (this.IsShooting) return handler.reply("TEXT", "Not available actually.")
    this.sendSocketNotification("EMPTY")
    this.lastPhoto = null
    handler.reply("TEXT", "done.")
  },

  sendSelfieTB: function(result) {
    var at = false
    if (result.session) {
      if (result.session.ext == "TELBOT") {
        at = true
        this.cmdSelfieResult(result.session.key, result.path)
      }        
      if (result.session.ext == "CALLBACK") {
        if (this.session.hasOwnProperty(result.session.key)) {
          callback = this.session[result.session.key]
          callback({
            path: result.path,
            uri: result.uri
          })
          this.session[result.session.key] = null
          delete this.session[result.session.key]
        }
      }
      if (this.config.sendTelegramBot && !at) {
        this.sendNotification("TELBOT_TELL_ADMIN", {
          type: "PHOTO_PATH",
          path: result.path
        })
        this.sendNotification("TELBOT_TELL_ADMIN", "New Selfie")
      }
    }
  },
})
