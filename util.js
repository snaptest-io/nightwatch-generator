module.exports.getNWKeyValueFromCode = function (keyCode) {
  switch(keyCode) {
    case "Enter":
      return "browser.Keys.ENTER";
    case "Escape":
      return "browser.Keys.ESCAPE";
    default:
      return "unknown";
  }
};
