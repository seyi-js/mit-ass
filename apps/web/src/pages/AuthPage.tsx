import { FormEvent, useState } from 'react';
import { ArrowRight, Leaf, ShieldCheck } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorMessage, Loading } from '../components';
import { User } from '../types';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, setUser } = useAuth();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      setUser(
        await api<User>(register ? '/auth/register' : '/auth/login', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Link to="/login" className="brand">
          <span className="brand-mark">
            <Leaf size={23} />
          </span>
          Campus Care<span className="brand-dot">.</span>
        </Link>
        <div>
          <p className="eyebrow">A better campus starts here</p>
          <h1>
            Small fixes.
            <br />
            Better days.
          </h1>
          <p>
            Report a maintenance issue, follow its progress, and help keep your
            campus working for everyone.
          </p>
          <div className="story-steps">
            <span>
              01 <strong>Report an issue</strong>
            </span>
            <span>
              02 <strong>We assign the right team</strong>
            </span>
            <span>
              03 <strong>Track it to completion</strong>
            </span>
          </div>
        </div>
        <p className="auth-caption">
          University maintenance & service requests
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <div className="small-icon">
            <ShieldCheck size={24} />
          </div>
          <p className="eyebrow">Your campus, connected</p>
          <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">
            {register
              ? 'Register to submit and track maintenance requests.'
              : 'Sign in to manage your maintenance requests.'}
          </p>
          <ErrorMessage message={error} />
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Enter your full name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.edu"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={12}
                maxLength={128}
                placeholder="Enter your password"
              />
              {register && (
                <span className="field-hint">Use at least 12 characters.</span>
              )}
            </label>
            {register && (
              <label>
                I am a
                <select name="role" defaultValue="STUDENT">
                  <option value="STUDENT">Student</option>
                  <option value="STAFF">Staff member</option>
                </select>
              </label>
            )}
            <button className="button primary full" disabled={pending}>
              {pending
                ? 'Please wait…'
                : register
                  ? 'Create account'
                  : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Campus Care?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <p className="field-hint">
            Maintenance officers and administrators receive accounts from an
            administrator.
          </p>
        </div>
        <footer>Campus Care · University service desk</footer>
      </main>
    </div>
  );
}
