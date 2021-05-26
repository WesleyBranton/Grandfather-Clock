/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Get chime from settings on startup
async function firstLoad() {
    var setting = await browser.storage.local.get('chime');
    if (setting.chime) {
        chimeName = setting.chime;
    } else {
        chimeName = 'default';
        browser.storage.local.set({
            chime: 'default'
        });
    }
    
    setting = await browser.storage.local.get('volume');
    if (setting.volume) {
        chimeVolume = setting.volume;
    } else {
        chimeVolume = 1;
        browser.storage.local.set({
            'volume': 1
        });
    }
    
    load();
}

// Create alarm
function load() {
    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    var day = d.getDate();
    var hour = d.getHours() + 1;
    
    d = new Date(year, month, day, hour);
    
    browser.alarms.create('grandfather-fox', {
        when: d.getTime(),
        periodInMinutes: 60
    });
}

// Check alarm is still valid
async function alarmCheck() {
    var alarm = await browser.alarms.get('grandfather-fox');
    var alarmTime = alarm.scheduledTime;
    var currentTime = new Date().getTime();
    
    if (alarmTime < currentTime || (alarmTime - currentTime) > 3600000) {
        listenMessage('reload');
    }
}

// Play chime
function hourTrigger(alarmInfo) {
    var d = new Date(alarmInfo.scheduledTime);
    var hour = d.getHours();
    
    if (hour > 12) {
        hour = hour - 12;
    } else if (hour == 0) {
        hour = 12;
    }

    if (chimeName == 'custom') {
        try {
            IDBFiles.getFileStorage({name: 'chimes'}).then((database) => {
                database.get('chime_' + hour).then((data) => {
                    if (data) {
                        audio = new Audio(URL.createObjectURL(data));
                        audio.addEventListener('ended', audioEnded);
                        audio.addEventListener('pause', audioEnded);
                        audio.addEventListener('play', audioStarted);
                        audio.volume = chimeVolume;
                        audio.play();
                    } else {
                        console.error('Error reading file:', 'File does not exist');
                    }
                });
            });
        } catch (error) {
            console.error('Error reading file:', error);
            return;
        }
    } else {
        audio = new Audio('audio/' + chimeName + '/' + hour + '.ogg');
        audio.addEventListener('ended', audioEnded);
        audio.addEventListener('pause', audioEnded);
        audio.addEventListener('play', audioStarted);
        audio.volume = chimeVolume;
        audio.play();
    }
}

// Audio is playing
function audioStarted() {
    browser.browserAction.setTitle({title: 'Click to stop Grandfather Fox chime...'});
    browser.browserAction.setBadgeText({text: '\u25B6'});
}

// Audio has finished
function audioEnded() {
    browser.browserAction.setTitle({title: 'Grandfather Fox'});
    browser.browserAction.setBadgeText({text: ''});
}

// Stop audio
function stopAudio() {
    if (audio) {
        audio.pause();
    }
}

// Listen for messages from other pages
function listenMessage(msg) {
    if (msg == 'reload') {
        var clearAlarms = browser.alarms.clearAll();
        clearAlarms.then(load);
    }
}

// Update chime preference
function storageChange(changes) {
    if (changes.chime) {
        chimeName = changes.chime.newValue;
    }
    
    if (changes.volume) {
        chimeVolume = changes.volume.newValue;
        if (audio) {
            audio.volume = chimeVolume;
        }
    }
}

/**
 * Validate file
 * @param {File} file
 * @returns Error
 */
function validateFile(file) {
    const validTypes = ['audio/mpeg', 'audio/ogg', 'video/ogg', 'audio/wav'];
    let isValidType = false;

    for (let type of validTypes) {
        if (file.type == type) {
            isValidType = true;
            break;
        }
    }

    if (!isValidType) {
        return 'Unsupported file type (Must be MP3, OGG, or WAV)';
    }

    if (file.size > 5000000) {
        return 'File size exceeds limit (Maximum 5MB)';
    }

    return null;
}

/**
 * Save file to database
 * @param {String} filename
 * @param {File} data
 * @param {Object} port
 */
function saveFile(filename, data, port) {
    try {
        const validation = validateFile(data);
        if (validation) {
            throw validation;
        }

        IDBFiles.getFileStorage({name: 'chimes'}).then((database) => {
            database.put(filename, data).then(() => {
                port.postMessage({
                    command: 'save',
                    status: 'success'
                });
            });
        });
    } catch (error) {
        console.error('Error saving file:', error);
        port.postMessage({
            command: 'save',
            status: 'failed',
            error: error
        });
    }
}

/**
 * Load file from database
 * @param {String} filename
 * @param {Object} port
 */
function getFile(filename, port) {
    try {
        IDBFiles.getFileStorage({name: 'chimes'}).then((database) => {
            database.get(filename).then((data) => {
                if (data) {
                    port.postMessage({
                        command: 'load',
                        status: 'success',
                        file: data
                    });
                } else {
                    console.error('Error reading file:', 'File does not exist');
                    port.postMessage({
                        command: 'load',
                        status: 'failed',
                        error: 'File not found'
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error reading file:', error);
        port.postMessage({
            command: 'load',
            status: 'failed',
            error: error
        });
    }
}

/**
 * Remove file from database
 * @param {String} filename
 * @param {Object} port
 */
function removeFile(filename, port) {
    try {
        IDBFiles.getFileStorage({name: 'chimes'}).then((database) => {
            database.remove(filename).then((data) => {
                port.postMessage({
                    command: 'remove',
                    status: 'success'
                });
            });
        });
    } catch (error) {
        console.error('Error removing file:', error);
        port.postMessage({
            command: 'remove',
            status: 'failed',
            error: error
        });
    }
}

/**
 * Get list of filenames from
 * @param {Object} port
 */
function listFiles(port) {
    try {
        IDBFiles.getFileStorage({name: 'chimes'}).then((database) => {
            database.list().then((list) => {
                port.postMessage({
                    command: 'list',
                    status: 'success',
                    list: list
                });
            });
        });
    } catch (error) {
        console.error('Error listing files:', error);
        port.postMessage({
            command: 'list',
            status: 'failed',
            error: error
        });
    }
}

/**
 * Remove all files from database
 */
function clearFiles() {
    try {
        IDBFiles.getFileStorage({name: 'chimes'}).then((database) => {
            database.clear();
        });
    } catch (error) {
        console.error('Error clearing files:', error);
    }
}

/**
 * Open connection to content script
 * @param {Object} port
 */
 function registerPort(port) {
    while (ports[port.name]) {
        port.name = parseInt(port.name) + 1 + '';
    }

    ports[port.name] = port;
    port.onDisconnect.addListener(unregisterPort);
    port.onMessage.addListener(handlePortMessage);
}

/**
 * Close connection to content script
 * @param {Object} port
 */
function unregisterPort(port) {
    delete ports[port.name];
}

function handlePortMessage(message, port) {
    switch (message.command) {
        case 'save':
            saveFile(message.filename, message.file, port);
            break;
        case 'load':
            getFile(message.filename, port);
            break;
        case 'remove':
            removeFile(message.filename, port);
            break;
        case 'list':
            listFiles(port);
            break;
        case 'clear':
            clearFiles();
            break;
    }
}

/**
 * Handles installation or update
 * @param {Object} details
 */
function handleInstalled(details) {
    if (details.reason == 'update') {
        const previousVersion = parseFloat(details.previousVersion);
        if (previousVersion < 2) {
            browser.tabs.create({
                url: 'https://addons.wesleybranton.com/addon/grandfather-fox/update/v2_0'
            });
        }
    }
}

var chimeName, chimeVolume, audio;
const ports = {};
browser.runtime.onConnect.addListener(registerPort);
firstLoad();
browser.alarms.onAlarm.addListener(hourTrigger);
chrome.runtime.onMessage.addListener(listenMessage);
browser.storage.onChanged.addListener(storageChange);
browser.webNavigation.onCompleted.addListener(alarmCheck);
browser.browserAction.onClicked.addListener(stopAudio);
browser.browserAction.setBadgeBackgroundColor({color: '#3C3'});
browser.browserAction.setBadgeTextColor({color: 'white'});
browser.runtime.onInstalled.addListener(handleInstalled);