const { withProjectBuildGradle, withSettingsGradle } = require("expo/config-plugins");

const jitpack = "maven { url 'https://www.jitpack.io' }";

function insertJitpack(contents) {
  if (contents.includes("jitpack.io")) {
    return contents;
  }
  if (!contents.includes("mavenCentral()")) {
    return contents;
  }
  return contents.replace("mavenCentral()", `mavenCentral()\n    ${jitpack}`);
}

module.exports = function withReceiptRecognition(config) {
  config = withSettingsGradle(config, (gradle) => {
    gradle.modResults.contents = insertJitpack(gradle.modResults.contents);
    return gradle;
  });
  return withProjectBuildGradle(config, (gradle) => {
    gradle.modResults.contents = insertJitpack(gradle.modResults.contents);
    return gradle;
  });
};
