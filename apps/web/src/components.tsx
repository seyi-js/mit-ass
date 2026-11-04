import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page, ServiceRequest, Status, statusLabels } from './types';

export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={20} /> Loading…
    </div>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <div className="message error" role="alert">
      {message}
    </div>
  ) : null;
}
export function SuccessMessage({ message }: { message?: string }) {
  return message ? (
    <div className="message success" role="status">
      {message}
    </div>
  ) : null;
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
export const date = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export function PageHeading({
  eyebrow,
  title,
  description,
  create = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  create?: boolean;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {create && (
        <Link className="button primary" to="/requests/new">
          <Plus size={18} />
          New request
        </Link>
      )}
    </div>
  );
}

export function Pagination({
  data,
  onPage,
}: {
  data: Pick<Page<unknown>, 'page' | 'pages' | 'total' | 'limit'>;
  onPage: (page: number) => void;
}) {
  const start = data.total
    ? Math.min((data.page - 1) * data.limit + 1, data.total)
    : 0;
  return (
    <div className="pagination">
      <span>
        {start}–{Math.min(data.page * data.limit, data.total)} of {data.total}
      </span>
      <div>
        <button
          aria-label="Previous page"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          Page {data.page} of {Math.max(1, data.pages)}
        </span>
        <button
          aria-label="Next page"
          disabled={data.page >= data.pages}
          onClick={() => onPage(data.page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function RequestTable({
  items,
  emptyMessage = 'Requests will appear here once they are submitted.',
}: {
  items: ServiceRequest[];
  emptyMessage?: string;
}) {
  if (!items.length)
    return (
      <div className="empty">
        <ClipboardList size={32} />
        <h3>No requests to show</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Request</th>
            <th>Location</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>
              <span className="sr-only">View</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link className="request-title" to={`/requests/${item.id}`}>
                  {item.title}
                </Link>
                <span className="cell-subtitle">
                  {item.category?.name} · #{item.id.slice(0, 8).toUpperCase()}
                </span>
              </td>
              <td>{item.location}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className="nowrap">{date(item.createdAt)}</td>
              <td>
                <Link
                  className="icon-link"
                  aria-label={`View ${item.title}`}
                  to={`/requests/${item.id}`}
                >
                  <ArrowRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
