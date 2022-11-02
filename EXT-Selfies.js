/********************
*  EXT-Selfies v1.0 *
*  Bugsounet        *
*  10/2022          *
********************/

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
    buttonStyle: "1", // Set "1", "2", "3", "4", "5" ------> or ["1", "3,"5"]
    updateInterval: 7 * 1000, // *
    animationSpeed: 3000,
    playShutter: true,
    shutterSound: "shutter.mp3",
    resultDuration: 1000 * 10,
    sendTelegramBot: true
  },

  getStyles: function() {
    return ["EXT-Selfies.css", "font-awesome.css"]
  },

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
    var countdown = null;
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
    if (this.lastPhoto) {
      handler.reply("PHOTO_PATH", this.lastPhoto.path)
      this.showLastPhoto(this.lastPhoto)
    } else {
      handler.reply("TEXT", "Couldn't find the last selfie.")
    }
  },

  cmdEmptySelfie: function(command, handler) {
    this.sendSocketNotification("EMPTY")
    handler.reply("TEXT", "done.")
  },

  start: function() {
   /** initialize all values before using **/
    /** initialize all values before using **/
    this.session = {}
    this.sendSocketNotification("INIT", this.config)
    this.lastPhoto = null
    this.logoValidate = "/modules/EXT-Selfies/resources/validate.png"
    this.logoExit = "/modules/EXT-Selfiesresources/exit.png"
    this.logoRetry = "/modules/EXT-Selfiesresources/retry.png"
    this.buttonUrls = {
      1: "/modules/EXT-Selfies/resources/master.png",
      2: "/modules/EXT-Selfies/resources/halloween.png",
      3: "/modules/EXT-Selfies/resources/birthday.png",
      4: "/modules/EXT-Selfies/resources/christmas.png"
    }
    this.logoSelfies = this.buttonUrls[1]
    /** end of initialize **/
    if (this.config.buttonStyle) { // @todo check this.buttonUrls length
      this.logoSelfies = this.buttonUrls[this.config.buttonStyle]
    }
    /* not needed use flash css
    setInterval(() => {
      this.updateDom(this.config.animationSpeed || 0); // use config.animationSpeed or revert to zero @ninjabreadman
    }, this.config.updateInterval)
    */
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    if (this.config.displayButton) {
      var getTimeStamp = new Date()
      var icon = document.createElement("div")
			icon.id = "EXT-SELFIES-BUTTON"
			icon.style.backgroundImage = "url(" + this.logoSelfies + ")"
			icon.classList.add("flash")
			var session = {}
			icon.addEventListener("click", () => this.shoot(this.config, session))
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

    var validateIcon = document.createElement("div")
    validateIcon.id = "EXT-SELFIESS-VALIDATE"
    validateIcon.classList.add("hidden")

    dom.appendChild(validateIcon)

    var retryIcon = document.createElement("div")
    retryIcon.id = "EXT-SELFIES-RETRY"
    retryIcon.classList.add("hidden")

    dom.appendChild(retryIcon)

    var exitIcon = document.createElement("div")
    exitIcon.id = "EXT-SELFIESS-EXIT"
    exitIcon.classList.add("hidden")

    dom.appendChild(exitIcon)
    
    var result = document.createElement("result")
    result.classList.add("result")

    dom.appendChild(result)

    /** attach this popup to the body **/
    document.body.appendChild(dom)
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "SHOOT_RESULT":
        this.postShoot(payload)
        break
      case "WEB_REQUEST":
        this.shoot(payload)
        break
      case "ERROR":
        this.sendNotification("EXT_ALERT", {
          type: "error",
          message: payload,
        })
        this.sendNotification("EXT_SELFIES-END")
        break
    }
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        this.prepare()
        //this.shoot()
        break
      case "GAv4_READY":
        if (sender.name == "MMM-GoogleAssistant") this.sendNotification("EXT_HELLO", this.name)
        break
      case "EXT_SELFIES-SHOOT":
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
        this.sendSocketNotification("EMPTY")
        break
      case "EXT_SELFIES-LAST":
        this.showLastPhoto(this.lastPhoto)
        break
      case "EXT_SELFIES-RESULT":
        this.validateSelfie()
        break
    }
  },

  shoot: function(option={}, session={}) {
    this.sendNotification("EXT_SELFIES-START")
    var sound = (option.hasOwnProperty("playShutter")) ? option.playShutter : this.config.playShutter
    var countdown = (option.hasOwnProperty("shootCountdown")) ? option.shootCountdown : this.config.shootCountdown
    var con = document.querySelector("#EXT-SELFIES")
    con.classList.toggle("shown")
    var win = document.querySelector("#EXT-SELFIES .window")
    win.classList.toggle("shown")

    const loop = (count) => {
      var c = document.querySelector("#EXT-SELFIES .count")
      c.innerHTML = count
      if (count < 0) {
        this.sendSocketNotification("SHOOT", {
          option: option,
          session: session
        })

        var shutter = document.querySelector("#EXT-SELFIES .shutter")
        if (sound) shutter.play()
        win.classList.toggle("shown")
        con.classList.toggle("shown")
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
    this.lastPhoto = result
    this.showLastPhoto(result)
  },

  showLastPhoto: function(result) {
    if (this.config.debug) console.log("Showing last photo.")
    var con = document.querySelector("#EXT-SELFIES")
    con.classList.toggle("shown")
    var rd = document.querySelector("#EXT-SELFIES .result")
    rd.style.backgroundImage = `url(modules/EXT-Selfies/photos/${result.uri})`

    rd.classList.toggle("shown")
    
    var validateIcon = document.querySelector("#EXT-SELFIES-VALIDATE")
    validateIcon.classList.remove("hidden")
    validateIcon.style.backgroundImage = "url(" + this.logoValidate + ")"
    icon.onclick = (event)=> {
      this.sendNotification("EXT_SELFIES-RESULT",(result))
    }
    var retryIcon = document.querySelector("#EXT-SELFIES-EXIT")
    retryIcon.classList.remove("hidden")
    retryIcon.style.backgroundImage = "url(" + this.logoRetry + ")"
    icon.onclick = (event)=> {
      this.sendNotification("EXT_SELFIES-SHOOT")
    }
    var exitIcon = document.querySelector("#EXT-SELFIES-VALIDATE")
    exitIcon.classList.remove("hidden")
    exitIcon.style.backgroundImage = "url(" + this.logoExit + ")"
    exitIcon.onclick = (event)=> {
      this.sendNotification("EXT_SELFIES-END")
    }
    setTimeout(()=>{
      rd.classList.toggle("shown")
      con.classList.toggle("shown")
      this.sendNotification("EXT_SELFIES-END")
    }, this.config.resultDuration)
  },

  validateSelfie: function(result) {
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
  }
})
