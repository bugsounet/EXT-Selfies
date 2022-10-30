
Module.register("EXT-Selfies", {
  defaults: {
    debug: false,
    storePath: "./photos",
    width:1280,
    height:720, // In some webcams, resolution ratio might be fixed so these values might not be applied.
    quality: 100, //Of course.
    device: null, // For default camera. Or,
    // device: "USB Camera" <-- See the backend log to get your installed camera name.
    shootMessage: "Smile!",
    shootCountdown: 5,
    displayCountdown: true,
    displayResult: true,
    displayButton: null, // null = no button or name of FontAwesome icon
    playShutter: true,
    shutterSound: "shutter.mp3",
    resultDuration: 1000 * 5,
    sendTelegramBot: true,
    rotateCountdown: "none", // rotates countdown display. "left", "right", "invert" also options
    rotatePreview: "none" // rotates preview display. "left", "right", "invert" also options
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
    this.session = {}
    this.sendSocketNotification("INIT", this.config)
    this.lastPhoto = null
  },

  getDom: function() {
    if (this.config.displayButton != null) {
      var wrapper = document.createElement("div")

      var img = document.createElement("span")
      img.className = "fa fa-" + this.config.displayButton + " fa-large"
      img.classList.add("large")

      var session = {}
      img.addEventListener("click", () => this.shoot(this.config, session))
      wrapper.appendChild(img)
      return wrapper
    }
  },

  prepare: function() {
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

    switch (this.config.rotateCountdown) {
      case "right":
        win.style.transform = "rotate(90deg)"
        break;
      case "left":
        win.style.transform = "rotate(-90deg)"
        break;
      case "invert":
        win.style.transform = "rotate(180deg)"
    }

    win.appendChild(message)
    win.appendChild(count)
    dom.appendChild(win)

    var shutter = document.createElement("audio")
    shutter.classList.add("shutter")
    if (this.config.playShutter) {
      shutter.src = "modules/EXT-Selfies/" + this.config.shutterSound
    }
    dom.appendChild(shutter)

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
      case "WEB_REQUEST":
        this.shoot(payload)
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
    }
  },

  shoot: function(option={}, session={}) {
    this.sendNotification("EXT_SELFIES-START")
    var showing = (option.hasOwnProperty("displayCountdown")) ? option.displayCountdown : this.config.displayCountdown
    var sound = (option.hasOwnProperty("playShutter")) ? option.playShutter : this.config.playShutter
    var countdown = (option.hasOwnProperty("shootCountdown")) ? option.shootCountdown : this.config.shootCountdown
    var rotatePreview = (option.hasOwnProperty("rotatePreview")) ? option.rotatePreview : this.config.rotatePreview
    var rotateCountdown = (option.hasOwnProperty("rotateCountdown")) ? option.rotateCountdown : this.config.rotateCountdown
    if (option.hasOwnProperty("displayResult")) session["displayResult"] = option.displayResult
    var con = document.querySelector("#EXT-SELFIES")
    if (showing) con.classList.toggle("shown")
    var win = document.querySelector("#EXT-SELFIES .window")
    if (showing) win.classList.toggle("shown")

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
        if (showing) win.classList.toggle("shown")
        if (showing) con.classList.toggle("shown")
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
    var at = false
    var showing = true
    if (result.session) {
      if (result.session.hasOwnProperty("displayResult")) { showing = result.session.displayResult }
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
    }

    if (this.config.sendTelegramBot && !at) {
      this.sendNotification("TELBOT_TELL_ADMIN", {
        type: "PHOTO_PATH",
        path: result.path
      })
      this.sendNotification("TELBOT_TELL_ADMIN", "New Selfie")
    }
    this.sendNotification("EXT_SELFIES-RESULT", result)
    //this.sendNotification("GPHOTO_UPLOAD", result.path)
    this.lastPhoto = result
    if (showing == true) {this.showLastPhoto(result) }
  },

  showLastPhoto: function(result) {
    if (this.config.debug) console.log("Showing last photo.")
    var showing = this.config.displayResult
    var con = document.querySelector("#EXT-SELFIES")
    if (showing) con.classList.toggle("shown")
    var rd = document.querySelector("#EXT-SELFIES .result")
    rd.style.backgroundImage = `url(modules/EXT-Selfies/photos/${result.uri})`

    switch (this.config.rotatePreview) {
      case "right":
        rd.style.transform = "rotate(90deg)"
        break;
      case "left":
        rd.style.transform = "rotate(-90deg)"
        break;
      case "invert":
        rd.style.transform = "rotate(180deg)"
    }

    if (showing) rd.classList.toggle("shown")
    setTimeout(()=>{
      if (showing) rd.classList.toggle("shown")
      if (showing) con.classList.toggle("shown")
      this.sendNotification("EXT_SELFIES-END")
    }, this.config.resultDuration)
  }
});
