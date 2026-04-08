import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { auth, token } from "../utils/api";
import "../styles/auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const { setUser, setUserRole } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    website: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passordene stemmer ikke overens");
      return;
    }

    if (formData.password.length < 6) {
      setError("Passord må være minst 6 tegn");
      return;
    }

    setLoading(true);

    try {
      const data = await auth.signup(
        formData.email,
        formData.password,
        formData.role === "company" ? formData.companyName : formData.firstName,
        formData.role === "company" ? "" : formData.lastName,
        formData.role,
        formData.role === "company" ? formData.website : undefined
      );
      token.set(data.token);
      setUser(data.user);
      setUserRole(data.user.role);
      navigate(formData.role === "student" ? "/profile" : "/chatbot");
    } catch (err) {
      setError(err.message || "Registrering mislyktes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Registrer deg</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          {formData.role === "company" ? (
            <>
              <div className="form-group">
                <label htmlFor="companyName">Bedriftsnavn</label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="website">Nettside</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="firstName">Fornavn</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Etternavn</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">E-post</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Jeg er</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="company">Bedrift</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Passord</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Gjenta passord</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Registrerer..." : "Registrer deg"}
          </button>
        </form>

        <p>
          Har du allerede konto? <a href="/login">Logg inn</a>
        </p>
      </div>
    </div>
  );
}
