/********************
*  EXT-Selfies v1.0 *
*  Bugsounet        *
*  10/2022          *
********************/

/** Warn: use `npm run update` for updating **/

/** @todo:
 * rewrite TB functions (/selfie, /emptyselfie, /lastselfie)
 * OR move it to EXT-SelfiesXXX ?? with mail,googlephoto,and telegram ?
 **/

Module.register("EXT-Selfies", {
  defaults: {
    debug: false,
    captureWidth:1280,
    captureHeight:720, // In some webcams, resolution ratio might be fixed so these values might not be applied.
    device: null, // For default camera. Or, device: "USB Camera" <-- See the backend log to get your installed camera name.
    // device is only used if preview not used
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
    usePreview: true,   // Fonction display capture
    previewWidth:640,
    previewHeight:360
  },

  getStyles: function() {
    return ["EXT-Selfies.css", "font-awesome.css", "testage.css"]
  },

  getScripts: function() {
    return [ "/modules/EXT-Selfies/resources/webcam.min.js" ]
  },

  start: function() {
    this.IsShooting = false
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
      icon.addEventListener("click", () => this.shoot(this.config))
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

    var preview = document.createElement("div") // créer l'element preview
    preview.classList.add("preview")
    dom.appendChild(preview)
    
    var test = document.createElement("div")
    test.id = "EXT-SELFIES-TEST"
    dom.appendChild(test)
    var testage = document.createElement("div")
    testage.id = "EXT-SELFIES-TESTAGE" // mode féniasse ...
    testage.classList.add("google")
    testage.innerHTML = `
  <div class="google__colored-blocks">
    <div class="google__colored-blocks-rotater">
      <div class="google__colored-block"></div>
      <div class="google__colored-block"></div>
      <div class="google__colored-block"></div>
      <div class="google__colored-block"></div>
    </div>
    <div class="google__colored-blocks-inner"></div>
    <div class="google__text">Smiles!</div>
  </div>
  <div class="google__inner">
    <svg class="google__numbers" viewBox="0 0 100 100">
      <defs>
        <path class="google__num-path-1" d="M40,28 55,22 55,78"/>
        <path class="google__num-join-1-2" d="M55,78 55,83 a17,17 0 1,0 34,0 a20,10 0 0,0 -20,-10"/>
        <path class="google__num-path-2" d="M69,73 l-35,0 l30,-30 a16,16 0 0,0 -22.6,-22.6 l-7,7"/>
        <path class="google__num-join-2-3" d="M28,69 Q25,44 34.4,27.4"/>
        <path class="google__num-path-3" d="M30,20 60,20 40,50 a18,15 0 1,1 -12,19"/>
      </defs>
      <path class="google__numbers-path" 
            d="M-10,20 60,20 40,50 a18,15 0 1,1 -12,19 
               Q25,44 34.4,27.4
               l7,-7 a16,16 0 0,1 22.6,22.6 l-30,30 l35,0 L69,73 
               a20,10 0 0,1 20,10 a17,17 0 0,1 -34,0 L55,83 
               l0,-61 L40,28" />
    </svg>
  </div>
`
    test.appendChild(testage)

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
    /** init camera **/
    if (this.config.usePreview) {
      Webcam.set({ // set options
        width: this.config.previewWidth,
        height: this.config.previewHeight,
        image_format: 'jpeg',
        jpeg_quality: 100,
        flip_horiz: true,
        dest_width: this.config.captureWidth,
        dest_height: this.config.captureHeight
      })
    }
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
        this.closeDisplayer()
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
        var pl = {
          option: {}
        }
        pl = Object.assign({}, pl, payload)
        this.shoot(pl.option)
        break
      case "EXT_SELFIES-EMPTY_STORE":
        if (this.IsShooting) return
        this.sendSocketNotification("EMPTY")
        this.lastPhoto = null
        break
      case "EXT_SELFIES-LAST":
        if (this.IsShooting || !this.lastPhoto) return
        this.showLastPhoto(this.lastPhoto, true)
        break
    }
  },

  shoot: function(option={}, retry = false) { // need todo better (@bugsounet)
    this.sendNotification("EXT_SELFIES-START")
    this.IsShooting = true
    var sound = (option.hasOwnProperty("playShutter")) ? option.playShutter : this.config.playShutter
    var countdown = (option.hasOwnProperty("shootCountdown")) ? option.shootCountdown : this.config.shootCountdown
    var con = document.querySelector("#EXT-SELFIES")
    var win = document.querySelector("#EXT-SELFIES .window")
    var preview = document.querySelector("#EXT-SELFIES .preview")
    var test = document.getElementById("EXT-SELFIES-TEST")
    var testage = document.getElementById("EXT-SELFIES-TESTAGE")
    var shutter = document.querySelector("#EXT-SELFIES .shutter")

    if (this.config.displayButton) {
      var button = document.getElementById("EXT-SELFIES-BUTTON")
      button.classList.add("hidden") // cache le boutton
    }
    con.classList.add("shown")
    win.classList.add("shown")

    if (this.config.usePreview) {
      if (!retry) {
        preview.classList.add("shown")
        Webcam.attach(preview) // display preview
        Webcam.on('load', () => {
          this.sendNotification("EXT_SELFIESFLASH-ON") // send to EXT-SelfiesFlash
          test.classList.add("shown")
          testage.addEventListener("animationend" , (e) => {
            if (e.animationName != "googleAnim") return // ignore others
            if (sound) shutter.play()
            Webcam.snap(data_uri => { // take the shoot and ...
              test.classList.remove("shown")
              this.sendNotification("EXT_SELFIESFLASH-OFF") // send to EXT-SelfiesFlash
              this.sendSocketNotification("SAVE", { // save the shoot
                data: data_uri,
                option: option
              })
            })
          }, {once: true})
        })
      } else {
        this.sendNotification("EXT_SELFIESFLASH-ON")
        test.classList.add("shown")
        testage.addEventListener("animationend" , (e) => {
          if (e.animationName != "googleAnim") return // ignore others
          if (sound) shutter.play()
          Webcam.snap(data_uri => { // take the shoot and ...
            test.classList.remove("shown")
            this.sendNotification("EXT_SELFIESFLASH-OFF") // send to EXT-SelfiesFlash
            this.sendSocketNotification("SAVE", { // save the shoot
              data: data_uri,
              option: option
            })
          })
        }, {once: true})
      }
    } else {
        test.classList.add("shown")
        testage.addEventListener("animationend" , (e) => {
          if (e.animationName != "googleAnim") return // ignore others
          if (sound) shutter.play()
          this.sendSocketNotification("SHOOT", {
            option: option
          })
          test.classList.remove("shown")
        }, {once: true})
    }
  },

  postShoot: function(result) {
    var autoValidation = (result.option.hasOwnProperty("autoValidate")) ? result.option.autoValidate:this.config.autoValidate
    if (!autoValidation) this.validateSelfie(result)
    this.showLastPhoto(result, autoValidation)
  },

  showLastPhoto: function(result, autoValidate= false) {
    this.IsShooting = true
    var con = document.querySelector("#EXT-SELFIES")
    con.classList.add("shown")
    var rd = document.querySelector("#EXT-SELFIES .result")
    rd.style.backgroundImage = `url(modules/EXT-Selfies/photos/${result.uri})`
    rd.classList.add("shown")

    if (autoValidate) {
      setTimeout(()=>{
        this.lastPhoto = result
        this.sendNotification("EXT_SELFIES-RESULT", result)
        this.closeDisplayer()
      }, this.config.resultDuration)
    }
  },

  validateSelfie: function(result) {
    var preview = document.querySelector("#EXT-SELFIES .preview")
    preview.classList.remove("shown")
    var pannel = document.getElementById("EXT-SELFIES-PANNEL")
    pannel.classList.add("shown")

    var validateIcon = document.getElementById("EXT-SELFIES-VALIDATE")
    validateIcon.onclick = ()=> {
      this.lastPhoto = result
      this.sendNotification("EXT_SELFIES-RESULT", result)
      this.closeDisplayer()
    }

    var retryIcon = document.getElementById("EXT-SELFIES-RETRY")
    retryIcon.onclick = ()=> { 
      this.sendSocketNotification("DELETE", result)
      this.retryDisplayer()
      this.shoot(result.option, true)
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
    var preview = document.querySelector("#EXT-SELFIES .preview")
    var c = document.querySelector("#EXT-SELFIES .count")
    if (pannel) pannel.classList.remove("shown")
    rd.classList.remove("shown")
    con.classList.remove("shown")
    if (this.config.usePreview && Webcam.live) {
      preview.classList.remove("shown")
      Webcam.reset() // free the camera
    }
    c.innerHTML = this.config.shootCountdown
    this.sendNotification("EXT_SELFIES-END")
    if (this.config.displayButton) button.classList.remove("hidden") // montre le boutton
    this.IsShooting = false
  },

  retryDisplayer() {
    var rd = document.querySelector("#EXT-SELFIES .result")
    var pannel = document.getElementById("EXT-SELFIES-PANNEL")
    var preview = document.querySelector("#EXT-SELFIES .preview")
    var c = document.querySelector("#EXT-SELFIES .count")
    if (pannel) pannel.classList.remove("shown")
    rd.classList.remove("shown")
    if (this.config.usePreview) preview.classList.add("shown")
    c.innerHTML = this.config.shootCountdown
  }
})
