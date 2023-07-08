const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google, drive_v3 } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.resource'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * @param {drive_v3.Drive} drive 
 * @returns file ID of the WebNotes folder
*/
async function getFolderId(drive) {
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
async function createFolder(drive, parentId, folderName) {
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
 * 
 * @param {*} drive A drive object
 * @param {*} folderId The file ID of the folder to be deleted
*/
async function deleteFolder(drive, folderId) {
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
 * 
 * @param {*} drive A drive object
 * @param {*} folderId The file ID of the folder to be recovered
*/
async function recoverFolder(drive, folderId) {
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
async function listFiles(drive, folderId) {
    try {
        const res = await drive.files.list({
            q: '\'' + folderId + '\' in parents and trashed=false',
            fields: 'nextPageToken, files(id, name)',
        });
        return res.data.files;
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
async function createFile(drive, folderId, fileName, fileContent) {
    var fileMetadata = {
        name: fileName,
        parents: [folderId]
    };
    var data = {
        mimeType: 'text/plain',
        body: fileContent
    };
    try {
        const res = await drive.files.create({
            resource: fileMetadata,
            media: data,
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
async function getFile(drive, fileId) {
    try {
        const res = await drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return res.data;
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
async function updateFile(drive, fileId, fileContent) {
    var data = {
        mimeType: 'text/plain',
        body: fileContent
    };
    try {
        await drive.files.update({
            fileId: fileId,
            media: data,
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
async function moveFile(drive, fileId, newFolderId) {
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
async function deleteFile(drive, fileId) {
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
async function recoverFile(drive, fileId) {
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

async function main() {
    const authClient = await authorize();
    const drive = google.drive({ version: 'v3', auth: authClient });

    const folderId = await getFolderId(drive);
    console.log("gfId:", folderId);

    const fileId = await createFile(drive, folderId, "Test Note 1", "Hello World! This is a test note.");
    console.log("cfId:", fileId);

    let files = await listFiles(drive, folderId);
    console.log("fs:", files);

    var content = await getFile(drive, fileId);
    console.log("f:", content);

    await updateFile(drive, fileId, "Hello! This is the updated Test Note.");

    content = await getFile(drive, fileId);
    console.log("f:", content);

    await deleteFile(drive, fileId);

    // await recoverFile(drive, fileId);

    // const subfolderId = await createFolder(drive, folderId, "Test Folder 1");
    // await createFile(drive, subfolderId, "Test Note 2", "This is a test note within a subfolder!");
    // await deleteFolder(drive, subfolderId);
}

main();