# Process Manager
NodeJS process monitoring module for Windows enviroment to keep process running. If process does not 
respond certain time period then it will be killed and started again.

### Usage
Install it via npm

```shell
$ npm i @singularitycreations/process-manager
```

```js
const ProcessManager = require('@singularitycreations/process-manager');

(async () => {
    try {        
        const pm = new ProcessManager({
            binaryPath: 'C:\\path\\to\\app.exe',
            prName: 'app.exe',
        });
        
        await pm.keepRunning();
        // your code
    } catch (error) {
        console.log(error.toString());
    }    
})();

```
