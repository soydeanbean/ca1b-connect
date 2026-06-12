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

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      setError("");

      const credential = await loginUser(email, password);

      if (!credential.user.emailVerified) {
        setError("Please verify your email first.");
        return;
      }

      navigate("/");
    } catch (err: any) {
      switch (err.code) {
        case "auth/user-not-found":
          setError("Email not found");
          break;

        case "auth/wrong-password":
          setError("Wrong password");
          break;

        case "auth/invalid-credential":
          setError("Invalid email or password");
          break;

        default:
          console.error(err);
          setError("Login failed");
      }
    }
  };

  const handleGoogle = async () => {
    try {
      setError("");
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error("GOOGLE ERROR:", err);
      setError(err.code || err.message);
    }
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
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
            Don't have an account?{" "}
            <span onClick={() => navigate("/register")}>
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}