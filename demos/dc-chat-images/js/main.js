/***
 * Excerpted from "Programming WebRTC",
 * published by The Pragmatic Bookshelf.
 * Copyrights apply to this code. It may not be used to create training material,
 * courses, books, articles, and the like. Contact us if you are in doubt.
 * We make no guarantees that this code is fit for any purpose.
 * Visit http://www.pragmaticprogrammer.com/titles/ksrtc for more book information.
***/
'use strict';

/**
 *  Global Variables: Configuration, $peer, and $self
 */

const rtc_config = null;

const $peer = {
  connection: new RTCPeerConnection(rtc_config)
};

const $self = {
  isPolite: false,
  isMakingOffer: false,
  isIgnoringOffer: false,
  isSettingRemoteAnswerPending: false,
  mediaConstraints: { audio: false, video: true }
};



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
 * Classes
 */

const VideoFX = class {
  constructor() {
    this.filters = ['grayscale', 'sepia', 'noir', 'psychedelic', 'none'];
  }
  cycleFilter() {
    const filter = this.filters.shift();
    this.filters.push(filter);
    return filter;
  }
};



/**
 *  User-Interface Setup
 */

document.querySelector('#header h1')
  .innerText = 'Welcome to Room #' + namespace;

document.querySelector('#call-button')
  .addEventListener('click', handleCallButton);

document.querySelector('#self')
  .addEventListener('click', handleSelfVideo);

document.querySelector('#chat-form')
  .addEventListener('submit', handleMessageForm);

document.querySelector('#chat-img-btn')
  .addEventListener('click', handleImageButton);


/**
 *  User Features and Media Setup
 */

requestUserMedia($self.mediaConstraints);

$self.features = {};
$self.filters = new VideoFX();
$self.messageQueue = [];



/**
 *  User-Interface Functions and Callbacks
 */

function handleCallButton(event) {
  const callButton = event.target;
  if (callButton.className === 'join') {
    console.log('Joining the call...');
    callButton.className = 'leave';
    callButton.innerText = 'Leave Call';
    joinCall();
  } else {
    console.log('Leaving the call...');
    callButton.className = 'join';
    callButton.innerText = 'Join Call';
    leaveCall();
  }
}

function joinCall() {
  sc.open();
}

function leaveCall() {
  self.isPolite = false;
  sc.close();
  resetCall($peer);
}

function handleSelfVideo(e) {
  if ($peer.connection.connectionState !== 'connected') return;
  const filter = `filter-${$self.filters.cycleFilter()}`;
  const fdc = $peer.connection.createDataChannel(filter);
  fdc.onclose = function() {
    console.log(`Remote peer has closed the ${filter} data channel`);
  };
  e.target.className = filter;
}

function handleImageButton(event) {
  let input = document.querySelector('input.temp');
  input = input ? input : document.createElement('input');
  input.className = 'temp';
  input.type = 'file';
  input.accept = '.gif, .jpg, .jpeg, .png';
  input.setAttribute('aria-hidden', true);
  // Safari/iOS requires appending the file input
  document.querySelector('#chat-form').appendChild(input);
  input.addEventListener('change', handleImageInput);
  input.click();
}

function handleImageInput(event) {
  event.preventDefault();
  const image = event.target.files[0];
  const metadata = {
    name: image.name,
    size: image.size,
    timestamp: Date.now(),
    type: image.type
  };
  appendMessage('self', '#chat-log', metadata, image);
  // Remove appended file input element
  event.target.remove();
  // Send or queue the file
  if ($peer.connection.connectionState === 'connected') {
    sendFile($peer, 'image-', metadata, image);
  } else {
    queueMessage({ metadata: metadata, file: image });
  }
}

function handleMessageForm(event) {
  event.preventDefault();
  const input = document.querySelector('#chat-msg');
  const message = {};
  message.text = input.value;
  message.timestamp = Date.now();
  if (message.text === '') return;

  appendMessage('self', '#chat-log', message);

  if ($peer.chatChannel && $peer.chatChannel.readyState === 'open') {
    try {
      $peer.chatChannel.send(JSON.stringify(message));
    } catch(e) {
      console.error('Error sending message:', e);
      queueMessage(message);
    }
  } else {
    queueMessage(message);
  }

  input.value = '';
}

function appendMessage(sender, log_element, message, image) {
  const log = document.querySelector(log_element);
  const li = document.createElement('li');
  li.className = sender;
  li.innerText = message.text;
  li.dataset.timestamp = message.timestamp;
  if (image) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(image);
    img.onload = function() {
      URL.revokeObjectURL(this.src);
      scrollToEnd(log);
    };
    li.innerText = ''; // undefined on images
    li.classList.add('img');
    li.appendChild(img);
  }
  log.appendChild(li);
  scrollToEnd(log);
}

function scrollToEnd(el) {
  if (el.scrollTo) {
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth'
    });
  } else {
    el.scrollTop = el.scrollHeight;
  }
}

function handleResponse(response) {
  const item = document
    .querySelector(`#chat-log *[data-timestamp="${response.id}"]`);
  if (response.timestamp - response.id > 1000) {
    item.classList.add('received', 'delayed');
  } else {
    item.classList.add('received');
  }
}

function queueMessage(message) {
  $self.messageQueue.push(message);
}



/**
 *  User-Media and Data-Channel Functions
 */

async function requestUserMedia(media_constraints) {
  $self.stream = new MediaStream();
  $self.media = await navigator.mediaDevices
    .getUserMedia(media_constraints);
  $self.stream.addTrack($self.media.getTracks()[0]);
  displayStream('#self', $self.stream);
}

function displayStream(video_id, stream) {
  document.querySelector(video_id).srcObject = stream;
}

function addTracksToConnection(pc, media) {
  if (media) {
    for (let track of media.getTracks()) {
      pc.addTrack(track, media);
    }
  }
}

function addChatChannel(peer) {

  // Snip, Snip

  peer.chatChannel =
    peer.connection.createDataChannel('text chat',
      { negotiated: true, id: 50 });
  peer.chatChannel.onmessage = function(e) {
    const message = JSON.parse(e.data);
    if (!message.id) {
      const response = {
        id: message.timestamp,
        timestamp: Date.now()
      };
      try {
        peer.chatChannel.send(JSON.stringify(response));
      } catch {
        queueMessage(response);
      }
      appendMessage('peer', '#chat-log', message);
    } else {
      handleResponse(message);
    }
  };
  peer.chatChannel.onclose = function(e) {
    console.log('Chat channel closed.');
  };
  peer.chatChannel.onopen = function(e) {
    console.log('Chat channel opened.');
    for (let message of $self.messageQueue) {
      console.log('Sending a message from the queque');
      if (message.file) {
        sendFile(peer, 'image-', message.metadata, message.file);
      } else {
        peer.chatChannel.send(JSON.stringify(message));
      }
    }
  };
}

function addFeaturesChannel(peer) {
  peer.featuresChannel =
    peer.connection.createDataChannel('features',
      { negotiated: true, id: 60 });
  peer.featuresChannel.onopen = function(e) {
    $self.features.binaryType = peer.featuresChannel.binaryType;
    // Other feature-detection logic could go here...
    peer.featuresChannel.send(JSON.stringify($self.features));
  };
  peer.featuresChannel.onmessage = function(e) {
    peer.features = JSON.parse(e.data);
  };
}

function sendFile(peer, prefix, metadata, file) {
  const dc = peer.connection.createDataChannel(`${prefix}${metadata.name}`);
  const chunk = 8 * 1024; // 8K chunks
  dc.onopen = async function() {
    if (!peer.features ||
      ($self.features.binaryType !== peer.features.binaryType)) {
      dc.binaryType = 'arraybuffer';
    }
    // Prepare data according to the binaryType in use
    const data = dc.binaryType === 'blob' ? file : await file.arrayBuffer();
    // Send the metadata
    dc.send(JSON.stringify(metadata));
    // Send the prepared data in chunks
    for (let i = 0; i < metadata.size; i += chunk) {
      dc.send(data.slice(i, i + chunk));
    }
  };
  dc.onmessage = function({ data }) {
    // Sending side will only ever receive a response
    handleResponse(JSON.parse(data));
    dc.close();
  };
}

function receiveFile(dc) {
  const chunks = [];
  let metadata;
  let bytesReceived = 0;
  dc.onmessage = function({ data }) {
    // Receive the metadata
    if (typeof data === 'string' && data.startsWith('{')) {
      metadata = JSON.parse(data);
    } else {
      // Receive and squirrel away chunks...
      bytesReceived += data.size ? data.size : data.byteLength;
      chunks.push(data);
      // ...until the bytes received equal the file size
      if (bytesReceived === metadata.size) {
        const image = new Blob(chunks, { type: metadata.type });
        const response = {
          id: metadata.timestamp,
          timestamp: Date.now()
        };
        appendMessage('peer', '#chat-log', metadata, image);
        // Send an acknowledgement
        try {
          dc.send(JSON.stringify(response));
        } catch {
          queueMessage(response);
        }
      }
    }
  };
}



/**
 *  Call Features & Reset Functions
 */

function establishCallFeatures(peer) {
  registerRtcCallbacks(peer.connection);
  addFeaturesChannel(peer);
  addChatChannel(peer);
  addTracksToConnection(peer.connection, $self.media);
}

function resetCall(peer) {
  displayStream('#peer', null);
  peer.connection.close();
  resetObjectKeys(peer);
  peer.connection = new RTCPeerConnection(rtc_config);
}



/**
 *  WebRTC Functions and Callbacks
 */

function registerRtcCallbacks(pc) {
  pc.onconnectionstatechange = handleRtcConnectionStateChange;
  pc.ondatachannel = handleRtcDataChannel;
  pc.onnegotiationneeded = handleRtcConnectionNegotiation;
  pc.onicecandidate = handleRtcIceCandidate;
  pc.ontrack = handleRtcPeerTrack;
}

function handleRtcPeerTrack({ track, streams: [stream] }) {
  console.log('Attempt to add media for peer...');
  displayStream('#peer', stream);
}

function handleRtcDataChannel({ channel }) {
  const label = channel.label;
  console.log(`Data channel added for ${label}`);
  if (label.startsWith('filter-')) {
    document.querySelector('#peer').className = label;
    channel.onopen = function() {
      channel.close();
    };
  }
  if (label.startsWith('image-')) {
    receiveFile(channel);
  }
}


/**
 * =========================================================================
 *  End Application-Specific Code
 * =========================================================================
 */



/**
 *  Reusable WebRTC Functions and Callbacks
 */

async function handleRtcConnectionNegotiation() {
  if ($self.isSuppressingInitialOffer) return;
  try {
    $self.isMakingOffer = true;
    await $peer.connection.setLocalDescription();
  } catch {
    const offer = await $peer.connection.createOffer();
    await $peer.connection.setLocalDescription(offer);
  } finally {
    sc.emit('signal',
      { description: $peer.connection.localDescription });
    $self.isMakingOffer = false;
  }
}

function handleRtcIceCandidate({ candidate }) {
  console.log('Attempting to handle an ICE candidate...');
  sc.emit('signal', { candidate: candidate });
}

function handleRtcConnectionStateChange() {
  const connectionState = $peer.connection.connectionState;
  console.log(`The connection state is now ${connectionState}`);
  document.querySelector('body').className = connectionState;
}



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
  establishCallFeatures($peer);
}

function handleScConnectedPeer() {
  $self.isPolite = true;
}

function handleScDisconnectedPeer() {
  resetCall($peer);
  establishCallFeatures($peer);
}

function resetAndRetryConnection(peer) {
  $self.isMakingOffer = false;
  $self.isIgnoringOffer = false;
  $self.isSettingRemoteAnswerPending = false;
  $self.isSuppressingInitialOffer = $self.isPolite;

  resetCall(peer);
  establishCallFeatures(peer);

  if ($self.isPolite) {
    sc.emit('signal', { description: { type: '_reset' } });
  }
}

async function handleScSignal({ candidate, description }) {
  if (description) {

    if (description.type === '_reset') {
      resetAndRetryConnection($peer);
      return;
    }

    const readyForOffer =
          !$self.isMakingOffer &&
          ($peer.connection.signalingState === 'stable'
            || $self.isSettingRemoteAnswerPending);

    const offerCollision = description.type === 'offer' && !readyForOffer;

    $self.isIgnoringOffer = !$self.isPolite && offerCollision;

    if ($self.isIgnoringOffer) {
      return;
    }

    $self.isSettingRemoteAnswerPending = description.type === 'answer';
    try {
      console.log('Signaling state on incoming description:',
        $peer.connection.signalingState);
      await $peer.connection.setRemoteDescription(description);
    } catch {
      resetAndRetryConnection($peer);
      return;
    }
    $self.isSettingRemoteAnswerPending = false;

    if (description.type === 'offer') {
      try {
        await $peer.connection.setLocalDescription();
      } catch {
        const answer = await $peer.connection.createAnswer();
        await $peer.connection.setLocalDescription(answer);
      } finally {
        sc.emit('signal',
          { description: $peer.connection.localDescription });
        $self.isSuppressingInitialOffer = false;
      }
    }
  } else if (candidate) {
    // Ignore empty ICE candidates
    if (candidate.candidate.length > 1) {
      await $peer.connection.addIceCandidate(candidate);
    }
  }

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

function resetObjectKeys(obj) {
  for (let key of Object.keys(obj)) {
    delete obj[key];
  }
}
