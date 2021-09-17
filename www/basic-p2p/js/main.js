
'use strict';

/**
 *  Global Variables: Configuration, $peer, and $self
 */



/**
 *  Signaling-Channel Setup
 */
const namespace = prepareNamespace(window.location.hash, true);

const sc = io.connect('/' + namespace, { autoConnect: false });

registerScCallbacks();


/**
 * =========================================================================
 *  Begin Application-Specific Code
 * =========================================================================
 */



/**
 *  User-Interface Setup
 */
document.querySelector('#call-button')
    .addEventListener('click', handleCallButton)

document.querySelector('#header h1')
    .innerText = "Welcome to room #" + namespace

/**
 *  User-Media Setup
 */



/**
 *  User-Interface Functions and Callbacks
 */

function handleCallButton(event) {
    const callButton = event.target;
    if (callButton.className === 'join') {
        console.log('Joining call');
        callButton.className = 'leave';
        callButton.innerText = 'Leave Call';
        joinCall();
    } else {
        console.log('Leaving call');
        callButton.className = 'join';
        callButton.innerText = 'Join Call';
        leaveCall();
    }
}

function joinCall() {
    sc.open();
}

function leaveCall() {
    sc.close();
}


/**
 *  User-Media Functions
 */



/**
 *  Call Features & Reset Functions
 */



/**
 *  WebRTC Functions and Callbacks
 */



/**
 * =========================================================================
 *  End Application-Specific Code
 * =========================================================================
 */



/**
 *  Reusable WebRTC Functions and Callbacks
 */



/**
 *  Signaling-Channel Functions and Callbacks
 */


function registerScCallbacks() {
    sc.on('connect', handleScConnect);
    sc.on('connected peer', handleScConnectedPeer);
    sc.on('disconnected peer', handleScDisconnectedPeer);
    sc.on('signal', handleScSignal);
}

function handleScConnect() {
    console.log('Successfully connected to the signaling server!');
}

function handleScConnectedPeer() {

}

function handleScDisconnectedPeer() {

}

async function handleScSignal({ candidate, description }) {

}


/**
 *  Utility Functions
 */
function prepareNamespace(hash, set_location) {
    let ns = hash.replace(/^#/, ''); // remove # from the hash
    if (/^[0-9]{7}$/.test(ns)) {
        console.log('Checked existing namespace', ns);
        return ns;
    }
    ns = Math.random().toString().substring(2, 9);
    console.log('Created new namespace', ns);
    if (set_location) window.location.hash = ns;
    return ns;
}
