import React from 'react';

const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
<h1 className="text-3xl font-bold text-[#2f54eb]">Notifications</h1>
        <p className="text-muted-foreground">Vos notifications récentes</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <p className="text-muted-foreground">Aucune notification pour le moment.</p>
      </div>
    </div>
  );
};

export default NotificationsPage;
