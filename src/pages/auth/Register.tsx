import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { registerUser } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (loading) return;

    try {
      setError("");
      setLoading(true);

      await registerUser(email, password);

      alert("Verification email sent! Check your inbox.");

      navigate("/login");
    } catch (err: unknown) {
      const code = err instanceof FirebaseError ? err.code : "";

      if (code === "auth/email-already-in-use") {
        setError("Email already in use");
      } else if (code === "auth/weak-password") {
        setError("Password too weak");
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-overlay">
          <h1>CA1B Connect</h1>
          <p>Create your account and join the system</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Create Account</h2>
          <p className="subtitle">Register to continue</p>

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

          <button
            className="primary-btn"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button className="google-btn" disabled>
            Google Sign-up (coming soon)
          </button>

          <p className="switch">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
}