import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import { useAuth } from "../../state/AuthContext.jsx";

export default function ReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("");

  function load() {
    api("/api/admin/reports", { token }).then((data) => setReports(data.reports)).catch((error) => setStatus(error.message));
  }

  useEffect(load, [token]);

  async function updateReport(id, value) {
    await api(`/api/admin/reports/${id}`, { method: "PUT", token, body: { status: value } });
    load();
  }

  async function blockUser(id) {
    await api(`/api/admin/block-user/${id}`, { method: "PUT", token });
    setStatus("Unsafe user blocked");
    load();
  }

  return (
    <section className="page">
      <div className="section-title">
        <p>Reports Page</p>
        <h1>Safety reports</h1>
        <span>Review reports, update status, and block unsafe users.</span>
      </div>
      {status && <p className="status-info">{status}</p>}
      <div className="grid gap-4">
        {reports.length === 0 && <article className="panel"><p className="text-campus-muted">No reports yet.</p></article>}
        {reports.map((report) => (
          <article className="panel" key={report._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-campus-gold">{report.status}</p>
                <h2 className="text-xl font-black">Reported user: {report.reportedUser?.name}</h2>
                <p className="text-campus-muted">Reported by: {report.reportedBy?.name}</p>
                <p className="mt-2 text-campus-muted">{report.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="h-11 rounded-lg border border-campus-line px-3" value={report.status} onChange={(event) => updateReport(report._id, event.target.value)}>
                  <option value="open">open</option>
                  <option value="reviewing">reviewing</option>
                  <option value="resolved">resolved</option>
                </select>
                <button className="btn-secondary" onClick={() => blockUser(report.reportedUser?._id)}>Block user</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
