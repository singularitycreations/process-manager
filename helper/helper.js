const moment = require('moment');

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
