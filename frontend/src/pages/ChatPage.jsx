import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, imageUrl } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";
import { useAppSocket } from "../state/SocketContext.jsx";

const chatEmojis = ["😀", "😂", "😍", "🥰", "😊", "😎", "😢", "😮", "👍", "❤️", "🔥", "✨", "🎉", "🙏", "💬"];

export default function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, updateUser } = useAuth();
  const { socket, incomingCall, clearIncomingCall } = useAppSocket() || {};
  const [matches, setMatches] = useState([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [blockedPeer, setBlockedPeer] = useState(null);
  const [call, setCall] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [mediaSupport, setMediaSupport] = useState({ checked: false, audio: false, video: false, calls: false });
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const peerRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const activeCallMatchIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUserId = String(user?._id || user?.id || "");
  const activeMatch = matches.find((match) => match._id === matchId);
  const matchedOtherUser = activeMatch?.users?.find((item) => String(item._id) !== currentUserId);
  const otherUser = matchedOtherUser || blockedPeer;
  const routeIncomingCall = location.state?.incomingCall;
  const activeIncomingCall = incomingCall?.matchId === matchId
    ? incomingCall
    : routeIncomingCall?.matchId === matchId
      ? routeIncomingCall
      : null;
  const titleName = otherUser?.name || "Conversation";
  const isBlocked = Boolean(otherUser?.isBlockedByMe || otherUser?.hasBlockedMe || blockedUserIds.includes(String(otherUser?._id || "")));
  const canChat = Boolean(matchId && activeMatch && matchedOtherUser && !isBlocked);
  const isOtherOnline = Boolean(otherUser?._id && onlineUserIds.includes(String(otherUser._id)));
  const isOtherTyping = Boolean(otherUser?._id && typingUserIds.includes(String(otherUser._id)));
  const currentUserName = user?.name || "You";
  const currentUserInitial = currentUserName.trim().charAt(0).toUpperCase() || "Y";

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
    if (!socket) return undefined;
    const handleNewMessage = (message) => {
      if (message.matchId === matchId) {
        setMessages((current) => [...current, message]);
        if (String(message.senderId) !== currentUserId) {
          socket.emit("messages:seen", { matchId });
        }
      }
    };
    const handleCallAnswer = async ({ matchId: signalMatchId, answer }) => {
      if (signalMatchId && signalMatchId !== matchId) return;
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await addPendingIceCandidates();
      setCall((current) => current ? { ...current, state: "connected" } : current);
      setStatus("Call connected.");
    };
    const handleIceCandidate = async ({ matchId: signalMatchId, candidate }) => {
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
    };
    const handleCallEnd = ({ matchId: signalMatchId }) => {
      if (!signalMatchId || signalMatchId === matchId) {
        endCall("Call ended.", false);
      }
    };
    const handleTypingStart = ({ from, matchId: typingMatchId }) => {
      if (typingMatchId !== matchId || String(from) === currentUserId) return;
      setTypingUserIds((current) => current.includes(String(from)) ? current : [...current, String(from)]);
    };
    const handleTypingStop = ({ from, matchId: typingMatchId }) => {
      if (typingMatchId !== matchId) return;
      setTypingUserIds((current) => current.filter((id) => id !== String(from)));
    };
    const handleMessagesSeen = ({ matchId: seenMatchId, seenBy }) => {
      if (seenMatchId !== matchId || String(seenBy) === currentUserId) return;
      setMessages((current) => current.map((message) => {
        if (String(message.senderId) !== currentUserId) return message;
        const seenByList = (message.seenBy || []).map((id) => String(id));
        if (seenByList.includes(String(seenBy))) return message;
        return { ...message, seenBy: [...(message.seenBy || []), seenBy] };
      }));
    };
    const handleMessagesDeleted = ({ matchId: deletedMatchId, messageIds = [] }) => {
      if (deletedMatchId !== matchId) return;
      const deletedIds = messageIds.map((id) => String(id));
      setMessages((current) => current.filter((message) => !deletedIds.includes(String(message._id))));
      setSelectedMessageIds((current) => current.filter((id) => !deletedIds.includes(String(id))));
      setActiveMessageId((current) => deletedIds.includes(String(current)) ? "" : current);
    };
    const handlePresenceUpdate = ({ userId, online }) => {
      setOnlineUserIds((current) => {
        const id = String(userId);
        if (online) return current.includes(id) ? current : [...current, id];
        return current.filter((item) => item !== id);
      });
    };
    const handlePresenceList = ({ users = [] }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        users.forEach(({ userId, online }) => {
          if (online) next.add(String(userId));
          else next.delete(String(userId));
        });
        return [...next];
      });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleCallEnd);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("messages:seen", handleMessagesSeen);
    socket.on("messages:deleted", handleMessagesDeleted);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("presence:list", handlePresenceList);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleCallEnd);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("messages:seen", handleMessagesSeen);
      socket.off("messages:deleted", handleMessagesDeleted);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("presence:list", handlePresenceList);
    };
  }, [socket, matchId, currentUserId]);

  useEffect(() => {
    if (!matchId) return;
    if (!matchesLoaded) return;
    if (!activeMatch) {
      setMessages([]);
      setActiveMessageId("");
      setSelectedMessageIds([]);
      setStatus("Match not found");
      return;
    }
    socket?.emit("match:join", matchId);
    api(`/api/messages/${matchId}`, { token })
      .then((data) => {
        setMessages(data.messages);
        setActiveMessageId("");
        setSelectedMessageIds([]);
        socket?.emit("messages:seen", { matchId });
      })
      .catch((error) => {
        setMessages([]);
        setStatus(error.message);
      });
  }, [matchId, token, socket, matchesLoaded, activeMatch]);

  useEffect(() => {
    if (!socket || !matchedOtherUser?._id) return;
    socket.emit("presence:check", { userIds: [matchedOtherUser._id] });
  }, [socket, matchedOtherUser?._id]);

  useEffect(() => {
    setTypingUserIds([]);
    setShowEmojiPicker(false);
    setActiveMessageId("");
    setSelectedMessageIds([]);
    clearTimeout(typingTimeoutRef.current);
    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket?.emit("typing:stop", { matchId });
    };
  }, [matchId, socket]);

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
    setMatchesLoaded(false);
    try {
      const data = await api("/api/matches", { token });
      setMatches(data.matches);
    } catch (error) {
      setMatches([]);
      setStatus(error.message);
    } finally {
      setMatchesLoaded(true);
    }
  }

  async function send(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = String(form.get("text") || "").trim();
    const image = form.get("image");
    const hasImage = image instanceof File && image.size > 0;
    if (!canChat || (!text && !hasImage)) return;
    event.currentTarget.reset();
    stopTyping();
    setShowEmojiPicker(false);
    if (hasImage) {
      const body = new FormData();
      body.set("text", text);
      body.set("image", image);
      await api(`/api/messages/${matchId}`, { method: "POST", token, body, isForm: true, timeout: 30000 });
      return;
    }
    await api(`/api/messages/${matchId}`, { method: "POST", token, body: { text } });
  }

  function stopTyping() {
    clearTimeout(typingTimeoutRef.current);
    socket?.emit("typing:stop", { matchId });
  }

  function handleTyping() {
    if (!canChat || !matchId) return;
    socket?.emit("typing:start", { matchId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 1200);
  }

  function addEmoji(emoji) {
    const input = messageInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
    input.focus();
    input.setSelectionRange(start + emoji.length, start + emoji.length);
    handleTyping();
  }

  function isMessageSelected(messageId) {
    return selectedMessageIds.includes(String(messageId));
  }

  function toggleMessageSelection(messageId) {
    const id = String(messageId);
    setSelectedMessageIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function handleMessagePress(messageId) {
    if (selectedMessageIds.length) {
      toggleMessageSelection(messageId);
      return;
    }
    setActiveMessageId((current) => current === messageId ? "" : messageId);
  }

  function startSelecting(messageId) {
    setActiveMessageId("");
    setSelectedMessageIds([String(messageId)]);
  }

  function clearMessageSelection() {
    setActiveMessageId("");
    setSelectedMessageIds([]);
  }

  async function deleteMessages(messageIds = selectedMessageIds) {
    const ids = messageIds.map((id) => String(id));
    if (!ids.length || !matchId) return;
    await api(`/api/messages/${matchId}`, { method: "DELETE", token, body: { messageIds: ids } });
    setMessages((current) => current.filter((message) => !ids.includes(String(message._id))));
    clearMessageSelection();
    setStatus(ids.length === 1 ? "Message deleted." : "Messages deleted.");
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
        socket?.emit("call:ice-candidate", {
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
      socket?.emit("call:offer", { matchId, offer: makeSignalDescription(offer, kind) });
      setStatus(`${kind} call ringing.`);
    } catch (error) {
      setStatus(getCallErrorMessage(error, "start"));
    }
  }

  async function acceptCall() {
    if (!activeIncomingCall || !matchId) return;
    const kind = activeIncomingCall.offer.kind || "Video";
    const callMatchId = activeIncomingCall.matchId || matchId;
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
      await peer.setRemoteDescription(new RTCSessionDescription(activeIncomingCall.offer));
      await addPendingIceCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket?.emit("call:answer", { matchId: callMatchId, answer: makeSignalDescription(answer) });
      clearIncomingCall?.();
      setStatus("Call connected.");
    } catch (error) {
      setStatus(getCallErrorMessage(error, "answer"));
    }
  }

  function endCall(message = "Call ended.", notify = true) {
    const notifyMatchId = activeCallMatchIdRef.current || matchId;
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
    clearIncomingCall?.();
    if (notify && notifyMatchId) {
      socket?.emit("call:end", { matchId: notifyMatchId });
    }
    if (message) {
      setStatus(message);
    }
  }

  const videoUnavailableMessage = getCallUnavailableMessage("Video");
  const callsUnavailableMessage = getCallUnavailableMessage("Voice");
  const hasRemoteVideo = Boolean(remoteStream?.getVideoTracks().some((track) => track.readyState === "live"));
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().some((track) => track.readyState === "live"));
  const showRemoteVideo = hasRemoteVideo && remoteVideoReady;
  const showLocalVideo = hasLocalVideo && localVideoReady;

  useEffect(() => {
    if (!activeIncomingCall || call) return;
    setStatus(`${activeIncomingCall.offer?.kind || "Video"} call incoming.`);
  }, [activeIncomingCall?.receivedAt, matchId, call]);

  useEffect(() => {
    if (!activeIncomingCall) return;
    if (location.state?.acceptIncomingCallAt !== activeIncomingCall.receivedAt) return;
    acceptCall();
    navigate(location.pathname, { replace: true, state: {} });
  }, [activeIncomingCall?.receivedAt, matchId, location.state?.acceptIncomingCallAt]);

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
                {matchId && (
                  <p className="text-sm font-bold text-campus-muted">
                    {canChat ? (isOtherTyping ? "Typing..." : isOtherOnline ? "Online" : "Offline") : "Chat disabled"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={!canChat} title={callsUnavailableMessage} onClick={() => startCall("Voice")}>Voice call</button>
              <button className="btn-secondary" disabled={!canChat} title={videoUnavailableMessage} onClick={() => startCall("Video")}>Video call</button>
              <button className="btn-secondary" disabled={!otherUser} onClick={toggleBlockUser}>{isBlocked ? "Unblock" : "Block"}</button>
              <button className="btn-secondary" disabled={!otherUser} onClick={reportUser}>Report</button>
            </div>
          </header>
          {selectedMessageIds.length > 0 && (
            <div className="message-selection-bar">
              <span>{selectedMessageIds.length} selected</span>
              <div>
                <button className="btn-secondary" type="button" onClick={clearMessageSelection}>Cancel</button>
                <button className="btn-primary" type="button" onClick={() => deleteMessages()}>Delete</button>
              </div>
            </div>
          )}
          <div className={`message-box ${selectedMessageIds.length ? "selecting" : ""}`}>
            {messages.length === 0 && (
              <div className="empty-chat">
                <h3>{canChat ? "Start the conversation" : matchId ? "Chat is unavailable" : "Pick a match to chat"}</h3>
                <p>{canChat ? "Send a message or start a call when you are ready." : matchId ? "This match cannot exchange messages." : "Your messages will appear here after you choose a match."}</p>
              </div>
            )}
            {messages.map((message) => {
              const isMine = String(message.senderId) === currentUserId;
              const isSeen = isMine && otherUser?._id && (message.seenBy || []).some((id) => String(id) === String(otherUser._id));
              const selected = isMessageSelected(message._id);
              const showActions = activeMessageId === message._id && selectedMessageIds.length === 0;
              return (
                <article
                  className={`message ${isMine ? "sent" : "received"} ${selected ? "selected" : ""}`}
                  key={message._id}
                  onClick={() => handleMessagePress(message._id)}
                >
                  {selectedMessageIds.length > 0 && (
                    <span className="message-select-check" aria-hidden="true">{selected ? "OK" : ""}</span>
                  )}
                  {message.imageUrl && (
                    <a
                      href={imageUrl(message.imageUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="message-image-link"
                      onClick={(event) => {
                        if (selectedMessageIds.length) {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleMessageSelection(message._id);
                          return;
                        }
                        if (activeMessageId !== message._id) {
                          event.preventDefault();
                          handleMessagePress(message._id);
                        }
                        event.stopPropagation();
                      }}
                    >
                      <img src={imageUrl(message.imageUrl)} alt="Shared in chat" />
                    </a>
                  )}
                  {message.text && <p>{message.text}</p>}
                  <span>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMine && ` | ${isSeen ? "Seen" : "Unseen"}`}
                  </span>
                  {showActions && (
                    <div className="message-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => deleteMessages([message._id])}>Delete</button>
                      <button type="button" onClick={() => startSelecting(message._id)}>Select more</button>
                    </div>
                  )}
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-composer" onSubmit={send}>
            <div className="chat-input-wrap">
              <button
                className="chat-emoji-btn"
                type="button"
                disabled={!canChat}
                aria-label="Open emoji picker"
                onClick={() => setShowEmojiPicker((value) => !value)}
              >
                :)
              </button>
              <input
                ref={imageInputRef}
                className="sr-only"
                name="image"
                type="file"
                accept="image/*"
                disabled={!canChat}
              />
              <button
                className="chat-emoji-btn"
                type="button"
                disabled={!canChat}
                aria-label="Add image"
                title="Add image"
                onClick={() => imageInputRef.current?.click()}
              >
                +
              </button>
              <input
                name="text"
                ref={messageInputRef}
                placeholder="Type a message"
                disabled={!canChat}
                onChange={handleTyping}
                onBlur={stopTyping}
              />
              {showEmojiPicker && (
                <div className="emoji-picker" role="menu" aria-label="Emoji picker">
                  {chatEmojis.map((emoji) => (
                    <button key={emoji} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addEmoji(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-primary" disabled={!canChat} type="submit">Send</button>
          </form>
          {status && <p className="status-info">{status}</p>}
          {call && (
            <div className="call-panel">
              <div className="call-card">
                <div className="call-header">
                  <div>
                    <p>{`${call.kind} call`}</p>
                    <h3>{otherUser?.name || "Your match"}</h3>
                  </div>
                  <button className="btn-secondary" type="button" onClick={() => endCall()}>End</button>
                </div>
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
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
