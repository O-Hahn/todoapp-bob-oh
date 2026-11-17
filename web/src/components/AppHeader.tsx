import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Header,
  HeaderContainer,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react';
import {
  Moon,
  Sun,
  Logout,
  ListChecked,
  Settings,
  UserAdmin,
} from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Todos', path: '/', icon: ListChecked, show: true },
    { label: 'Settings & Tokens', path: '/settings', icon: Settings, show: true },
    {
      label: 'Administration',
      path: '/admin',
      icon: UserAdmin,
      show: user?.role === 'admin',
    },
  ];

  return (
    <HeaderContainer
      render={({
        isSideNavExpanded: expanded,
        onClickSideNavExpand,
      }: {
        isSideNavExpanded: boolean;
        onClickSideNavExpand: () => void;
      }) => {
        const sideNavOpen = isSideNavExpanded || expanded;
        return (
          <Header aria-label="IBM ToDo Application">
            <SkipToContent />
            {user && (
              <HeaderMenuButton
                aria-label={sideNavOpen ? 'Close menu' : 'Open menu'}
                onClick={() => {
                  onClickSideNavExpand();
                  setIsSideNavExpanded(!sideNavOpen);
                }}
                isActive={sideNavOpen}
                aria-expanded={sideNavOpen}
              />
            )}
            <HeaderName
              href="#"
              prefix="IBM"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                if (user) navigate('/');
              }}
            >
              ToDo
            </HeaderName>

            {user && (
              <HeaderNavigation aria-label="App Navigation">
                {navItems
                  .filter((item) => item.show)
                  .map((item) => (
                    <HeaderMenuItem
                      key={item.path}
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      href="#"
                    >
                      {item.label}
                    </HeaderMenuItem>
                  ))}
              </HeaderNavigation>
            )}

            <HeaderGlobalBar>
              <HeaderGlobalAction
                aria-label={
                  isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'
                }
                onClick={toggleTheme}
                tooltipAlignment="end"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </HeaderGlobalAction>

              {user && (
                <HeaderGlobalAction
                  aria-label="Logout"
                  onClick={handleLogout}
                  tooltipAlignment="end"
                >
                  <Logout size={20} />
                </HeaderGlobalAction>
              )}
            </HeaderGlobalBar>

            {user && (
              <SideNav
                aria-label="Side navigation"
                expanded={sideNavOpen}
                isPersistent={false}
                onSideNavBlur={() => setIsSideNavExpanded(false)}
              >
                <SideNavItems>
                  {navItems
                    .filter((item) => item.show)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <SideNavLink
                          key={item.path}
                          isActive={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setIsSideNavExpanded(false);
                          }}
                          renderIcon={Icon}
                          href="#"
                        >
                          {item.label}
                        </SideNavLink>
                      );
                    })}
                  <SideNavLink
                    onClick={handleLogout}
                    renderIcon={Logout}
                    href="#"
                  >
                    Logout ({user.email})
                  </SideNavLink>
                </SideNavItems>
              </SideNav>
            )}
          </Header>
        );
      }}
    />
  );
};
