import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { imageUrl } from "../utils/api.js";
import { useAppSocket } from "../state/SocketContext.jsx";

export default function IncomingCallOverlay() {
  const navigate = useNavigate();
  const { incomingCall, declineIncomingCall } = useAppSocket() || {};
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    setAccepting(false);
  }, [incomingCall?.receivedAt]);

  if (!incomingCall || accepting) return null;

  const kind = incomingCall.offer?.kind || "Video";
  const callerName = incomingCall.fromUser?.name || "Your match";

  function acceptCall() {
    setAccepting(true);
    navigate(`/chat/${incomingCall.matchId}`, {
      state: {
        acceptIncomingCallAt: incomingCall.receivedAt,
        incomingCall
      }
    });
  }

  return (
    <div className="incoming-call-screen" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="incoming-call-card">
        <div className="incoming-call-pulse" aria-hidden="true">
          {incomingCall.fromUser?.profilePhoto ? (
            <img src={imageUrl(incomingCall.fromUser.profilePhoto)} alt="" />
          ) : (
            <span>{callerName.trim().charAt(0).toUpperCase() || (kind === "Voice" ? "V" : "C")}</span>
          )}
        </div>
        <p>{kind} call incoming</p>
        <h2>{callerName}</h2>
        <div className="incoming-call-actions">
          <button className="btn-secondary" type="button" onClick={declineIncomingCall}>Decline</button>
          <button className="btn-primary" type="button" onClick={acceptCall}>Accept</button>
        </div>
      </div>
    </div>
  );
}
