import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api, imageUrl, SOCKET_URL } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [blockedPeer, setBlockedPeer] = useState(null);
  const [call, setCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [mediaSupport, setMediaSupport] = useState({ checked: false, audio: false, video: false, calls: false });
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const activeCallMatchIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentUserId = String(user?._id || user?.id || "");

  useEffect(() => {
    setBlockedUserIds((user?.blockedUsers || []).map((id) => String(id)));
  }, [user?.blockedUsers]);

  function attachMediaStream(mediaElement, stream) {
    if (!mediaElement || mediaElement.srcObject === stream) return;
    mediaElement.srcObject = stream;
    if (stream) {
      mediaElement.onloadedmetadata = () => mediaElement.play?.().catch(() => {});
      mediaElement.play?.().catch(() => {});
    }
  }

  function makeSignalDescription(description, kind) {
    return {
      type: description.type,
      sdp: description.sdp,
      ...(kind ? { kind } : {})
    };
  }

  useEffect(() => {
    loadMatches();
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function checkMediaSupport() {
      const supportsMedia = Boolean(navigator.mediaDevices?.getUserMedia);
      const supportsCalls = typeof RTCPeerConnection !== "undefined" && typeof MediaStream !== "undefined";
      const nextSupport = { checked: true, audio: supportsMedia, video: supportsMedia, calls: supportsMedia && supportsCalls };

      if (supportsMedia && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          nextSupport.audio = devices.some((device) => device.kind === "audioinput");
          nextSupport.video = devices.some((device) => device.kind === "videoinput");
        } catch {
          nextSupport.audio = true;
          nextSupport.video = true;
        }
      }

      if (!cancelled) {
        setMediaSupport(nextSupport);
      }
    }

    checkMediaSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on("message:new", (message) => {
      if (message.matchId === matchId) {
        setMessages((current) => [...current, message]);
      }
    });
    socket.on("call:offer", ({ from, matchId: incomingMatchId, offer }) => {
      if (from === currentUserId) return;
      if (incomingMatchId && incomingMatchId !== matchId) {
        navigate(`/chat/${incomingMatchId}`);
      }
      endCall("", false);
      setIncomingCall({ from, matchId: incomingMatchId, offer });
      setStatus(`${offer.kind || "Video"} call incoming.`);
    });
    socket.on("call:answer", async ({ matchId: signalMatchId, answer }) => {
      if (signalMatchId && signalMatchId !== matchId) return;
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await addPendingIceCandidates();
      setCall((current) => current ? { ...current, state: "connected" } : current);
      setStatus("Call connected.");
    });
    socket.on("call:ice-candidate", async ({ matchId: signalMatchId, candidate }) => {
      if (!candidate) return;
      if (signalMatchId && signalMatchId !== matchId) return;
      if (!peerRef.current || !peerRef.current.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        setStatus("Could not add call connection candidate.");
      }
    });
    socket.on("call:end", ({ matchId: signalMatchId }) => {
      if (!signalMatchId || signalMatchId === matchId) {
        endCall("Call ended.", false);
      }
    });
    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, matchId, currentUserId, navigate]);

  useEffect(() => {
    if (!matchId) return;
    socketRef.current?.emit("match:join", matchId);
    api(`/api/messages/${matchId}`, { token })
      .then((data) => setMessages(data.messages))
      .catch((error) => {
        setMessages([]);
        setStatus(error.message);
      });
  }, [matchId, token]);

  useEffect(() => {
    localStreamRef.current = localStream;
    attachMediaStream(localVideoRef.current, localStream);
    remoteStreamRef.current = remoteStream;
    attachMediaStream(remoteVideoRef.current, remoteStream);
    attachMediaStream(remoteAudioRef.current, remoteStream);
  }, [localStream, remoteStream, call]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, matchId]);

  useEffect(() => () => endCall("", false), []);

  async function loadMatches() {
    const data = await api("/api/matches", { token });
    setMatches(data.matches);
  }

  async function send(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = form.get("text").trim();
    if (!canChat || !text) return;
    event.currentTarget.reset();
    await api(`/api/messages/${matchId}`, { method: "POST", token, body: { text } });
  }

  function getCallUnavailableMessage(kind) {
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "Calls need HTTPS or localhost so the browser can allow camera and microphone access.";
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return "Calls are not supported in this browser. Try Chrome, Edge, or Firefox.";
    }
    if (typeof RTCPeerConnection === "undefined" || typeof MediaStream === "undefined") {
      return "Video and voice calls are not supported in this browser.";
    }
    if (mediaSupport.checked && kind === "Video" && !mediaSupport.video) {
      return "No camera was found on this device, so video call is unavailable.";
    }
    if (mediaSupport.checked && !mediaSupport.audio) {
      return "No microphone was found on this device, so calls are unavailable.";
    }
    return "";
  }

  async function getMedia(kind) {
    const unavailableMessage = getCallUnavailableMessage(kind);
    if (unavailableMessage) {
      throw new Error(unavailableMessage);
    }

    return navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "Video" });
  }

  function getCallErrorMessage(error, action) {
    if (error.name === "NotAllowedError") {
      return action === "answer" ? "Allow camera and microphone permission to answer the call." : "Allow camera and microphone permission to start the call.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "This device does not have the camera or microphone needed for this call.";
    }
    if (error.name === "NotReadableError") {
      return "Your camera or microphone is already in use by another app.";
    }
    return error.message || (action === "answer" ? "Could not answer the call." : "Could not start the call on this device.");
  }

  async function addPendingIceCandidates() {
    if (!peerRef.current || !peerRef.current.remoteDescription) return;
    const candidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        setStatus("Could not add call connection candidate.");
      }
    }
  }

  function createPeer(stream) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      const existingTracks = remoteStreamRef.current?.getTracks() || [];
      const nextTracks = existingTracks.some((track) => track.id === event.track.id)
        ? existingTracks
        : [...existingTracks, event.track];
      const nextRemoteStream = new MediaStream(nextTracks);

      remoteStreamRef.current = nextRemoteStream;
      setRemoteStream(nextRemoteStream);
      attachMediaStream(remoteVideoRef.current, nextRemoteStream);
      attachMediaStream(remoteAudioRef.current, nextRemoteStream);

      event.track.onunmute = () => {
        attachMediaStream(remoteVideoRef.current, nextRemoteStream);
        attachMediaStream(remoteAudioRef.current, nextRemoteStream);
      };
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call:ice-candidate", {
          matchId: activeCallMatchIdRef.current || matchId,
          candidate: event.candidate
        });
      }
    };
    peer.onconnectionstatechange = () => {
      if (peerRef.current !== peer) return;
      if (["failed", "closed"].includes(peer.connectionState)) {
        endCall("Call disconnected.", false);
      }
    };

    peerRef.current = peer;
    return peer;
  }

  async function startCall(kind) {
    if (!canChat || call) return;
    try {
      const stream = await getMedia(kind);
      activeCallMatchIdRef.current = matchId;
      localStreamRef.current = stream;
      setLocalStream(stream);
      setLocalVideoReady(false);
      attachMediaStream(localVideoRef.current, stream);
      remoteStreamRef.current = null;
      setRemoteStream(null);
      setRemoteVideoReady(false);
      setCall({ kind, state: "calling" });
      const peer = createPeer(stream);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current?.emit("call:offer", { matchId, offer: makeSignalDescription(offer, kind) });
      setStatus(`${kind} call ringing.`);
    } catch (error) {
      setStatus(getCallErrorMessage(error, "start"));
    }
  }

  async function acceptCall() {
    if (!incomingCall || !matchId) return;
    const kind = incomingCall.offer.kind || "Video";
    const callMatchId = incomingCall.matchId || matchId;
    try {
      const stream = await getMedia(kind);
      activeCallMatchIdRef.current = callMatchId;
      localStreamRef.current = stream;
      setLocalStream(stream);
      setLocalVideoReady(false);
      attachMediaStream(localVideoRef.current, stream);
      remoteStreamRef.current = null;
      setRemoteStream(null);
      setRemoteVideoReady(false);
      setCall({ kind, state: "connected" });
      const peer = createPeer(stream);
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await addPendingIceCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current?.emit("call:answer", { matchId: callMatchId, answer: makeSignalDescription(answer) });
      setIncomingCall(null);
      setStatus("Call connected.");
    } catch (error) {
      setStatus(getCallErrorMessage(error, "answer"));
    }
  }

  function endCall(message = "Call ended.", notify = true) {
    peerRef.current?.close();
    peerRef.current = null;
    pendingIceCandidatesRef.current = [];
    activeCallMatchIdRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    attachMediaStream(localVideoRef.current, null);
    attachMediaStream(remoteVideoRef.current, null);
    attachMediaStream(remoteAudioRef.current, null);
    setLocalStream(null);
    setRemoteStream(null);
    setLocalVideoReady(false);
    setRemoteVideoReady(false);
    setCall(null);
    setIncomingCall(null);
    if (notify && matchId) {
      socketRef.current?.emit("call:end", { matchId });
    }
    if (message) {
      setStatus(message);
    }
  }

  const activeMatch = matches.find((match) => match._id === matchId);
  const matchedOtherUser = activeMatch?.users?.find((item) => String(item._id) !== currentUserId);
  const otherUser = matchedOtherUser || blockedPeer;
  const titleName = otherUser?.name || "Conversation";
  const isBlocked = Boolean(otherUser?.isBlockedByMe || otherUser?.hasBlockedMe || blockedUserIds.includes(String(otherUser?._id || "")));
  const canChat = Boolean(matchId && activeMatch && matchedOtherUser && !isBlocked);
  const videoUnavailableMessage = getCallUnavailableMessage("Video");
  const callsUnavailableMessage = getCallUnavailableMessage("Voice");
  const hasRemoteVideo = Boolean(remoteStream?.getVideoTracks().some((track) => track.readyState === "live"));
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().some((track) => track.readyState === "live"));
  const showRemoteVideo = hasRemoteVideo && remoteVideoReady;
  const showLocalVideo = hasLocalVideo && localVideoReady;
  const currentUserName = user?.name || "You";
  const currentUserInitial = currentUserName.trim().charAt(0).toUpperCase() || "Y";

  async function toggleBlockUser() {
    if (!otherUser) return;
    const method = isBlocked ? "DELETE" : "POST";
    const data = await api(`/api/block/${otherUser._id}`, { method, token });
    const nextBlockedUserIds = (data.blockedUsers || []).map((id) => String(id));
    setBlockedUserIds(nextBlockedUserIds);
    updateUser({ ...user, blockedUsers: data.blockedUsers || [] });
    setBlockedPeer(isBlocked ? null : otherUser);
    await loadMatches();
    setStatus(`${otherUser.name} has been ${isBlocked ? "unblocked" : "blocked"}.`);
  }

  async function reportUser() {
    if (!otherUser) return;
    const reason = window.prompt("Report reason");
    if (!reason) return;
    await api(`/api/report/${otherUser._id}`, { method: "POST", token, body: { reason } });
    setStatus("Report sent to admin.");
  }

  return (
    <section className="page">
      <div className="section-title">
        <p>Chat Page</p>
        <h1>Real-time chat</h1>
        <span>Messages are sent through Socket.io and API storage. Seen/unseen is updated when chat opens.</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="panel">
          <h2 className="mb-3 font-black">Matches</h2>
          <div className="grid gap-2">
            {matches.map((match) => (
              <Link className={`nav-link ${match._id === matchId ? "active" : ""}`} to={`/chat/${match._id}`} key={match._id}>
                Match {match._id.slice(-5)}
              </Link>
            ))}
          </div>
        </aside>
        <section className="panel grid min-h-[620px] grid-rows-[auto_1fr_auto] gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {canChat && (
                <img
                  className="h-12 w-12 rounded-lg object-cover"
                  src={imageUrl(otherUser?.profilePhoto)}
                  alt={titleName}
                />
              )}
              <div>
                <h2 className="text-xl font-black">{canChat ? titleName : matchId ? "Unavailable chat" : "Select a match"}</h2>
                {matchId && <p className="text-sm font-bold text-campus-muted">{canChat ? "Matched chat" : "Chat disabled"}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={!canChat} title={callsUnavailableMessage} onClick={() => startCall("Voice")}>Voice call</button>
              <button className="btn-secondary" disabled={!canChat} title={videoUnavailableMessage} onClick={() => startCall("Video")}>Video call</button>
              <button className="btn-secondary" disabled={!otherUser} onClick={toggleBlockUser}>{isBlocked ? "Unblock" : "Block"}</button>
              <button className="btn-secondary" disabled={!otherUser} onClick={reportUser}>Report</button>
            </div>
          </header>
          <div className="message-box">
            {messages.length === 0 && (
              <div className="empty-chat">
                <h3>{canChat ? "Start the conversation" : matchId ? "Chat is unavailable" : "Pick a match to chat"}</h3>
                <p>{canChat ? "Send a message or start a call when you are ready." : matchId ? "This match cannot exchange messages." : "Your messages will appear here after you choose a match."}</p>
              </div>
            )}
            {messages.map((message) => {
              const isMine = String(message.senderId) === currentUserId;
              return (
                <article className={`message ${isMine ? "sent" : "received"}`} key={message._id}>
                  <p>{message.text}</p>
                  <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-composer" onSubmit={send}>
            <input name="text" placeholder="Type a message" disabled={!canChat} required />
            <button className="btn-primary" disabled={!canChat} type="submit">Send</button>
          </form>
          {status && <p className="status-info">{status}</p>}
          {(call || incomingCall) && (
            <div className="call-panel">
              <div className="call-card">
                <div className="call-header">
                  <div>
                    <p>{incomingCall ? "Incoming call" : `${call.kind} call`}</p>
                    <h3>{otherUser?.name || "Your match"}</h3>
                  </div>
                  <button className="btn-secondary" type="button" onClick={() => endCall()}>End</button>
                </div>
                {incomingCall ? (
                  <div className="call-actions">
                    <button className="btn-primary" type="button" onClick={acceptCall}>Accept {incomingCall.offer.kind || "Video"} call</button>
                    <button className="btn-secondary" type="button" onClick={() => endCall("Call declined.")}>Decline</button>
                  </div>
                ) : (
                  <div className={`call-stage ${call.kind === "Voice" ? "voice-only" : ""}`}>
                    <video
                      className={`remote-video ${showRemoteVideo ? "" : "empty"}`}
                      ref={remoteVideoRef}
                      autoPlay
                      muted
                      playsInline
                      onLoadedData={() => setRemoteVideoReady(true)}
                      onPlaying={() => setRemoteVideoReady(true)}
                      onWaiting={() => setRemoteVideoReady(false)}
                      onEmptied={() => setRemoteVideoReady(false)}
                    />
                    <audio ref={remoteAudioRef} autoPlay />
                    {!showRemoteVideo && (
                      <div className="call-placeholder">
                        <h4>{call.state === "calling" ? `Calling ${otherUser?.name || "your match"}...` : "Waiting for video"}</h4>
                        <p>{call.state === "calling" ? "The video will appear after they answer." : "Audio may be connected while the camera is still unavailable."}</p>
                      </div>
                    )}
                    <div className={`local-preview ${showLocalVideo ? "ready" : "empty"}`}>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        onLoadedData={() => setLocalVideoReady(true)}
                        onPlaying={() => setLocalVideoReady(true)}
                        onWaiting={() => setLocalVideoReady(false)}
                        onEmptied={() => setLocalVideoReady(false)}
                      />
                      {!showLocalVideo && (
                        <div className="local-preview-fallback">
                          {user?.profilePhoto ? (
                            <img src={imageUrl(user.profilePhoto)} alt={currentUserName} />
                          ) : (
                            <span className="local-preview-initial">{currentUserInitial}</span>
                          )}
                          <span>{hasLocalVideo ? "Starting camera" : "Camera unavailable"}</span>
                        </div>
                      )}
                    </div>
                    {call.kind === "Voice" && <div className="voice-call-label">Voice call in progress</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
