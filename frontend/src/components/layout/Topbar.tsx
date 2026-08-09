import React, { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { useNotifications } from '../../hooks/useNotifications';
import { Button } from '../ui/button';

const Topbar: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [showDrawer, setShowDrawer] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVITATION':
        return '�';
      case 'MISSION_ASSIGNED':
        return '📋';
      case 'MISSION_ACCEPTED':
        return '✅';
      case 'MISSION_DECLINED':
        return '❌';
      case 'DOCUMENT_ADDED':
        return '�';
      default:
        return '📌';
    }
  };

  const groupedNotifications = (notifications || []).reduce((acc, notif) => {
    const date = new Date(notif.created_at).toLocaleDateString('fr-FR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(notif);
    return acc;
  }, {} as Record<string, typeof notifications>);

  return (
    <>
      <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Bienvenue, {user?.first_name} {user?.last_name}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            className="relative p-2 rounded-md hover:bg-accent transition-colors"
            onClick={() => setShowDrawer(true)}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">{user?.first_name} {user?.last_name}</p>
              <p className="text-muted-foreground text-xs">{user?.role}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDrawer(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-xl">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsRead()}
                      className="text-xs"
                    >
                      Tout marquer comme lu
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDrawer(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune notification</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-6">
                    {Object.entries(groupedNotifications).map(([date, notifs]) => (
                      <div key={date}>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {date}
                        </p>
                        <div className="space-y-2">
                          {notifs.map((notif) => (
                            <div
                              key={notif.id}
                              className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
                                notif.is_read 
                                  ? 'bg-muted/30 border-transparent' 
                                  : 'bg-accent border-accent'
                              }`}
                              onClick={() => {
                                if (!notif.is_read) markAsRead(notif.id);
                                if (notif.related_project_id) {
                                  window.location.href = `/projects/${notif.related_project_id}`;
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium text-sm ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {notif.type}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {notif.message}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!notif.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeNotification(notif.id);
                                    }}
                                    className="p-1 rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
                                    title="Supprimer la notification"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
