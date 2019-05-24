module.exports.prepForArgString = (string) => {
  return string
    .replace(new RegExp("\\${", 'g'), "\\${")
    .replace(new RegExp("`", 'g'), "\\`")
};

module.exports.prepForArgRegExpString = (string) => {
  return string
    .replace(new RegExp("\\\\", 'g'), "\\\\")
    .replace(new RegExp("\\${", 'g'), "\\${")
    .replace(new RegExp("`", 'g'), "\\`")
};