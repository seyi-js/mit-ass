import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { queryString, useResource } from '../api';
import { useAuth } from '../auth';
import {
  ErrorMessage,
  Loading,
  PageHeading,
  Pagination,
  RequestTable,
} from '../components';
import {
  Category,
  Page,
  ServiceRequest,
  statuses,
  statusLabels,
} from '../types';

export function RequestsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') || '';
  const status = params.get('status') || '';
  const categoryId = params.get('categoryId') || '';
  const requests = useResource<Page<ServiceRequest>>(
    `/requests${queryString({ page, search, status, categoryId })}`,
  );
  const categories = useResource<Category[]>('/categories');
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeading
        eyebrow="Service desk"
        title={
          user!.role === 'OFFICER'
            ? 'Assigned requests'
            : user!.role === 'ADMIN'
              ? 'All requests'
              : 'My requests'
        }
        description="Find a request and follow its progress."
        create={['STUDENT', 'STAFF'].includes(user!.role)}
      />
      <section className="panel">
        <div className="filters">
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Search requests</span>
            <input
              placeholder="Search title or location…"
              value={search}
              maxLength={100}
              onChange={(event) => update('search', event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select
              value={categoryId}
              onChange={(event) => update('categoryId', event.target.value)}
            >
              <option value="">All categories</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ErrorMessage message={requests.error || categories.error} />
        {requests.loading ? (
          <Loading />
        ) : (
          requests.data &&
          !requests.error && (
            <>
              <RequestTable
                items={requests.data.items}
                emptyMessage={
                  search || status || categoryId
                    ? 'Try changing your search or filters.'
                    : undefined
                }
              />
              <Pagination
                data={requests.data}
                onPage={(value) => update('page', String(value))}
              />
            </>
          )
        )}
      </section>
    </>
  );
}
