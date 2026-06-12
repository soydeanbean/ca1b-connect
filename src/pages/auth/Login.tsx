import { useEffect, useState } from "react";
import { loginUser, loginWithGoogle } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // ✅ AUTO REDIRECT (THIS FIXES GOOGLE LOGIN TOO)
  useEffect(() => {
    if (!loading && user) {
      if (!user.emailVerified) {
        setError("Please verify your email first.");
        return;
      }
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      setError("");

      const result = await loginUser(email, password);

      if (!result.user.emailVerified) {
        setError("Please verify your email first.");
        return;
      }

      // no navigate here anymore
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("Email not found");
      } else if (err.code === "auth/wrong-password") {
        setError("Wrong password");
      } else {
        setError("Login failed");
      }
    }
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
    // redirect handled automatically by AuthContext
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-overlay">
          <h1>CA1B Connect</h1>
          <p>Manage attendance, schedules, and students in one place.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Welcome Back</h2>
          <p className="subtitle">Login to continue</p>

          {error && <p className="error-text">{error}</p>}

          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="primary-btn" onClick={handleLogin}>
            Sign In
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button className="google-btn" onClick={handleGoogle}>
            Continue with Google
          </button>

          <p className="switch">
            Don’t have an account?{" "}
            <span onClick={() => navigate("/register")}>Register</span>
          </p>
        </div>
      </div>
    </div>
  );
}