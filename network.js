const { google, drive_v3 } = require('googleapis');
const credentials = require('./credentials.json').web;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.resource'];

const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, "http://localhost:3000/oauth2callback");

exports.authorize = async function (req, res) {
    const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        scope: SCOPES,
        // Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes: true
    });
    res.send(JSON.stringify({ url: authorizationUrl }));
}

exports.handleOAuthCallback = async function (req, res) {
    console.log(req.query.code);
    let { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    setup(oauth2Client).then(() => {
        res.redirect('/');
    });
}

var drive;
exports.homeFolderId;
exports.isRunning = false;
async function setup(authClient) {
    drive = google.drive({ version: 'v3', auth: authClient });
    exports.homeFolderId = await getFolderId();
    exports.isRunning = true;
    console.log(exports.homeFolderId, exports.isRunning);
}

/**
 * @param {drive_v3.Drive} drive 
 * @returns file ID of the WebNotes folder
*/
async function getFolderId() {
    const res = await drive.files.list({
        q: 'mimeType=\'application/vnd.google-apps.folder\' and name = \'WebNotes\' and trashed=false',
        fields: 'files(id)',
        spaces: 'drive',
    });
    if (res.data.files[0]) {
        return res.data.files[0].id;
    }
    else {
        const fileMetadata = {
            name: 'WebNotes',
            mimeType: 'application/vnd.google-apps.folder',
        };
        try {
            const file = await drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            return file.data.id;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }
}

/**
 * @param {drive_v3.Drive} drive A drive object
 * @param {String} parentId The file ID of the parent folder of the file to be created
 * @param {String} folderName The name of the file to be created
 * @returns The file ID the created file
 */
exports.createFolder = async function (parentId, folderName) {
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    try {
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        return folder.data.id;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * @param {*} drive A drive object
 * @param {*} folderId The file ID of the folder to be deleted
*/
exports.deleteFolder = async function (folderId) {
    try {
        await drive.files.update({
            fileId: folderId,
            resource: {
                trashed: true
            }
        });
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * @param {*} drive A drive object
 * @param {*} folderId The file ID of the folder to be recovered
*/
exports.recoverFolder = async function (folderId) {
    try {
        await drive.files.update({
            fileId: folderId,
            resource: {
                trashed: false
            }
        });
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * @param {drive_v3.Drive} drive A drive object
 * @param {String} folderId The folder to search for files in
 * @returns An array of files and their ids in the specified folder
 */
exports.getFiles = async function (folderId = exports.homeFolderId) {
    try {
        const res = await drive.files.list({
            q: '\'' + folderId + '\' in parents and trashed=false',
            fields: 'nextPageToken, files(id, name, mimeType)',
        });
        return res.data.files;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

exports.getFileMetadata = async function (fileId) {
    try {
        const res = await drive.files.get({
            fileId: fileId,
            fields: "name, parents"
        });
        return res.data;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * @param {drive_v3.Drive} drive A drive object
 * @param {String} folderId The file ID of the parent folder of the file to be created
 * @param {String} fileName The name of the file to be created
 * @param {String} fileContent The contents of the file to be created
 * @returns The file ID the created file
 */
exports.createFile = async function (folderId, fileName) {
    var fileMetadata = {
        name: fileName,
        parents: [folderId],
        mimeType: 'text/plain'
    };
    try {
        const res = await drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });
        return res.data.id;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * 
 * @param {drive_v3.Drive} drive A drive object
 * @param {String} fileId The file to fetch the contents from
 */
exports.getFile = async function (fileId) {
    try {
        const res = await drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return {
            metadata: await exports.getFileMetadata(fileId),
            data: res.data
        };
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * 
 * @param {*} drive A drive object
 * @param {*} fileId The file ID of the file to be updated
 * @param {*} fileContent The updated contents of the file
 */
exports.updateFile = async function (fileId, fileName, fileContent) {
    var data = {
        mimeType: 'text/plain',
        body: fileContent
    };
    try {
        await drive.files.update({
            fileId: fileId,
            resource: { name: fileName },
            media: data
        });
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * 
 * @param {drive_v3.Drive} drive A drive object
 * @param {String} fileId The file ID of the file to be moved
 * @param {String} newFolderId The file ID of the folder that the file is to be moved to
 */
exports.moveFile = async function (fileId, newFolderId) {
    try {
        await drive.files.update({
            fileId: fileId,
            resource: {
                parents: [newFolderId]
            }
        });
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * 
 * @param {*} drive A drive object
 * @param {*} fileId The file ID of the file to be deleted
 */
exports.deleteFile = async function (fileId) {
    try {
        await drive.files.update({
            fileId: fileId,
            resource: {
                trashed: true
            }
        });
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

/**
 * 
 * @param {*} drive A drive object
 * @param {*} fileId The file ID of the file to be recovered
 */
exports.recoverFile = async function (fileId) {
    try {
        await drive.files.update({
            fileId: fileId,
            resource: {
                trashed: false
            }
        });
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}
