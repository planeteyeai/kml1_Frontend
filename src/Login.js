import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import API_URL from "./config";
import "./Auth.css";

const TAB_SIGNIN = "signin";
const TAB_SIGNUP = "signup";

const Login = () => {
  const { login } = useAuth();
  const [tab, setTab] = useState(TAB_SIGNIN);

  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);

  const switchTab = (next) => {
    setTab(next);
    setSignInError("");
    setSignUpError("");
    setSignUpSuccess("");
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInError("");

    const username = signInUsername.trim();
    const password = signInPassword;

    if (!username || !password) {
      setSignInError("Please enter username and password.");
      return;
    }

    setSignInLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        login({ username: data.username || username }, data.token || "");
        return;
      }
      setSignInError(data.message || "Invalid username or password.");
    } catch (err) {
      setSignInError("Cannot reach the server. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess("");

    const username = signUpUsername.trim();
    const password = signUpPassword;
    const confirm = signUpConfirm;

    if (!username || !password) {
      setSignUpError("Please choose a username and password.");
      return;
    }
    if (username.length < 3) {
      setSignUpError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 4) {
      setSignUpError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirm) {
      setSignUpError("Passwords do not match.");
      return;
    }

    setSignUpLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSignUpSuccess("Account created. Signing you in...");
        try {
          const loginRes = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.success) {
            login({ username: loginData.username || username }, loginData.token || "");
            return;
          }
        } catch (_) {
          // fall through to manual sign-in switch
        }
        setSignUpUsername("");
        setSignUpPassword("");
        setSignUpConfirm("");
        setSignInUsername(username);
        setSignInPassword("");
        switchTab(TAB_SIGNIN);
        return;
      }
      setSignUpError(data.message || "Could not create account.");
    } catch (err) {
      setSignUpError("Cannot reach the server. Please try again.");
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark" />
          <div className="auth-brand-text">
            <span className="auth-brand-title">KML Tools</span>
            <span className="auth-brand-subtitle">Road & distress workspace</span>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication">
          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB_SIGNIN}
            className={`auth-tab ${tab === TAB_SIGNIN ? "is-active" : ""}`}
            onClick={() => switchTab(TAB_SIGNIN)}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB_SIGNUP}
            className={`auth-tab ${tab === TAB_SIGNUP ? "is-active" : ""}`}
            onClick={() => switchTab(TAB_SIGNUP)}
          >
            Create account
          </button>
        </div>

        {tab === TAB_SIGNIN ? (
          <form onSubmit={handleSignIn} className="auth-form" noValidate>
            <h2 className="auth-heading">Welcome back</h2>
            <p className="auth-sub">Sign in to continue to your workspace.</p>

            {signInError && <div className="auth-error">{signInError}</div>}

            <div className="auth-input-group">
              <label htmlFor="signin-username">Username</label>
              <input
                id="signin-username"
                type="text"
                autoComplete="username"
                value={signInUsername}
                onChange={(e) => setSignInUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={signInLoading}
            >
              {signInLoading ? "Signing in..." : "Sign in"}
            </button>

            <p className="auth-switch">
              New here?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => switchTab(TAB_SIGNUP)}
              >
                Create an account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="auth-form" noValidate>
            <h2 className="auth-heading">Create your account</h2>
            <p className="auth-sub">
              Your credentials are stored on the server. Nothing is saved on this
              device.
            </p>

            {signUpError && <div className="auth-error">{signUpError}</div>}
            {signUpSuccess && <div className="auth-success">{signUpSuccess}</div>}

            <div className="auth-input-group">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={signUpUsername}
                onChange={(e) => setSignUpUsername(e.target.value)}
                placeholder="Choose a username (min 3 chars)"
                required
                minLength={3}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                placeholder="Choose a password (min 4 chars)"
                required
                minLength={4}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={signUpConfirm}
                onChange={(e) => setSignUpConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={4}
              />
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={signUpLoading}
            >
              {signUpLoading ? "Creating account..." : "Create account"}
            </button>

            <p className="auth-switch">
              Already have an account?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => switchTab(TAB_SIGNIN)}
              >
                Sign in instead
              </button>
            </p>
          </form>
        )}

        <p className="auth-note">
          Session-only login &mdash; your username and password are not saved on
          this device.
        </p>
      </div>
    </div>
  );
};

export default Login;
