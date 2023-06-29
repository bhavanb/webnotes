
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static("public"));

app.listen(PORT, (error) => {
    if (!error) {
        console.log("Server is Successfully Running, and App is listening on port " + PORT);
    }
    else {
        console.log("Error occurred, server can't start", error);
    }
});

app.post('/interface/', (req, res) => {
    let data = req.body;

    switch (data["title"]) {
        case "request":
            console.log('Received request: ' + data["type"]);

            if (data["type"] === "list") {
                readListofContents(res, data["path"]);
            }
            else if (data["type"] == "note") {
                readNote(res, data["name"]);
            }
            break;

        case "create":
            console.log('Received create: ' + data["name"]);

            if (data["type"] === "note") {
                createNote(res, data["path"], data["name"]);
            }
            else if (data["type"] == "folder") {
                createFolder(res, data["path"], data["name"]);
            }
            break;

        case "update":
            console.log('Received update: ' + data["name_old"]);
            updateNote(res, data);
            break;

        case "delete":
            console.log('Received delete: ' + data["name"]);
            if (data["type"] === "note") {
                deleteNote(res, data["name"]);
            }
            else if (data["type"] == "folder") {
                deleteFolder(res, data["name"]);
            }
            break;

        default:
            break;
    }
});

function readListofContents(res, path = "") {
    var readdir = path || "./notes/";
    readdir = readdir.replace(/\/+/g, "/");
    fs.readdir(readdir, (err, files) => {
        if (!err) {
            let list = [];
            files.forEach((name) => {
                if (name === ".gitignore") { return; }
                var fpath = (readdir[readdir.length - 1] == '/') ? readdir + name : readdir + "/" + name;
                list.push({
                    name: fpath,
                    type: (fs.lstatSync(fpath).isFile()) ? "note" : "folder"
                });
            });

            list = list.filter(item => item.type === "folder").concat(list.filter(item => item.type === "note"));
            console.log("- Read", list);
            res.send(JSON.stringify({
                data: list,
                path: readdir
            }));
        }
        else {
            console.error(err);
            res.status(500).send();
        }
    });
}

function readNote(res, name) {
    const src = fs.createReadStream(name);
    src.on("error", function (err) {
        console.error(err);
        res.status(404).send();
    });
    console.log("- Read", name);
    src.pipe(res);
}

function createNote(res, path, name) {
    fs.writeFile(path + name, "", (err) => {
        if (!err) {
            console.log("- Created", path + name);
            res.status(200).send();
        }
        else {
            console.error(err);
            res.status(500).send();
        }
    });
}

var buffer = "";

function updateNote(res, data) {
    if (!data["isLastChunk"]) {
        buffer += data["data"];
        res.status(200).send();
        return;
    }

    var oldpath = data["name_old"];
    var path = data["name"];

    if (oldpath != path) {
        fs.unlink(oldpath, function (err) {
            if (!err) {
                console.log("- Removed", oldpath);
            }
            else {
                console.error(err);
            }
        });
    }

    fs.writeFile(path, (buffer.length == 0) ? data["data"] : buffer, function (err) {
        if (!err) {
            console.log("- Updated as", path);
            res.status(200).send();
        }
        else {
            console.error(err);
            res.status(500).send()
        }
    });
    buffer = "";
}

function deleteNote(res, name) {
    fs.unlink(name, function (err) {
        if (!err) {
            console.log("- Deleted", name);
            res.status(200).send();
        }
        else {
            console.error(err);
            res.status(500).send();
        }
    });
}

function createFolder(res, path, name) {
    fs.mkdir(path + name, (err) => {
        if (!err) {
            console.log("- Created Folder", path);
            res.send(JSON.stringify({
                data: "success"
            }));
        }
        else {
            console.error(err);
            res.send(JSON.stringify({
                data: "error"
            }));
        }
    });
}

function deleteFolder(res, name) {
    fs.rm(name, { recursive: true, force: true }, function (err) {
        if (!err) {
            console.log("- Deleted", name);
            res.send(JSON.stringify({
                data: "success"
            }));
        }
        else {
            console.error(err);
            res.send(JSON.stringify({
                data: "error"
            }));
        }
    });
}