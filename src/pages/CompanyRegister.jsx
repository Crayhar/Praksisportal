import { useState } from "react";
import { leads } from "../utils/api";
import "../styles/auth.css";

export default function CompanyRegister() {
  const [form, setForm] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    wantsContact: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await leads.register(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1 style={{ color: "#347e84" }}>&#10003;</h1>
          <h2 style={{ color: "#347e84", marginTop: 0 }}>Tusen takk!</h2>
          <p style={{ color: "#374151", fontSize: "1rem" }}>
            Tusen takk for at du registrerte deg!
          </p>
          {form.wantsContact && (
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Du vil snart motta en e-post fra oss på <strong>{form.email}</strong>.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Registrer bedrift</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="companyName">Bedriftsnavn</label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={form.companyName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstName">Fornavn</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
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
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-post</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              id="wantsContact"
              name="wantsContact"
              type="checkbox"
              checked={form.wantsContact}
              onChange={handleChange}
              style={{ width: "auto", margin: 0 }}
            />
            <label htmlFor="wantsContact" style={{ margin: 0, cursor: "pointer" }}>
              Kontakt meg - jeg vil gjerne vite mer om et mulig samarbeide
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Registrerer..." : "Registrer deg"}
          </button>
        </form>
      </div>
    </div>
  );
}
