import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api, imageUrl } from "../utils/api.js";
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
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const currentUserId = String(user?._id || user?.id || "");

  useEffect(() => {
    setBlockedUserIds((user?.blockedUsers || []).map((id) => String(id)));
  }, [user?.blockedUsers]);

  function attachMediaStream(videoElement, stream) {
    if (!videoElement || videoElement.srcObject === stream) return;
    videoElement.srcObject = stream;
    if (stream) {
      videoElement.play?.().catch(() => {});
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
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8000", { auth: { token } });
    socketRef.current.on("message:new", (message) => {
      if (message.matchId === matchId) {
        setMessages((current) => [...current, message]);
      }
    });
    socketRef.current.on("call:offer", ({ from, matchId: incomingMatchId, offer }) => {
      if (from === currentUserId) return;
      if (incomingMatchId && incomingMatchId !== matchId) {
        navigate(`/chat/${incomingMatchId}`);
      }
      endCall("", false);
      setIncomingCall({ from, matchId: incomingMatchId, offer });
      setStatus(`${offer.kind || "Video"} call incoming.`);
    });
    socketRef.current.on("call:answer", async ({ matchId: signalMatchId, answer }) => {
      if (signalMatchId && signalMatchId !== matchId) return;
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await addPendingIceCandidates();
      setCall((current) => current ? { ...current, state: "connected" } : current);
      setStatus("Call connected.");
    });
    socketRef.current.on("call:ice-candidate", async ({ matchId: signalMatchId, candidate }) => {
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
    socketRef.current.on("call:end", ({ matchId: signalMatchId }) => {
      if (!signalMatchId || signalMatchId === matchId) {
        endCall("Call ended.", false);
      }
    });
    return () => socketRef.current.disconnect();
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
  }, [localStream, remoteStream, call]);

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

  async function getMedia(kind) {
    return navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "Video" });
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
      const [streamFromEvent] = event.streams;
      if (streamFromEvent) {
        setRemoteStream(streamFromEvent);
        return;
      }
      const currentRemoteStream = remoteStreamRef.current || new MediaStream();
      currentRemoteStream.addTrack(event.track);
      remoteStreamRef.current = currentRemoteStream;
      setRemoteStream(currentRemoteStream);
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call:ice-candidate", { matchId, candidate: event.candidate });
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
      localStreamRef.current = stream;
      setLocalStream(stream);
      attachMediaStream(localVideoRef.current, stream);
      setRemoteStream(new MediaStream());
      setCall({ kind, state: "calling" });
      const peer = createPeer(stream);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current?.emit("call:offer", { matchId, offer: makeSignalDescription(offer, kind) });
      setStatus(`${kind} call ringing.`);
    } catch (error) {
      setStatus(error.name === "NotAllowedError" ? "Allow camera and microphone permission to start the call." : "Could not start the call on this device.");
    }
  }

  async function acceptCall() {
    if (!incomingCall || !matchId) return;
    const kind = incomingCall.offer.kind || "Video";
    const callMatchId = incomingCall.matchId || matchId;
    try {
      const stream = await getMedia(kind);
      localStreamRef.current = stream;
      setLocalStream(stream);
      attachMediaStream(localVideoRef.current, stream);
      setRemoteStream(new MediaStream());
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
      setStatus(error.name === "NotAllowedError" ? "Allow camera and microphone permission to answer the call." : "Could not answer the call.");
    }
  }

  function endCall(message = "Call ended.", notify = true) {
    peerRef.current?.close();
    peerRef.current = null;
    pendingIceCandidatesRef.current = [];
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    attachMediaStream(localVideoRef.current, null);
    attachMediaStream(remoteVideoRef.current, null);
    setLocalStream(null);
    setRemoteStream(null);
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
              <button className="btn-secondary" disabled={!canChat} onClick={() => startCall("Voice")}>Voice call</button>
              <button className="btn-secondary" disabled={!canChat} onClick={() => startCall("Video")}>Video call</button>
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
                    <video className="remote-video" ref={remoteVideoRef} autoPlay playsInline />
                    <video className="local-video" ref={localVideoRef} autoPlay muted playsInline />
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
