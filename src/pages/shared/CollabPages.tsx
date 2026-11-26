import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Send } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatRelativeDate } from '../../lib/format';
import type { NotificationItem } from '../../types';

export function MessagesPage() {
  const [searchParams] = useSearchParams();
  const { user, toast } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState(searchParams.get('applicationId') || '');
  const [draft, setDraft] = useState('');

  const { data: threadsData, isLoading: loadingThreads } = useQuery<{ threads: any[] }>({
    queryKey: ['message-threads'],
    queryFn: () => apiRequest('/api/collab/messages/threads'),
  });

  useEffect(() => {
    if (!selectedAppId && threadsData?.threads?.length) {
      setSelectedAppId(threadsData.threads[0].applicationId);
    }
  }, [selectedAppId, threadsData]);

  const { data: msgData } = useQuery<{ messages: any[] }>({
    queryKey: ['messages', selectedAppId],
    queryFn: () => apiRequest(`/api/collab/messages/${selectedAppId}`),
    enabled: Boolean(selectedAppId),
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiRequest('/api/collab/messages', {
        method: 'POST',
        body: JSON.stringify({ applicationId: selectedAppId, body }),
      }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedAppId] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Message failed', description: err.message, variant: 'error' });
    },
  });

  const activeThread = threadsData?.threads?.find((t) => t.applicationId === selectedAppId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Application Messages
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Direct, controlled communication linked strictly to active job applications.
        </p>
      </div>

      {loadingThreads ? (
        <LoadingRows count={3} />
      ) : !threadsData?.threads || threadsData.threads.length === 0 ? (
        <EmptyState
          title="No active application conversations"
          description="Messaging threads unlock automatically once an application is submitted."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[520px]">
          {/* Thread List */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {threadsData.threads.map((t) => (
              <button
                key={t.applicationId}
                type="button"
                onClick={() => setSelectedAppId(t.applicationId)}
                className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                  selectedAppId === t.applicationId ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <Avatar src={t.counterpart?.avatarUrl} name={t.counterpart?.name || 'User'} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {t.counterpart?.name}
                    </p>
                    {t.unreadCount > 0 && (
                      <span className="font-mono text-xs font-bold text-blue-600 tabular-nums">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate">{t.jobTitle}</p>
                  <p className="text-xs text-slate-400 truncate mt-1">
                    {t.lastMessage ? t.lastMessage.body : 'Start a conversation…'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Conversation Pane */}
          <div className="lg:col-span-8 flex flex-col justify-between min-h-[420px]">
            {activeThread && (
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <p className="text-sm font-bold text-slate-900">{activeThread.counterpart?.name}</p>
                  <p className="text-xs text-slate-500">
                    {activeThread.jobTitle} · {activeThread.companyName}
                  </p>
                </div>
                <StatusText status={activeThread.applicationStatus} />
              </div>
            )}

            <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[380px]">
              {(msgData?.messages || []).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">
                  No messages yet on this application. Send a message below.
                </p>
              ) : (
                (msgData?.messages || []).map((m) => {
                  const mine = m.senderUserId === user?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                          mine
                            ? 'bg-navy-900 text-white'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <p>{m.body}</p>
                      </div>
                      <span className="mt-1 text-[11px] text-slate-400">
                        {m.senderName} · {formatRelativeDate(m.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) sendMutation.mutate(draft.trim());
              }}
              className="p-4 border-t border-slate-200 flex items-center gap-2.5"
            >
              <label htmlFor="message-input" className="sr-only">
                Type a message
              </label>
              <input
                id="message-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message linked to this application…"
                className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={sendMutation.isPending || !draft.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const { setUnreadNotifications, toast } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery<{ notifications: NotificationItem[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest('/api/collab/notifications'),
  });

  useEffect(() => {
    if (typeof data?.unreadCount === 'number') {
      setUnreadNotifications(data.unreadCount);
    }
  }, [data?.unreadCount, setUnreadNotifications]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/collab/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest('/api/collab/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadNotifications(0);
      toast({ title: 'All notifications marked as read' });
    },
  });

  const list = (data?.notifications || []).filter((n) => (filter === 'unread' ? !n.read : true));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time updates for applications, shortlisting, interviews, and moderation decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Unread ({data?.unreadCount ?? 0})
            </button>
          </div>
          <button
            type="button"
            disabled={markAllMutation.isPending || (data?.unreadCount ?? 0) === 0}
            onClick={() => markAllMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-900 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingRows count={4} />
      ) : list.length === 0 ? (
        <EmptyState
          title="You’re all caught up"
          description="No notifications match this view right now."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {list.map((item) => (
            <div
              key={item.id}
              className={`p-5 flex items-start justify-between gap-4 ${
                item.read ? 'bg-white' : 'bg-blue-50/35'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2 rounded-lg bg-slate-100 text-navy-900 shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {formatRelativeDate(item.createdAt)} · {item.read ? 'Read' : 'Unread'}
                  </p>
                </div>
              </div>
              {!item.read && (
                <button
                  type="button"
                  onClick={() => markReadMutation.mutate(item.id)}
                  className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountSettingsPage() {
  const { user, refreshUser, toast } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [prefs, setPrefs] = useState(
    user?.notificationPrefs || {
      emailApplications: true,
      emailInterviews: true,
      emailJobAlerts: true,
    }
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/auth/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name, notificationPrefs: prefs }),
      }),
    onSuccess: async () => {
      await refreshUser();
      toast({ title: 'Account preferences saved', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      toast({ title: 'Password updated', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Password change failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your profile identity, email notification rules, and password security.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSettingsMutation.mutate();
        }}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
      >
        <h2 className="font-display text-base font-bold text-slate-900">Profile &amp; Notifications</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Display Name
            </label>
            <input
              id="set-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="set-email"
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={prefs.emailApplications}
              onChange={(e) => setPrefs({ ...prefs, emailApplications: e.target.checked })}
            />
            <span>Email updates for application submissions &amp; status changes</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={prefs.emailInterviews}
              onChange={(e) => setPrefs({ ...prefs, emailInterviews: e.target.checked })}
            />
            <span>Email notifications for interview invitations &amp; reschedules</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={prefs.emailJobAlerts}
              onChange={(e) => setPrefs({ ...prefs, emailJobAlerts: e.target.checked })}
            />
            <span>Weekly matching job alerts</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saveSettingsMutation.isPending}
          className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg hover:bg-blue-600"
        >
          {saveSettingsMutation.isPending ? 'Saving…' : 'Save Preferences'}
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          passwordMutation.mutate();
        }}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
      >
        <h2 className="font-display text-base font-bold text-slate-900">Change Password</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pw-curr" className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              id="pw-curr"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="pw-new" className="block text-xs font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <input
              id="pw-new"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={passwordMutation.isPending}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
