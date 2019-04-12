function loadOptions() {
    let NL = "\r";
    chrome.storage.sync.get({
        jiraUrl: '',
        jiraIdRegex: '([a-zA-Z0-9]+-[0-9]+)',
    }, function(items) {
        document.getElementById('jiraUrl').value = items.jiraUrl;
        document.getElementById('jiraIdRegex').value = items.jiraIdRegex;
    });
}

function saveOptions() {
    chrome.storage.sync.set({
        jiraUrl: document.getElementById("jiraUrl").value,
        jiraIdRegex: document.getElementById("jiraIdRegex").value,
    }, function() {
        // Update status to let user know options were saved.
        let status = document.getElementById('status');
        status.style.display = 'block';
        window.scrollTo(0, 0);
        setTimeout(function() {
            status.style.display = 'none';
        }, 2000);
    });
}

function clearOptions() {
    chrome.storage.sync.remove([
        'jiraUrl', 'jiraIdRegex'
    ]);
    loadOptions();
    saveOptions();
}

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("clear").addEventListener("click", clearOptions);
