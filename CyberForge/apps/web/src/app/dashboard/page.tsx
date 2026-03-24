'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { subscribeToAlerts } from '@/lib/socket';
import Cookies from 'js-cookie';

interface Site {
  id: string;
  name: string;
  location: string;
}

interface Asset {
  id: string;
  name: string;
  status: string;
}

interface Sensor {
  id: string;
  name: string;
  sensorType: string;
  unit: string;
}

interface Reading {
  id: string;
  value: number;
  timestamp: string;
}

interface AlertEvent {
  id: string;
  message: string;
  severity: string;
  status: string;
  detectedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [showAlertPanel, setShowAlertPanel] = useState(true);

  // Check authentication
  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!user) {
      loadUser();
    }
  }, [user, router]);

  // Subscribe to real-time alerts
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAlerts((alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    return unsubscribe;
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      router.push('/login');
    }
  };

  const loadSites = async () => {
    try {
      const data = await apiClient.getSites();
      setSites(data);
      if (data.length > 0) {
        setSelectedSite(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  };

  const loadAssets = async (siteId: string) => {
    try {
      const data = await apiClient.getAssets(siteId);
      setAssets(data);
      if (data.length > 0) {
        setSelectedAsset(data[0].id);
      } else {
        setSelectedAsset(null);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const loadSensors = async (assetId: string) => {
    try {
      const data = await apiClient.getSensors(assetId);
      setSensors(data);
      if (data.length > 0) {
        setSelectedSensor(data[0].id);
      } else {
        setSelectedSensor(null);
      }
    } catch (error) {
      console.error('Failed to load sensors:', error);
    }
  };

  const loadReadings = async (sensorId: string) => {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      const data = await apiClient.getReadings(sensorId, from, now, 1000);
      setReadings(data.reverse());
    } catch (error) {
      console.error('Failed to load readings:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await apiClient.getAlertEvents('ACTIVE', undefined, 10);
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      await loadSites();
      await loadAlerts();
      setLoading(false);
    };

    load();
  }, [user]);

  // Load assets when site changes
  useEffect(() => {
    if (selectedSite) {
      loadAssets(selectedSite);
    }
  }, [selectedSite]);

  // Load sensors when asset changes
  useEffect(() => {
    if (selectedAsset) {
      loadSensors(selectedAsset);
    }
  }, [selectedAsset]);

  // Load readings when sensor changes
  useEffect(() => {
    if (selectedSensor) {
      loadReadings(selectedSensor);
    }
  }, [selectedSensor]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await apiClient.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a)),
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CyberForge Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Welcome, {user.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {user.role}
            </span>
            <button onClick={handleLogout} className="button-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-gray-200 bg-white p-6 overflow-y-auto">
          {/* Sites */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Sites</h2>
            <select
              value={selectedSite || ''}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="input w-full"
            >
              <option value="">Select a site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assets */}
          {selectedSite && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Assets</h2>
              <select
                value={selectedAsset || ''}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="input w-full"
              >
                <option value="">Select an asset...</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sensors */}
          {selectedAsset && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Sensors</h2>
              <select
                value={selectedSensor || ''}
                onChange={(e) => setSelectedSensor(e.target.value)}
                className="input w-full"
              >
                <option value="">Select a sensor...</option>
                {sensors.map((sensor) => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.name} ({sensor.sensorType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Current Values */}
          {selectedSensor && readings.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-semibold text-gray-900">Latest Reading</h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{readings[readings.length - 1].value.toFixed(2)}</p>
                <p className="mt-2 text-sm text-gray-600">
                  {new Date(readings[readings.length - 1].timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Chart placeholder */}
            <div className="col-span-2 card">
              <h2 className="mb-4 font-semibold text-gray-900">Sensor Readings (24h)</h2>
              {readings.length > 0 ? (
                <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
                  <p className="text-gray-500">Chart visualization would go here</p>
                </div>
              ) : (
                <p className="text-gray-600">Select a sensor to view readings</p>
              )}
            </div>

            {/* Alerts Panel */}
            <div className="card flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Active Alerts</h2>
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  {alerts.filter((a) => a.status === 'ACTIVE').length}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-600">No active alerts</p>
                ) : (
                  alerts
                    .filter((a) => a.status === 'ACTIVE')
                    .map((alert) => (
                      <div key={alert.id} className="rounded-md border border-red-200 bg-red-50 p-2">
                        <p className="text-xs font-medium text-red-900">{alert.message}</p>
                        <p className="mt-1 text-xs text-red-700">
                          {new Date(alert.detectedAt).toLocaleTimeString()}
                        </p>
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="mt-2 w-full rounded px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                        >
                          Acknowledge
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
