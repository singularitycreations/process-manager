const moment = require('moment');
const fs = require('fs');

/**
 * Get formated date.
 *
 * @author Eignart
 * @since 2019.03.21
 */
exports.getDate = function formatedDate({ format = 'Y-MM-DD HH:mm:ss' } = {}) {
  return moment().format(format);
};

/**
 * Sleep function.
 *
 * @param {Number} ms milliseconds
 * @returns {Promise}
 * @author Eignart
 * @since 2019.03.21
 */
exports.timeout = function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Simple file read wrapper.
 *
 * @param {String} filePath Path to file.
 * @returns {String | Boolean} If file read failed (probably file not exist) then returns false
 *  otherwise file content.
 * @author Eignart
 * @since 2019.03.24
 */
exports.readFile = function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    // file not exist
    return false;
  }
};

/**
 * The hasProperty() method returns a boolean indicating whether the object has the specified
 * property as its own property (as opposed to inheriting it).
 *
 * @param {Object} obj Object where to check.
 * @param {String} key Object key name to check.
 * @returns {Boolean} true | false
 * @author Eignart
 * @since 2019.03.24
 */
exports.hasProperty = function hasProperty(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
