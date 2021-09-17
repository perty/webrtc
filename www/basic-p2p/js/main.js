
'use strict';

/**
 *  Global Variables: Configuration, $peer, and $self
 */



/**
 *  Signaling-Channel Setup
 */



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
    } else {
        console.log('Leaving call');
        callButton.className = 'join';
        callButton.innerText = 'Join Call';
    }
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



/**
 *  Utility Functions
 */
