/**  EXT-Selfies command for GoogleAssistant v4  **/
/**  multi Lang EN/FR **/
/**  modify pattern to your language if needed  **/
/**  @bugsounet  **/

var recipe = {
  transcriptionHooks: {
    "TAKE_SELFIE_FR": {
      pattern: "prends un selfie",
      command: "TAKE_SELFIE"
    },
    "TAKE_SELFIE_EN" : {
      pattern : "take a selfie",
      command: "TAKE_SELFIE"
    }
  },

  commands: {
    "TAKE_SELFIE": {
      notificationExec: { notification: "EXT_SELFIES-SHOOT" },
      soundExec: { chime: "opening" }
    }
  }
}
exports.recipe = recipe
