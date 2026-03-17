import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

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
  const [authUser, setAuthUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("signin"); // or signup
  const [authMessage, setAuthMessage] = useState("");

  const usingSupabase = isSupabaseConfigured;

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      setError("");
      try {
        if (usingSupabase) {
          const { data: requests, error: reqErr } = await supabase
            .from("help_requests")
            .select(
              "id,title,description,category,location,status,created_by_name,created_by_email,created_by_role,created_at,status_updated_at"
            )
            .order("created_at", { ascending: false });

          if (reqErr) throw reqErr;

          const ids = (requests || []).map(r => r.id);
          const { data: responses, error: respErr } = await supabase
            .from("help_responses")
            .select(
              "id,request_id,volunteer_name,volunteer_email,message,responded_at"
            )
            .in(
              "request_id",
              ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]
            )
            .order("responded_at", { ascending: true });

          if (respErr) throw respErr;

          const responsesByReq = (responses || []).reduce((acc, r) => {
            acc[r.request_id] = acc[r.request_id] || [];
            acc[r.request_id].push({
              id: r.id,
              volunteerName: r.volunteer_name,
              volunteerEmail: r.volunteer_email || "",
              message: r.message,
              respondedAt: r.responded_at
            });
            return acc;
          }, {});

          const mapped = (requests || []).map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            category: r.category,
            location: r.location,
            status: r.status,
            name: r.created_by_name,
            email: r.created_by_email || "",
            createdByRole: r.created_by_role,
            createdAt: r.created_at,
            statusUpdatedAt: r.status_updated_at,
            responses: responsesByReq[r.id] || []
          }));

          setHelpRequests(mapped);
        } else {
          const res = await fetch("http://localhost:5000/api/help-requests");
          if (!res.ok) throw new Error("Failed to fetch requests");
          const data = await res.json();
          setHelpRequests(data);
        }
      } catch (err) {
        console.error(err);
        setError(
          usingSupabase
            ? "Could not load requests from Supabase. Check your keys and RLS policies."
            : "Could not load requests. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  // Keep track of Supabase auth user (if Supabase is enabled)
  useEffect(() => {
    if (!usingSupabase) return;

    let mounted = true;

    const initAuth = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        console.error("Error loading auth user", error);
        return;
      }
      setAuthUser(data.user ?? null);
      if (data.user?.email && !currentUser.email) {
        setCurrentUser(prev => ({ ...prev, email: data.user.email }));
      }
    };

    initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user?.email && !currentUser.email) {
        setCurrentUser(prev => ({ ...prev, email: user.email }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [currentUser.email, usingSupabase]);

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
      if (usingSupabase) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        const effectiveEmail =
          currentUser.email || user?.email || null;

        const payload = {
          title,
          description,
          category,
          location,
          status: "open",
          created_by_name: name,
          created_by_email: effectiveEmail,
          created_by_role: currentUser.role,
          created_by_user_id: user?.id ?? null
        };

        const { data, error: insErr } = await supabase
          .from("help_requests")
          .insert(payload)
          .select()
          .single();

        if (insErr) throw insErr;

        const newRequest = {
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          location: data.location,
          status: data.status,
          name: data.created_by_name,
          email: data.created_by_email || "",
          createdByRole: data.created_by_role,
          createdAt: data.created_at,
          statusUpdatedAt: data.status_updated_at,
          responses: []
        };

        setHelpRequests(prev => [newRequest, ...prev]);
      } else {
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
      }

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
    try {
      if (usingSupabase) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        const insertPayload = {
          request_id: id,
          volunteer_name: payload.volunteerName,
          volunteer_email: currentUser.email || user?.email || null,
          volunteer_user_id: user?.id ?? null,
          message: payload.message
        };

        const { data: resp, error: respErr } = await supabase
          .from("help_responses")
          .insert(insertPayload)
          .select()
          .single();

        if (respErr) throw respErr;

        const newResponse = {
          id: resp.id,
          volunteerName: resp.volunteer_name,
          volunteerEmail: resp.volunteer_email || "",
          message: resp.message,
          respondedAt: resp.responded_at
        };

        setHelpRequests(prev =>
          prev.map(r =>
            r.id === id ? { ...r, responses: [...r.responses, newResponse] } : r
          )
        );
      } else {
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
      }
    } catch (err) {
      console.error(err);
      alert("Could not send response. Please try again.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      if (usingSupabase) {
        const { data, error: updErr } = await supabase
          .from("help_requests")
          .update({ status, status_updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (updErr) throw updErr;

        const updatedRequest = {
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          location: data.location,
          status: data.status,
          name: data.created_by_name,
          email: data.created_by_email || "",
          createdByRole: data.created_by_role,
          createdAt: data.created_at,
          statusUpdatedAt: data.status_updated_at,
          responses: helpRequests.find(r => r.id === id)?.responses || []
        };

        setHelpRequests(prev =>
          prev.map(r => (r.id === updatedRequest.id ? updatedRequest : r))
        );
      } else {
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
      }
    } catch (err) {
      console.error(err);
      alert("Could not update status. Please try again.");
    }
  };

  const filteredRequests = useMemo(
    () =>
      helpRequests
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
    }),
    [categoryFilter, currentUser.name, helpRequests, statusFilter, view]
  );

  const handleAuthSubmit = async e => {
    e.preventDefault();
    if (!usingSupabase) {
      alert("Auth requires Supabase to be configured.");
      return;
    }
    if (!authEmail || !authPassword) {
      setAuthMessage("Please enter email and password.");
      return;
    }

    try {
      setAuthMessage("");
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        setAuthMessage(
          "Check your email to confirm your account, then sign in."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        setAuthMessage("Signed in.");
      }
    } catch (err) {
      console.error(err);
      setAuthMessage(err.message || "Authentication failed.");
    }
  };

  const handleSignOut = async () => {
    if (!usingSupabase) return;
    await supabase.auth.signOut();
    setAuthMessage("Signed out.");
  };

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
                <span>Display as</span>
                <input
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
              {usingSupabase && (
                <form
                  onSubmit={handleAuthSubmit}
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    fontSize: 11
                  }}
                >
                  <span>
                    Account{" "}
                    {authUser?.email ? `(${authUser.email})` : "(not signed in)"}
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 999 }}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 999 }}
                  />
                  <select
                    value={authMode}
                    onChange={e => setAuthMode(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 999 }}
                  >
                    <option value="signin">Sign in</option>
                    <option value="signup">Sign up</option>
                  </select>
                  <button type="submit" style={{ padding: "6px 12px" }}>
                    {authMode === "signup" ? "Create account" : "Sign in"}
                  </button>
                  {authUser && (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      style={{
                        padding: "6px 12px",
                        background:
                          "linear-gradient(135deg, #6b7280, #4b5563)",
                        boxShadow: "none",
                        color: "#f9fafb"
                      }}
                    >
                      Sign out
                    </button>
                  )}
                  {authMessage && (
                    <span
                      style={{
                        fontSize: 11,
                        color: authMessage.includes("failed")
                          ? "#b91c1c"
                          : "#047857"
                      }}
                    >
                      {authMessage}
                    </span>
                  )}
                </form>
              )}
            </div>
            {!usingSupabase && (
              <div className="helper-text" style={{ marginTop: 8 }}>
                Supabase is not configured yet — using local API at{" "}
                <code>http://localhost:5000</code>. Add{" "}
                <code>REACT_APP_SUPABASE_URL</code> and{" "}
                <code>REACT_APP_SUPABASE_ANON_KEY</code> to switch to Supabase.
              </div>
            )}
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
              ? "You’re signed in as a volunteer. Browse open requests and respond where you can help most."
              : "You’re signed in as a neighbour. Track your requests and see who has responded."}
          </p>

          <div className="filters-bar">
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
                request={{
                  ...req,
                  onChangeStatus: status => updateStatus(req.id, status)
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
