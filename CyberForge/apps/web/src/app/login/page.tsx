'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login(email, password);
      const { accessToken, refreshToken } = response;

      setTokens(accessToken, refreshToken);

      // Fetch user info
      const user = await apiClient.getCurrentUser();
      setUser(user);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">CyberForge</h1>
          <p className="mt-2 text-sm text-gray-600">Secure Industrial Data Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div>
            <label className="label block text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cyberforge.local"
              className="input mt-1"
              required
            />
          </div>

          <div>
            <label className="label block text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input mt-1"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">Demo Accounts</p>
          <p className="mt-2 space-y-1 text-xs">
            <span className="block">
              <strong>Admin:</strong> admin@cyberforge.local
            </span>
            <span className="block">
              <strong>Analyst:</strong> analyst@cyberforge.local
            </span>
            <span className="block">
              <strong>Operator:</strong> operator@cyberforge.local
            </span>
            <span className="block">
              <strong>Viewer:</strong> viewer@cyberforge.local
            </span>
          </p>
          <p className="mt-2">Check your seed output for default passwords.</p>
        </div>
      </div>
    </div>
  );
}
