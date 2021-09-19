"use strict";

/**
 *  Global Variables: Configuration, $peer, and $self
 */

const rtc_config = null;

const $peer = {
  connection: new RTCPeerConnection(rtc_config),
};

const $self = {
  isPolite: false,
  isMakingOffer: false,
  isIgnoringOffer: false,
  isSettingRemoteAnswerPending: false,
  mediaConstraints: { audio: false, video: true },
};

/**
 *  Signaling-Channel Setup
 */
const namespace = prepareNamespace(window.location.hash, true);

const sc = io.connect("/" + namespace, { autoConnect: false });

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
    this.filters = ["grayscale", "sepia", "noir", "psychedelic", "none"];
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

document.querySelector("#header h1").innerText =
  "Welcome to Room #" + namespace;

document
  .querySelector("#call-button")
  .addEventListener("click", handleCallButton);

document.querySelector("#self").addEventListener("click", handleSelfVideo);

/**
 *  User-Media Setup
 */

requestUserMedia($self.mediaConstraints);

$self.filters = new VideoFX();

/**
 *  User-Interface Functions and Callbacks
 */

function handleCallButton(event) {
  const callButton = event.target;
  if (callButton.className === "join") {
    console.log("Joining the call...");
    callButton.className = "leave";
    callButton.innerText = "Leave Call";
    joinCall();
  } else {
    console.log("Leaving the call...");
    callButton.className = "join";
    callButton.innerText = "Join Call";
    leaveCall();
  }
}

function joinCall() {
  sc.open();
}

function leaveCall() {
  sc.close();
  resetCall($peer);
}

function handleSelfVideo(e) {
  if ($peer.connection.connectionState !== "connected") return;
  const filter = `filter-${$self.filters.cycleFilter()}`;
  const fdc = $peer.connection.createDataChannel(filter);
  fdc.onclose = function () {
    console.log(`Remote peer has closed the ${filter} data channel`);
  };
  e.target.className = filter;
}

/**
 *  User-Media Functions
 */

async function requestUserMedia(media_constraints) {
  $self.stream = new MediaStream();
  $self.media = await navigator.mediaDevices.getUserMedia(media_constraints);
  $self.stream.addTrack($self.media.getTracks()[0]);
  displayStream("#self", $self.stream);
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

/**
 *  Call Features & Reset Functions
 */

function establishCallFeatures(peer) {
  registerRtcCallbacks(peer.connection);
  addTracksToConnection(peer.connection, $self.media);
}

function resetCall(peer) {
  displayStream("#peer", null);
  peer.connection.close();
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
  console.log("Attempt to add media for peer...");
  displayStream("#peer", stream);
}

function handleRtcDataChannel({ channel }) {
  const label = channel.label;
  console.log(`Data channel added for ${label}`);
  if (label.startsWith("filter-")) {
    document.querySelector("#peer").className = label;
    channel.onopen = function () {
      channel.close();
    };
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
  $self.isMakingOffer = true;
  console.log("Attempting to make an offer...");
  await $peer.connection.setLocalDescription();
  sc.emit("signal", { description: $peer.connection.localDescription });
  $self.isMakingOffer = false;
}

function handleRtcIceCandidate({ candidate }) {
  console.log("Attempting to handle an ICE candidate...");
  sc.emit("signal", { candidate: candidate });
}

function handleRtcConnectionStateChange() {
  const connectionState = $peer.connection.connectionState;
  console.log(`The connection state is now ${connectionState}`);
  document.querySelector("body").className = connectionState;
}
/**
 *  Signaling-Channel Functions and Callbacks
 */

function registerScCallbacks() {
  sc.on("connect", handleScConnect);
  sc.on("connected peer", handleScConnectedPeer);
  sc.on("disconnected peer", handleScDisconnectedPeer);
  sc.on("signal", handleScSignal);
}

function handleScConnect() {
  console.log("Successfully connected to the signaling server!");
  establishCallFeatures($peer);
}

function handleScConnectedPeer() {
  $self.isPolite = true;
}

function handleScDisconnectedPeer() {
  resetCall($peer);
  establishCallFeatures($peer);
}

async function handleScSignal({ candidate, description }) {
  if (description) {
    const readyForOffer =
      !$self.isMakingOffer &&
      ($peer.connection.signalingState === "stable" ||
        $self.isSettingRemoteAnswerPending);

    const offerCollision = description.type === "offer" && !readyForOffer;

    $self.isIgnoringOffer = !$self.isPolite && offerCollision;
    if ($self.isIgnoringOffer) {
      return;
    }

    $self.isSettingRemoteAnswerPending = description.type === "answer";
    await $peer.connection.setRemoteDescription(description);
    $self.isSettingRemoteAnswerPending = false;

    if (description.type === "offer") {
      await $peer.connection.setLocalDescription();
      sc.emit("signal", { description: $peer.connection.localDescription });
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
  let ns = hash.replace(/^#/, ""); // remove # from the hash
  if (/^[0-9]{7}$/.test(ns)) {
    console.log("Checked existing namespace", ns);
    return ns;
  }
  ns = Math.random().toString().substring(2, 9);
  console.log("Created new namespace", ns);
  if (set_location) window.location.hash = ns;
  return ns;
}
