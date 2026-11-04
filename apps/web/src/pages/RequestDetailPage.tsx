import { FormEvent, useState } from 'react';
import { ArrowLeft, MapPin, Pencil, Trash2, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, queryString, useResource } from '../api';
import { useAuth } from '../auth';
import {
  dateTime,
  ErrorMessage,
  Loading,
  StatusBadge,
  SuccessMessage,
} from '../components';
import { Page, ServiceRequest, User } from '../types';

function AssignmentForm({
  request,
  onChange,
}: {
  request: ServiceRequest;
  onChange: () => void;
}) {
  const [search, setSearch] = useState('');
  const officers = useResource<Page<User>>(
    `/users${queryString({ role: 'OFFICER', limit: 100, search })}`,
  );
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const officerId = new FormData(event.currentTarget).get('officerId');
    try {
      await api(`/requests/${request.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officerId }),
      });
      onChange();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="panel form-panel" onSubmit={submit}>
      <h2>{request.officerId ? 'Reassign request' : 'Assign an officer'}</h2>
      <ErrorMessage message={error || officers.error} />
      <label>
        Find an officer
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          maxLength={100}
        />
      </label>
      <label>
        Maintenance officer
        <select
          name="officerId"
          required
          defaultValue=""
          disabled={officers.loading}
        >
          <option value="" disabled>
            {officers.loading ? 'Loading officers…' : 'Select an officer'}
          </option>
          {officers.data?.items
            .filter((user) => user.active && user.id !== request.officerId)
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.email}
              </option>
            ))}
        </select>
      </label>
      <p className="field-hint">
        Only active officers can be assigned. Search to narrow the list.
        Reassignment returns the request to Assigned.
      </p>
      <button className="button primary" disabled={pending || officers.loading}>
        {pending ? 'Assigning…' : 'Assign request'}
      </button>
    </form>
  );
}

function ProgressForm({
  request,
  onChange,
}: {
  request: ServiceRequest;
  onChange: () => void;
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const next = request.status === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const note = new FormData(event.currentTarget).get('note');
    try {
      await api(`/requests/${request.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: next, note }),
      });
      onChange();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="panel form-panel" onSubmit={submit}>
      <h2>Update progress</h2>
      <ErrorMessage message={error} />
      <label>
        Progress note
        <textarea
          name="note"
          rows={3}
          required
          minLength={3}
          maxLength={1000}
          placeholder={
            next === 'IN_PROGRESS'
              ? 'Describe the work you are starting.'
              : 'Describe the work completed.'
          }
        />
      </label>
      <button className="button primary" disabled={pending}>
        {pending
          ? 'Updating…'
          : next === 'IN_PROGRESS'
            ? 'Start work'
            : 'Mark as completed'}
      </button>
    </form>
  );
}

export function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resource = useResource<ServiceRequest>(`/requests/${id}`);
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? '',
  );
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const request = resource.data;
  const refresh = () => {
    setMessage('Request updated successfully.');
    resource.refresh();
  };
  async function remove() {
    setDeleting(true);
    setError('');
    try {
      await api(`/requests/${id}`, { method: 'DELETE', body: '{}' });
      navigate('/requests');
    } catch (error) {
      setError((error as Error).message);
      setDeleting(false);
    }
  }
  if (resource.loading) return <Loading />;
  if (resource.error || !request)
    return (
      <>
        <Link to="/requests" className="back-link">
          Back to requests
        </Link>
        <ErrorMessage message={resource.error || 'Request not found.'} />
      </>
    );
  const canEdit =
    request.status === 'SUBMITTED' &&
    (request.requesterId === user!.id || user!.role === 'ADMIN');
  const canProgress =
    ['ADMIN', 'OFFICER'].includes(user!.role) &&
    ['ASSIGNED', 'IN_PROGRESS'].includes(request.status);
  return (
    <>
      <Link to="/requests" className="back-link">
        <ArrowLeft size={16} />
        Back to requests
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Request #{request.id.slice(0, 8).toUpperCase()}
          </p>
          <h1>{request.title}</h1>
          <p className="muted">Submitted {dateTime(request.createdAt)}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <SuccessMessage message={message} />
      <ErrorMessage message={error} />
      <div className="detail-layout">
        <div className="stack">
          <section className="panel detail-card">
            <div className="panel-heading compact">
              <h2>Request details</h2>
              {canEdit && (
                <Link className="text-link" to={`/requests/${id}/edit`}>
                  <Pencil size={15} />
                  Edit request
                </Link>
              )}
            </div>
            <div className="detail-meta">
              <div>
                <MapPin size={18} />
                <span>
                  <small>Location</small>
                  {request.location}
                </span>
              </div>
              <div>
                <UserRound size={18} />
                <span>
                  <small>Submitted by</small>
                  {request.requester?.name}
                </span>
              </div>
            </div>
            <dl className="details-list">
              <div>
                <dt>Category</dt>
                <dd>{request.category?.name}</dd>
              </div>
              <div>
                <dt>Assigned officer</dt>
                <dd>{request.officer?.name ?? 'Awaiting assignment'}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{dateTime(request.updatedAt)}</dd>
              </div>
            </dl>
            <h3>Description</h3>
            <p className="description">{request.description}</p>
            {canEdit && (
              <div className="delete-section">
                {confirmDelete ? (
                  <div>
                    <p>Delete this submitted request? This cannot be undone.</p>
                    <div className="inline-actions">
                      <button
                        className="button danger"
                        onClick={remove}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting…' : 'Confirm deletion'}
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                      >
                        Keep request
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="text-button danger-text"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={15} />
                    Delete request
                  </button>
                )}
              </div>
            )}
          </section>
          {canProgress && (
            <ProgressForm
              key={request.status}
              request={request}
              onChange={refresh}
            />
          )}
          {user!.role === 'ADMIN' && request.status !== 'COMPLETED' && (
            <AssignmentForm request={request} onChange={refresh} />
          )}
          {!!request.assignments?.length && (
            <section className="panel detail-card">
              <h2>Assignment history</h2>
              <ul className="assignment-list">
                {request.assignments.map((assignment) => (
                  <li key={assignment.id}>
                    <strong>{assignment.officer.name}</strong>
                    <p>
                      Assigned by {assignment.assignedBy.name} ·{' '}
                      {dateTime(assignment.assignedAt)}
                    </p>
                    <small>
                      {assignment.endedAt
                        ? `Closed ${dateTime(assignment.endedAt)}`
                        : 'Current assignment'}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <section className="panel history">
          <h2>Request history</h2>
          <p className="muted">Updates from submission to resolution.</p>
          <ol className="timeline">
            {request.logs?.map((log) => (
              <li key={log.id}>
                <StatusBadge status={log.status} />
                <p>{log.note}</p>
                <strong>{log.actor.name}</strong>
                <time dateTime={log.createdAt}>{dateTime(log.createdAt)}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
