// The last time a refresh of the page was done
let lastRefresh = (new Date()).getTime();
let jiraLogo = chrome.extension.getURL("images/jira.png");
let jiraUrl = undefined;
let jiraIdRegex = '([a-zA-Z0-9]+-[0-9]+)';

chrome.storage.sync.get({
    jiraUrl: '',
    jiraIdRegex: '([a-zA-Z0-9]+-[0-9]+)',
}, function (items) {
    jiraUrl = items.jiraUrl;
    jiraIdRegex = items.jiraIdRegex;

    if (jiraUrl === '') {
        console.error('GitHub Jira plugin could not load: Jira URL is not set.');
        return;
    }

    //Check login
    chrome.runtime.sendMessage(
        {query: 'getSession', jiraUrl: jiraUrl},
        function (loginResult) {
            if (loginResult.name === undefined) {
                console.error('You are not logged in to Jira at http://' + jiraUrl + ' - Please login.');
                return;
            }

            // Check page if content changed (for AJAX pages)
            $(document).on('DOMNodeInserted', function () {
                if ((new Date()).getTime() - lastRefresh >= 250) {
                    lastRefresh = (new Date()).getTime();
                    checkPage();
                }
            });

            // Check page initially
            checkPage();
        }
    );

});

function checkPage() {
    let url = window.location.href;
    if (url.match(/github\.com\/(.*)\/(.*)\/pull\//) != null) {
        setTimeout(function () {
            handleCommitsTitle();
            handlePrPage();
        }, 200); //Small timeout for dom to finish setup
    }

    if (url.match(/github\.com\/(.*)\/(.*)\/pulls/) != null) {
        // setTimeout(function () {
        //     handlePrsPage();
        // }, 200); //Small timeout for dom to finish setup
    }

    if (url.match(/github\.com\/(.*)\/(.*)\/compare\/(.*)/) != null) {
        //Create PR page
        setTimeout(function () {
            handleCommitsTitle();
        }, 200); //Small timeout for dom to finish setup
    }
}

function handlePrsPage() {
    let baseTicketUrl = 'https://' + jiraUrl + '/browse/';

    $(".js-issue-row > div > div.float-left.col-9.lh-condensed.p-2").each(function (index, item) {
        let $item = $(item);
        let itemLinkHtml = $item.html();

        if (!itemLinkHtml.match(new RegExp(jiraIdRegex, "g"))) {
            return;
        }

        let aHref = $item[0].href;
        let splittedContent = itemLinkHtml.split(new RegExp(jiraIdRegex, "g"));

        for (var i = 0; i < splittedContent.length; i += 3) {
            $item.prepend(
                '<span class="labels lh-default">' +
                '<a class="d-inline-block IssueLabel v-align-text-top" style="background-color: #a0c5d7; color: #000000" title="Link to Jira" href="' +
                baseTicketUrl +
                '>Jira</a>' +
                '</span>'
            );
        }
    });
}

function handleCommitsTitle() {
    let baseTicketUrl = 'https://' + jiraUrl + '/browse/';

    $(".commit-message code").each(function (index, item) {
        let $item = $(item);
        let $itemLink = $item.find('a');
        let itemLinkHtml = $itemLink.html();

        if (!itemLinkHtml.match(new RegExp(jiraIdRegex, "g"))) {
            return;
        }

        let aHref = $itemLink[0].href;
        let splittedContent = itemLinkHtml.split(new RegExp(jiraIdRegex, "g"));

        $item.html('');
        for (var i = 0; i < splittedContent.length; i += 3) {
            $item.append(
                '<a href="' + aHref + '">' + splittedContent[0] + '</a>' +
                '<a href="' + baseTicketUrl + splittedContent[1] + '" target="_blank" ><b>' + splittedContent[1] + '</b></a>' +
                ' <a href="' + aHref + '">' + splittedContent[2].trim() + '</a>'
            );
        }
    });
}

function handlePrPage() {
    let title = $("h1 > span.js-issue-title").html();
    if (title === undefined || $('#insertedJiraData').length > 0) {
        //If we didn't find a ticket, or the data is already inserted, cancel.
        return false;
    }

    let ticketNumber = title.match(new RegExp(jiraIdRegex, "g"));
    if (null == ticketNumber) {
        //Title was found, but ticket number wasn't.
        return false;
    }
    ticketNumber = ticketNumber[0];
    let ticketUrl = 'https://' + jiraUrl + '/browse/' + ticketNumber;

    //Replace title with clickable link to jira ticket
    $("h1 > span.js-issue-title").html(
        title.replace(
            new RegExp(jiraIdRegex, "g"),
            '<a href="' + ticketUrl + '" target="_blank" alt="Ticket in Jira">' + ticketNumber + '</a>'
        )
    );

    //Open up a handle for data
    $('#partial-discussion-header').append(
        '<div id="insertedJiraData">Loading ticket ' + ticketNumber + '...</div>'
    );

    //Load up data from jira
    chrome.runtime.sendMessage(
        {query: 'getTicketInfo', jiraUrl: jiraUrl, ticketNumber: ticketNumber},
        function (result) {
            if (result.fields) {
                let assignee = result.fields.assignee;
                let reporter = result.fields.reporter;

                let assigneeImage = assignee ? assignee.avatarUrls['16x16'] : jiraLogo;
                let reporterImage = reporter ? reporter.avatarUrls['16x16'] : jiraLogo;

                let assigneeDisplayName = assignee ? assignee.displayName : 'Unknown';
                let reporterDisplayName = reporter ? reporter.displayName : 'Unknown';

                $("#insertedJiraData").html(
                    '<div class="TableObject gh-header-meta">' +
                    '<div class="TableObject-item">' +
                    '<span class="State State--green" style="background-color: rgb(160,197,215);">' +
                    '<img height="16" class="octicon" width="12" aria-hidden="true" src="' + jiraLogo + '"/> <a style="color:white;" href="' + ticketUrl + '" target="_blank">Jira</a>' +
                    '</span>' +
                    '</div>' +
                    '<div class="TableObject-item">' +
                    '<span class="State State--white" style="background-color: rgb(220, 220, 220);color:rgb(40,40,40);">' +
                    '<img height="16" class="octicon" width="12" aria-hidden="true" src="' + result.fields.status.iconUrl + '"/> ' + result.fields.status.name +
                    '</span>' +
                    '</div>' +
                    '<div class="TableObject-item TableObject-item--primary">' +
                    '<b><a href="' + ticketUrl + '" target="_blank">[' + ticketNumber + '] - ' + result.fields.summary + '</a></b>' +
                    ' - Reported by ' +
                    '<span class="author text-bold"><img src="' + reporterImage + '" width="16"/> ' + reporterDisplayName + '</span>' +
                    ' and assigned to ' +
                    '<span class="author text-bold"><img src="' + assigneeImage + '" width="16"/> ' + assigneeDisplayName + '</span>' +
                    '</div>' +
                    '</div>'
                );
            }
        }
    );
}
