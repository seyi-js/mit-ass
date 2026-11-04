import {
  ArrowUpRight,
  CheckCheck,
  ClipboardList,
  Clock3,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useResource } from '../api';
import { useAuth } from '../auth';
import {
  ErrorMessage,
  Loading,
  PageHeading,
  RequestTable,
} from '../components';
import { Dashboard, Page, roleLabels, ServiceRequest } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useResource<Dashboard>('/dashboard');
  const recent = useResource<Page<ServiceRequest>>('/requests?limit=5');
  const requester = user?.role === 'STUDENT' || user?.role === 'STAFF';
  const cards = [
    {
      title: 'Total requests',
      count: stats.data?.total,
      icon: ClipboardList,
      note: 'All service requests',
      tone: 'green',
    },
    {
      title: 'Awaiting assignment',
      count: stats.data?.counts.SUBMITTED,
      icon: Clock3,
      note: 'Submitted for review',
      tone: 'amber',
    },
    {
      title: 'Active jobs',
      count: stats.data
        ? stats.data.counts.ASSIGNED + stats.data.counts.IN_PROGRESS
        : undefined,
      icon: Wrench,
      note: 'Assigned or in progress',
      tone: 'blue',
    },
    {
      title: 'Completed',
      count: stats.data?.counts.COMPLETED,
      icon: CheckCheck,
      note: 'Maintenance resolved',
      tone: 'green',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={`${roleLabels[user!.role]} dashboard`}
        title={`Hello, ${user!.name.split(' ')[0]}.`}
        description={
          requester
            ? 'A clear view of your requests, from report to resolution.'
            : user!.role === 'OFFICER'
              ? 'Your assigned maintenance jobs, all in one place.'
              : 'Keep campus maintenance organised and moving forward.'
        }
        create={requester}
      />
      <ErrorMessage message={stats.error} />
      {stats.loading ? (
        <Loading />
      ) : (
        <div className="stats-grid">
          {cards.map((card) => (
            <article className="stat-card" key={card.title}>
              <div>
                <span>{card.title}</span>
                <span className={`stat-icon ${card.tone}`}>
                  <card.icon size={19} />
                </span>
              </div>
              <strong>{card.count ?? '—'}</strong>
              <p>{card.note}</p>
            </article>
          ))}
        </div>
      )}
      <section className="welcome-strip">
        <div className="strip-icon">
          <Wrench size={24} />
        </div>
        <div>
          <h2>
            {requester
              ? 'Something needs attention?'
              : 'Every request has a next step.'}
          </h2>
          <p>
            {requester
              ? 'Tell us what happened and where. Follow every update in your request history.'
              : 'Open a request to see its details, assignment and latest progress.'}
          </p>
        </div>
        <Link to={requester ? '/requests/new' : '/requests'}>
          {requester ? 'Submit a request' : 'View requests'}
          <ArrowUpRight size={18} />
        </Link>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent requests</h2>
            <p>
              Your five most recent{' '}
              {user!.role === 'OFFICER' ? 'assigned ' : ''}requests
            </p>
          </div>
          <Link to="/requests" className="text-link">
            View all <ArrowUpRight size={16} />
          </Link>
        </div>
        <ErrorMessage message={recent.error} />
        {recent.loading ? (
          <Loading />
        ) : (
          recent.data && <RequestTable items={recent.data.items} />
        )}
      </section>
      <section className="workflow">
        <p className="eyebrow">From report to resolution</p>
        <div>
          {['Submitted', 'Assigned', 'In progress', 'Completed'].map(
            (step, index) => (
              <div key={step}>
                <span>0{index + 1}</span>
                <h3>{step}</h3>
                <p>
                  {
                    [
                      'The issue is recorded.',
                      'An officer takes responsibility.',
                      'The team works on the issue.',
                      'The repair is recorded as done.',
                    ][index]
                  }
                </p>
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}
