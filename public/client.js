var UUID = "";

window.onload = async function () {

    const urlParams = new URLSearchParams(window.location.search);
    UUID = urlParams.get("uuid");
    if (UUID != null) {
        console.log(UUID);
        window.history.pushState({}, document.title, '/');
    }
    else {
        await attemptSessionRestore();
    }
    setOptionList();
    getContentList();

    var editor = document.getElementById("editor");
    editor.onfocus = () => {
        range = document.createRange();
        range.selectNodeContents(document.getElementById("editor"));
        range.collapse(false);
        selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editor.scrollTop = editor.scrollHeight;
    }

    const note = urlParams.get('note');
    if (note != null) {
        getNote(note);
    }
    await document.fonts.load("16px Inter").then(function () { hideLoader() }, function () { console.log("error loading fonts"); });
}

async function attemptSessionRestore() {
    console.log("attempt session restore");
    await fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: null,
            title: "restore"
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(response => response.json()).then((json) => {
        console.log("json: "+JSON.stringify(json));
        if (json["uuid"] != "error") {
            UUID = json["uuid"];
            console.log("restored session!");
            console.log(UUID);
        }
        else
            console.log("failed to restore session");
    });
}

var autosaveTimeout;

function update() {
    updateTheme();
    updateTitle();
    wordCount();
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout("autoSave()", 5000);
}

function updateTheme() {
    var editor = document.getElementById("editor");
    editor.querySelectorAll('*').forEach((elm) => {
        if (elm.classList != editor.classList) {
            elm.classList = editor.classList;
        }
    });
}

function wordCount() {
    var text = document.getElementById("editor").innerText;
    var count = 0;
    var lines = text.split('\n');
    let words = [];
    for (let index = 0; index < lines.length; index++) {
        words[index] = lines[index].split(' ');
    }
    words.forEach(element => {
        element.forEach(word => {
            if (word != '') {
                count++;
            }
        });
    });
    document.getElementById("wordcount").innerHTML = count + " word" + ((count == 1) ? "" : "s");
}

function updateTitle() {
    var head = document.getElementById("heading");
    if (head.value != '') {
        document.title = "WebNotes | " + head.value;
    }
    else {
        document.title = "WebNotes";
    }
}

function getSetTheme() {
    // Get the user's theme preference from local storage, if it's available
    const currentTheme = localStorage.getItem("theme");

    if (currentTheme) {
        setTheme(currentTheme);
    }
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {   //check users OS level theme preference
        setTheme("dark");
    }
    else {
        setTheme("light");
    }
}

function setTheme(theme) {
    var selector = document.getElementById("themeSelector");

    if (theme == "dark") {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
        document.body.querySelectorAll('*').forEach((elm) => {
            elm.classList.add("dark");
            elm.classList.remove("light");
        });
        selector.setAttribute("src", "assets/icon-light.svg");
        localStorage.setItem("theme", "dark");
    }
    else if (theme == "light") {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
        document.body.querySelectorAll('*').forEach((elm) => {
            elm.classList.add("light");
            elm.classList.remove("dark");
        });
        selector.setAttribute("src", "assets/icon-dark.svg");
        localStorage.setItem("theme", "light");
    }
}

function toggleTheme() {
    var theme = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(theme);
}

async function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    var main = document.getElementById("main");
    var splash = document.getElementById("splashScreen");
    var menu = document.getElementById("menu");
    if (!sidebarIsOpen()) {
        sidebar.style.width = "25%";
        main.style.marginLeft = "25%";
        splash.style.marginLeft = "25%";
        await sleep(200);
        sidebar.querySelectorAll('*').forEach((elm) => {
            elm.classList.remove("hidden");
        });
        menu.setAttribute("src", "assets/icon-close.svg");
    }
    else {
        sidebar.querySelectorAll('*').forEach((elm) => {
            elm.classList.add("hidden");
        });
        await sleep(200);
        sidebar.style.width = "0%"
        main.style.marginLeft = "0%";
        splash.style.marginLeft = "0%";
        menu.setAttribute("src", "assets/icon-menu.svg");
    }
}

function sidebarIsOpen() {
    return document.getElementById("sidebar").style.width == "25%"
}

function getContentList(folderId) {
    console.log(UUID);
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "request",
            type: "list",
            folderId: folderId
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(response => response.json()).then(async (json) => {
        if (!json["error"]) {
            setContentList(json["name"], json["parent"], json["data"], json["isHomeFolder"]);
            sessionStorage.setItem("folderId", folderId || json["parent"].id);
        }
        else {
            console.log(json);
            setNoAuthContentList();
        }
        getSetTheme();
    });
}

function setNoAuthContentList() {
    console.log("not signed in");
    var contentList = document.getElementById("contentList");
    contentList.querySelectorAll(".note").forEach((elem) => {
        elem.remove();
    });
    var empty = document.createElement("div");
    var emptyText = document.createElement("p");
    emptyText.innerText = "Sign in to access your notes.";
    emptyText.classList.add("inverse");
    emptyText.style.opacity = "0.75";
    empty.appendChild(emptyText);

    empty.classList = document.body.classList;
    empty.classList.add("note", "inverse");
    if (!sidebarIsOpen()) {
        empty.classList.add("hidden");
    }

    contentList.appendChild(empty);
}

function setContentList(name, parent, notes, isHomeFolder) {
    var contentList = document.getElementById("contentList");
    contentList.querySelectorAll(".note").forEach((elem) => {
        elem.remove();
    });
    if (!isHomeFolder) {
        var backButton = document.createElement("div");

        var backIcon = document.createElement("img");
        backIcon.src = "assets/icon-back.svg";
        backIcon.classList.add("icon");
        backIcon.setAttribute("draggable", "false");
        backButton.appendChild(backIcon);

        var backText = document.createElement("p");
        backText.innerText = name;
        backText.classList.add("inverse");
        backButton.appendChild(backText);

        var dirText = document.createElement("p");
        dirText.innerText = parent["name"].replace('WebNotes', 'Home');
        dirText.classList.add("inverse");
        dirText.classList.add("dull");
        dirText.style.display = "none";
        dirText.setAttribute("text", "");
        backButton.appendChild(dirText);

        backButton.onclick = function () {
            if (!window.getSelection().toString()) {
                getContentList(parent["id"]);
            }
        };
        backButton.classList = document.body.classList;
        backButton.classList.add("note", "inverse");
        backButton.style.userSelect = "none";
        if (!sidebarIsOpen) {
            backButton.classList.add("hidden");
        }

        backButton.onmouseenter = function () {
            var directoryText = this.querySelector("[text='']");
            directoryText.style.display = "inline-block";
        }

        backButton.onmouseleave = function () {
            var directoryText = this.querySelector("[text='']");
            directoryText.style.display = "none";
        }

        contentList.appendChild(backButton);
    }
    if (notes.length == 0) {
        var empty = document.createElement("div");
        var emptyText = document.createElement("p");
        emptyText.innerText = "You have no notes.";
        emptyText.classList.add("inverse");
        emptyText.style.opacity = "0.75";
        empty.appendChild(emptyText);

        empty.classList = document.body.classList;
        empty.classList.add("note", "inverse");
        if (!sidebarIsOpen()) {
            empty.classList.add("hidden");
        }

        contentList.appendChild(empty);
    }
    notes.forEach((elem) => {
        var entry = document.createElement("div");

        var name = (elem.name.length <= 18) ? elem.name : elem.name.substring(0, 15) + "...";

        var theme = document.body.classList[0];

        var entryIcon = document.createElement("img");
        entryIcon.src = `assets/icon-${(elem.mimeType == "text/plain") ? "note" : "folder"}.svg`;
        entryIcon.setAttribute("draggable", "false");
        entryIcon.classList.add("icon");
        entryIcon.classList.add(theme);
        entry.appendChild(entryIcon);

        var entryText = document.createElement("p");
        entryText.classList.add("inverse");
        entryText.classList.add(theme);
        entryText.innerText = name;
        entry.appendChild(entryText);

        var deleteIcon = document.createElement("img");
        deleteIcon.src = "assets/icon-delete.svg";
        deleteIcon.classList.add("icon");
        deleteIcon.classList.add("delete");
        deleteIcon.classList.add(theme);
        deleteIcon.style.display = "none";
        deleteIcon.onclick = function (e) {
            e.stopPropagation();
            (elem.mimeType == "text/plain") ? deleteNote(elem.id, elem.name) : deleteFolder(elem.id, elem.name);
        };
        entry.appendChild(deleteIcon);

        entry.onmouseenter = function () {
            var icon = this.querySelector(".delete");
            icon.style.display = "inline-block";
        }

        entry.onmouseleave = function () {
            var icon = this.querySelector(".delete");
            icon.style.display = "none";
        }

        entry.onclick = function () {
            if (!window.getSelection().toString()) {
                if ((elem.mimeType == "text/plain")) {
                    getNote(`${elem.id}`);
                }
                else {
                    getContentList(`${elem.id}`);
                }
            }
        };
        entry.classList = document.body.classList;
        entry.classList.add("note", "inverse");
        if (!sidebarIsOpen()) {
            entry.classList.add("hidden");
        }

        contentList.appendChild(entry);
    });
}

function setOptionList() {
    var optionList = document.getElementById("optionList");

    var newFolder = document.createElement("div");

    var newFolderIcon = document.createElement("img");
    newFolderIcon.src = "assets/icon-new-folder.svg"
    newFolderIcon.setAttribute("draggable", "false");
    newFolderIcon.classList.add("icon");
    newFolder.appendChild(newFolderIcon);

    var newFolderText = document.createElement("p");
    newFolderText.innerText = "New Folder";
    newFolderText.classList.add("inverse");
    newFolder.appendChild(newFolderText);

    newFolder.onclick = function () {
        if (!window.getSelection().toString()) {
            createFolder();
        }
    };
    newFolder.classList = document.body.classList;
    newFolder.classList.add("option", "inverse");
    if (!sidebarIsOpen) {
        newFolder.classList.add("hidden");
    }

    optionList.appendChild(newFolder);

    var newNote = document.createElement("div");

    var newNoteIcon = document.createElement("img");
    newNoteIcon.src = "assets/icon-new-note.svg"
    newNoteIcon.setAttribute("draggable", "false");
    newNoteIcon.classList.add("icon");
    newNote.appendChild(newNoteIcon);

    var newNoteText = document.createElement("p");
    newNoteText.innerText = "New Note";
    newNoteText.classList.add("inverse");
    newNote.appendChild(newNoteText);

    newNote.onclick = function () {
        if (!window.getSelection().toString()) {
            createNote();
        }
    };
    newNote.classList = document.body.classList;
    newNote.classList.add("option", "inverse");
    if (!sidebarIsOpen) {
        newNote.classList.add("hidden");
    }

    optionList.appendChild(newNote);

    var signInButton = document.createElement("div");

    var signInButtonIcon = document.createElement("img");
    signInButtonIcon.src = "assets/google-logo.svg"
    signInButtonIcon.setAttribute("draggable", "false");
    signInButtonIcon.classList.add("icon");
    signInButton.appendChild(signInButtonIcon);

    var signInButtonText = document.createElement("p");
    signInButtonText.innerText = (UUID == null) ? "Sign in" : "Sign out";
    signInButtonText.classList.add("inverse");
    signInButton.appendChild(signInButtonText);

    signInButton.onclick = function () {
        fetch("http://localhost:3000/interface/", {

            // Adding method type
            method: "POST",

            // Adding body or contents to send
            body: JSON.stringify({
                uuid: UUID,
                title: (UUID == null) ? "login" : "logout"
            }),
            // Adding headers to the request
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(res => res.json()).then((json) => {
            window.location.href = json.url;
        });
    };
    signInButton.classList = document.body.classList;
    signInButton.classList.add("option", "inverse");
    if (!sidebarIsOpen) {
        signInButton.classList.add("hidden");
    }

    optionList.appendChild(signInButton);
}

async function createNote() {
    var name = await prompt("Enter name of new note:");
    if (!name) { return; }
    var parentId = sessionStorage.getItem("folderId")
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "create",
            type: "note",
            parent: parentId,
            name: name
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(res => res.json()).then((json) => {
        if (json.id) {
            document.getElementById("statusIndicator").innerText = "Created " + name;
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.log("created " + name + " successfully");
            getNote(json.id);
            getContentList(parentId);
        }
        else {
            document.getElementById("statusIndicator").innerText = "Error! Could not create note";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.error("could not create note!");
        }
    });
}

function getNote(fileId) {
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "request",
            type: "note",
            fileId: fileId
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(res => res.json()).then((json) => {
        if (json["metadata"]) {
            openNote(json["metadata"].name, fileId, formatContent(json["data"]));
        }
        else {
            document.getElementById("statusIndicator").innerText = "Error! Could not get " + json["name"];
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.error("Error! Could not get " + json["name"]);
        }
    });
}

function openNote(name, fileId, data) {
    modifyUrl("Webnotes | " + name, "?note=" + fileId);
    sessionStorage.setItem("note-cache", JSON.stringify({
        name: name,
        data_hash: data.hashCode(),
        fileId: fileId
    }));
    var heading = document.getElementById("heading");
    var editor = document.getElementById("editor");
    heading.value = name;
    editor.innerHTML = data;
    if (document.getElementById("splashScreen")) {
        hideSplashscreen();
    }
    editor.focus();
    update();

}

function updateNote(name, fileId, data) {
    document.getElementById("statusIndicator").classList.remove("hidden");
    document.getElementById("statusIndicator").innerText = "Saving...";
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "update",
            fileId: fileId,
            name: name,
            data: data
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(res => {
        if (res.status == 200) {
            document.getElementById("statusIndicator").innerText = "Saved";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.log("updated note successfully");
        }
        else {
            document.getElementById("statusIndicator").innerText = "Error! Could not save note";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.error("could not update note!");
        }
    });
}

async function deleteNote(fileId, fileName) {
    if (!await confirm("Are you sure you want to delete '" + fileName + "'? This cannot be undone!")) { return; }
    modifyUrl("Webnotes", "");  //TODO:fix
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "delete",
            type: "note",
            fileId: fileId
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(res => {
        if (res.status == 200) {
            document.getElementById("statusIndicator").innerText = "Deleted note";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.log("deleted note successfully");
            showSplashscreen();
        }
        else {
            document.getElementById("statusIndicator").innerText = "Error! Could not delete note";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.error("could not delete note!");
        }
    });

    getContentList(sessionStorage.getItem("folderId"));
}

async function createFolder() {
    var name = await prompt("Enter name of new folder:");
    if (!name) { return; }
    var parentId = sessionStorage.getItem("folderId");
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "create",
            type: "folder",
            parent: parentId,
            name: name
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(res => res.json()).then((json) => {
        if (json.id) {
            document.getElementById("statusIndicator").innerText = "Created folder";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.log("created folder successfully");
            getContentList(json.id);
        }
        else {
            document.getElementById("statusIndicator").innerText = "Error! Could not create folder";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.error("could not create folder!");
        }
    });
}

async function deleteFolder(folderId, folderName) {
    if (!await confirm("Are you sure you want to delete '" + folderName + "'? Notes inside '" + folderName + "' will also be deleted!")) { return; }
    fetch("http://localhost:3000/interface/", {

        // Adding method type
        method: "POST",

        // Adding body or contents to send
        body: JSON.stringify({
            uuid: UUID,
            title: "delete",
            type: "folder",
            folderId: folderId
        }),

        // Adding headers to the request
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(res => {
        if (res.status == 200) {
            document.getElementById("statusIndicator").innerText = "Deleted folder";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.log("deleted folder successfully");
            getContentList(sessionStorage.getItem("folderId"));
            showSplashscreen();
        }
        else {
            document.getElementById("statusIndicator").innerText = "Error! Could not delete folder";
            setTimeout(() => { document.getElementById("statusIndicator").classList.add("hidden"); }, 1000);
            console.error("could not folder note!");
        }
    });
}

async function hideLoader() {
    await sleep(500);
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("all").style.opacity = 1;
    await sleep(500);
    document.getElementById("loader").remove();
}

async function showSplashscreen() {
    document.getElementById("splashScreen").style.zIndex = "2";
    document.getElementById("splashScreen").classList.remove("hidden");
    document.getElementById("content").classList.add("hidden");
    document.title = "WebNotes"
}

async function hideSplashscreen() {
    document.getElementById("splashScreen").classList.add("hidden");
    document.getElementById("content").classList.remove("hidden");
    document.getElementById("splashScreen").style.zIndex = "-1";
}

function autoSave() {
    var heading = document.getElementById("heading").value;
    var text = document.getElementById("editor").innerHTML;
    text = fixFormat(text);
    var cache_note = JSON.parse(sessionStorage.getItem("note-cache"));
    if (cache_note["name"] != heading || cache_note["data_hash"] != text.hashCode()) {
        cache_note["name"] = heading;
        cache_note["data_hash"] = text.hashCode();
        sessionStorage.setItem("note-cache", JSON.stringify(cache_note));

        document.getElementById("editor").setContent(text);
        updateNote(heading, cache_note["fileId"], deformatContent(text));
        getContentList(sessionStorage.getItem("folderId"));
    }
}