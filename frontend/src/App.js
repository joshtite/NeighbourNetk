import { useEffect, useState } from "react";
import "./App.css";

function StatusPill({ status }) {
  const label = status === "resolved"
    ? "Resolved"
    : status === "in_progress"
    ? "In progress"
    : "Open";

  const className =
    status === "resolved"
      ? "status-pill status-resolved"
      : status === "in_progress"
      ? "status-pill status-in-progress"
      : "status-pill status-open";

  return <span className={className}>{label}</span>;
}

function RequestCard({ request, onRespond }) {
  const [volunteerName, setVolunteerName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!volunteerName || !message) {
      alert("Please add your name and a message before responding.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onRespond(request.id, { volunteerName, message });
      setVolunteerName("");
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStatus =
    request.status === "open"
      ? { value: "in_progress", label: "Mark in progress" }
      : request.status === "in_progress"
      ? { value: "resolved", label: "Mark resolved" }
      : null;

  return (
    <div className="request-card">
      <div className="request-header">
        <div>
          <h4 style={{ margin: 0 }}>{request.title}</h4>
          <div className="request-meta">
            {request.category && <span className="tag">{request.category}</span>}
            {request.location && (
              <span className="tag">Near {request.location}</span>
            )}
          </div>
        </div>
        <StatusPill status={request.status} />
      </div>

      <p style={{ margin: "6px 0 4px" }}>{request.description}</p>
      <div className="request-meta">
        Posted by {request.name} •{" "}
        {new Date(request.createdAt).toLocaleString()}
      </div>

      {request.responses.length > 0 && (
        <div className="responses">
          <h5>Volunteer responses ({request.responses.length})</h5>
          {request.responses.map((r, i) => (
            <div key={i} className="response">
              <b>{r.volunteerName}:</b> {r.message}
              <br />
              <small>{new Date(r.respondedAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}

      {nextStatus && (
        <div style={{ margin: "4px 0 8px", fontSize: 11, color: "#4b5563" }}>
          Owner or volunteers can{" "}
          <button
            style={{
              padding: "4px 10px",
              fontSize: 11,
              boxShadow: "none",
              borderRadius: 999
            }}
            onClick={() => request.onChangeStatus(nextStatus.value)}
          >
            {nextStatus.label}
          </button>
        </div>
      )}

      <div className="response-form">
        <input
          placeholder="Your name"
          value={volunteerName}
          onChange={e => setVolunteerName(e.target.value)}
        />
        <input
          placeholder="How can you help?"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Respond"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [helpRequests, setHelpRequests] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Errand / daily life");
  const [location, setLocation] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem("nn-current-user");
    if (stored) return JSON.parse(stored);
    return { name: "Alex", email: "", role: "neighbour" };
  });
  const [view, setView] = useState("all"); // all | mine_requests | mine_responses
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/help-requests");
        if (!res.ok) throw new Error("Failed to fetch requests");
        const data = await res.json();
        setHelpRequests(data);
      } catch (err) {
        console.error(err);
        setError("Could not load requests. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  useEffect(() => {
    localStorage.setItem("nn-current-user", JSON.stringify(currentUser));
  }, [currentUser]);

  // Adjust default view/filters when role changes
  useEffect(() => {
    if (currentUser.role === "volunteer") {
      setView("all");
      setStatusFilter("open");
    } else {
      setView("mine_requests");
      setStatusFilter("all");
    }
  }, [currentUser.role]);

  const submitRequest = async () => {
    if (!title || !description || !name) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          name,
          category,
          location,
          createdByRole: currentUser.role
        })
      });

      if (!res.ok) throw new Error("Failed to create request");

      const newRequest = await res.json();

      setHelpRequests(prev => [newRequest, ...prev]);
      setTitle("");
      setDescription("");
      setName("");
      setLocation("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong creating your request. Please try again.");
    }
  };

  const handleRespond = async (id, payload) => {
    const res = await fetch(
      `http://localhost:5000/api/help-requests/${id}/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      alert("Could not send response. Please try again.");
      return;
    }

    const updatedRequest = await res.json();

    setHelpRequests(prev =>
      prev.map(r => (r.id === updatedRequest.id ? updatedRequest : r))
    );
  };

  const updateStatus = async (id, status) => {
    const res = await fetch(
      `http://localhost:5000/api/help-requests/${id}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }
    );

    if (!res.ok) {
      alert("Could not update status. Please try again.");
      return;
    }

    const updatedRequest = await res.json();
    setHelpRequests(prev =>
      prev.map(r => (r.id === updatedRequest.id ? updatedRequest : r))
    );
  };

  const filteredRequests = helpRequests
    .filter(req => {
      if (view === "mine_requests") {
        return req.name.toLowerCase() === currentUser.name.toLowerCase();
      }
      if (view === "mine_responses") {
        return req.responses.some(
          r =>
            r.volunteerName.toLowerCase() === currentUser.name.toLowerCase()
        );
      }
      return true;
    })
    .filter(req => {
      if (statusFilter === "all") return true;
      return req.status === statusFilter;
    })
    .filter(req => {
      if (categoryFilter === "all") return true;
      return req.category === categoryFilter;
    });

  return (
    <div className="container">
      <div className="card">
        <div className="page-header">
          <div className="page-title">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="logo-mark">N</div>
              <h2>NeighbourNetk</h2>
            </div>
            <p>
              A calm space for neighbours to ask for help and volunteers to
              respond — from errands and study support to tech questions.
            </p>
          </div>
          <div>
            <div className="pill">Full‑stack community support MVP</div>
            <div style={{ marginTop: 10 }}>
              <div className="signin-panel">
                <span>Signed in as</span>
                <input
                  type="text"
                  placeholder="Name"
                  value={currentUser.name}
                  onChange={e =>
                    setCurrentUser(prev => ({ ...prev, name: e.target.value }))
                  }
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={currentUser.email}
                  onChange={e =>
                    setCurrentUser(prev => ({ ...prev, email: e.target.value }))
                  }
                />
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="neighbour"
                    checked={currentUser.role === "neighbour"}
                    onChange={e =>
                      setCurrentUser(prev => ({
                        ...prev,
                        role: e.target.value
                      }))
                    }
                    style={{ marginRight: 4 }}
                  />
                  Neighbour
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="volunteer"
                    checked={currentUser.role === "volunteer"}
                    onChange={e =>
                      setCurrentUser(prev => ({
                        ...prev,
                        role: e.target.value
                      }))
                    }
                    style={{ marginRight: 4 }}
                  />
                  Volunteer
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="layout">
          <section>
            <div className="section-title">
              Create a new help request <span>2–3 sentences is perfect</span>
            </div>

            <div className="form-grid">
              <label>
                Title
                <input
                  placeholder="Need help with groceries this Sunday"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </label>

              <label>
                Details
                <textarea
                  placeholder="Describe what you need, any timing, and how a neighbour can help."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </label>

              <div className="inline-fields">
                <label>
                  Your name
                  <input
                    placeholder="First name is enough"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </label>
                <label>
                  Neighbourhood / area
                  <input
                    placeholder="e.g. East Dallas, Block C"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Category
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option>Errand / daily life</option>
                  <option>Study support / tutoring</option>
                  <option>Tech help</option>
                  <option>Community / events</option>
                  <option>Other</option>
                </select>
              </label>
            </div>

            <button onClick={submitRequest}>Submit help request</button>
          </section>

          <aside className="sidebar">
            <div className="section-title">
              How NeighbourNetk works
            </div>
            <p className="helper-text">
              Designed as a lightweight neighbourhood help board: residents
              share what they need, neighbours respond and coordinate outside
              the app.
            </p>
            <ul>
              <li>Post a short request with context and area.</li>
              <li>Neighbours respond with concrete offers to help.</li>
              <li>Requests can later be marked as resolved when help is done.</li>
            </ul>
          </aside>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="section-title">
            Existing help requests{" "}
            <span>
              {filteredRequests.length > 0
                ? `${filteredRequests.length} shown for this view`
                : "none yet — try adjusting filters or posting one"}
            </span>
          </div>

          <p className="helper-text" style={{ marginBottom: 6 }}>
            {currentUser.role === "volunteer"
              ? "You’re signed in as a volunteer. Browse open requests below and respond where you can help most."
              : "You’re signed in as a neighbour. Use this list to keep track of your requests and see who has responded."}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
              fontSize: 11
            }}
          >
            <div className="pill">
              View:
              <select
                style={{
                  border: "none",
                  background: "transparent",
                  marginLeft: 6,
                  fontSize: 11
                }}
                value={view}
                onChange={e => setView(e.target.value)}
              >
                <option value="all">All requests</option>
                <option value="mine_requests">Requests I created</option>
                <option value="mine_responses">Requests I’m helping with</option>
              </select>
            </div>
            <div className="pill">
              Status:
              <select
                style={{
                  border: "none",
                  background: "transparent",
                  marginLeft: 6,
                  fontSize: 11
                }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="pill">
              Category:
              <select
                style={{
                  border: "none",
                  background: "transparent",
                  marginLeft: 6,
                  fontSize: 11
                }}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option>Errand / daily life</option>
                <option>Study support / tutoring</option>
                <option>Tech help</option>
                <option>Community / events</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {loading && <p>Loading requests…</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {!loading && helpRequests.length === 0 && (
            <div className="empty-state">
              No help requests yet. Be the first neighbour to ask for help —
              for example, a quick grocery pickup or language practice.
            </div>
          )}

          {!loading &&
            filteredRequests.map(req => (
              <RequestCard
                key={req.id}
                request={{ ...req, onChangeStatus: status =>
                  updateStatus(req.id, status)
                }}
                onRespond={handleRespond}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;
