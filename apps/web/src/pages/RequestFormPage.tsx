import { FormEvent, useState } from 'react';
import { ArrowLeft, Info, Send } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useResource } from '../api';
import { Category, ServiceRequest } from '../types';
import { ErrorMessage, Loading, PageHeading } from '../components';

export function RequestForm({
  categories,
  initial,
  onSave,
}: {
  categories: Category[];
  initial?: ServiceRequest;
  onSave: (body: Record<string, FormDataEntryValue>) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await onSave(Object.fromEntries(new FormData(event.currentTarget)));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="panel form-panel" onSubmit={submit}>
      <ErrorMessage message={error} />
      <label>
        Request title
        <input
          name="title"
          required
          minLength={5}
          maxLength={120}
          placeholder="e.g. Leaking pipe in hostel bathroom"
          defaultValue={initial?.title}
        />
        <span className="field-hint">
          A short, clear description of the issue.
        </span>
      </label>
      <div className="form-row">
        <label>
          Category
          <select
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? ''}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <input
            name="location"
            required
            minLength={3}
            maxLength={200}
            placeholder="Building, floor and room"
            defaultValue={initial?.location}
          />
        </label>
      </div>
      <label>
        Describe the issue
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder="Explain what is wrong and where the maintenance team can find it."
          defaultValue={initial?.description}
        />
        <span className="field-hint">
          Include enough detail to help the officer understand the problem.
        </span>
      </label>
      <div className="form-actions">
        <Link
          to={initial ? `/requests/${initial.id}` : '/requests'}
          className="button secondary"
        >
          Cancel
        </Link>
        <button className="button primary" disabled={pending}>
          <Send size={17} />
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}

export function RequestFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const categories = useResource<Category[]>('/categories');
  const request = useResource<ServiceRequest>(id ? `/requests/${id}` : null);
  const onSave = async (body: Record<string, FormDataEntryValue>) => {
    const saved = await api<ServiceRequest>(
      id ? `/requests/${id}` : '/requests',
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) },
    );
    navigate(`/requests/${saved.id}`, {
      state: {
        message: id ? 'Request updated.' : 'Your request has been submitted.',
      },
    });
  };
  return (
    <>
      <Link to={id ? `/requests/${id}` : '/requests'} className="back-link">
        <ArrowLeft size={16} />
        Back to {id ? 'request' : 'requests'}
      </Link>
      <PageHeading
        eyebrow="Service desk"
        title={id ? 'Edit request' : 'New service request'}
        description="Tell us what needs attention. We’ll take it from here."
      />
      <ErrorMessage message={categories.error || request.error} />
      {categories.loading || (id && request.loading) ? (
        <Loading />
      ) : (
        categories.data &&
        (!id || request.data) &&
        (request.data && request.data.status !== 'SUBMITTED' ? (
          <ErrorMessage message="Only submitted requests can be edited." />
        ) : (
          <div className="form-layout">
            <RequestForm
              categories={categories.data}
              initial={request.data ?? undefined}
              onSave={onSave}
            />
            <aside className="help-card">
              <Info size={22} />
              <h3>A few helpful details</h3>
              <p>Choose the category that best matches the fault.</p>
              <p>
                Give the exact location so the maintenance officer can find it.
              </p>
              <p>
                You can edit or delete your request until an officer is
                assigned.
              </p>
            </aside>
          </div>
        ))
      )}
    </>
  );
}
