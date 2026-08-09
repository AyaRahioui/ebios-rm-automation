import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,

  Bell, 
  User, 
  LogOut 
} from 'lucide-react';
const logoUrl = '/src/assets/logo.png';
import { useAuth } from '../../store/authContext';
import { cn } from '../../lib/utils';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['ADMIN', 'CHEF_PROJET', 'CONSULTANT', 'CLIENT'] },
    { path: '/projects', icon: Briefcase, label: 'Projets', roles: ['CHEF_PROJET', 'CLIENT'] },

    { path: '/missions', icon: FileText, label: 'Mes missions', roles: ['CONSULTANT'] },
    { path: '/admin/users', icon: Users, label: 'Utilisateurs', roles: ['ADMIN'] },
    { path: '/notifications', icon: Bell, label: 'Notifications', roles: ['ADMIN', 'CHEF_PROJET', 'CONSULTANT', 'CLIENT'] },
  ];


  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-background border-r border-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="EBIOS RM"
            style={{
              maxWidth: '85%',
              height: 'auto',
              display: 'block',
              verticalAlign: 'middle',
              marginLeft: '20px',
              marginTop: '-22px',
              marginBottom: '-20px',
            }}
          />
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <User className="w-5 h-5" />
          Mon profil
        </NavLink>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
