/********************
*  EXT-Selfies v1.0 *
*  Bugsounet        *
*  10/2022          *
********************/

/** Todo:
 * use onoff npm library for flash
**/

/** Warn:
 * flash is now moved to EXT-SelfiesFlash !
 **/

const NodeWebcam = require( "node-webcam" );
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const ba64 = require("ba64");

var log = () => { /* do nothing */ };

var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start: function() {
    this.devices = []
    this.device = false
  },

  initialize: function(payload) {
    console.log("[SELFIES] EXT-Selfies Version:", require('./package.json').version, "rev:", require('./package.json').rev)
    this.config = payload
    if (payload.debug) {
      log = (...args) => { console.log("[SELFIES]", ...args) }
    }
    if (!this.config.usePreview) {
      var Webcam = NodeWebcam.create({})
      Webcam.list((list)=>{
        log("Searching camera devices...")
        if (!list || list.length <= 0) {
          log ("Cannot find any camera in this computer.")
          return
        }
        this.devices.concat(list);
        log("Detected devices:", list)
        if (payload.device) {
          var idx = list.indexOf(payload.device)
          if (idx !== -1) {
            this.device = list[idx]
            log(`'${payload.device}' will be used.`)
          } else {
            log(`Cannot find '${payload.device}' in the list. '${list[0]}' be selected as default.`)
          }
        } else {
          log(`Default camera '${list[0]}' will be used.`)
        }
      })
    }
    this.sendSocketNotification("INITIALIZED")

  },

  socketNotificationReceived: function(noti, payload) {
    switch (noti) {
      case "INIT":
        this.initialize(payload)
        break
      case "SHOOT":
        log('Shoot payload:', payload)
        this.shoot(payload)
        break
      case "EMPTY":
        var dir = path.resolve(__dirname, "photos")
        exec(`rm ${dir}/*.jpeg`, (err, sto, ste)=>{
          if (sto) log("stdOut:", sto)
          if (ste) log("stdErr:", ste)
          if (err) return console.error("[SELFIES] Cleaning directory Error:", err)
          log("Cleaning directory:", dir)
          this.sendSocketNotification("SHOOTS_EMPTY")
        })
        break
      case "DELETE":
        this.deleteShoot(payload)
        break
      case "SAVE":
        this.base64ToJPGSave(payload)
        break
    }
  },

  base64ToJPGSave: function(payload) {
    var uri = moment().format("YYMMDD_HHmmss")
    var filename = path.resolve(__dirname, "photos", uri)
    ba64.writeImage(filename, payload.data, err => {
      if (err) throw err;
      log("Image saved successfully");
      this.sendSocketNotification("SHOOT_RESULT", {
        path: filename + ".jpeg",
        uri: uri + ".jpeg",
        option: payload.option
      })
    })
  },

  shoot: function(payload) {
    if (this.config.usePreview) return console.error("[SELFIES] Warn Main core try to use shoot command with preview feature!")
    var uri = moment().format("YYMMDD_HHmmss") + ".jpeg"
    var filename = path.resolve(__dirname, "photos", uri)
    var opts = Object.assign ({
      width: this.config.captureWidth,
      height: this.config.captureHeight,
      quality: 100,
      delay: 0,
      saveShots: true,
      output: "jpeg",
      device: this.device,
      callbackReturn: "location",
      verbose: this.config.debug
    }, (payload.options) ? payload.options : {})

    this.sendSocketNotification("FLASH_ON") // infom main js with FLASH_ON for EXT-SelfiesFlash (before take shoot)

    NodeWebcam.capture(filename, opts, (err, data)=>{
      this.sendSocketNotification("FLASH_OFF") // infom main js with FLASH_OFF for EXT-SelfiesFlash (after take shoot)
      if (err || !fs.existsSync(data)) { // verifie si erreur ou si le fichier n'as pas été créé (evite le crash)
        console.error("[SELFIES] Capture Error!", err ? err : "")
        this.sendSocketNotification("ERROR", "Webcam Capture Error!")
        return
      }
      log("Photo is taken:", data)
      this.sendSocketNotification("SHOOT_RESULT", {
        path: data,
        uri: uri
      })
    })

  },

  deleteShoot: function(payload) {
    if (payload.path) {
      fs.unlink(payload.path,
        err => {
          if (err) {
            this.sendSocketNotification("ERROR", "Error when delete last shoot!") // will inform user with EXT-Alert 
            return console.log("[SELFIES] Delete Error:", err)
          }
          log("File deleted:", payload.uri)
        }
      )
    }
  }
});
