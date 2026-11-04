import { FormEvent, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { queryString, useResource } from '../api';
import { ErrorMessage, Loading, PageHeading, StatusBadge } from '../components';
import { Report, statuses } from '../types';

export function ReportsPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [error, setError] = useState('');
  const report = useResource<Report>(`/reports${queryString(range)}`);
  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get('from'));
    const to = String(form.get('to'));
    if (from && to && from > to) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setError('');
    setRange({ from, to });
    report.refresh();
  }
  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="Maintenance reports"
        description="Review request volumes and completion across the university."
      />
      <form className="panel report-filter" onSubmit={generate}>
        <label>
          Submitted from
          <input name="from" type="date" />
        </label>
        <label>
          Submitted to
          <input name="to" type="date" />
        </label>
        <button className="button primary" disabled={report.loading}>
          <BarChart3 size={17} />
          Generate report
        </button>
      </form>
      <p className="field-hint">
        Dates are inclusive and use UTC. Leave both dates blank to include all
        requests.
      </p>
      <ErrorMessage message={error || report.error} />
      {report.loading ? (
        <Loading />
      ) : (
        report.data &&
        !report.error && (
          <>
            <div className="stats-grid three">
              {[
                ['Total requests', report.data.total],
                ['Completed requests', report.data.completed],
                ['Completion rate', `${report.data.completionRate}%`],
              ].map(([label, value]) => (
                <article className="stat-card" key={label}>
                  <div>{label}</div>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <div className="report-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Requests by status</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.map((status) => (
                      <tr key={status}>
                        <td>
                          <StatusBadge status={status} />
                        </td>
                        <td>
                          {report.data!.byStatus.find(
                            (row) => row.status === status,
                          )?.count ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Requests by category</h2>
                </div>
                {report.data.byCategory.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.byCategory.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty">
                    <p>No requests in this date range.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
