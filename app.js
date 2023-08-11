
const express = require('express');
const bodyParser = require('body-parser');
const network = require('./network')
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));

app.listen(PORT, async function (error) {
    if (!error) {
        console.log("Server is Successfully Running, and App is listening on port " + PORT);
        // await network.setup();
    }
    else {
        console.log("Error occurred, server can't start", error);
    }
});

// app.get('/authentication', network.authorize);
app.get('/oauth2callback', network.handleOAuthCallback);

app.post('/interface/', (req, res) => {
    let data = req.body;

    if (!(network.isRunning) && data["title"] != "login") {
        // console.log("sending to auth");
        // network.authorize(req, res);
        res.send(JSON.stringify({ error: "Not Signed in" }))
        return;
    }

    switch (data["title"]) {
        case "login":
            console.log("login");
            network.authorize(req, res);
            break;
        case "request":

            if (data["type"] === "list") {
                console.log('Received request: ' + (data["folderId"] || network.homeFolderId));
                readListofContents(res, data["folderId"]);
            }
            else if (data["type"] == "note") {
                console.log('Received request: ' + data["fileId"]);
                readNote(res, data["fileId"]);
            }
            break;

        case "create":
            console.log('Received create: ' + data["name"]);

            if (data["type"] === "note") {
                createNote(res, data["parent"], data["name"]);
            }
            else if (data["type"] == "folder") {
                createFolder(res, data["parent"], data["name"]);
            }
            break;

        case "update":
            console.log('Received update: ' + data["name"]);
            updateNote(res, data["fileId"], data["name"], data["data"]);
            break;

        case "delete":
            if (data["type"] === "note") {
                console.log('Received delete: ' + data["fileId"]);
                deleteNote(res, data["fileId"]);
            }
            else if (data["type"] == "folder") {
                console.log('Received delete: ' + data["folderId"]);
                deleteFolder(res, data["folderId"]);
            }
            break;

        default:
            break;
    }
});

async function readListofContents(res, folderId = network.homeFolderId) {
    var data = await network.getFileMetadata(folderId);
    var parentData = await network.getFileMetadata(data.parents[0]);
    res.send(JSON.stringify({
        name: data.name,
        data: await network.getFiles(folderId),
        parent: (folderId == network.homeFolderId) ? { id: network.homeFolderId, name: 'WebNotes' } : { id: data.parents[0], name: parentData.name },
        isHomeFolder: (folderId == network.homeFolderId)
    }));
}

async function readNote(res, fileId) {
    var data = await network.getFile(fileId);
    res.send(JSON.stringify(data));
}

async function createNote(res, folderId, name) {
    try {
        res.send(JSON.stringify({
            id: await network.createFile(folderId, name)
        }));
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function updateNote(res, fileId, name, data) {
    try {
        await network.updateFile(fileId, name, data);
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function deleteNote(res, fileId) {
    try {
        await network.deleteFile(fileId);
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function createFolder(res, folderId, name) {
    try {
        res.send(JSON.stringify({
            id: await network.createFolder(folderId, name)
        }));
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function deleteFolder(res, folderId) {
    try {
        await network.deleteFile(folderId);
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}