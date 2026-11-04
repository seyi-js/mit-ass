import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, RequestTable, StatusBadge } from '../components';
import { RequestForm } from '../pages/RequestFormPage';
import { ServiceRequest } from '../types';

describe('request submission', () => {
  const categories = [{ id: 'plumbing', name: 'Plumbing' }];
  it('requires the fault details before sending a request', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RequestForm categories={categories} onSave={onSave} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(onSave).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText(/Request title/),
      'Leaking bathroom pipe',
    );
    await user.selectOptions(screen.getByLabelText('Category'), 'plumbing');
    await user.type(screen.getByLabelText('Location'), 'Hostel B, room 12');
    await user.type(
      screen.getByLabelText(/Describe the issue/),
      'Water leaks beneath the bathroom sink.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Leaking bathroom pipe',
      categoryId: 'plumbing',
      location: 'Hostel B, room 12',
      description: 'Water leaks beneath the bathroom sink.',
    });
  });

  it('preserves entered details and displays an API failure', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(new Error('Select a valid category.'));
    const initial = {
      id: 'one',
      title: 'Faulty classroom light',
      location: 'Classroom 102',
      description: 'The light flickers continuously.',
      categoryId: 'plumbing',
    } as ServiceRequest;
    render(
      <MemoryRouter>
        <RequestForm
          categories={categories}
          initial={initial}
          onSave={onSave}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select a valid category.',
    );
    expect(screen.getByLabelText(/Request title/)).toHaveValue(initial.title);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save changes' }),
      ).toBeEnabled(),
    );
  });
});

describe('request tracking', () => {
  it('renders clear status labels', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('offers a useful empty state when filters match nothing', () => {
    render(
      <MemoryRouter>
        <RequestTable items={[]} emptyMessage="Try changing your filters." />
      </MemoryRouter>,
    );
    expect(screen.getByText('Try changing your filters.')).toBeInTheDocument();
  });

  it('links a request to its tracking details', () => {
    const request = {
      id: 'request-123',
      title: 'Faulty classroom light',
      location: 'Room 102',
      status: 'SUBMITTED',
      createdAt: '2026-11-01T10:00:00Z',
      category: { id: 'c', name: 'Electricity' },
    } as ServiceRequest;
    render(
      <MemoryRouter>
        <RequestTable items={[request]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: request.title })).toHaveAttribute(
      'href',
      '/requests/request-123',
    );
    expect(screen.getByRole('cell', { name: 'Submitted' })).toBeInTheDocument();
  });

  it('prevents pagination beyond the first and last page', async () => {
    const onPage = vi.fn();
    const { rerender } = render(
      <Pagination
        data={{ page: 1, pages: 2, total: 11, limit: 10 }}
        onPage={onPage}
      />,
    );
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Next page'));
    expect(onPage).toHaveBeenCalledWith(2);
    rerender(
      <Pagination
        data={{ page: 2, pages: 2, total: 11, limit: 10 }}
        onPage={onPage}
      />,
    );
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });
});
