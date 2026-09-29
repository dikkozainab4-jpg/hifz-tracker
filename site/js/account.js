// Sign-in / account creation / password reset UI, backed by Supabase Auth.
import { supabase } from "./cloud.js";
import { $ } from "./ui.js";

const MODES = {
  signin: { title: "Welcome back", eyebrow: "SIGN IN", submit: "Sign in", email: true, password: true, autocomplete: "current-password" },
  signup: { title: "Create your account", eyebrow: "JOIN HIFZLY", submit: "Create account", email: true, password: true, autocomplete: "new-password" },
  forgot: { title: "Reset your password", eyebrow: "FORGOT PASSWORD", submit: "Send reset link", email: true, password: false },
  recovery: { title: "Choose a new password", eyebrow: "NEW PASSWORD", submit: "Save new password", email: false, password: true, autocomplete: "new-password" },
};
const MIN_PASSWORD = 8;

function friendly(error) {
  const m = String(error?.message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "That email or password doesn’t look right. Please try again.";
  if (m.includes("not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("password")) return error.message;
  if (m.includes("fetch") || m.includes("network")) return "Could not reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

export function initAccount({ onSignedIn, onSignedOut }) {
  let mode = "signin";
  let currentId = null;
  let recovering = location.hash.includes("type=recovery");

  const say = (text, kind = "info") => {
    const box = $("#auth-message");
    box.textContent = text;
    box.dataset.kind = kind;
    box.hidden = !text;
  };

  function setMode(next) {
    mode = next;
    const m = MODES[next];
    $("#auth-eyebrow").textContent = m.eyebrow;
    $("#auth-title").textContent = m.title;
    $("#auth-submit").textContent = m.submit;
    $("#auth-email-field").hidden = !m.email;
    $("#auth-password-field").hidden = !m.password;
    $("#auth-password").autocomplete = m.autocomplete ?? "off";
    $("#auth-password").required = m.password;
    $("#auth-email").required = m.email;
    $("#auth-to-signup").hidden = next !== "signin";
    $("#auth-to-signin").hidden = next === "signin" || next === "recovery";
    $("#auth-to-forgot").hidden = next !== "signin";
    say("");
  }

  const handle = (session) => {
    const id = session?.user?.id ?? null;
    if (id === currentId) return;
    currentId = id;
    if (id) onSignedIn(session.user);
    else onSignedOut();
  };

  // Never call Supabase or await inside this callback (it can deadlock the auth client), so defer.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recovering = true;
      setTimeout(() => { onSignedOut(); setMode("recovery"); }, 0);
      return;
    }
    if (recovering) return;
    setTimeout(() => handle(session), 0);
  });

  supabase.auth.getSession().then(({ data }) => {
    if (recovering) { setMode("recovery"); onSignedOut(); return; }
    handle(data.session);
  });

  $("#auth-to-signup").addEventListener("click", () => setMode("signup"));
  $("#auth-to-signin").addEventListener("click", () => setMode("signin"));
  $("#auth-to-forgot").addEventListener("click", () => setMode("forgot"));

  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const btn = $("#auth-submit");
    btn.disabled = true;
    say("");
    try {
      if ((mode === "signup" || mode === "recovery") && password.length < MIN_PASSWORD) {
        say(`Please choose a password of at least ${MIN_PASSWORD} characters.`, "error");
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + "/" } });
        if (error) throw error;
        if (!data.session) {
          setMode("signin");
          say("Almost there. We’ve sent a confirmation link to your email. Open it, then sign in.", "ok");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/" });
        if (error) throw error;
        say("If that email has an account, a reset link is on its way.", "ok");
      } else if (mode === "recovery") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        recovering = false;
        const { data } = await supabase.auth.getSession();
        history.replaceState(null, "", location.pathname);
        handle(data.session);
      }
      $("#auth-password").value = "";
    } catch (err) {
      say(friendly(err), "error");
    } finally {
      btn.disabled = false;
    }
  });

  setMode(recovering ? "recovery" : "signin");

  return {
    async signOut() {
      await supabase.auth.signOut();
      setTimeout(() => handle(null), 0);
    },
  };
}
