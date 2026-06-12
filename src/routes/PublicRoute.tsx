import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }: any) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  // if already logged in → block login page
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}