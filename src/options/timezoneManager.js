/**
 * Populates the timezone list in the options
 */
function refreshTimezoneList() {
    const select = document.getElementById('timezone');
    select.textContent = '';

    // Add automatic option
    const auto = document.createElement('option');
    auto.value = 'auto';
    auto.textContent = browser.i18n.getMessage('timezoneSystemSettings');
    select.appendChild(auto);

    const timezones = getGroupedTimezones();
    for (const group of getSortedTimezoneKeys(timezones)) {
        const optionGroup = document.createElement('optgroup');
        optionGroup.label = group;

        for (const tz of timezones[group]) {
            const option = document.createElement('option');
            option.value = tz;
            option.textContent = tz.replaceAll('_', ' ').replace(`${group}/`, '');
            optionGroup.appendChild(option);
        }

        select.appendChild(optionGroup);
    }
}

/**
 * Create a list of timezones grouped by prefix.
 * @returns Timezones grouped by prefix
 */
function getGroupedTimezones() {
    const timezones = {};

    for (const t of Intl.supportedValuesOf('timeZone')) {
        let timezoneGroup;

        if (t.toLowerCase().startsWith('etc/')) {
            continue;
        }

        if (t.includes('/')) {
            timezoneGroup = t.split('/')[0];
        } else {
            timezoneGroup = browser.i18n.getMessage('timezoneOther');
        }

        if (!(timezoneGroup in timezones)) {
            timezones[timezoneGroup] = [];
        }

        timezones[timezoneGroup].push(t);
    }

    for (const t of Object.values(timezones)) {
        t.sort();
    }

    return timezones;
}

/**
 * Create a list of timezone group keys sorted alphabetically. The "Other" option will
 * always appear at the end of the list.
 * @param {Object} timezones Timezones grouped by prefix
 * @returns List of sorted timezone group keys
 */
function getSortedTimezoneKeys(timezones) {
    const keys = Object.keys(timezones).sort();
    const otherIndex = keys.indexOf(browser.i18n.getMessage('timezoneOther'));

    if (otherIndex > -1) {
        keys.splice(otherIndex, 1);
        keys.push(browser.i18n.getMessage('timezoneOther'));
    }

    return keys;
}

/**
 * Show the date and time of the selected timezone
 * @param {boolean} once
 */
function showCurrentTime(once) {
    const output = document.getElementById('current-time');

    if (document.settings.timezone.value == 'auto') {
        output.textContent = new Date().toLocaleString('en-US');
    } else {
        output.textContent = new Date().toLocaleString('en-US', {
            timeZone: document.settings.timezone.value
        });
    }

    if (!once) { // Update in 1 second
        setTimeout(() => {
            showCurrentTime(false);
        }, 1000);
    }
}

/**
 * Update current timezone label when Use System Settings is selected and hide current
 * timezone label when a specific timezone is selected
 */
function updateCurrentTimezone() {
    if (document.settings.timezone.value == 'auto') {
        document.getElementById('current-timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
        document.getElementById('current-timezone-container').classList.remove('hide');
    } else {
        document.getElementById('current-timezone-container').classList.add('hide');
    }
}

refreshTimezoneList();
showCurrentTime(false);
document.settings.timezone.addEventListener('change', () => { showCurrentTime(true); updateCurrentTimezone(); });