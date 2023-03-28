/********************
*  EXT-Selfies v1.1 *
*  Bugsounet        *
*  venditti69500    *
*  03/2023          *
********************/

Module.register("EXT-Selfies", {
  defaults: {
    debug: false,
    captureWidth:1280,
    captureHeight:720,
    device: null,
    usePreview: true,
    previewWidth:640,
    previewHeight:360,
    displayButton: true,
    buttonStyle: 0,
    buttons: {
      1: "master.png",
      2: "halloween.png",
      3: "birthday.png",
      4: "christmas.png"
    },
    blinkButton: false,
    playShutter: true,
    resultDuration: 1000 * 10,
    autoValidate: true,
    counterStyle: 0,
    showResult: true
  },

  getStyles: function() {
    let defaultStyle = ["EXT-Selfies.css", "font-awesome.css"]
    defaultStyle.push(this.defineCSSFile())
    return defaultStyle
  },

  getScripts: function() {
    return [ "/modules/EXT-Selfies/components/webcam.min.js" ]
  },

  start: function() {
    this.IsShooting = false
    this.lastPhoto = null
    /** 0: default
      * 1: google
      * 2: point
      * 3: move
     **/

    this.counterStyleHTML = {
      0: `
    <div class="message">Smiles!</div>
    <div class="count">5</div>
`,

      1: `
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
`,

      2: `
  <div class="c"></div>
  <div class="o"></div>
  <div class="u"></div>
  <div class="n"></div>
  <div class="t"></div>
<svg>
  <defs>
    <filter id="filter">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -10" result="filter" />
      <feComposite in="SourceGraphic" in2="filter" operator="atop" />
    </filter>
  </defs>
</svg>
`,

      3: `
  <div></div>
`
    }
    this.counterStyle = null
    this.ready = false
    this.resourcesPatch = "/modules/EXT-Selfies/resources/"
    this.logoSelfies = this.resourcesPatch
    this.logo= {
      Send: this.resourcesPatch + "send.png",
      Save: this.resourcesPatch + "save.png",
      Exit: this.resourcesPatch + "exit.png",
      Retry: this.resourcesPatch + "retry.png",
    }
    if (this.config.buttonStyle && this.config.buttons[this.config.buttonStyle]) { // if buttonStyle is a number
      this.logoSelfies += this.config.buttons[this.config.buttonStyle]
    } else if (Array.isArray(this.config.buttonStyle) && this.config.buttons[this.config.buttonStyle[0]]) { // buttonStyle is an array [1,2,3] and verify the first number of the array
      this.logoSelfies += this.config.buttons[this.config.buttonStyle[0]] // select the first number of the array
    } else this.logoSelfies += "master.png" // fallback to master.png
    if (this.config.counterStyle && this.counterStyleHTML[this.config.counterStyle]) {
      this.counterStyle = this.counterStyleHTML[this.config.counterStyle]
    } else this.counterStyle = this.counterStyleHTML[0]
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
      icon.addEventListener("click", () => this.shoot())
      wrapper.appendChild(icon)
    } else wrapper.style.display = 'none'
    return wrapper
  },

  prepare: function() {
    /** popup main code **/
    var dom = document.createElement("div")
    dom.id = "EXT-SELFIES"

    var preview = document.createElement("div")
    preview.classList.add("preview")
    dom.appendChild(preview)
    
    var animate = document.createElement("div")
    animate.id = "EXT-SELFIES-ANIMATE"
    dom.appendChild(animate)
    var animatedCounter = document.createElement("div")
    animatedCounter.id = "EXT-SELFIES-COUNTER"
    animatedCounter.innerHTML = this.counterStyle
    animate.appendChild(animatedCounter)

    var shutter = document.createElement("audio")
    shutter.classList.add("shutter")
    shutter.src = this.resourcesPatch + "shutter.mp3"
    dom.appendChild(shutter)

    var validatePannel = document.createElement("div")
    validatePannel.id = "EXT-SELFIES-PANNEL"

      var sendIcon = document.createElement("div")
      sendIcon.id = "EXT-SELFIES-SEND"
      sendIcon.style.backgroundImage = `url(${this.logo.Send})`
      validatePannel.appendChild(sendIcon)

      var saveIcon = document.createElement("div")
      saveIcon.id = "EXT-SELFIES-SAVE"
      saveIcon.style.backgroundImage = `url(${this.logo.Save})`
      validatePannel.appendChild(saveIcon)

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
        this.sendNotification("EXT_SELFIESFLASH-OFF") // send to EXT-SelfiesFlash
        this.sendNotification("EXT_SELFIES-END") // inform shoot ended
        this.closeDisplayer()
        this.IsShooting = false
        break
      case "SHOOTS_EMPTY":
        this.sendNotification("EXT_SELFIES-CLEAN_STORE") // inform there is no photos !
        break
      case "FLASH_OFF":
        this.sendNotification("EXT_SELFIESFLASH-OFF") // send to EXT-SelfiesFlash
        break
    }
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "GW_READY":
        if (sender.name == "Gateway") {
          this.sendSocketNotification("INIT", this.config)
          this.prepare()
          this.ready = true
          this.sendNotification("EXT_HELLO", this.name)
        }
        break
      case "EXT_SELFIES-SHOOT":
        if (this.IsShooting || !this.ready) return
        this.shoot(payload)
        break
      case "EXT_SELFIES-EMPTY_STORE":
        if (this.IsShooting || !this.ready) return
        this.sendSocketNotification("EMPTY")
        this.lastPhoto = null
        break
      case "EXT_SELFIES-LAST":
        if (this.IsShooting || !this.lastPhoto || !this.ready) return
        this.showLastPhoto(this.lastPhoto, false, true)
        break
    }
  },

  shoot: function(options={}, retry = false) {
    var options = {
      playShutter: options.playShutter || this.config.playShutter,
      autoValidate: options.autoValidate || this.config.autoValidate,
      showResult: options.showResult || this.config.showResult,
      TBkey: options.TBkey || null,
      useTBKeyOnly: options.useTBKeyOnly || false
    }
    this.sendNotification("EXT_SELFIES-START")
    this.IsShooting = true
    var con = document.querySelector("#EXT-SELFIES")
    var button = document.getElementById("EXT-SELFIES-BUTTON")

    if (this.config.displayButton) button.classList.add("hidden") // cache le boutton

    con.classList.add("shown")

    if (this.config.usePreview) this.initShootWithPreview(options,retry)
    else this.initShootWithNoPreview(options)
  },

  initShootWithPreview: function (options, retry) {
    if (!Webcam.params.webcamSet) {
      Webcam.set({ // set options
        width: this.config.previewWidth,
        height: this.config.previewHeight,
        image_format: 'jpeg',
        jpeg_quality: 100,
        flip_horiz: true,
        dest_width: this.config.captureWidth,
        dest_height: this.config.captureHeight,
        webcamSet: true
      })
      Webcam.on("error", error => {
        console.log("[SELFIES] Could not access webcam:", error)
        this.socketNotificationReceived("ERROR", "Could not access webcam: " + error)
      })
      console.log("[SELFIES] Init camera params")
    }
    var animate = document.getElementById("EXT-SELFIES-ANIMATE")
    var animatedCounter = document.getElementById("EXT-SELFIES-COUNTER")
    var preview = document.querySelector("#EXT-SELFIES .preview")
    if (retry) { // need to retry the shoot ? (don't re-init camera)
      this.sendNotification("EXT_SELFIESFLASH-ON")
      animate.classList.add("shown")
      if (this.config.counterStyle == 1) {
        animatedCounter.addEventListener("animationend" , () => {
          this.takeShootWithPreview(options)
        }, {once: true}) // don't duplicate EventListener !
      } else if (this.config.counterStyle == 2) {
        this.countDownForStyle2(5).then(() => {
          this.takeShootWithPreview(options)
        })
      } else if (this.config.counterStyle == 3) {
        animate.classList.add("move")
        animatedCounter.classList.add("dot")
        animatedCounter.addEventListener("animationend" , () => {
          this.takeShootWithPreview(options)
          animate.classList.remove("move")
          animatedCounter.classList.remove("dot")
        }, {once: true})
      } else { // fallback to default
        this.countDownForStyle0(5).then(() => {
          this.takeShootWithPreview(options)
        })
      }

    } else { // take the shoot
      preview.classList.add("shown")
      Webcam.attach(preview)
      Webcam.on('load', () => {
        this.sendNotification("EXT_SELFIESFLASH-ON")
        animate.classList.add("shown")
        if (this.config.counterStyle == 1) {
          animatedCounter.classList.add("google")
          animatedCounter.addEventListener("animationend" , () => {
            this.takeShootWithPreview(options)
          }, {once: true})
        } else if (this.config.counterStyle == 2) {
          this.countDownForStyle2(5).then(() => {
            this.takeShootWithPreview(options)
          })
        } else if (this.config.counterStyle == 3) {
          animate.classList.add("move")
          animatedCounter.classList.add("dot")
          animatedCounter.addEventListener("animationend" , () => {
            this.takeShootWithPreview(options)
            animate.classList.remove("move")
            animatedCounter.classList.remove("dot")
          }, {once: true})
        } else { // fallback to default
          this.countDownForStyle0(5).then(() => {
            this.takeShootWithPreview(options)
          })
        }
      })
    }
  },

  initShootWithNoPreview: function (options) {
    var animate = document.getElementById("EXT-SELFIES-ANIMATE")
    var animatedCounter = document.getElementById("EXT-SELFIES-COUNTER")
    animate.classList.add("shown")
    this.sendNotification("EXT_SELFIESFLASH-ON")
    if (this.config.counterStyle == 1) {
      animatedCounter.classList.add("google")
      animatedCounter.addEventListener("animationend" , () => {
        this.takeShootWithNoPreview(options)
      }, {once: true})
    } else if (this.config.counterStyle == 2) {
      this.countDownForStyle2(5).then(() => {
        this.takeShootWithNoPreview(options)
      })
    } else if (this.config.counterStyle == 3) {
      animate.classList.add("move")
      animatedCounter.classList.add("dot")
      animatedCounter.addEventListener("animationend" , () => {
        this.takeShootWithNoPreview(options)
        animate.classList.remove("move")
        animatedCounter.classList.remove("dot")
      }, {once: true})
    } else { // fallback to default
      this.countDownForStyle0(5).then(() => {
        this.takeShootWithNoPreview(options)
      })
    }
  },

  takeShootWithPreview: function (options) {
    var sound = options.playShutter
    var animate = document.getElementById("EXT-SELFIES-ANIMATE")
    var shutter = document.querySelector("#EXT-SELFIES .shutter")
    if (sound) shutter.play()
    Webcam.snap(data_uri => {
      this.sendNotification("EXT_SELFIESFLASH-OFF")
      this.sendSocketNotification("SAVE", {
        data: data_uri,
        options: options
      })
      animate.classList.remove("shown")
    })
  },

  takeShootWithNoPreview: function (options) {
    var sound = options.playShutter
    var animate = document.getElementById("EXT-SELFIES-ANIMATE")
    var shutter = document.querySelector("#EXT-SELFIES .shutter")
    if (sound) shutter.play()
    this.sendSocketNotification("SHOOT", {
      options: options
    })
    animate.classList.remove("shown")
  },

  countDownForStyle2: function (count) { // style 2 main
    var animatedCounter = document.getElementById("EXT-SELFIES-COUNTER")
    return new Promise (resolve => {
      if (count < 0) resolve()
      else {
        animatedCounter.removeAttribute('class')
        setTimeout(()=>{
          animatedCounter.classList.add('counter-' + count)
          setTimeout(()=>{
            count--
            this.countDownForStyle2(count).then(resolve)
          }, 1000)
        }, 600)
      }
    })
  },
  
  countDownForStyle0: function(count) { // default style
    var c = document.querySelector("#EXT-SELFIES-COUNTER .count")
    return new Promise (resolve => {
      if (count < 0) resolve()
      else {
        c.innerHTML = count
        setTimeout(() => {
          count--
          this.countDownForStyle0(count).then(resolve)
        }, 1000)
      }
    })
  },

  postShoot: function(result) {
    var showResult = result.options.showResult
    var autoValidation = result.options.autoValidate
    if (showResult) {
      if (!autoValidation) this.validateSelfie(result)
      this.showLastPhoto(result)
    } else {
      this.lastPhoto = result
      this.sendNotification("EXT_SELFIES-RESULT", result)
      this.closeDisplayer()
    }
  },

  showLastPhoto: function(result, sendResult = true, showLastOnly = false) {
    var autoValidate = showLastOnly ? true : result.options.autoValidate
    this.IsShooting = true
    var con = document.querySelector("#EXT-SELFIES")
    con.classList.add("shown")
    var rd = document.querySelector("#EXT-SELFIES .result")
    rd.style.backgroundImage = `url(modules/EXT-Selfies/photos/${result.uri})`
    rd.classList.add("shown")
    if (autoValidate) {
      if (this.config.usePreview) {
        var preview = document.querySelector("#EXT-SELFIES .preview")
        preview.classList.remove("shown")
      }
      setTimeout(()=>{
        this.lastPhoto = result
        if (sendResult) this.sendNotification("EXT_SELFIES-RESULT", result)
        this.closeDisplayer()
      }, this.config.resultDuration)
    }
  },

  validateSelfie: function(result) {
    var preview = document.querySelector("#EXT-SELFIES .preview")
    preview.classList.remove("shown")
    var pannel = document.getElementById("EXT-SELFIES-PANNEL")
    pannel.classList.add("shown")

    var sendIcon = document.getElementById("EXT-SELFIES-SEND")
    sendIcon.onclick = ()=> {
      this.lastPhoto = result    // Sauvegarde le selfie en local
      this.sendNotification("EXT_SELFIES-RESULT", result) // Envoi la notif pour EXT-SSender
      this.closeDisplayer()
    }

    var saveIcon = document.getElementById("EXT-SELFIES-SAVE")
    saveIcon.onclick = ()=> {
      this.lastPhoto = result  // Sauvegarde uniquement le selfie en local
      result.options.useTBKeyOnly = true // "tag" affiche le resultat uniquement si la commande /selfie est utilisé (EXT-SelfieSender)
      this.sendNotification("EXT_SELFIES-RESULT", result)
      this.closeDisplayer()
    }
    var retryIcon = document.getElementById("EXT-SELFIES-RETRY")
    retryIcon.onclick = ()=> { 
      this.sendSocketNotification("DELETE", result)
      this.retryDisplayer()
      this.shoot(result.options, true)
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
    if (pannel) pannel.classList.remove("shown")
    rd.classList.remove("shown")
    con.classList.remove("shown")
    if (this.config.usePreview && Webcam.live) {
      preview.classList.remove("shown")
      Webcam.reset() // free the camera
    }
    this.sendNotification("EXT_SELFIES-END")
    if (this.config.displayButton) button.classList.remove("hidden") // montre le boutton
    this.IsShooting = false
  },

  retryDisplayer: function () {
    var rd = document.querySelector("#EXT-SELFIES .result")
    var pannel = document.getElementById("EXT-SELFIES-PANNEL")
    var preview = document.querySelector("#EXT-SELFIES .preview")
    if (pannel) pannel.classList.remove("shown")
    rd.classList.remove("shown")
    if (this.config.usePreview) preview.classList.add("shown")
  },
  
  defineCSSFile: function () {
    let counterStyleCSS= {
      0: "/modules/EXT-Selfies/resources/default.css",
      1: "/modules/EXT-Selfies/resources/google.css",
      2: "/modules/EXT-Selfies/resources/countdown.css",
      3: "/modules/EXT-Selfies/resources/move.css"
    }
    return counterStyleCSS[this.config.counterStyle] || counterStyleCSS[0]
  }
})
