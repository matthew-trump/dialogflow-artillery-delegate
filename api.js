const express = require('express');
const router = express.Router();

const { artilleryDelegate } = require("./artillery-delegate");

router.get('/', (req, res, next) => {
    res.json({ message: "OK" });
});
router.put('/', (req, res, next) => {
    res.json({ message: "OK" });
});
router.post('/', (req, res, next) => {
    artilleryDelegate.deepPing(req, res)
        .then((result) => {
            res.json(result)
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});
router.put('/download/:projectId/:scriptId', (req, res, next) => {
    const projectId = req.params.projectId;
    const scriptId = req.params.scriptId;
    artilleryDelegate.downloadYaml(projectId, scriptId)
        .then((result) => {
            res.json(result)
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});
router.post('/execute/:projectId/:scriptId', (req, res, next) => {
    const yamlRequest = {
        projectId: req.params.projectId,  //sanitize this!!
        scriptId: req.params.scriptId,   //sanitize this!!
        time: req.query.time,
        target: req.query.target,
        ipAddress: req.query.ipAddress
    }
    artilleryDelegate.executeYaml(yamlRequest)
        .then((result) => {
            res.json(result);
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});
router.get('/output/:projectId', (req, res, next) => {
    const projectId = req.params.projectId;
    artilleryDelegate.listOutput(projectId)
        .then((result) => {
            res.json(result);
        })
        .catch((err) => {
            res.status(400).json(err);
        })
});
router.post('/output/:projectId/:scriptId', (req, res, next) => {
    const projectId = req.params.projectId;
    const scriptId = req.params.scriptId;
    const time = req.query.time;
    artilleryDelegate.uploadOutput(projectId, scriptId, time)
        .then((result) => {
            res.json(result);
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});

module.exports = router;