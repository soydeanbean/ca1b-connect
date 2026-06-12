import { useState } from "react";
import { loginUser, loginWithGoogle } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    await loginUser(email, password);
    navigate("/");
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
    navigate("/");
  };

  return (
    <div className="auth-container">

      {/* LEFT SIDE */}
      <div className="auth-left">
        <div className="auth-overlay">
          <h1>CA1B Connect</h1>
          <p>Manage attendance, schedules, and students in one place.</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-right">

        <div className="auth-box">
          <h2>Welcome Back</h2>
          <p className="subtitle">Login to continue</p>

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
            Don’t have an account? <span onClick={() => navigate("/register")}>Register</span>
          </p>
        </div>

      </div>

    </div>
  );
}