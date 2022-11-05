/********************
*  EXT-Selfies v1.0 *
*  Bugsounet        *
*  10/2022          *
********************/

const NodeWebcam = require( "node-webcam" );
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;

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
      this.sendSocketNotification("INITIALIZED")
    })
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
        exec(`rm ${dir}/*.jpg`, (err, sto, ste)=>{
          log("Cleaning directory:", dir)
          if (err) console.error("[SELFIES] Cleaning directory Error:", err)
          if (sto) log("stdOut:", sto)
          if (ste) log("stdErr:", ste)
        })
        break
      case "DELETE":
        this.deleteShoot(payload)
        break
    }
  },

  shoot: function(payload) {
    var uri = moment().format("YYMMDD_HHmmss") + ".jpg"
    var filename = path.resolve(__dirname, "photos", uri)
    var opts = Object.assign ({
      width: this.config.width,
      height: this.config.height,
      quality: 100,
      delay: 0,
      saveShots: true,
      output: "jpeg",
      device: this.device,
      callbackReturn: "location",
      verbose: this.config.debug
    }, (payload.options) ? payload.options : {})
    NodeWebcam.capture(filename, opts, (err, data)=>{
      if (err || !fs.existsSync(data)) {
        console.error("[SELFIES] Capture Error!", err ? err : "")
        this.sendSocketNotification("ERROR", "Webcam Capture Error!")
        return
      }
      log("Photo is taken:", data)
      this.sendSocketNotification("SHOOT_RESULT", {
        path: data,
        uri: uri,
        session: payload.session
      })
    })
  },

  deleteShoot: function(payload) {
    console.log(payload)
    if (payload.path) {
      fs.unlink(payload.path,
        err => {
          if (err) {
            this.sendSocketNotification("ERROR", "Error when delete last shoot!")
            return console.log("[SELFIES] Delete Error:", err)
          }
          log("File deleted:", payload.uri)
        }
      )
    }
  }
});
