import { FormEvent, useState } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { api, queryString, useResource } from '../api';
import {
  ErrorMessage,
  Loading,
  PageHeading,
  Pagination,
  SuccessMessage,
} from '../components';
import { Page, Role, roleLabels, User } from '../types';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const users = useResource<Page<User>>(
    `/users${queryString({ page, search, role })}`,
  );
  const existing = editing && editing !== 'new' ? editing : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form) as Record<string, unknown>;
    if (existing) body.active = form.get('active') === 'on';
    try {
      await api(existing ? `/users/${existing.id}` : '/users', {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      setEditing(null);
      setMessage(existing ? 'User updated.' : 'User created.');
      users.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="User management"
        description="Manage student, staff, maintenance officer and administrator accounts."
      />
      <div className="toolbar">
        <p className="muted">
          Create officer accounts here before assigning requests.
        </p>
        <button
          className="button primary"
          onClick={() => {
            setEditing('new');
            setError('');
          }}
        >
          <Plus size={18} />
          Add user
        </button>
      </div>
      <SuccessMessage message={message} />
      {editing && (
        <form
          key={existing?.id ?? 'new'}
          className="panel form-panel user-form"
          onSubmit={submit}
        >
          <div className="panel-heading compact">
            <h2>{existing ? 'Edit user' : 'Create user'}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Close user form"
              onClick={() => setEditing(null)}
            >
              <X size={18} />
            </button>
          </div>
          <ErrorMessage message={error} />
          <div className="form-row">
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={existing?.name}
              />
            </label>
            <label>
              Role
              <select name="role" defaultValue={existing?.role ?? 'OFFICER'}>
                {(Object.keys(roleLabels) as Role[]).map((role) => (
                  <option value={role} key={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {existing ? (
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={existing.active}
              />
              Account active
            </label>
          ) : (
            <div className="form-row">
              <label>
                Email address
                <input name="email" type="email" required maxLength={254} />
              </label>
              <label>
                Initial password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <span className="field-hint">
                  At least 12 characters. Share directly with the account
                  holder.
                </span>
              </label>
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button className="button primary" disabled={pending}>
              {pending ? 'Saving…' : existing ? 'Save user' : 'Create user'}
            </button>
          </div>
        </form>
      )}
      <section className="panel">
        <div className="filters">
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Search users</span>
            <input
              placeholder="Search name or email…"
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {(Object.keys(roleLabels) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ErrorMessage message={users.error} />
        {users.loading ? (
          <Loading />
        ) : (
          users.data && (
            <>
              {users.data.items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Account</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.data.items.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.name}</strong>
                          </td>
                          <td>{user.email}</td>
                          <td>{roleLabels[user.role]}</td>
                          <td>
                            <span
                              className={`badge ${user.active ? 'completed' : 'submitted'}`}
                            >
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              aria-label={`Edit ${user.name}`}
                              onClick={() => {
                                setEditing(user);
                                setError('');
                              }}
                            >
                              <Pencil size={15} />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <h3>No users found</h3>
                  <p>Try changing your search or role filter.</p>
                </div>
              )}
              <Pagination data={users.data} onPage={setPage} />
            </>
          )
        )}
      </section>
    </>
  );
}
