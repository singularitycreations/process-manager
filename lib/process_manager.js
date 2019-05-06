/* eslint-disable no-console */
const { spawn, exec } = require('child_process');
const {
  getDate, timeout, readFile, hasProperty,
} = require('../helper/helper');

/**
 * Process manager module only for Windows enviroment.
 *
 * @param {Object} options Optional parameters.`

    options.binaryName - 'Optional, {String}, default is empty. Full path to executable binary.'
    options.prName - 'Optional, {String}, default is empty. Process name like "node.exe".'´
 * @author Eignart
 * @since 2019.03.21
 */
class ProcessManager {
  constructor({
    binaryPath = '',
    prName = '',
  } = {}) {
    this.processBinaryPath = binaryPath;
    this.processName = prName;
    this.killedProcessInfo = [];
    this.processKilled = false;
  }

  /**
   * Keep process running. This function check process status on every `options.interval` sec and
   * restarts process if status is `Not Responging` `options.notRespondingCheckLimit` times. If
   * process not exist then it will be started first and then starts monitorig process status.
   *
   * @param {Object} options Optional parameters.`

    options.binaryPath - 'Optional, {String}, default is "this.processBinaryPath". Full path to executable binary.'
    options.prName - 'Optional, {String}, default is "this.processName" process name like "node.exe".'
    options.interval - '{Nunmber}, default is 30000 ms. Interval time to check process status.'
    options.notRespondingCheckLimit - 'Optional, default is 4. How many times to check before killing "Not Responding" process.'´
   * @returns {void}
   * @throws {Error}
   * @author Eignart
   * @since 2019.03.21
   */
  async keepRunning({
    binaryPath = this.processBinaryPath,
    prName = this.processName,
    interval = 30000,
    notRespondingCheckLimit = 4,
    killOldProcess = false,
  } = {}) {
    if (prName === '') {
      throw new Error('Missing required parameter "prName" (process name).');
    }

    if (binaryPath === '') {
      throw new Error('Missing required parameter "binaryPath" (process binary path).');
    }

    let prInfo = await this.getProcessInfo({
      prName,
    });

    if (!prInfo.isExist()) {
      console.log(`[${getDate()}] (PManager) Process not exist, starting ...`);
      this.startProcess({
        binaryPath,
        prName,
      });
    } else if (killOldProcess) {
      // kill old process
      process.kill(prInfo.PID);
      // wait 5 sec
      await timeout(5000);
      // start new process
      this.startProcess({
        binaryPath,
        prName,
      });
    }

    console.log(`[${getDate()}] (PManager) Monitoring ${prName} process.`);
    let notRespondingCnt = 0;

    setInterval(async () => {
      prInfo = await this.getProcessInfo({
        prName,
        status: 'Not Responding',
      });

      if (prInfo.PID) {
        console.log(`[${getDate()}] (PManager) ${prName} not responding.`);
        notRespondingCnt += 1;
      } else {
        notRespondingCnt = 0;
      }

      // if the process does not responding to long then kill this process
      if (prInfo.PID && notRespondingCnt === notRespondingCheckLimit) {
        notRespondingCnt = 0;
        this.processKilled = true;
        this.killedProcessInfo = await this.getProcessInfo({
          prName,
          returnAll: true,
        });

        console.log(`[${getDate()}] (PManager) Kill process ${prInfo.PID}`);

        try {
          process.kill(prInfo.PID);
          console.log(`[${getDate()}] (PManager) Process killed`);

          // wait 10 sec and then start it again
          await timeout(10000);
          this.startProcess({
            binaryPath,
            prName,
          });
          this.processKilled = false;
        } catch (error) {
          console.log(`[${getDate()}] (PManager) ${error.toString()}`);
        }
      }
    }, interval);
  }

  /**
   * Start child process.
   *
   * @param {void}
   * @returns {void}
   * @author Eignart
   * @since 2019.03.19
   */
  async startProcess({
    binaryPath = this.processBinaryPath,
    prName = this.processName,
  } = {}) {
    if (prName === '') {
      throw new Error('Missing required parameter "prName" (process name).');
    }

    if (binaryPath === '') {
      throw new Error('Missing required parameter "binaryPath" (process binary path).');
    }

    console.log(`[${getDate()}] (PManager) Start ${prName} process.`);

    // Start process, this is child process
    // On Windows, setting options.detached to true makes it possible for the child process to
    // continue running after the parent exits.
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    return spawn(binaryPath, { detached: true });
  }

  /**
   * Get process info via process ID (PID) or name. If process not found then all values in result
   * object will be empty string and `PID` value is 0.
   * Result object
   *
    `{

    "ImageName": 'process name',
    "PID": 'process ID', // if process not found then this is 0
    "SessionName": '',
    "Session#": '',
    "MemUsage": '',
    "Status": '', // Possible values: Unknown, Running, Not Responding
    "UserName": '',
    "CPUTime": '',
    "WindowTitle": '',
    "isExist": "this is function and returns Boolean"
    }`
   *
   * @param {Object} options Optional parameters.`

    options.prName - 'Optional, {String}, default is "this.processName". Process name like "node.exe".'
    options.PID - 'Optional, {Number}, process ID, set this to get process info via PID. IF both (PID and prName) is defined then PID will be used to get process info.'
    options.status - 'Optional, {String}, default is empty. Possible values: "Unknown", "Running", "Not Responding". For example, if you set this "Not Responding" and process status is "Running" then result will be empty, that means "Not Responding" process not found.'
    options.returnAll - 'Optional, {Boolean}, default is false, if it`s true and only "options.prName" is defined then it returns all found processes info as array where every array element is "result object". In this case "result object" does not have "isExist" function.'´
   *
   * @returns {Object|Array}
   * @throws {Error}
   * @author Eignart
   * @since 2019.03.07
   */
  // eslint-disable-next-line class-methods-use-this
  async getProcessInfo({
    prName = this.processName,
    PID = 0,
    status = '',
    returnAll = false,
  } = {}) {
    if (prName === '' && PID === 0) {
      throw new Error('Missing required parameter "prName" (process name).');
    }

    const result = {
      ImageName: '',
      PID: 0,
      SessionName: '',
      'Session#': '',
      MemUsage: '',
      Status: '',
      UserName: '',
      CPUTime: '',
      WindowTitle: '',
      isExist() {
        return this.PID !== 0;
      },
    };

    // eslint-disable-next-line consistent-return
    return new Promise(((resolve) => {
      if (prName === '' && !Number(PID)) {
        return resolve(result);
      }

      let cmdFilter = '';

      if (prName.length) {
        cmdFilter = `"IMAGENAME eq ${prName}"`;
      }

      if (Number(PID)) {
        cmdFilter = `"PID eq ${PID}"`;
      }

      if (status.length) {
        cmdFilter += ` /FI "Status eq ${status}"`;
      }

      // 'tasklist' command list all running tasks on WIN OS.
      exec(`tasklist /FO CSV /V /FI ${cmdFilter}`, (_err, stdout) => {
        if (stdout.indexOf('No tasks') > 0) {
          return resolve(result);
        }

        const prList = stdout.split('\n');
        // Takes the header row. The shift() method removes the first element from an array and
        // returns that removed element.
        // Then remove ", space, new line (\r)
        const header = prList.shift().split(',').map(v => v.replace(/"| |\r/g, ''));

        if (returnAll) {
          const allProcResult = [];

          // eslint-disable-next-line consistent-return, array-callback-return
          prList.forEach((val) => {
            if (val.length) {
              const rowData = {};
              // Remove ", new line (\r)
              const rowValues = val.split(',').map(v => v.replace(/"|\r/g, ''));
              // eslint-disable-next-line no-return-assign
              header.forEach((key, idx) => {
                rowData[key] = rowValues[idx];
              });

              allProcResult.push(rowData);
            }
          });

          return resolve(allProcResult);
        }

        // take first row data and remove ", new line (\r)
        const rowValues = prList.shift().split(',').map(v => v.replace(/"|\r/g, ''));
        // eslint-disable-next-line no-return-assign
        header.forEach((key, idx) => result[key] = rowValues[idx]);

        return resolve(result);
      });
    }));
  }
}

module.exports = {
  ProcessManager, getDate, timeout, hasProperty, readFile,
};
