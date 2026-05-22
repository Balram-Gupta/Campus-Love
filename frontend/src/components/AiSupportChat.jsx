import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const suggestions = [
  "How do I sign up?",
  "Why is my account pending?",
  "How does matching work?",
  "Why is chat disabled?",
  "How do I report someone?"
];

const siteKnowledge = [
  {
    title: "Signup and OTP",
    path: "/signup",
    keywords: ["signup", "sign up", "register", "create account", "otp", "verify email", "email verification", "student id", "id card"],
    answer:
      "To create a CampusLove account, open Signup, enter your email, request the 6-digit OTP, verify it, then complete your profile. Signup needs your name, password, age above 18, gender, department, course, semester, roll number, bio, interests, student ID card image, and profile photo. After submission, an admin must approve your ID before you can log in and use swipe, matches, chat, voice call, or video call."
  },
  {
    title: "Login",
    path: "/login",
    keywords: ["login", "log in", "signin", "sign in", "cannot login", "can't login", "approved"],
    answer:
      "You can log in only after your account is approved by an admin. Use the same email and password you created during signup. If login says your account status is pending, rejected, or blocked, the account is not currently approved for the user app."
  },
  {
    title: "Password reset",
    path: "/forgot-password",
    keywords: ["password", "forgot", "reset", "new password", "recover"],
    answer:
      "Use Forgot password on the login page. Enter your email, request the OTP, then submit the OTP with a new password and matching confirmation. Passwords must be at least 8 characters."
  },
  {
    title: "Pending approval",
    path: "/pending",
    keywords: ["pending", "approval", "approved", "verification", "waiting", "admin review", "rejected", "id approval"],
    answer:
      "After signup, your profile goes to admin verification. The admin reviews the uploaded student ID card and either approves or rejects the account. Until approval, login, swipe, chat, voice call, and video call stay locked."
  },
  {
    title: "Swipe",
    path: "/swipe",
    keywords: ["swipe", "discover", "like", "skip", "profiles", "students", "no more profiles"],
    answer:
      "The Swipe page shows approved student profiles. Use Like to show interest or Skip to move on. If both students like each other, CampusLove creates a match and chat becomes available. If there are no cards, there are no more verified profiles available right now."
  },
  {
    title: "Matches",
    path: "/matches",
    keywords: ["match", "matches", "matched", "mutual", "open chat"],
    answer:
      "The Matches page lists people where both sides liked each other. Open a match from there to start real-time chat, voice call, or video call."
  },
  {
    title: "Chat and calls",
    path: "/chat",
    keywords: ["chat", "message", "messages", "real time", "socket", "voice", "video", "call", "camera", "microphone", "disabled"],
    answer:
      "Chat works only after a mutual match and while neither person has blocked the other. Messages are saved through the API and delivered in real time with Socket.io. Voice and video calls are available inside an active matched chat; the browser must allow microphone permission, and video calls also need camera permission."
  },
  {
    title: "Profile",
    path: "/profile",
    keywords: ["profile", "bio", "interests", "photo", "photos", "gallery", "department", "course", "semester", "gender preference", "age"],
    answer:
      "Use Profile to update your name, age, department, course, semester, gender preference, bio, interests, profile photo, and extra gallery photos. Extra photos can be selected and deleted from the uploaded pictures section."
  },
  {
    title: "Safety",
    path: "/settings",
    keywords: ["block", "unblock", "report", "safety", "privacy", "abuse", "harassment", "settings"],
    answer:
      "CampusLove has blocking and reporting. In Chat, use Block to stop contact or Report to send a safety report to admins. Settings shows people you blocked and lets you unblock them. The privacy guidance is to never share your phone number, exact location, dorm room, timetable, or student ID image with other users."
  },
  {
    title: "Notifications",
    path: "/swipe",
    keywords: ["notification", "notifications", "announcement", "bell", "alert"],
    answer:
      "Notifications appear from the bell in the app header after login. They can include account updates, admin announcements, and other app alerts. New notifications can arrive live through Socket.io."
  },
  {
    title: "Admin",
    path: "/admin/login",
    keywords: ["admin", "dashboard", "approve", "reject", "fake account", "reports", "announcement", "block user"],
    answer:
      "Admins use the admin login and dashboard to review pending users, approve or reject student ID verification, delete fake accounts, block users, manage safety reports, and send announcements."
  },
  {
    title: "App overview",
    path: "/",
    keywords: ["feature", "features", "about", "what is", "how works", "campuslove", "site", "website", "web app"],
    answer:
      "CampusLove is a campus-only dating web app. Its main features are email OTP signup, student ID verification, admin approval, swipe discovery, mutual matches, real-time chat, voice and video calls, profile editing, gallery photos, notifications, reporting, blocking, privacy settings, and an admin dashboard."
  }
];

const quickReplies = {
  hello: "Hi. I am CampusLove AI, the site assistant. Ask me about signup, OTP, approval, swipe, matches, chat, calls, profile, safety, notifications, or admin features.",
  thanks: "You are welcome. I can also point you to the correct page if you are stuck in the web app."
};

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreEntry(question, entry) {
  return entry.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) return score;
    if (question === normalizedKeyword) return score + 8;
    if (question.includes(normalizedKeyword)) return score + 4;
    return normalizedKeyword.split(" ").some((part) => part.length > 3 && question.includes(part)) ? score + 1 : score;
  }, 0);
}

function getCurrentPageHint(pathname) {
  const current = siteKnowledge.find((entry) => pathname === entry.path || (entry.path !== "/" && pathname.startsWith(entry.path)));
  return current ? `You are currently around ${current.title}. ` : "";
}

function answerQuestion(rawQuestion, pathname, user) {
  const question = normalize(rawQuestion);
  if (!question) {
    return {
      text: "Ask me a question about how the CampusLove web app works.",
      path: null
    };
  }

  if (["hi", "hello", "hey"].some((word) => question === word || question.startsWith(`${word} `))) {
    return { text: quickReplies.hello, path: null };
  }

  if (["thanks", "thank you", "thx"].some((word) => question.includes(word))) {
    return { text: quickReplies.thanks, path: null };
  }

  const ranked = siteKnowledge
    .map((entry) => ({ ...entry, score: scoreEntry(question, entry) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (!best || best.score === 0) {
    return {
      text:
        "I can help with CampusLove web-app questions only: signup, OTP, approval, login, swipe, matches, chat, calls, profile, notifications, safety, reports, blocking, and admin review. Try asking about one of those features.",
      path: null
    };
  }

  const userHint = user
    ? `You are signed in as ${user.name || "a CampusLove user"}. `
    : "You are not signed in right now. ";
  return {
    text: `${getCurrentPageHint(pathname)}${userHint}${best.answer}`,
    path: best.path,
    title: best.title
  };
}

export default function AiSupportChat() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I am CampusLove AI. Ask me anything about this web app."
    }
  ]);

  const routeLabel = useMemo(() => {
    const entry = siteKnowledge.find((item) => location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)));
    return entry?.title || "CampusLove";
  }, [location.pathname]);

  function ask(question) {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) return;
    const reply = answerQuestion(cleanQuestion, location.pathname, user);
    setMessages((current) => [
      ...current,
      { role: "user", text: cleanQuestion },
      { role: "assistant", text: reply.text, path: reply.path, title: reply.title }
    ]);
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    ask(form.get("question"));
    event.currentTarget.reset();
  }

  return (
    <div className="ai-chat">
      {open && (
        <section className="ai-chat-panel" aria-label="CampusLove AI chat">
          <header className="ai-chat-header">
            <div>
              <p>CampusLove AI</p>
              <h2>Site help</h2>
            </div>
            <button className="ai-icon-btn" type="button" aria-label="Close AI chat" onClick={() => setOpen(false)}>
              X
            </button>
          </header>

          <div className="ai-chat-context">
            <span>Current page</span>
            <strong>{routeLabel}</strong>
          </div>

          <div className="ai-chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                <p>{message.text}</p>
                {message.path && (
                  <Link className="ai-message-link" to={message.path}>
                    Open {message.title}
                  </Link>
                )}
              </article>
            ))}
          </div>

          <div className="ai-suggestions">
            {suggestions.map((item) => (
              <button key={item} type="button" onClick={() => ask(item)}>
                {item}
              </button>
            ))}
          </div>

          <form className="ai-chat-form" onSubmit={submit}>
            <input name="question" placeholder="Ask about this site" autoComplete="off" />
            <button className="btn-primary" type="submit">Ask</button>
          </form>
        </section>
      )}

      <button className="ai-chat-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        AI
      </button>
    </div>
  );
}
