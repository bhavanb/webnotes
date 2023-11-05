
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const app = express();
const PORT = 3000;

const { google } = require('googleapis');
const uuid = require('uuid').v4;
const https = require('https');
const DriveManager = require('./driveManager');
const credentials = require('./credentials_isolated.json').web;

const clientURL = "http://localhost:5500";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());
// app.use(express.static("public"));

const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, clientURL);
var driveManagers = new Map();
const serverStartTime = Date.now()
app.listen(PORT, async function (error) {
    if (!error) {
        console.log("Server is Successfully Running, and App is listening on port " + PORT);
    }
    else {
        console.log("Error occurred, server can't start", error);
    }
});


app.post('/interface/', async (req, res) => {
    let data = req.body;
    console.log(data);
    // console.log(data["title"]);
    if (!(data["title"] == "login" || data["title"] == "restore" || data["title"] == "code") && data["uuid"] == null) {
        res.send(JSON.stringify({ error: "Not Signed in" }))
        return;
    }

    switch (data["title"]) {
        case "code":
            console.log(data["code"]);
            var uId = uuid();
            driveManagers.set(uId, new DriveManager());
            await driveManagers.get(uId).setup(data["code"]);
            console.log(uId);
            res.send(JSON.stringify({ uuid: uId }));
            break;

        case "restore":
            console.log("attempt session restore");
            console.log("authTime: " + data["authTime"]);
            console.log("startTime: " + serverStartTime);
            if (data["authTime"] < serverStartTime)
                authorize(req, res);
            else
                res.send(JSON.stringify({ uuid: "valid" }));
            console.log(req.cookies);
            return;
        case "login":
            console.log("login");
            authorize(req, res);
            break;
        case "logout":
            console.log("logout");
            logout(data["uuid"], req, res);
            break;
        case "request":
            if (data["type"] === "list") {
                console.log('Received request: ' + (data["folderId"] || driveManagers.get(data["uuid"]).homeFolderId));
                readListofContents(res, data["uuid"], data["folderId"]);
            }
            else if (data["type"] == "note") {
                console.log('Received request: ' + data["fileId"]);
                readNote(res, data["uuid"], data["fileId"]);
            }
            break;

        case "create":
            console.log('Received create: ' + data["name"]);

            if (data["type"] === "note") {
                createNote(res, data["uuid"], data["parent"], data["name"]);
            }
            else if (data["type"] == "folder") {
                createFolder(res, data["uuid"], data["parent"], data["name"]);
            }
            break;

        case "update":
            console.log('Received update: ' + data["name"]);
            updateNote(res, data["uuid"], data["fileId"], data["name"], data["data"]);
            break;

        case "delete":
            if (data["type"] === "note") {
                console.log('Received delete: ' + data["fileId"]);
                deleteNote(res, data["uuid"], data["fileId"]);
            }
            else if (data["type"] == "folder") {
                console.log('Received delete: ' + data["folderId"]);
                deleteFolder(res, data["uuid"], data["folderId"]);
            }
            break;

        default:
            break;
    }
});

async function authorize(req, res) {
    const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file'],
        // Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes: true
    });
    res.send(JSON.stringify({ url: authorizationUrl }));
}

async function logout(uuid, req, res) {
    let postData = "token=" + driveManagers.get(uuid).authClient.credentials.access_token;
    // fetch("http://oauth2.googleapis.com/revoke", {

    //     // Adding method type
    //     method: "POST",

    //     // Adding body or contents to send
    //     body: postData,
    //     // Adding headers to the request
    //     headers: {
    //         "Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
    //     }
    // }).then(res => res.json()).then((json) => {
    //     console.log("logout " + uuid);
    //     driveManagers.delete(uuid);
    //     console.log(json);
    // });

    //Options for POST request to Google's OAuth 2.0 server to revoke a token
    let postOptions = {
        host: 'oauth2.googleapis.com',
        port: '443',
        path: '/revoke',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    // Set up the request
    const postReq = https.request(postOptions, function (res) {
        res.setEncoding('utf8');
        res.on('data', d => {
            console.log('Response: ' + d);
        });
    });

    postReq.on('error', error => {
        console.log(error)
    });

    // Post the request with data
    postReq.write(postData);
    postReq.end();
    console.log("logout " + uuid);
    res.clearCookie("uuid");
    res.send(JSON.stringify({ url: clientURL }));
    driveManagers.delete(uuid);
}

async function readListofContents(res, uuid, folderId = driveManagers.get(uuid).homeFolderId) {
    var data = await driveManagers.get(uuid).getFileMetadata(folderId);
    var parentData = await driveManagers.get(uuid).getFileMetadata(data.parents[0]);
    res.send(JSON.stringify({
        name: data.name,
        data: await driveManagers.get(uuid).getFiles(folderId),
        parent: (folderId == driveManagers.get(uuid).homeFolderId) ? { id: driveManagers.get(uuid).homeFolderId, name: 'WebNotes' } : { id: data.parents[0], name: parentData.name },
        isHomeFolder: (folderId == driveManagers.get(uuid).homeFolderId)
    }));
}

async function readNote(res, uuid, fileId) {
    var data = await driveManagers.get(uuid).getFile(fileId);
    res.send(JSON.stringify(data));
}

async function createNote(res, uuid, folderId, name) {
    try {
        res.send(JSON.stringify({
            id: await driveManagers.get(uuid).createFile(folderId, name)
        }));
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function updateNote(res, uuid, fileId, name, data) {
    try {
        await driveManagers.get(uuid).updateFile(fileId, name, data);
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function deleteNote(res, uuid, fileId) {
    try {
        await driveManagers.get(uuid).deleteFile(fileId);
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function createFolder(res, uuid, folderId, name) {
    try {
        res.send(JSON.stringify({
            id: await driveManagers.get(uuid).createFolder(folderId, name)
        }));
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

async function deleteFolder(res, uuid, folderId) {
    try {
        await driveManagers.get(uuid).deleteFile(folderId);
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}