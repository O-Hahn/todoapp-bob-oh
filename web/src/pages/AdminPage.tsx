import React, { useState, useEffect } from 'react';
import {
  Tile,
  Tag,
  InlineNotification,
  DataTableSkeleton,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react';
import { UserMultiple, Task, CheckmarkOutline, WarningAlt, Alarm } from '@carbon/icons-react';
import { AdminStatsResponse } from '../types/index.js';
import { fetchAdminStats } from '../api/adminApi.js';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setError(null);
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load administration statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const totalTodos = stats?.users.reduce((acc, u) => acc + u.total, 0) || 0;
  const totalDone = stats?.users.reduce((acc, u) => acc + u.done, 0) || 0;
  const totalOpen = stats?.users.reduce((acc, u) => acc + u.open, 0) || 0;
  const totalOverdue = stats?.users.reduce((acc, u) => acc + u.overdue, 0) || 0;

  return (
    <div className="app-content">
      <div className="mb-6">
        <h1 className="page-title">
          Operator Administration
        </h1>
        <p className="page-subtitle">
          Read-only system overview and per-user activity statistics. Todo contents are strictly protected.
        </p>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          className="mb-6"
        />
      )}

      {loading ? (
        <DataTableSkeleton
          headers={[
            { key: 'u', header: 'User' },
            { key: 't', header: 'Total' },
            { key: 'd', header: 'Done' },
            { key: 'o', header: 'Open' },
            { key: 'ov', header: 'Overdue' },
          ]}
        />
      ) : (
        <>
          {/* Summary KPI Tiles */}
          <div className="stats-grid">
            <Tile>
              <div className="stat-label">
                <UserMultiple size={20} />
                <span className="text-sm">Total Users</span>
              </div>
              <div className="stat-value">
                {stats?.totalUsers || 0}
              </div>
            </Tile>

            <Tile>
              <div className="stat-label">
                <Task size={20} />
                <span className="text-sm">Total Tasks</span>
              </div>
              <div className="stat-value">
                {totalTodos}
              </div>
            </Tile>

            <Tile>
              <div className="stat-label stat-label--success">
                <CheckmarkOutline size={20} />
                <span className="text-sm">Done Tasks</span>
              </div>
              <div className="stat-value">
                {totalDone}
              </div>
            </Tile>

            <Tile>
              <div className="stat-label stat-label--info">
                <WarningAlt size={20} />
                <span className="text-sm">Open Tasks</span>
              </div>
              <div className="stat-value">
                {totalOpen}
              </div>
            </Tile>

            <Tile>
              <div className="stat-label stat-label--error">
                <Alarm size={20} />
                <span className="text-sm">Overdue Tasks</span>
              </div>
              <div className="stat-value">
                {totalOverdue}
              </div>
            </Tile>
          </div>

          {/* User Activity Table */}
          <TableContainer title="Registered User Statistics">
            <Table aria-label="User statistics table">
              <TableHead>
                <TableRow>
                  <TableHeader>User Email</TableHeader>
                  <TableHeader>Total Tasks</TableHeader>
                  <TableHeader>Done</TableHeader>
                  <TableHeader>Open</TableHeader>
                  <TableHeader>Overdue</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats?.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No regular users registered yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stats?.users.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-semibold">{user.email}</TableCell>
                      <TableCell>{user.total}</TableCell>
                      <TableCell>
                        <Tag type="green">{user.done}</Tag>
                      </TableCell>
                      <TableCell>
                        <Tag type="blue">{user.open}</Tag>
                      </TableCell>
                      <TableCell>
                        <Tag type={user.overdue > 0 ? 'red' : 'cool-gray'}>
                          {user.overdue}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  );
};
