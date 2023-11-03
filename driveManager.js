const { google } = require('googleapis');
const credentials = require('./credentials.json').web;

module.exports = class DriveManager {
    async setup(code) {
        console.log("New DriveManager!");
        this.authClient = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, "http://localhost:3000/oauth2callback");
        var { tokens } = await this.authClient.getToken(code)
        this.authClient.setCredentials(tokens);
        this.drive = google.drive({ version: 'v3', auth: this.authClient });
        this.homeFolderId = await this.getFolderId();
        console.log("ac: " + this.authClient);
    }
    async getFolderId() {
        const res = await this.drive.files.list({
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
                const file = await this.drive.files.create({
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

    async createFolder(parentId, folderName) {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };
        try {
            const folder = await this.drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            return folder.data.id;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    async deleteFolder(folderId) {
        try {
            await this.drive.files.update({
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

    async recoverFolder(folderId) {
        try {
            await this.drive.files.update({
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

    async getFiles(folderId = this.homeFolderId) {
        try {
            const res = await this.drive.files.list({
                q: '\'' + folderId + '\' in parents and trashed=false',
                fields: 'nextPageToken, files(id, name, mimeType)',
            });
            return res.data.files;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    async getFileMetadata(fileId) {
        try {
            const res = await this.drive.files.get({
                fileId: fileId,
                fields: "name, parents"
            });
            return res.data;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    async createFile(folderId, fileName) {
        var fileMetadata = {
            name: fileName,
            parents: [folderId],
            mimeType: 'text/plain'
        };
        try {
            const res = await this.drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });
            return res.data.id;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    async getFile(fileId) {
        try {
            const res = await this.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });
            return {
                metadata: await this.getFileMetadata(fileId),
                data: res.data
            };
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    async updateFile(fileId, fileName, fileContent) {
        var data = {
            mimeType: 'text/plain',
            body: fileContent
        };
        try {
            await this.drive.files.update({
                fileId: fileId,
                resource: { name: fileName },
                media: data
            });
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    async moveFile(fileId, newFolderId) {
        try {
            await this.drive.files.update({
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

    async deleteFile(fileId) {
        try {
            await this.drive.files.update({
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

    async recoverFile(fileId) {
        try {
            await this.drive.files.update({
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
}