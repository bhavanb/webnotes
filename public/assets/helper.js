function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function confirm(text) {
	var popup = document.createElement("dialog");
	popup.id = "popup";
	var theme = document.body.classList[0];
	popup.classList.add(theme);

	var title = document.createElement("p");
	title.id = "popup-title";
	title.innerText = text;
	popup.appendChild(title);

	var confirmForm = document.createElement("form");
	confirmForm.id = "popup-confirm";
	confirmForm.method = "dialog";

	var acceptButton = document.createElement("button");
	acceptButton.value = "accept";
	acceptButton.innerText = "Ok";
	acceptButton.classList.add(theme, "inverse");
	confirmForm.appendChild(acceptButton);

	var cancelButton = document.createElement("button");
	cancelButton.value = "cancel";
	cancelButton.innerText = "Cancel";
	cancelButton.autofocus = true;
	cancelButton.classList.add(theme, "inverse");
	confirmForm.appendChild(cancelButton);

	popup.appendChild(confirmForm);

	popup.addEventListener('cancel', (event) => {
		event.preventDefault();
	});

	document.body.appendChild(popup);

	popup.showModal();
	await new Promise(resolve => {
		popup.addEventListener('close', () => {
			resolve(true)
		}, { once: true });
	});
	popup.remove();
	return (popup.returnValue === "accept") ? true : false;
}

async function prompt(text) {
	var popup = document.createElement("dialog");
	popup.id = "popup";
	var theme = document.body.classList[0];
	popup.classList.add(theme);

	var title = document.createElement("p");
	title.id = "popup-title";
	title.innerText = text;
	popup.appendChild(title);

	var promptFrom = document.createElement("form");
	promptFrom.id = "popup-prompt";
	promptFrom.method = "dialog";

	var promptInput = document.createElement("input");
	promptInput.type = "text";
	promptInput.classList.add(theme);
	promptInput.autofocus = true;
	promptFrom.appendChild(promptInput)

	var popupFooter = document.createElement("div");
	popupFooter.id = "popup-confirm";

	var acceptButton = document.createElement("button");
	acceptButton.value = "accept";
	acceptButton.innerText = "Ok";
	acceptButton.classList.add(theme, "inverse");

	acceptButton.onclick = function () {
		acceptButton.value = promptInput.value;
	};

	popupFooter.appendChild(acceptButton);

	var cancelButton = document.createElement("button");
	cancelButton.value = "cancel";
	cancelButton.innerText = "Cancel";
	cancelButton.autofocus = true;
	cancelButton.classList.add(theme, "inverse");
	popupFooter.appendChild(cancelButton);

	promptFrom.appendChild(popupFooter);
	popup.appendChild(promptFrom);

	popup.addEventListener('cancel', (event) => {
		event.preventDefault();
	});

	document.body.appendChild(popup);

	popup.showModal();
	await new Promise(resolve => {
		popup.addEventListener('close', () => {
			resolve(true)
		}, { once: true });
	});
	popup.remove();
	return (popup.returnValue != "cancel") ? popup.returnValue : "";
}

function replaceAll(string, search, replace) {
	return string.split(search).join(replace);
}

function fixFormat(text) {
	text = replaceAll(text, /<span .*?>/g, "");
	text = replaceAll(text, /<\/span>/g, "");

	let parser = new DOMParser;
	var elem = parser.parseFromString(text, "text/html").body;
	var div = elem.querySelector("div");
	while (div) {
		if (/<br .*?>/g.test(div.innerHTML)) {
			elem.replaceChild(document.createTextNode(div.innerHTML), div);
		}
		else {
			elem.replaceChild(document.createTextNode("<br>" + div.innerHTML), div);
		}
		div = elem.querySelector("div");
	}
	var t = elem.innerHTML;

	t = replaceAll(t, "&lt;", "<");
	t = replaceAll(t, "&gt;", ">");

	return t;
}

function formatContent(text) {
	var text = text;

	//BOLD
	var rBSpan = /\*.*?\*/g;
	var rBText = /(?<=\*)(.*?)(?=\*)/g;
	var bSpan = rBSpan.exec(text);
	var bText = rBText.exec(text);
	if (bSpan) {
		for (let i = 0; i < bSpan.length; i++) {
			text = text.replace(bSpan[i], `<b>${bText[i]}</b>`);
		}
	}

	//ITALIC
	var rISpan = /_.*?_/g;
	var rIText = /(?<=_)(.*?)(?=_)/g;
	var iSpan = rISpan.exec(text);
	var iText = rIText.exec(text);
	if (iSpan) {
		for (let i = 0; i < iSpan.length; i++) {
			text = text.replace(iSpan[i], `<i>${iText[i]}</i>`);
		}

	}

	//UNDERLINE
	var rUSpan = /~.*?~/g;
	var rUText = /(?<=~)(.*?)(?=~)/g;
	var uSpan = rUSpan.exec(text);
	var uText = rUText.exec(text);
	if (uSpan) {
		for (let i = 0; i < uSpan.length; i++) {
			text = text.replace(uSpan[i], `<u>${uText[i]}</u>`);
		}
	}

	text = replaceAll(text, "\n", "<br>");
	text["data"] = text;
	return text;
}

function deformatContent(json) {
	var text = json["data"];
	//BOLD
	text = replaceAll(text, /<b .*?>/g, "*");
	text = replaceAll(text, /<\/b>/g, "*");
	//ITALIC
	text = replaceAll(text, /<i .*?>/g, "_");
	text = replaceAll(text, /<\/i>/g, "_");
	//UNDERLINE
	text = replaceAll(text, /<u .*?>/g, "~");
	text = replaceAll(text, /<\/u>/g, "~");
	//NEWLINE
	text = replaceAll(text, /<br.*?>/g, "\n");

	json["data"] = text.trim();
	return json;

}

function modifyUrl(title, url) {
	if (typeof (history.pushState) != "undefined") {
		var obj = {
			Title: title,
			Url: url
		};
		history.pushState(obj, obj.Title, obj.Url);
	}
}

String.prototype.hashCode = function () {
	var hash = 0,
		i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0;
	}
	return hash;
}