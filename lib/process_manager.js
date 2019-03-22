/* eslint-disable no-console */
const { spawn, exec } = require('child_process');
const { getDate, timeout } = require('../helper/helper');

/**
 * Process manager module only for Windows enviroment.
 * @since 2019.03.21
 */
class ProcessManager {
  constructor() {
    this.processBinaryPath = '';
    this.processName = '';
    this.killedProcessInfo = [];
    this.processKilled = false;
  }

  /**
   * Keep process running. This function starts setInterval method to check process
   * status on every `params.interval` sec and restarts process if status is `Not Responging`
   * `params.notRespondingCheckLimit` times.
   *
   * @param {Object} params
   *
   * `params.binaryPath` - Required, {String}, full path to executable binary.
   * `params.prName` - Required, {String}, process name like `node.exe`.
   * `params.interval` - {Nunmber}, default is 30000 ms. Interval time to check process status.
   *
   * `params.notRespondingCheckLimit` - Optional, default is 4. How many times to check before
      killing `Not Responding` process.
   * @returns {void}
   * @throws {Error}
   * @author Eignart
   * @since 2019.03.21
   */
  async keepRunning({
    binaryPath = '',
    prName = '',
    interval = 30000,
    notRespondingCheckLimit = 4,
  } = {}) {
    if (prName === '') {
      throw new Error('Missing required parameter "prName" (process name).');
    }

    if (binaryPath === '') {
      throw new Error('Missing required parameter "binaryPath" (process binary path).');
    }

    this.processBinaryPath = binaryPath;
    this.processName = prName;
    let notRespondingCnt = 0;

    setInterval(async () => {
      const prInfo = await this.getProcessInfo({
        status: 'Not Responding',
      });

      if (prInfo.PID) {
        console.log(`[${getDate()}] (PManager) ${this.processName} not responding.`);
        notRespondingCnt += 1;
      } else {
        notRespondingCnt = 0;
      }

      // if the process does not responding to long then kill this process
      if (prInfo.PID && notRespondingCnt === notRespondingCheckLimit) {
        notRespondingCnt = 0;
        this.processKilled = true;
        this.killedProcessInfo = await this.getProcessInfo({
          returnAll: true,
        });

        console.log(`[${getDate()}] (PManager) Kill process ${prInfo.PID}`);

        try {
          process.kill(prInfo.PID);
          console.log(`[${getDate()}] (PManager) Process killed`);

          // just in case wait 10 sec and then start it again
          await timeout(10000);
          this.startProcess();
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
  async startProcess() {
    console.log(`[${getDate()}] (PManager) Start ${this.processName} process.`);

    // Start process, this is child process
    // On Windows, setting options.detached to true makes it possible for the child process to
    // continue running after the parent exits.
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    await spawn(this.processBinaryPath, { detached: true });
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
   * @param {Object} params Optional parameters.
    `

    'params.prName' - Required, {String}, Process name like `node.exe`.
    'params.PID' - Optional, {Number}, Process ID, set this to get process info via PID. IF both
      (PID and prName) is defined then PID will be used to get process info.
    'params.status' - Optional, {String}, default is empty. Possible values: `Unknown`, `Running`,
     `Not Responding`. For example, if you set this 'Not Responding' and process status is `Running`
      then result will be empty, that means `Not Responding` process not found.
    'params.returnAll' - Optional, {Boolean}, default is false, if true and only `param.prName` is
      defined then it returns all found processes info as array where every array element is result
      object. In this case result object does not have "isExist" function.
    `
   *
   * @returns {Object|Array}
   * @throws {Error}
   * @author Eignart
   * @since 2019.03.07
   */
  // eslint-disable-next-line class-methods-use-this
  async getProcessInfo({
    prName = '',
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

module.exports = ProcessManager;
