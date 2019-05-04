const fs = require('fs');
const http = require('http');
const exec = require('child_process').exec;

const ARTILLERY_PROVIDER_HOST = process.env.ARTILLERY_PROVIDER_HOST || "localhost";
const ARTILLERY_PROVIDER_PORT = process.env.ARTILLERY_PROVIDER_PORT || 8081;
const PING_PATH = '/dialogflow';
const ARTILLERY_YAML_DOWNLOAD_PATH = '/dialogflow/artillery/yaml/';
const ARTILLERY_OUTPUT_PATH = '/dialogflow/artillery/output/';
const SCRIPTS_PATH = process.env.SCRIPTS_PATH || './scripts/';
const OUTPUT_PATH = process.env.OUTPUT_PATH || './output/';
const TEST_PREFIX = process.env.TEST_PREFIX || 'TEST-';;
const CONVERSATION_IDS_FILE = process.env.CONVERSATION_IDS_FILE || "/conversation-ids.csv";


class ArtilleryDelegate {

    deepPing() {
        return new Promise((resolve, reject) => {
            const host = ARTILLERY_PROVIDER_HOST;
            const port = ARTILLERY_PROVIDER_PORT;
            const path = PING_PATH;

            const post_req = http.request({
                host: host,
                port: port,
                path: path,
                method: 'GET'
            }, function (res) {

                var responseString = "";
                res.setEncoding('utf8');

                res.on("data", function (data) {
                    responseString += data;
                });
                res.on('error', function (err) {
                    reject({
                        error: "Unable to contact Artillery provider at " + host + ":" + port
                    });
                });
                res.on("end", function () {
                    try {
                        const response = JSON.parse(responseString);
                        resolve({ message: "OK", dialogflow: response });
                    } catch (err) {
                        resolve({ message: "OK", dialogflow: { message: responseString } });
                    }
                });
            });
            post_req.on('error', (error) => {
                const message = "Unable ping artillery provider at at " + host + ":" + port;
                console.log("ERROR " + message, error)
                resolve({ message: "OK", dialogflow: { message: message } });
            })
            post_req.end();
        })
    }

    downloadYaml(projectId, scriptId) {

        return new Promise((resolve, reject) => {

            const host = ARTILLERY_PROVIDER_HOST;
            const port = ARTILLERY_PROVIDER_PORT;

            const path = ARTILLERY_YAML_DOWNLOAD_PATH + projectId + '/' + scriptId;

            const post_req = http.request({
                host: host,
                port: port,
                path: path,
                method: 'GET'
            }, function (res) {

                var responseString = "";
                res.setEncoding('utf8');

                res.on("data", function (data) {
                    responseString += data;
                });
                res.on('error', function (err) {
                    reject({ error: "Unable to contact Artillery provider at " + host + ":" + port })
                });
                res.on("end", function () {

                    const yaml = responseString;

                    this.writeYaml(yaml, projectId, scriptId);
                    this.writeConversationIds(projectId, 100);

                    resolve({ message: "OK-1" })
                });
            });
            post_req.on('error', (error) => {
                const message = "Error contacting Artillery Provider at " + host + ":" + port;
                console.log("ERROR " + message, error);
                reject({ error: message })
            })
            post_req.end();

        })

    }
    writeYaml(yaml, projectId, scriptId) {
        const dir = SCRIPTS_PATH + projectId;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        const filepath = dir + "/" + scriptId + ".yml";
        fs.writeFileSync(filepath, yaml)
    }
    writeConversationIds = function (projectId, number) {
        const ids = [];
        for (let i = 0; i < number; i++) {
            ids.push(TEST_PREFIX + this.getRandomString());
        }
        const output = ids.join("\n");
        const dir = SCRIPTS_PATH + projectId;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        const filepath = dir + CONVERSATION_IDS_FILE;
        fs.writeFileSync(filepath, output)
    }
    getRandomString() {
        return Math.random().toString(36).substring(7);
    }

    executeYaml(yamlRequest) {

        return new Promise((resolve, reject) => {

            const projectId = yamlRequest.projectId;  //sanitize this!!
            const scriptId = yamlRequest.scriptId;   //sanitize this!!
            const time = yamlRequest.time;        //sanitize this!!
            const target = yamlRequest.target;      //sanitize this!!
            const ipAddress = yamlRequest.ipAddress;

            const filepath = this.getYamlPath(projectId, scriptId);
            const dir = OUTPUT_PATH + projectId;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            const fileprefix = dir + '/' + scriptId + '-' + time;
            const outputPath = fileprefix + '.out';
            const metaPath = fileprefix + '.json';

            const output = {
                delegateId: process.env.DELEGATE_ID,
                ipAddress,
                projectId,
                scriptId,
                time,
                target,
                outputPath,
                metaPath
            }

            let scripttext = 'artillery run ' + filepath + ' --output ' + outputPath;
            if (target) {
                scripttext = scripttext + ' --target ' + target;
            }
            exec(scripttext,
                (error, stdout, stderr) => {
                    const now = (new Date()).getTime();
                    output.completed = now;
                    console.log(`${stdout}`);
                    console.log(`${stderr}`);
                    if (error !== null) {
                        console.log(`exec error: ${error}`);
                    }
                    fs.writeFileSync(metaPath, JSON.stringify(output), 'utf-8');

                    //uploadResults(projectId,scriptId,output,outputPath);
                });
            resolve({ message: "OK-EXECUTE", output });

        })
    }
    getYamlPath = function (projectId, scriptId) {
        const dir = SCRIPTS_PATH + projectId;
        const filepath = dir + "/" + scriptId + ".yml";
        return filepath;
    }
    listOutput(projectId) {

        return new Promise((resolve, reject) => {
            const path = OUTPUT_PATH + projectId;
            if (!fs.existsSync(path)) {
                resolve({ output: [] });
            } else {
                let output = [];
                fs.readdir(path, function (err, items) {

                    if (err) {
                        console.log(err);
                        reject({ error: err });
                    }
                    if (items) {
                        items.filter(item => {
                            return item.endsWith('.json');
                        })
                            .map((filename) => {
                                const object = require(path + "/" + filename);
                                output.push(object);
                            });
                        resolve({ output: output });
                    } else {
                        resolve({ output: [] });
                    }

                });
            }
        })

    }

    uploadOutput(projectId, scriptId, time) {
        return new Promise((resolve, reject) => {

            const host = ARTILLERY_PROVIDER_HOS;
            const port = ARTILLERY_PROVIDER_PORT;
            const path = ARTILLERY_OUTPUT_PATH + projectId + '/' + scriptId;

            const fileprefix = OUTPUT_PATH + projectId + '/' + scriptId + '-' + time;
            const outputPath = fileprefix + '.out';
            const metaPath = fileprefix + ".json";
            const exec = fs.readFileSync(outputPath, 'utf-8');
            const meta = require(metaPath);

            const post_obj = {
                meta: meta,
                exec: exec
            }
            const post_data = JSON.stringify(post_obj)
            const post_req = http.request({
                host: host,
                port: port,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data)
                }
            }, function (res) {
                res.setEncoding('utf8');
                let responseString = "";
                res.on("data", function (data) {
                    responseString += data;
                });
                res.on('error', function (err) {
                    reject({
                        error: "Unable to contact Artillery provider at " + host + ":" + port
                    });
                });
                res.on("end", function () {

                    meta.uploaded = (new Date()).getTime();
                    console.log("UPLOADED", meta);
                    fs.writeFile(metaPath, JSON.stringify(meta), 'utf-8', (err) => {
                        if (err) {
                            reject({
                                error: "Unable to contact Artillery provider at " + host + ":" + port
                            });
                        } else {
                            console.log("WROTE UPDATED", metaPath);
                            resolve({ uploaded: meta.uploaded })
                        }
                    });
                });
            });
            post_req.on('error', (error) => {
                const message = "Error uploading to Artillery provider " + host + ":" + port
                console.log("ERROR " + message, error)
                reject({ error: error });
            })
            post_req.write(post_data);
            post_req.end();

        })

    }
}

module.exports = { artilleryDelegate: new ArtilleryDelegate() }